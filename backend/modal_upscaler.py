import modal
import base64
from fastapi import FastAPI, Request

app = modal.App("vario-upscaler")
web_app = FastAPI()

# Instalamos PyTorch de forma secuencial para evitar el bug de metadatos de BasicSR
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1", "libglib2.0-0", "wget", "git")
    .run_commands(
        "pip install \"numpy<2\" opencv-python-headless==4.9.0.80",
        "pip install \"numpy<2\" torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cu121",
        "pip install \"numpy<2\" basicsr==1.4.2 realesrgan==0.3.0 fastapi uvicorn",
        "wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth -O /RealESRGAN_x4plus.pth"
    )
)

with image.imports():
    import cv2
    import numpy as np
    import torch
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer

@app.cls(image=image, gpu="T4", timeout=120, scaledown_window=300)
class Upscaler:
    @modal.enter()
    def load_model(self):
        # Se carga en la memoria de la GPU una sola vez y se mantiene "caliente"
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        self.upsampler = RealESRGANer(
            scale=4,
            model_path='/RealESRGAN_x4plus.pth',
            model=model,
            tile=256,
            tile_pad=10,
            pre_pad=0,
            half=True # Usa fp16 nativo de la GPU NVIDIA (Súper veloz)
        )

    @modal.method()
    def process(self, image_b64: str, scale: str, format_ext: str):
        # 1. Decodificar
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # 2. Procesar con GPU
        output, _ = self.upsampler.enhance(img, outscale=4)

        # 3. Si pidieron escala 2, lo reducimos a la mitad para ahorrar peso
        if str(scale) == '2':
            h, w = output.shape[:2]
            output = cv2.resize(output, (w//2, h//2), interpolation=cv2.INTER_AREA)

        # 4. Codificar
        encode_ext = '.jpg' if format_ext == 'jpg' else '.png'
        success, encoded_img = cv2.imencode(encode_ext, output)
        if not success:
            raise Exception("Failed to encode image")
            
        return base64.b64encode(encoded_img.tobytes()).decode('utf-8')

@web_app.post("/")
async def process_image(req: Request):
    data = await req.json()
    image_b64 = data.get("image_base64")
    scale = data.get("scale", "4")
    format_ext = data.get("format", "jpg")
    
    # Llamamos a la GPU
    upscaler = Upscaler()
    result_b64 = upscaler.process.remote(image_b64, scale, format_ext)
    
    return {"status": "success", "result_b64": result_b64}

@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    return web_app

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

const BIN_DIR = path.join(__dirname, '..', 'bin', 'realesrgan');
const MODELS_DIR = path.join(BIN_DIR, 'models');

// Detectar plataforma: .exe en Windows, sin extension en Linux/macOS
const BIN_NAME = process.platform === 'win32'
    ? 'realesrgan-ncnn-vulkan.exe'
    : 'realesrgan-ncnn-vulkan';
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

const MODEL_MAP = {
    '2': 'realesr-animevideov3-x2',
    '4': 'realesrgan-x4plus',
};

// Validar al arranque que el binario existe en esta plataforma
const fs_sync = require('fs');
if (!fs_sync.existsSync(BIN_PATH)) {
    console.warn(`[upscaler] ADVERTENCIA: Binario no encontrado en ${BIN_PATH}`);
    console.warn(`[upscaler] En Linux: descarga el release de https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases`);
    console.warn(`[upscaler] y coloca el binario en backend/bin/realesrgan/ con chmod +x`);
}

require('dotenv').config();

/**
 * Escala una imagen con realesrgan reportando progreso real via onProgress.
 * Guarda el input y el output directamente a disco en una carpeta temporal.
 * @param {Buffer} imageBuffer - PNG base
 * @param {string} scale - '2' | '4'
 * @param {string} format - 'jpg' | 'png' | 'webp'
 * @param {Function} onProgress - callback(percent: number)
 * @returns {Promise<{ inputPath: string, outputPath: string }>} Rutas a los archivos
 */
async function upscaleImage(imageBuffer, scale = '4', format = 'png', onProgress = () => {}) {
    const id = crypto.randomUUID();
    const ext = format === 'jpeg' ? 'jpg' : format;
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `vario_realesr_in_${id}.png`);
    const outputPath = path.join(tmpDir, `vario_realesr_out_${id}.${ext}`);
    const modelName = MODEL_MAP[scale] || MODEL_MAP['4'];

    await fs.writeFile(inputPath, imageBuffer);
    
    // Switch Inteligente: Buscamos la URL de Modal en el archivo .env
    const modalUrl = process.env.MODAL_WEBHOOK_URL;

    if (modalUrl) {
        try {
            onProgress(10); // Iniciando puente a nube gráfica
            const imageB64 = imageBuffer.toString('base64');
            onProgress(20);
            
            // Enviar la imagen a Modal Serverless
            const res = await fetch(modalUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: imageB64,
                    scale: scale,
                    format: ext
                })
            });
            onProgress(80); // Respuesta recibida
            
            if (!res.ok) throw new Error(`Modal HTTP error: ${res.statusText}`);
            
            const data = await res.json();
            if (data.status !== 'success') throw new Error('Modal process failed');
            
            // Reconstruir la imagen final
            const resultBuffer = Buffer.from(data.result_b64, 'base64');
            await fs.writeFile(outputPath, resultBuffer);
            onProgress(100);
            return { inputPath, outputPath };

        } catch (error) {
            console.warn(`[upscaler] Modal API falló (${error.message}). Haciendo fallback a binario local lento...`);
            // Si la nube falla (ej. sin saldo), cae al binario de CPU para nunca romper la web
            await runBinary(inputPath, outputPath, scale, modelName, ext, onProgress);
            return { inputPath, outputPath };
        }
    } else {
        // Modo Normal: Si el admin no configuró Modal en su .env, usar binario local
        await runBinary(inputPath, outputPath, scale, modelName, ext, onProgress);
        return { inputPath, outputPath };
    }
}

function runBinary(inputPath, outputPath, scale, modelName, format, onProgress) {
    return new Promise((resolve, reject) => {
        // Mantenemos -t 256 que es lo que realmente da la velocidad al procesar
        // trozos mas grandes. Retiramos -g -1 y -j 4:4:4 que causaron crash (código 255)
        // en el servidor KVM de 2 nucleos.
        const args = [
            '-i', inputPath, 
            '-o', outputPath, 
            '-s', scale, 
            '-n', modelName, 
            '-m', MODELS_DIR, 
            '-t', '256', 
            '-f', format
        ];
        
        const child = spawn(BIN_PATH, args);

        child.stderr.on('data', (data) => {
            const out = data.toString();
            const match = out.match(/(\d+(?:\.\d+)?)%/);
            if (match) onProgress(Math.min(parseFloat(match[1]), 99));
        });

        child.on('close', (code) => {
            if (code === 0) { onProgress(100); resolve(); }
            else reject(new Error(`realesrgan exito con codigo ${code}`));
        });

        child.on('error', reject);
    });
}

module.exports = { upscaleImage };

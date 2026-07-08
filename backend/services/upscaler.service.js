const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

const BIN_PATH = path.join(__dirname, '..', 'bin', 'realesrgan', 'realesrgan-ncnn-vulkan.exe');
const MODELS_DIR = path.join(__dirname, '..', 'bin', 'realesrgan', 'models');

// Mapeo de escala a modelo optimo
const MODEL_MAP = {
    '2': 'realesr-animevideov3-x2',
    '4': 'realesrgan-x4plus',
};

/**
 * Escala una imagen usando el binario realesrgan-ncnn-vulkan.
 * @param {Buffer} imageBuffer - Buffer de la imagen de entrada
 * @param {string} scale - '2' o '4'
 * @returns {Promise<Buffer>} - Buffer de la imagen escalada en PNG
 */
async function upscaleImage(imageBuffer, scale = '4') {
    const id = crypto.randomUUID();
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `realesr_in_${id}.png`);
    const outputPath = path.join(tmpDir, `realesr_out_${id}.png`);

    const modelName = MODEL_MAP[scale] || MODEL_MAP['4'];

    try {
        await fs.writeFile(inputPath, imageBuffer);
        await runBinary(inputPath, outputPath, scale, modelName);
        const outputBuffer = await fs.readFile(outputPath);
        return outputBuffer;
    } finally {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
    }
}

function runBinary(inputPath, outputPath, scale, modelName) {
    return new Promise((resolve, reject) => {
        const args = [
            '-i', inputPath,
            '-o', outputPath,
            '-s', scale,
            '-n', modelName,
            '-m', MODELS_DIR,
        ];

        execFile(BIN_PATH, args, { timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('[upscaler] stderr:', stderr);
                return reject(new Error(`realesrgan fallo: ${error.message}`));
            }
            resolve();
        });
    });
}

module.exports = { upscaleImage };

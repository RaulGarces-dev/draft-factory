const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

const BIN_PATH = path.join(__dirname, '..', 'bin', 'realesrgan', 'realesrgan-ncnn-vulkan.exe');
const MODELS_DIR = path.join(__dirname, '..', 'bin', 'realesrgan', 'models');

const MODEL_MAP = {
    '2': 'realesr-animevideov3-x2',
    '4': 'realesrgan-x4plus',
};

/**
 * Escala una imagen con realesrgan reportando progreso real via onProgress.
 * @param {Buffer} imageBuffer
 * @param {string} scale - '2' | '4'
 * @param {Function} onProgress - callback(percent: number)
 * @returns {Promise<Buffer>}
 */
async function upscaleImage(imageBuffer, scale = '4', onProgress = () => {}) {
    const id = crypto.randomUUID();
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `realesr_in_${id}.png`);
    const outputPath = path.join(tmpDir, `realesr_out_${id}.png`);
    const modelName = MODEL_MAP[scale] || MODEL_MAP['4'];

    try {
        await fs.writeFile(inputPath, imageBuffer);
        await runBinary(inputPath, outputPath, scale, modelName, onProgress);
        return await fs.readFile(outputPath);
    } finally {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
    }
}

function runBinary(inputPath, outputPath, scale, modelName, onProgress) {
    return new Promise((resolve, reject) => {
        const args = ['-i', inputPath, '-o', outputPath, '-s', scale, '-n', modelName, '-m', MODELS_DIR];
        const child = spawn(BIN_PATH, args);

        // El binario emite progreso en stderr como "x.xx%"
        child.stderr.on('data', (data) => {
            const match = data.toString().match(/(\d+(?:\.\d+)?)%/);
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

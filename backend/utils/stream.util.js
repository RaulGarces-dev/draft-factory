const archiver = require('archiver');

const createZipStream = (res) => {
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    archive.on('error', (err) => {
        console.error('Error en archiver:', err);
        throw err;
    });

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.warn('Archiver warning:', err);
        } else {
            throw err;
        }
    });

    archive.pipe(res);
    return archive;
};

const finalizeZip = async (archive) => {
    await archive.finalize();
};

module.exports = {
    createZipStream,
    finalizeZip
};

const { PDFDocument } = require('pdf-lib');

const mergePdfs = async (pdfBuffers) => {
    const mergedPdf = await PDFDocument.create();
    
    for (const pdfBytes of pdfBuffers) {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
        });
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
};

module.exports = {
    mergePdfs
};

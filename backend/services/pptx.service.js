const pptxgen = require('pptxgenjs');

const generatePptx = async (pngBuffer) => {
    const pres = new pptxgen();
    const slide = pres.addSlide();
    
    const base64Data = pngBuffer.toString('base64');
    
    slide.addImage({
        data: `image/png;base64,${base64Data}`,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
    });
    
    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
    return pptxBuffer;
};

module.exports = {
    generatePptx
};

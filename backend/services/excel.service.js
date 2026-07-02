const xlsx = require('xlsx');

const parseExcelBuffer = (buffer) => {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
    return data;
};

module.exports = {
    parseExcelBuffer
};

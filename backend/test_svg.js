const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').toLowerCase().trim();
console.log("NEX:", normalize('NEX_1_110'));
console.log("NEO:", normalize('NEO_1_110'));

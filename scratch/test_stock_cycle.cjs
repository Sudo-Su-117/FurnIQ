const http = require('http');

http.get('http://localhost:3000/api/v1/stock', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    const item = parsed.data.find(p => p.name.includes('Teakwood Royal King Bed'));
    console.log('Product:', item.name);
    console.log('Current Live Stock Quantity:', item.stockQuantity);
    console.log('Total Stock Value:', item.inventoryValuation);
  });
});

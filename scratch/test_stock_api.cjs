const http = require('http');

http.get('http://localhost:3000/api/v1/stock', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Stock API Response Status:', res.statusCode);
    console.log('Stock API Data:', JSON.parse(data));
  });
}).on('error', (err) => console.error('Error:', err.message));

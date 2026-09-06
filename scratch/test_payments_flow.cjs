const http = require('http');

async function login() {
  const data = JSON.stringify({ email: 'admin@urbanfurniture.com', password: 'Admin123!' });
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function request(path, method = 'GET', payload = null, token = null) {
  const data = payload ? JSON.stringify(payload) : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (payload) headers['Content-Length'] = Buffer.byteLength(data);

  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path: '/api/v1' + path, method, headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(data);
    req.end();
  });
}

async function testPaymentWithTax() {
  const auth = await login();
  const token = auth?.data?.tokens?.accessToken;
  console.log('Login token acquired:', token ? 'YES' : 'NO');

  function getList(b) {
    if (!b) return [];
    if (Array.isArray(b)) return b;
    if (Array.isArray(b.items)) return b.items;
    if (Array.isArray(b.data)) return b.data;
    if (b.data && Array.isArray(b.data.items)) return b.data.items;
    return [];
  }

  const vendors = await request('/contacts?limit=100', 'GET', null, token);
  console.log('vendors.body:', vendors.body);
  const vList = getList(vendors.body);
  const vId = vList[0].id;

  const prods = await request('/products?limit=100', 'GET', null, token);
  const pList = getList(prods.body);
  const pId = pList[0].id;
  const unitPrice = 104000;

  console.log('1. Creating Vendor Bill with untaxed unitPrice = 104000...');
  const billRes = await request('/purchases/bills', 'POST', {
    vendorId: vId,
    lines: [{ productId: pId, quantity: 1, unitPrice }]
  }, token);

  const billObj = billRes.body?.data || billRes.body;
  console.log(`   Bill created: ${billObj.billNumber}, totalAmount: ${billObj.totalAmount}`);
  const billId = billObj.id;

  console.log('2. Confirming Vendor Bill...');
  const confRes = await request(`/purchases/bills/${billId}/confirm`, 'PATCH', null, token);
  const confObj = confRes.body?.data || confRes.body;
  console.log(`   Bill status: ${confObj.status}`);

  console.log(`3. Recording payment of ₹${billObj.totalAmount} (including 18% GST)...`);
  const payRes = await request('/payments/vendor', 'POST', {
    vendorBillId: billId,
    paymentMethod: 'BANK',
    amount: Number(billObj.totalAmount)
  }, token);

  console.log(`   Payment status code: ${payRes.status}`);
  const payObj = payRes.body?.data || payRes.body;
  if (payRes.status === 201) {
    console.log(`   Payment SUCCESS! Payment No: ${payObj.paymentNumber || payObj.id}`);
  } else {
    console.error('   Payment FAILED:', payRes.body);
  }
}

testPaymentWithTax().catch(console.error);

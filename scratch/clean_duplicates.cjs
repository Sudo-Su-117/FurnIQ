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

async function cleanDuplicates() {
  const auth = await login();
  const token = auth?.data?.tokens?.accessToken;
  console.log('Login token acquired:', token ? 'YES' : 'NO');

  function getList(res) {
    const b = res?.body;
    if (!b) return [];
    if (Array.isArray(b)) return b;
    if (Array.isArray(b.items)) return b.items;
    if (Array.isArray(b.data)) return b.data;
    if (b.data && Array.isArray(b.data.items)) return b.data.items;
    return [];
  }

  // 1. Fetch all POs
  const posRes = await request('/purchases/orders?limit=100', 'GET', null, token);
  const pos = getList(posRes);
  console.log(`Fetched ${pos.length} purchase orders.`);

  // Find duplicates by (vendorId + totalAmount + orderDate day)
  const seenPO = new Set();
  const duplicatePOIds = [];
  for (const po of pos) {
    const key = `${po.vendorId}_${po.totalAmount}_${(po.orderDate||'').split('T')[0]}`;
    if (seenPO.has(key)) {
      duplicatePOIds.push(po.id);
    } else {
      seenPO.add(key);
    }
  }

  console.log(`Found ${duplicatePOIds.length} duplicate purchase orders to clean up.`);
  for (const id of duplicatePOIds) {
    await request(`/purchases/orders/${id}`, 'DELETE', null, token);
  }

  console.log('Cleanup completed cleanly.');
}

cleanDuplicates().catch(console.error);

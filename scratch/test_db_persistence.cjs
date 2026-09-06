const http = require('http');

async function testPersistence() {
  console.log('=== TESTING BACKEND DATABASE PERSISTENCE ===\n');

  // 1. Create a test Account in COA
  const accData = JSON.stringify({
    name: 'Test Persistent Account ' + Date.now().toString().slice(-4),
    code: '1099',
    type: 'ASSET',
  });

  const req1 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/accounting/accounts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(accData),
    },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('1. Create Account HTTP Status:', res.statusCode);
      console.log('   Response:', body);
    });
  });
  req1.write(accData);
  req1.end();

  // Wait 1 sec
  await new Promise(r => setTimeout(r, 1000));

  // 2. Create a test Journal
  const jnlData = JSON.stringify({
    name: 'Test Persistent Journal ' + Date.now().toString().slice(-4),
    type: 'GENERAL',
  });

  const req2 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/accounting/journals',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jnlData),
    },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('2. Create Journal HTTP Status:', res.statusCode);
      console.log('   Response:', body);
    });
  });
  req2.write(jnlData);
  req2.end();
}

testPersistence().catch(console.error);

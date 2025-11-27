// 測試 Google Auth 後端
const https = require('https');

const testCredential = 'test_token'; // 這會失敗，但可以看到後端回應

const data = JSON.stringify({
  credential: testCredential
});

const options = {
  hostname: 'ichiban-backend-248630813908.us-central1.run.app',
  port: 443,
  path: '/api/v1/auth/google',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();

/**
 * 測試 Session
 */

const https = require('https');

const SESSION_ID = 'bad16f589a350b26599e2f9302146d1c0d3873230d983c8f';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ichiban-backend-new-248630813908.us-central1.run.app',
      path: path,
      method: 'GET',
      headers: {
        'Cookie': `sid=${SESSION_ID}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('測試 Session');
  console.log('========================================\n');

  try {
    const result = await makeRequest('/api/auth/session');
    
    console.log('Session 數據:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.user) {
      console.log('\n用戶 ID:', result.user.id);
      console.log('用戶名:', result.user.username);
    }
  } catch (error) {
    console.error('\n❌ API 調用失敗:', error);
  }
  
  console.log('\n========================================');
}

main();

/**
 * 測試 /user/inventory API
 */

const https = require('https');

const API_BASE = 'https://ichiban-backend-new-248630813908.us-central1.run.app';
const SESSION_ID = 'bad16f589a350b26599e2f9302146d1c0d3873230d983c8f'; // 從 cookie 獲取

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
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Body:', data);
        
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
  console.log('測試 /user/inventory API');
  console.log('========================================\n');

  try {
    const result = await makeRequest('/api/user/inventory');
    
    if (Array.isArray(result)) {
      console.log('\n✅ API 返回陣列');
      console.log('獎品數量:', result.length);
      
      if (result.length > 0) {
        console.log('\n第一個獎品:');
        console.log(JSON.stringify(result[0], null, 2));
      }
    } else {
      console.log('\n❌ API 返回格式不正確');
      console.log('返回值:', result);
    }
  } catch (error) {
    console.error('\n❌ API 調用失敗:', error);
  }
  
  console.log('\n========================================');
}

main();

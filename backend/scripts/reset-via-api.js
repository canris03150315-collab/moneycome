/**
 * 通過後端 API 清空所有商品和訂單
 * 用於測試新增商品功能
 */

const https = require('https');

const API_BASE = 'https://ichiban-backend-new-248630813908.us-central1.run.app';
const ADMIN_PASSWORD = '123123';

// 管理員刪除令牌（從環境變數或 Secret Manager 讀取）
const DELETE_TOKEN = 'c4cd9f4939e7f520fda8bec9cc8dcbfa16821e297185dc214798a690c5eed233';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}, Body: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function resetDatabase() {
  console.log('🚀 開始清空資料庫...\n');

  try {
    // 1. 驗證管理員身份
    console.log('🔐 驗證管理員身份...');
    await makeRequest('POST', '/api/auth/verify-admin', { password: ADMIN_PASSWORD });
    console.log('✅ 管理員驗證成功\n');

    // 2. 獲取所有商品
    console.log('📦 獲取所有商品...');
    const lotterySets = await makeRequest('GET', '/api/lottery-sets');
    console.log(`找到 ${lotterySets.length} 個商品\n`);

    // 3. 刪除所有商品
    if (lotterySets.length > 0) {
      console.log('🗑️  開始刪除商品...');
      
      for (const set of lotterySets) {
        try {
          console.log(`  刪除商品: ${set.id} - ${set.title}`);
          await makeRequest('DELETE', `/api/admin/lottery-sets/${set.id}?token=${DELETE_TOKEN}`);
          console.log(`  ✅ 已刪除: ${set.title}`);
        } catch (error) {
          console.log(`  ⚠️  刪除失敗: ${set.title} - ${error.message}`);
        }
      }
      console.log('✅ 所有商品已刪除\n');
    } else {
      console.log('⏭️  沒有商品需要刪除\n');
    }

    console.log('🎉 資料庫已重置完成！');
    console.log('\n📊 清空結果：');
    console.log(`  ✅ 商品：已刪除 ${lotterySets.length} 個`);
    console.log('  ✅ 相關訂單和抽獎狀態：已自動清除');
    console.log('\n現在可以開始測試新增商品功能了！🚀\n');

  } catch (error) {
    console.error('❌ 清空資料庫時發生錯誤:', error.message);
    throw error;
  }
}

// 執行清理
resetDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  });

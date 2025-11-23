#!/usr/bin/env node

/**
 * 數據遷移腳本：從記憶體數據庫遷移到 Firestore
 * 
 * 使用方式：
 *   node migrations/migrate-to-firestore.js
 * 
 * 注意：
 * - 確保已經設置好 Google Cloud 認證
 * - 這個腳本會將當前記憶體中的數據遷移到 Firestore
 * - 建議在測試環境先執行，確認無誤後再在生產環境執行
 */

const db = require('../db/firestore');

// 模擬當前記憶體數據庫的數據（實際應該從運行中的 server 導出）
// 由於記憶體數據在 server 重啟後會消失，這裡提供一個備份/恢復機制

/**
 * 遷移用戶數據
 */
async function migrateUsers(users = []) {
  console.log('\n📦 開始遷移用戶數據...');
  
  if (users.length === 0) {
    console.log('⚠️  沒有用戶數據需要遷移');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of users) {
    try {
      // 檢查用戶是否已存在
      const existing = await db.getUserById(user.id);
      
      if (existing) {
        console.log(`⏭️  用戶已存在，跳過: ${user.email}`);
        continue;
      }
      
      // 創建用戶
      await db.createUser(user);
      successCount++;
      console.log(`✅ 遷移用戶: ${user.email} (${user.id})`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 遷移用戶失敗: ${user.email}`, error.message);
    }
  }
  
  console.log(`\n用戶遷移完成: 成功 ${successCount} / 失敗 ${errorCount}`);
}

/**
 * 遷移訂單數據
 */
async function migrateOrders(orders = []) {
  console.log('\n📦 開始遷移訂單數據...');
  
  if (orders.length === 0) {
    console.log('⚠️  沒有訂單數據需要遷移');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const order of orders) {
    try {
      // 檢查訂單是否已存在
      const existing = await db.getOrderById(order.id);
      
      if (existing) {
        console.log(`⏭️  訂單已存在，跳過: ${order.id}`);
        continue;
      }
      
      // 創建訂單
      await db.createOrder(order);
      successCount++;
      console.log(`✅ 遷移訂單: ${order.id} (${order.type})`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 遷移訂單失敗: ${order.id}`, error.message);
    }
  }
  
  console.log(`\n訂單遷移完成: 成功 ${successCount} / 失敗 ${errorCount}`);
}

/**
 * 遷移獎品實例數據
 */
async function migratePrizes(prizes = []) {
  console.log('\n📦 開始遷移獎品實例數據...');
  
  if (prizes.length === 0) {
    console.log('⚠️  沒有獎品數據需要遷移');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const prize of prizes) {
    try {
      // 創建獎品實例
      await db.createPrizeInstance(prize);
      successCount++;
      console.log(`✅ 遷移獎品: ${prize.instanceId}`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 遷移獎品失敗: ${prize.instanceId}`, error.message);
    }
  }
  
  console.log(`\n獎品遷移完成: 成功 ${successCount} / 失敗 ${errorCount}`);
}

/**
 * 創建測試數據（用於演示）
 */
function createTestData() {
  const userId = 'test-user-001';
  
  return {
    users: [
      {
        id: userId,
        email: '123123@aaa',
        username: '測試達人',
        password: '123123',
        roles: ['user', 'ADMIN'],
        points: 2000,
        lotteryStats: {},
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
      {
        id: 'test-user-002',
        email: 'test@example.com',
        username: 'TestUser',
        password: 'password123',
        roles: ['user'],
        points: 1000,
        lotteryStats: {},
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }
    ],
    orders: [],
    prizes: []
  };
}

/**
 * 從 JSON 文件導入數據
 */
async function importFromJSON(filepath) {
  const fs = require('fs').promises;
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ 讀取 JSON 文件失敗:', error.message);
    return null;
  }
}

/**
 * 導出當前 Firestore 數據到 JSON（用於備份）
 */
async function exportToJSON(filepath) {
  console.log('\n💾 導出 Firestore 數據到 JSON...');
  
  try {
    const users = await db.getAllActiveUsers();
    const data = {
      users,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const fs = require('fs').promises;
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`✅ 數據已導出到: ${filepath}`);
    console.log(`   用戶數量: ${users.length}`);
    
  } catch (error) {
    console.error('❌ 導出失敗:', error.message);
  }
}

/**
 * 清理測試數據（謹慎使用！）
 */
async function cleanupTestData() {
  console.log('\n🗑️  清理測試數據...');
  console.log('⚠️  這將刪除所有測試用戶！');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question('確定要繼續嗎？(yes/no): ', async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ 取消清理');
        resolve();
        return;
      }
      
      try {
        // 這裡實現清理邏輯
        // 注意：Firestore 不支持直接清空 collection，需要逐個刪除
        console.log('清理功能需要手動實現...');
        
      } catch (error) {
        console.error('❌ 清理失敗:', error.message);
      }
      
      resolve();
    });
  });
}

/**
 * 主函數
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🚀 Firestore 數據遷移工具 🚀       ║');
  console.log('╚════════════════════════════════════════╝');
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'migrate':
        // 遷移數據
        const filepath = args[1];
        let data;
        
        if (filepath) {
          console.log(`\n📂 從文件導入: ${filepath}`);
          data = await importFromJSON(filepath);
        } else {
          console.log('\n📂 使用測試數據');
          data = createTestData();
        }
        
        if (data) {
          await migrateUsers(data.users || []);
          await migrateOrders(data.orders || []);
          await migratePrizes(data.prizes || []);
          
          console.log('\n🎉 遷移完成！');
        }
        break;
        
      case 'export':
        // 導出數據
        const outputFile = args[1] || 'firestore-backup.json';
        await exportToJSON(outputFile);
        break;
        
      case 'cleanup':
        // 清理測試數據
        await cleanupTestData();
        break;
        
      case 'test':
        // 測試連接
        console.log('\n🔍 測試 Firestore 連接...');
        const testUser = await db.getUserByEmail('123123@aaa');
        if (testUser) {
          console.log('✅ Firestore 連接成功！');
          console.log('找到測試用戶:', testUser.email);
        } else {
          console.log('⚠️  找不到測試用戶（這是正常的，如果你還沒遷移數據）');
        }
        break;
        
      default:
        // 顯示幫助
        console.log('\n使用方式:');
        console.log('  node migrate-to-firestore.js migrate [json文件]  - 遷移數據');
        console.log('  node migrate-to-firestore.js export [輸出文件]   - 導出數據');
        console.log('  node migrate-to-firestore.js test                - 測試連接');
        console.log('  node migrate-to-firestore.js cleanup             - 清理測試數據');
        console.log('\n示例:');
        console.log('  node migrate-to-firestore.js migrate             - 使用測試數據');
        console.log('  node migrate-to-firestore.js migrate data.json   - 從文件遷移');
        console.log('  node migrate-to-firestore.js export backup.json  - 導出到文件');
    }
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error);
    process.exit(1);
  }
}

// 執行主函數
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateUsers,
  migrateOrders,
  migratePrizes,
  exportToJSON,
  importFromJSON,
};

/**
 * 檢查獎品實例數據
 */

const { firestore, COLLECTIONS } = require('./db/firestore');

async function main() {
  console.log('========================================');
  console.log('檢查獎品實例');
  console.log('========================================\n');
  
  try {
    // 獲取所有獎品實例
    const snapshot = await firestore.collection(COLLECTIONS.PRIZES).get();
    
    console.log(`找到 ${snapshot.size} 個獎品實例\n`);
    
    if (snapshot.size === 0) {
      console.log('沒有任何獎品實例');
      process.exit(0);
    }
    
    // 按用戶分組
    const byUser = {};
    
    snapshot.docs.forEach(doc => {
      const prize = doc.data();
      const userId = prize.userId || 'unknown';
      
      if (!byUser[userId]) {
        byUser[userId] = [];
      }
      
      byUser[userId].push(prize);
    });
    
    // 顯示每個用戶的獎品
    for (const [userId, prizes] of Object.entries(byUser)) {
      console.log(`\n用戶: ${userId}`);
      console.log(`獎品數量: ${prizes.length}`);
      console.log('---');
      
      prizes.forEach((prize, idx) => {
        console.log(`${idx + 1}. ${prize.prizeGrade} - ${prize.prizeName}`);
        console.log(`   ID: ${prize.instanceId}`);
        console.log(`   商品: ${prize.lotterySetId}`);
        console.log(`   訂單: ${prize.orderId}`);
        console.log(`   狀態: ${prize.status}`);
        console.log(`   創建時間: ${prize.createdAt}`);
      });
    }
    
    console.log('\n========================================');
    
  } catch (error) {
    console.error('\n❌ 檢查失敗:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

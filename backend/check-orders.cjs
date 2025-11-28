/**
 * 檢查訂單數據
 */

const { firestore, COLLECTIONS } = require('./db/firestore');

async function main() {
  console.log('========================================');
  console.log('檢查訂單');
  console.log('========================================\n');
  
  try {
    // 獲取所有訂單
    const snapshot = await firestore
      .collection(COLLECTIONS.ORDERS)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`找到 ${snapshot.size} 個訂單\n`);
    
    if (snapshot.size === 0) {
      console.log('沒有任何訂單');
      process.exit(0);
    }
    
    snapshot.docs.forEach((doc, idx) => {
      const order = doc.data();
      
      console.log(`\n訂單 ${idx + 1}: ${order.id}`);
      console.log(`用戶: ${order.userId}`);
      console.log(`商品標題: ${order.lotterySetTitle}`);
      console.log(`商品 ID: ${order.lotterySetId}`);
      console.log(`抽獎數: ${order.drawCount}`);
      console.log(`票號: ${JSON.stringify(order.drawnTicketIndices)}`);
      console.log(`創建時間: ${order.createdAt}`);
      
      if (order.items && order.items.length > 0) {
        console.log(`獎品清單 (${order.items.length} 個):`);
        order.items.forEach((item, i) => {
          console.log(`  ${i + 1}. 票號 ${item.ticketIndex}: ${item.prizeGrade} - ${item.prizeName}`);
        });
      }
      
      if (order.prizeSummary) {
        console.log(`獎品摘要:`, order.prizeSummary);
      }
      
      if (order.prizeInstanceIds && order.prizeInstanceIds.length > 0) {
        console.log(`獎品實例 (${order.prizeInstanceIds.length} 個):`, order.prizeInstanceIds.slice(0, 3), '...');
      }
    });
    
    console.log('\n========================================');
    
  } catch (error) {
    console.error('\n❌ 檢查失敗:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

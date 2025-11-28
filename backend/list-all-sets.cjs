/**
 * 列出所有商品
 */

const { firestore, COLLECTIONS } = require('./db/firestore');

async function main() {
  console.log('========================================');
  console.log('所有抽獎商品');
  console.log('========================================\n');
  
  try {
    const snapshot = await firestore.collection(COLLECTIONS.LOTTERY_SETS).get();
    
    console.log(`找到 ${snapshot.size} 個商品\n`);
    
    if (snapshot.size === 0) {
      console.log('沒有任何商品');
      process.exit(0);
    }
    
    snapshot.docs.forEach((doc, idx) => {
      const set = doc.data();
      
      console.log(`\n商品 ${idx + 1}:`);
      console.log(`  ID: ${set.id || doc.id}`);
      console.log(`  標題: ${set.title}`);
      console.log(`  狀態: ${set.status}`);
      console.log(`  價格: ${set.price}`);
      
      if (set.prizes && set.prizes.length > 0) {
        console.log(`  獎品數: ${set.prizes.length}`);
        
        // 檢查最後賞
        const lastOne = set.prizes.find(p => p.type === 'LAST_ONE');
        if (lastOne) {
          console.log(`  ✅ 有最後賞: ${lastOne.name}`);
        } else {
          console.log(`  ❌ 沒有最後賞`);
        }
        
        // 列出所有獎品類型
        const types = [...new Set(set.prizes.map(p => p.type))];
        console.log(`  獎品類型: ${types.join(', ')}`);
      } else {
        console.log(`  ❌ 沒有獎品`);
      }
      
      if (set.drawnTicketIndices) {
        console.log(`  已抽票數: ${set.drawnTicketIndices.length}`);
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

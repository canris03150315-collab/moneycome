/**
 * 檢查抽獎商品數據
 */

const { firestore, COLLECTIONS } = require('./db/firestore');

async function main() {
  const setId = 'set-1764317857797-q00s26w'; // 哥吉拉測試最後賞
  
  console.log('========================================');
  console.log(`檢查商品: ${setId}`);
  console.log('========================================\n');
  
  try {
    const doc = await firestore.collection(COLLECTIONS.LOTTERY_SETS).doc(setId).get();
    
    if (!doc.exists) {
      console.log('商品不存在');
      process.exit(0);
    }
    
    const set = doc.data();
    
    console.log('原始數據:', JSON.stringify(set, null, 2));
    
    if (!set) {
      console.log('商品數據為空');
      process.exit(0);
    }
    
    console.log(`\n標題: ${set.title}`);
    console.log(`狀態: ${set.status}`);
    console.log(`價格: ${set.price}`);
    
    if (!set.prizes || set.prizes.length === 0) {
      console.log('\n❌ 沒有獎品數據');
      process.exit(0);
    }
    
    console.log(`\n獎品列表 (${set.prizes.length} 個):\n`);
    
    set.prizes.forEach((prize, idx) => {
      console.log(`${idx + 1}. ${prize.grade} - ${prize.name}`);
      console.log(`   ID: ${prize.id}`);
      console.log(`   類型: ${prize.type}`);
      console.log(`   總數: ${prize.total}`);
      console.log(`   剩餘: ${prize.remaining}`);
      console.log('');
    });
    
    // 檢查是否有最後賞
    const lastOnePrize = set.prizes.find(p => p.type === 'LAST_ONE');
    if (lastOnePrize) {
      console.log('✅ 找到最後賞:', lastOnePrize.name);
    } else {
      console.log('❌ 沒有找到最後賞 (type === "LAST_ONE")');
    }
    
    // 計算一般賞的總票數
    const normalPrizes = set.prizes.filter(p => p.type === 'NORMAL');
    const totalNormalTickets = normalPrizes.reduce((sum, p) => sum + (p.total || 0), 0);
    console.log(`\n一般賞總票數: ${totalNormalTickets}`);
    
    console.log('\n========================================');
    
  } catch (error) {
    console.error('\n❌ 檢查失敗:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

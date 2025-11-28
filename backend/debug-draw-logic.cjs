/**
 * 調試抽獎邏輯
 */

const { firestore, COLLECTIONS } = require('./db/firestore');

// 複製 buildPrizeOrder 函數
function buildPrizeOrder(prizes = []) {
  const order = [];
  const normals = prizes.filter(p => p && p.type === 'NORMAL');
  normals.forEach(p => {
    const count = typeof p.total === 'number' && p.total > 0 ? p.total : 0;
    for (let i = 0; i < count; i++) {
      order.push(p.id);
    }
  });
  return order;
}

async function main() {
  const setId = 'set-1764333013637-vjjpysx';
  
  console.log('========================================');
  console.log('調試抽獎邏輯');
  console.log('========================================\n');
  
  try {
    // 獲取商品數據
    const doc = await firestore.collection(COLLECTIONS.LOTTERY_SETS).doc(setId).get();
    
    if (!doc.exists) {
      console.log('商品不存在');
      process.exit(0);
    }
    
    const set = doc.data();
    const prizePool = set.prizes || [];
    
    console.log('商品:', set.title);
    console.log('獎品數:', prizePool.length);
    console.log('');
    
    // 檢查最後賞
    const lastOnePrize = prizePool.find(p => p.type === 'LAST_ONE');
    const normalPrizes = prizePool.filter(p => p.type === 'NORMAL');
    
    console.log('最後賞:', lastOnePrize ? `✅ ${lastOnePrize.name}` : '❌ 不存在');
    console.log('一般賞數:', normalPrizes.length);
    console.log('');
    
    // 計算總票數
    const totalNormalTickets = normalPrizes.reduce((sum, p) => sum + (p.total || 0), 0);
    console.log('一般賞總票數:', totalNormalTickets);
    console.log('');
    
    // 建立 prizeOrder
    const prizeOrder = buildPrizeOrder(prizePool);
    console.log('prizeOrder 長度:', prizeOrder.length);
    console.log('prizeOrder:', prizeOrder);
    console.log('');
    
    // 模擬第一次抽獎（5 張票）
    const currentDrawnTickets = []; // 第一次抽
    const tickets = [9, 8, 7, 6, 5]; // 第一次要抽
    
    console.log('=== 模擬第二次抽獎 ===');
    console.log('已抽票數:', currentDrawnTickets.length);
    console.log('本次抽票:', tickets);
    console.log('');
    
    tickets.forEach((ticketIndex, idx) => {
      const isLastTicket = (currentDrawnTickets.length + idx + 1) === totalNormalTickets;
      
      console.log(`票號 ${ticketIndex} (idx=${idx}):`);
      console.log(`  currentDrawnTickets.length = ${currentDrawnTickets.length}`);
      console.log(`  idx = ${idx}`);
      console.log(`  currentDrawnTickets.length + idx + 1 = ${currentDrawnTickets.length + idx + 1}`);
      console.log(`  totalNormalTickets = ${totalNormalTickets}`);
      console.log(`  isLastTicket = ${isLastTicket}`);
      
      if (isLastTicket && lastOnePrize) {
        console.log(`  ✅ 應該給最後賞: ${lastOnePrize.name}`);
      } else {
        const prizeId = prizeOrder[ticketIndex];
        const prize = prizePool.find(p => p.id === prizeId);
        console.log(`  prizeOrder[${ticketIndex}] = ${prizeId}`);
        console.log(`  獎品: ${prize ? prize.name : '找不到'}`);
      }
      console.log('');
    });
    
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ 調試失敗:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

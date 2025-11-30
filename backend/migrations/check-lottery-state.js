/**
 * 檢查特定商品的狀態
 */

const db = require('../db/firestore');

async function checkLotteryState(setId) {
  try {
    console.log(`檢查商品: ${setId}\n`);
    
    // 獲取商品定義
    const setDoc = await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).doc(setId).get();
    if (!setDoc.exists) {
      console.log('❌ 商品不存在');
      return;
    }
    
    const setData = setDoc.data();
    console.log('商品標題:', setData.title);
    console.log('prizeOrder 長度:', setData.prizeOrder?.length || 0);
    console.log('poolCommitmentHash:', setData.poolCommitmentHash ? '✓ 存在' : '✗ 不存在');
    console.log('poolSeed:', setData.poolSeed ? '✓ 存在' : '✗ 不存在');
    
    // 獲取抽獎狀態
    const state = await db.getLotteryState(setId);
    console.log('\n抽獎狀態:');
    console.log('drawnTicketIndices 長度:', state.drawnTicketIndices?.length || 0);
    
    const totalTickets = setData.prizeOrder?.length || 0;
    const drawnTickets = state.drawnTicketIndices?.length || 0;
    const isSoldOut = drawnTickets >= totalTickets;
    
    console.log('\n售完狀態:');
    console.log(`已抽: ${drawnTickets} / ${totalTickets}`);
    console.log('是否售完:', isSoldOut ? '✓ 是' : '✗ 否');
    
    if (isSoldOut && !setData.poolSeed) {
      console.log('\n⚠️ 商品已售完但沒有 poolSeed！');
      console.log('需要更新此商品');
    } else if (isSoldOut && setData.poolSeed) {
      console.log('\n✓ 商品已售完且有 poolSeed');
    } else {
      console.log('\n- 商品未售完');
    }
    
  } catch (error) {
    console.error('檢查失敗:', error);
  }
}

// 執行檢查
if (require.main === module) {
  const setId = process.argv[2] || 'set-1764336937045-71euc74';
  checkLotteryState(setId)
    .then(() => {
      console.log('\n檢查完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('檢查失敗:', error);
      process.exit(1);
    });
}

module.exports = { checkLotteryState };

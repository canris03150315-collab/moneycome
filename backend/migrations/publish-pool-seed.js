/**
 * 為指定商品公開籤池種子碼
 * 用於手動公開已售完或接近售完的商品的種子碼
 */

const crypto = require('crypto');
const db = require('../db/firestore');

// 生成隨機種子碼
function generatePoolSeed() {
  return crypto.randomBytes(32).toString('hex');
}

// 計算 Hash
function calculateHash(prizeOrder, poolSeed) {
  const data = prizeOrder.join(',') + poolSeed;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function publishPoolSeed(setId, forcePublish = false) {
  try {
    console.log(`處理商品: ${setId}\n`);
    
    // 獲取商品數據
    const setDoc = await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).doc(setId).get();
    if (!setDoc.exists) {
      console.log('❌ 商品不存在');
      return false;
    }
    
    const setData = setDoc.data();
    console.log('商品標題:', setData.title);
    
    // 檢查是否已有種子碼
    if (setData.poolSeed) {
      console.log('✓ 種子碼已公開');
      console.log('poolSeed:', setData.poolSeed);
      return true;
    }
    
    // 檢查售完狀態
    const state = await db.getLotteryState(setId);
    const totalTickets = setData.prizeOrder?.length || 0;
    const drawnTickets = state.drawnTicketIndices?.length || 0;
    const remainingTickets = totalTickets - drawnTickets;
    
    console.log(`\n售完狀態: ${drawnTickets} / ${totalTickets} (剩餘 ${remainingTickets} 張)`);
    
    if (!forcePublish && remainingTickets > 1) {
      console.log('⚠️ 商品還有超過 1 張籤未抽，不建議公開種子碼');
      console.log('如果要強制公開，請使用 --force 參數');
      return false;
    }
    
    // 生成或使用現有的種子碼
    let poolSeed = setData.poolSeed;
    
    if (!poolSeed) {
      // 如果沒有種子碼，需要重新生成並更新 Hash
      console.log('\n⚠️ 警告：此商品沒有預先生成的種子碼');
      console.log('將生成新的種子碼並更新承諾 Hash');
      
      poolSeed = generatePoolSeed();
      const poolCommitmentHash = calculateHash(setData.prizeOrder || [], poolSeed);
      
      await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).doc(setId).update({
        poolSeed,
        poolCommitmentHash
      });
      
      console.log('✓ 已生成並公開種子碼');
      console.log('新的 poolCommitmentHash:', poolCommitmentHash);
      console.log('poolSeed:', poolSeed);
    } else {
      // 如果已有種子碼，只需要公開
      await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).doc(setId).update({
        poolSeed
      });
      
      console.log('✓ 已公開種子碼');
      console.log('poolSeed:', poolSeed);
    }
    
    return true;
    
  } catch (error) {
    console.error('處理失敗:', error);
    return false;
  }
}

// 批量公開所有接近售完的商品
async function publishAllNearSoldOut() {
  try {
    console.log('開始檢查所有商品...\n');
    
    const setsSnapshot = await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).get();
    console.log(`找到 ${setsSnapshot.size} 個商品\n`);
    
    let publishedCount = 0;
    let skippedCount = 0;
    
    for (const doc of setsSnapshot.docs) {
      const setData = doc.data();
      const setId = doc.id;
      
      console.log(`\n檢查商品: ${setId} (${setData.title})`);
      
      // 跳過已公開的
      if (setData.poolSeed) {
        console.log('  ✓ 已公開，跳過');
        skippedCount++;
        continue;
      }
      
      // 檢查售完狀態
      const state = await db.getLotteryState(setId);
      const totalTickets = setData.prizeOrder?.length || 0;
      const drawnTickets = state.drawnTicketIndices?.length || 0;
      const remainingTickets = totalTickets - drawnTickets;
      
      console.log(`  售完狀態: ${drawnTickets} / ${totalTickets} (剩餘 ${remainingTickets} 張)`);
      
      // 只公開剩餘 1 張或已售完的
      if (remainingTickets <= 1) {
        const success = await publishPoolSeed(setId, true);
        if (success) {
          publishedCount++;
        }
      } else {
        console.log('  - 還有多張籤未抽，暫不公開');
        skippedCount++;
      }
    }
    
    console.log('\n=================================');
    console.log('批量公開完成！');
    console.log(`總商品數: ${setsSnapshot.size}`);
    console.log(`已公開: ${publishedCount}`);
    console.log(`已跳過: ${skippedCount}`);
    console.log('=================================\n');
    
  } catch (error) {
    console.error('批量公開失敗:', error);
    throw error;
  }
}

// 執行
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    // 批量公開所有接近售完的商品
    publishAllNearSoldOut()
      .then(() => {
        console.log('腳本執行完成');
        process.exit(0);
      })
      .catch((error) => {
        console.error('腳本執行失敗:', error);
        process.exit(1);
      });
  } else {
    // 公開指定商品
    const setId = args.find(arg => !arg.startsWith('--')) || 'set-1764336937045-71euc74';
    const forcePublish = args.includes('--force');
    
    publishPoolSeed(setId, forcePublish)
      .then(() => {
        console.log('\n腳本執行完成');
        process.exit(0);
      })
      .catch((error) => {
        console.error('腳本執行失敗:', error);
        process.exit(1);
      });
  }
}

module.exports = { publishPoolSeed, publishAllNearSoldOut };

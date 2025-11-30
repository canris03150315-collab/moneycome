/**
 * 為所有商品添加公平性驗證資訊
 * - poolCommitmentHash: 籤池承諾 Hash
 * - poolSeed: 籤池種子碼（售完後公開）
 */

const crypto = require('crypto');
const db = require('../db/firestore');

const COLLECTIONS = db.COLLECTIONS;

// 生成隨機種子碼
function generatePoolSeed() {
  return crypto.randomBytes(32).toString('hex');
}

// 計算 Hash
function calculateHash(prizeOrder, poolSeed) {
  const data = prizeOrder.join(',') + poolSeed;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// 根據獎項生成 prizeOrder
function buildPrizeOrder(prizes = []) {
  const order = [];
  const normals = prizes.filter(p => p && p.type === 'NORMAL');
  normals.forEach(p => {
    for (let i = 0; i < (p.total || 0); i++) {
      order.push(p.id);
    }
  });
  const lastOne = prizes.find(p => p && p.type === 'LAST_ONE');
  if (lastOne) {
    order.push(lastOne.id);
  }
  return order;
}

async function addPoolVerificationData() {
  try {
    console.log('開始為商品添加公平性驗證資訊...\n');
    
    // 獲取所有商品
    const setsSnapshot = await db.firestore.collection(COLLECTIONS.LOTTERY_SETS).get();
    console.log(`找到 ${setsSnapshot.size} 個商品\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const doc of setsSnapshot.docs) {
      const setData = doc.data();
      const setId = doc.id;
      
      console.log(`處理商品: ${setId} (${setData.title})`);
      
      try {
        // 檢查是否已有驗證資訊（使用 getLotteryState）
        const stateData = await db.getLotteryState(setId);
        
        if (stateData.poolCommitmentHash && stateData.poolSeed) {
          console.log(`  ✓ 已有驗證資訊，跳過\n`);
          skippedCount++;
          continue;
        }
        
        // 生成 prizeOrder
        const prizeOrder = buildPrizeOrder(setData.prizes || []);
        console.log(`  - 生成 prizeOrder: ${prizeOrder.length} 張籤`);
        
        // 生成種子碼
        const poolSeed = generatePoolSeed();
        console.log(`  - 生成 poolSeed: ${poolSeed.substring(0, 16)}...`);
        
        // 計算承諾 Hash
        const poolCommitmentHash = calculateHash(prizeOrder, poolSeed);
        console.log(`  - 計算 poolCommitmentHash: ${poolCommitmentHash.substring(0, 16)}...`);
        
        // 檢查商品是否已售完
        const drawnTicketIndices = stateData.drawnTicketIndices || [];
        const isSoldOut = drawnTicketIndices.length >= prizeOrder.length;
        
        // 更新商品文檔（使用 markTicketsDrawn 的方式更新）
        const updateData = {
          poolCommitmentHash,
          prizeOrder
        };
        
        // 只有售完的商品才公開種子碼
        if (isSoldOut) {
          updateData.poolSeed = poolSeed;
          console.log(`  ✓ 商品已售完，公開種子碼`);
        } else {
          console.log(`  - 商品未售完，種子碼暫不公開`);
        }
        
        // 直接更新 LOTTERY_SETS 文檔
        await db.firestore.collection(COLLECTIONS.LOTTERY_SETS).doc(setId).update(updateData);
        
        console.log(`  ✓ 更新成功\n`);
        updatedCount++;
        
      } catch (error) {
        console.error(`  ✗ 處理失敗:`, error.message, '\n');
      }
    }
    
    console.log('\n=================================');
    console.log('遷移完成！');
    console.log(`總商品數: ${setsSnapshot.size}`);
    console.log(`已更新: ${updatedCount}`);
    console.log(`已跳過: ${skippedCount}`);
    console.log('=================================\n');
    
  } catch (error) {
    console.error('遷移失敗:', error);
    throw error;
  }
}

// 執行遷移
if (require.main === module) {
  addPoolVerificationData()
    .then(() => {
      console.log('腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { addPoolVerificationData };

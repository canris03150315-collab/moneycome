/**
 * 公平性驗證自動化補丁
 * 
 * 使用方法：
 * 1. 將此文件中的代碼片段複製到 server-firestore.js 的對應位置
 * 2. 或者運行此腳本自動應用補丁（需要實現）
 */

const crypto = require('crypto');

// ============================================
// 補丁 1: 商品創建時自動生成驗證資訊
// ============================================
// 位置: server-firestore.js, POST /api/admin/lottery-sets
// 在第 3421-3448 行之間添加

const PATCH_1_CREATE_LOTTERY_SET = `
    // 自動生成公平性驗證資訊
    if (!dataToSave.prizeOrder || dataToSave.prizeOrder.length === 0) {
      dataToSave.prizeOrder = buildPrizeOrder(dataToSave.prizes || []);
    }
    
    // 生成籤池種子碼（不公開）
    const poolSeed = crypto.randomBytes(32).toString('hex');
    
    // 計算籤池承諾 Hash（公開）
    const poolData = dataToSave.prizeOrder.join(',') + poolSeed;
    const poolCommitmentHash = crypto.createHash('sha256').update(poolData).digest('hex');
    
    // 保存承諾 Hash，但不保存種子碼（售完後才公開）
    dataToSave.poolCommitmentHash = poolCommitmentHash;
    // 將 poolSeed 保存在一個隱藏字段中，供後續使用
    dataToSave._poolSeed = poolSeed;  // 以 _ 開頭表示私有字段
    
    console.log('[ADMIN][CREATE_LOTTERY_SET] Generated poolCommitmentHash:', poolCommitmentHash.substring(0, 16) + '...');
`;

// ============================================
// 補丁 2: 通知函數
// ============================================
// 位置: server-firestore.js, 文件頂部（在路由定義之前）

async function notifyPoolSeedPublished(setId, setTitle) {
  try {
    console.log(`[NOTIFY] 種子碼已公開：${setTitle} (${setId})`);
    console.log(`[NOTIFY] 📢 商品「${setTitle}」已售完，種子碼已公開！`);
    
    // 創建系統通知
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'POOL_SEED_PUBLISHED',
      title: '籤池種子碼已公開',
      message: `商品「${setTitle}」已售完，種子碼已公開供驗證！`,
      lotterySetId: setId,
      lotterySetTitle: setTitle,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    
    // 保存系統通知
    const { firestore } = require('./db/firestore');
    await firestore.collection('SYSTEM_NOTIFICATIONS').doc(notification.id).set(notification);
    console.log('[NOTIFY] ✅ 系統通知已創建');
    
    // 發送給所有參與過此商品的用戶
    const db = require('./db/firestore');
    const orders = await firestore
      .collection(db.COLLECTIONS.ORDERS)
      .where('lotterySetId', '==', setId)
      .get();
    
    const userIds = new Set();
    orders.docs.forEach(doc => {
      const order = doc.data();
      if (order.userId) {
        userIds.add(order.userId);
      }
    });
    
    console.log(`[NOTIFY] 找到 ${userIds.size} 位參與用戶`);
    
    // 為每位用戶創建個人通知
    for (const userId of userIds) {
      const userNotification = {
        ...notification,
        id: `notif-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId,
      };
      
      await firestore.collection('USER_NOTIFICATIONS').doc(userNotification.id).set(userNotification);
    }
    
    console.log('[NOTIFY] ✅ 用戶通知已發送');
    
  } catch (error) {
    console.error('[NOTIFY] 發送通知失敗:', error);
    // 不影響主流程
  }
}

// ============================================
// 補丁 3: 抽獎完成後檢查並公開種子碼
// ============================================
// 位置: server-firestore.js, POST /api/lottery-sets/:id/draw
// 在返回結果之前（第 1400 行附近）添加

const PATCH_3_AUTO_PUBLISH_SEED = `
    // 檢查商品是否售完，如果是則自動公開種子碼
    const finalDrawnState = await db.getLotteryState(setId);
    const finalDrawnCount = finalDrawnState?.drawnTicketIndices?.length || 0;
    const totalTickets = prizeOrder.length;
    const isSoldOut = finalDrawnCount >= totalTickets;
    
    console.log('[DRAW] Checking if sold out...');
    console.log('[DRAW] Final drawn count:', finalDrawnCount);
    console.log('[DRAW] Total tickets:', totalTickets);
    console.log('[DRAW] Is sold out:', isSoldOut);
    
    if (isSoldOut) {
      console.log('[DRAW] 🎉 商品已售完！自動公開種子碼...');
      
      // 獲取商品數據
      const setDoc = await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).doc(setId).get();
      const setData = setDoc.data();
      
      // 檢查是否已有公開的種子碼
      if (!setData.poolSeed && setData._poolSeed) {
        // 公開種子碼
        await db.firestore.collection(db.COLLECTIONS.LOTTERY_SETS).doc(setId).update({
          poolSeed: setData._poolSeed
        });
        console.log('[DRAW] ✅ 種子碼已自動公開');
        
        // 發送通知
        await notifyPoolSeedPublished(setId, setData.title);
      } else if (setData.poolSeed) {
        console.log('[DRAW] 種子碼已經公開過了');
      } else {
        console.log('[DRAW] ⚠️ 警告：商品沒有預先生成的種子碼');
      }
    }
    
    // 在返回結果時添加 isSoldOut 標記
    return res.json({ 
      success: true, 
      results, 
      drawnPrizes: results,
      user: sess.user,
      updatedUser: sess.user,
      order,
      newOrder: order,
      newBalance: newPoints,
      isSoldOut // 告訴前端商品是否已售完
    });
`;

// ============================================
// 使用說明
// ============================================

console.log(`
===========================================
公平性驗證自動化補丁
===========================================

請手動將以下代碼片段添加到 server-firestore.js：

1. 補丁 1: 在 POST /api/admin/lottery-sets 端點中
   位置: 第 3421-3448 行之間
   在 "if (lotterySet.prizeOrder)" 之後添加

2. 補丁 2: 在文件頂部添加 notifyPoolSeedPublished 函數
   位置: 在路由定義之前

3. 補丁 3: 在 POST /api/lottery-sets/:id/draw 端點中
   位置: 返回結果之前（第 1400 行附近）
   替換原有的 return res.json({...})

===========================================
`);

module.exports = {
  notifyPoolSeedPublished,
  PATCH_1_CREATE_LOTTERY_SET,
  PATCH_3_AUTO_PUBLISH_SEED
};

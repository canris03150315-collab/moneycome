/**
 * 安全功能使用示例
 * 
 * 展示如何在實際端點中使用：
 * 1. 注入防護
 * 2. 數據加密
 */

const express = require('express');
const { 
  sanitizeId,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeSortField,
  SafeQueryBuilder
} = require('../utils/injection-protection');

const { 
  getEncryption,
  maskSensitiveData
} = require('../utils/encryption');

const router = express.Router();

// ============================================
// 示例 1：安全的用戶查詢（防止注入）
// ============================================

router.get('/users/:id', async (req, res) => {
  try {
    // ✅ 清理 ID 參數
    const userId = sanitizeId(req.params.id);
    
    // ✅ 使用安全查詢構建器
    const query = new SafeQueryBuilder(db.firestore.collection('USERS'))
      .where('id', '==', userId)
      .limit(1);
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: '用戶不存在' });
    }
    
    const user = snapshot.docs[0].data();
    
    // ✅ 解密敏感字段
    const encryption = getEncryption();
    const decryptedUser = encryption.decryptObject(user, ['address', 'phone']);
    
    // ✅ 在日誌中掩碼敏感數據
    console.log('[USER] Retrieved user:', {
      id: user.id,
      email: maskSensitiveData(user.email, { type: 'email' }),
      phone: maskSensitiveData(decryptedUser.phone, { type: 'phone' })
    });
    
    res.json(decryptedUser);
  } catch (error) {
    console.error('[USER] Error:', error);
    res.status(500).json({ message: '獲取用戶失敗' });
  }
});

// ============================================
// 示例 2：安全的列表查詢（防止注入 + 分頁）
// ============================================

router.get('/users', async (req, res) => {
  try {
    // ✅ 清理和驗證查詢參數
    const page = sanitizeNumber(req.query.page || 1, { min: 1, max: 1000, integer: true });
    const limit = sanitizeNumber(req.query.limit || 20, { min: 1, max: 100, integer: true });
    
    // ✅ 白名單驗證排序字段
    const ALLOWED_SORT_FIELDS = ['createdAt', 'email', 'points'];
    const sortField = req.query.sortBy 
      ? sanitizeSortField(req.query.sortBy, ALLOWED_SORT_FIELDS)
      : 'createdAt';
    
    const sortDirection = req.query.sortDir || 'desc';
    
    // ✅ 使用安全查詢構建器
    const query = new SafeQueryBuilder(db.firestore.collection('USERS'))
      .orderBy(sortField, sortDirection)
      .limit(limit);
    
    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => doc.data());
    
    // ✅ 批量解密
    const encryption = getEncryption();
    const decryptedUsers = users.map(user => 
      encryption.decryptObject(user, ['address', 'phone'])
    );
    
    res.json({
      users: decryptedUsers,
      page,
      limit,
      total: snapshot.size
    });
  } catch (error) {
    console.error('[USERS] Error:', error);
    res.status(500).json({ message: '獲取用戶列表失敗' });
  }
});

// ============================================
// 示例 3：安全的用戶更新（加密敏感數據）
// ============================================

router.put('/users/:id', async (req, res) => {
  try {
    // ✅ 清理 ID
    const userId = sanitizeId(req.params.id);
    
    // ✅ 清理輸入數據
    const updates = {};
    
    if (req.body.email) {
      updates.email = sanitizeEmail(req.body.email);
    }
    
    if (req.body.points !== undefined) {
      updates.points = sanitizeNumber(req.body.points, { min: 0, max: 1000000, integer: true });
    }
    
    // ✅ 加密敏感字段
    const encryption = getEncryption();
    const sensitiveFields = ['address', 'phone'];
    
    const encryptedUpdates = encryption.encryptObject(
      { ...updates, ...req.body },
      sensitiveFields
    );
    
    // 更新數據庫
    await db.firestore.collection('USERS').doc(userId).update({
      ...encryptedUpdates,
      updatedAt: Date.now()
    });
    
    // ✅ 記錄審計日誌（掩碼敏感數據）
    console.log('[USER] Updated user:', {
      userId,
      updates: {
        email: updates.email ? maskSensitiveData(updates.email, { type: 'email' }) : undefined,
        address: req.body.address ? maskSensitiveData(req.body.address, { type: 'address' }) : undefined
      }
    });
    
    res.json({ message: '用戶更新成功' });
  } catch (error) {
    console.error('[USER] Update error:', error);
    res.status(500).json({ message: '更新用戶失敗' });
  }
});

// ============================================
// 示例 4：安全的訂單創建（加密收件人信息）
// ============================================

router.post('/orders', async (req, res) => {
  try {
    const { 
      userId, 
      items, 
      recipientName, 
      recipientPhone, 
      recipientAddress 
    } = req.body;
    
    // ✅ 驗證必填字段
    if (!userId || !items || !recipientName || !recipientPhone || !recipientAddress) {
      return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // ✅ 清理數據
    const cleanUserId = sanitizeId(userId);
    
    // ✅ 加密敏感字段
    const encryption = getEncryption();
    const orderData = {
      userId: cleanUserId,
      items,
      recipientName,
      recipientPhone,
      recipientAddress,
      status: 'PENDING',
      createdAt: Date.now()
    };
    
    const encryptedOrder = encryption.encryptObject(
      orderData,
      ['recipientName', 'recipientPhone', 'recipientAddress']
    );
    
    // 保存到數據庫
    const orderRef = await db.firestore.collection('ORDERS').add(encryptedOrder);
    
    // ✅ 日誌中掩碼敏感數據
    console.log('[ORDER] Created order:', {
      orderId: orderRef.id,
      userId: cleanUserId,
      recipientName: maskSensitiveData(recipientName, { showFirst: 1, showLast: 0 }),
      recipientPhone: maskSensitiveData(recipientPhone, { type: 'phone' }),
      recipientAddress: maskSensitiveData(recipientAddress, { type: 'address' })
    });
    
    res.json({
      orderId: orderRef.id,
      message: '訂單創建成功'
    });
  } catch (error) {
    console.error('[ORDER] Create error:', error);
    res.status(500).json({ message: '創建訂單失敗' });
  }
});

// ============================================
// 示例 5：安全的搜索（防止注入）
// ============================================

router.get('/search', async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: '缺少搜索關鍵字' });
    }
    
    // ✅ 白名單驗證搜索類型
    const ALLOWED_TYPES = ['users', 'products', 'orders'];
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: '無效的搜索類型' });
    }
    
    // ✅ 清理搜索關鍵字
    const cleanQuery = sanitizeString(query);
    
    // ✅ 使用安全查詢
    const collectionName = type.toUpperCase();
    const safeQuery = new SafeQueryBuilder(db.firestore.collection(collectionName))
      .where('searchable', '>=', cleanQuery.toLowerCase())
      .where('searchable', '<=', cleanQuery.toLowerCase() + '\uf8ff')
      .limit(20);
    
    const snapshot = await safeQuery.get();
    const results = snapshot.docs.map(doc => doc.data());
    
    res.json({ results, count: results.length });
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    res.status(500).json({ message: '搜索失敗' });
  }
});

// ============================================
// 示例 6：數據遷移腳本（加密現有數據）
// ============================================

async function migrateExistingData() {
  console.log('[MIGRATION] Starting data encryption migration...');
  
  const encryption = getEncryption();
  const usersSnapshot = await db.firestore.collection('USERS').get();
  
  let encrypted = 0;
  let skipped = 0;
  
  for (const doc of usersSnapshot.docs) {
    const user = doc.data();
    
    // 檢查是否已加密
    if (user.address_encrypted) {
      skipped++;
      continue;
    }
    
    // 加密敏感字段
    const encryptedUser = encryption.encryptObject(user, ['address', 'phone']);
    
    // 更新數據庫
    await doc.ref.update(encryptedUser);
    encrypted++;
    
    if (encrypted % 100 === 0) {
      console.log(`[MIGRATION] Encrypted ${encrypted} users...`);
    }
  }
  
  console.log(`[MIGRATION] Complete! Encrypted: ${encrypted}, Skipped: ${skipped}`);
}

module.exports = {
  router,
  migrateExistingData
};

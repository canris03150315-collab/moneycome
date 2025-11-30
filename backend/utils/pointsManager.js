/**
 * 點數管理器 - 提供安全的點數操作
 * 包含原子性操作、審計日誌、異常檢測
 */

const db = require('../db/firestore');

// 點數操作類型
const OPERATION_TYPES = {
  DRAW: 'DRAW',                           // 抽獎
  RECHARGE: 'RECHARGE',                   // 充值
  RECYCLE: 'RECYCLE',                     // 回收
  SHOP_ORDER: 'SHOP_ORDER',               // 商城下單
  SHOP_FINALIZE: 'SHOP_FINALIZE',         // 商城補款
  SHIPMENT: 'SHIPMENT',                   // 申請出貨
  ADMIN_ADD: 'ADMIN_ADD',                 // 管理員增加
  ADMIN_DEDUCT: 'ADMIN_DEDUCT',           // 管理員扣除
  REFUND: 'REFUND',                       // 退款
};

// 點數限制配置
const LIMITS = {
  MIN_RECHARGE: 100,                      // 最小充值
  MAX_RECHARGE: 10000,                    // 最大單次充值
  DAILY_RECHARGE_LIMIT: 50000,            // 每日充值限制
  MAX_ADMIN_ADJUST: 100000,               // 管理員單次調整上限
  ANOMALY_THRESHOLD_1H: 10000,            // 1小時異常閾值
  MAX_POINTS: 1000000,                    // 用戶最大點數
};

/**
 * 原子性扣除點數
 * @param {string} userId - 用戶 ID
 * @param {number} amount - 扣除金額
 * @param {object} options - 選項
 * @returns {Promise<object>} 操作結果
 */
async function deductPoints(userId, amount, options = {}) {
  const {
    operation,      // 操作類型
    reason,         // 原因描述
    relatedId,      // 相關 ID（訂單/抽獎等）
    metadata = {},  // 額外元數據
    operatorId,     // 操作者 ID（管理員操作時）
    ipAddress,      // IP 地址
    userAgent,      // User Agent
  } = options;

  // 驗證參數
  if (!userId || !amount || amount <= 0) {
    throw new Error('無效的參數');
  }

  if (!operation || !OPERATION_TYPES[operation]) {
    throw new Error('無效的操作類型');
  }

  const userRef = db.firestore.collection(db.COLLECTIONS.USERS).doc(userId);

  try {
    // 使用 Firestore Transaction 確保原子性
    const result = await db.firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('用戶不存在');
      }

      const userData = userDoc.data();
      const currentPoints = Number(userData.points || 0);

      // 檢查點數是否足夠
      if (currentPoints < amount) {
        throw new Error(`點數不足（當前：${currentPoints}，需要：${amount}）`);
      }

      const newPoints = currentPoints - amount;

      // 更新用戶點數
      transaction.update(userRef, {
        points: newPoints,
        lastActiveAt: new Date().toISOString()
      });

      return {
        userId,
        oldPoints: currentPoints,
        newPoints,
        change: -amount,
        operation,
        reason,
        relatedId,
        metadata,
        operatorId,
        ipAddress,
        userAgent,
      };
    });

    // 創建審計日誌
    await createAuditLog(result);

    // 創建交易記錄
    await db.createTransaction({
      userId,
      type: operation,
      amount: -amount,
      description: reason || `${operation}: 扣除 ${amount} 點`,
      relatedOrderId: relatedId,
    });

    console.log(`[POINTS] ✅ Deducted ${amount} points from user ${userId} (${result.oldPoints} -> ${result.newPoints})`);

    return {
      success: true,
      oldPoints: result.oldPoints,
      newPoints: result.newPoints,
      change: -amount,
    };

  } catch (error) {
    console.error(`[POINTS] ❌ Failed to deduct points:`, error.message);
    throw error;
  }
}

/**
 * 原子性增加點數
 * @param {string} userId - 用戶 ID
 * @param {number} amount - 增加金額
 * @param {object} options - 選項
 * @returns {Promise<object>} 操作結果
 */
async function addPoints(userId, amount, options = {}) {
  const {
    operation,
    reason,
    relatedId,
    metadata = {},
    operatorId,
    ipAddress,
    userAgent,
    skipAnomalyCheck = false, // 是否跳過異常檢測
  } = options;

  // 驗證參數
  if (!userId || !amount || amount <= 0) {
    throw new Error('無效的參數');
  }

  if (!operation || !OPERATION_TYPES[operation]) {
    throw new Error('無效的操作類型');
  }

  // 異常檢測（除非明確跳過）
  if (!skipAnomalyCheck) {
    const anomaly = await detectAnomalies(userId, 'ADD', amount);
    if (anomaly.detected) {
      console.warn(`[POINTS] ⚠️ Anomaly detected for user ${userId}:`, anomaly.reason);
      // 可以選擇拒絕操作或發送警報
      // throw new Error(`操作被拒絕：${anomaly.reason}`);
    }
  }

  const userRef = db.firestore.collection(db.COLLECTIONS.USERS).doc(userId);

  try {
    const result = await db.firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('用戶不存在');
      }

      const userData = userDoc.data();
      const currentPoints = Number(userData.points || 0);
      const newPoints = currentPoints + amount;

      // 檢查是否超過最大點數
      if (newPoints > LIMITS.MAX_POINTS) {
        throw new Error(`點數超過上限（最大：${LIMITS.MAX_POINTS}）`);
      }

      transaction.update(userRef, {
        points: newPoints,
        lastActiveAt: new Date().toISOString()
      });

      return {
        userId,
        oldPoints: currentPoints,
        newPoints,
        change: amount,
        operation,
        reason,
        relatedId,
        metadata,
        operatorId,
        ipAddress,
        userAgent,
      };
    });

    // 創建審計日誌
    await createAuditLog(result);

    // 創建交易記錄
    await db.createTransaction({
      userId,
      type: operation,
      amount: amount,
      description: reason || `${operation}: 增加 ${amount} 點`,
      relatedOrderId: relatedId,
    });

    console.log(`[POINTS] ✅ Added ${amount} points to user ${userId} (${result.oldPoints} -> ${result.newPoints})`);

    return {
      success: true,
      oldPoints: result.oldPoints,
      newPoints: result.newPoints,
      change: amount,
    };

  } catch (error) {
    console.error(`[POINTS] ❌ Failed to add points:`, error.message);
    throw error;
  }
}

/**
 * 創建審計日誌
 * @param {object} data - 日誌數據
 */
async function createAuditLog(data) {
  const log = {
    id: `points-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: data.userId,
    oldPoints: data.oldPoints,
    newPoints: data.newPoints,
    change: data.change,
    operation: data.operation,
    reason: data.reason || '',
    relatedId: data.relatedId || null,
    operatorId: data.operatorId || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null,
    metadata: data.metadata || {},
    timestamp: new Date().toISOString(),
  };

  try {
    await db.firestore.collection('POINTS_AUDIT_LOG').doc(log.id).set(log);
    console.log(`[POINTS] 📝 Audit log created: ${log.id}`);
  } catch (error) {
    console.error(`[POINTS] ❌ Failed to create audit log:`, error.message);
    // 不拋出錯誤，避免影響主流程
  }
}

/**
 * 異常檢測
 * @param {string} userId - 用戶 ID
 * @param {string} type - 操作類型（ADD/DEDUCT）
 * @param {number} amount - 金額
 * @returns {Promise<object>} 檢測結果
 */
async function detectAnomalies(userId, type, amount) {
  try {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    // 查詢 1 小時內的點數變動
    const recentLogs = await db.firestore
      .collection('POINTS_AUDIT_LOG')
      .where('userId', '==', userId)
      .where('timestamp', '>', oneHourAgo)
      .get();

    if (recentLogs.empty) {
      return { detected: false };
    }

    // 計算 1 小時內的總增加量
    const recentTotal = recentLogs.docs.reduce((sum, doc) => {
      const change = doc.data().change;
      return sum + (change > 0 ? change : 0);
    }, 0);

    // 檢查是否超過閾值
    if (type === 'ADD' && recentTotal + amount > LIMITS.ANOMALY_THRESHOLD_1H) {
      return {
        detected: true,
        reason: `1 小時內點數增加異常（總計：${recentTotal + amount} 點）`,
        recentTotal,
        currentAmount: amount,
        threshold: LIMITS.ANOMALY_THRESHOLD_1H,
      };
    }

    return { detected: false };

  } catch (error) {
    console.error(`[POINTS] ❌ Anomaly detection failed:`, error.message);
    return { detected: false };
  }
}

/**
 * 獲取用戶點數（直接從 Firestore 讀取）
 * @param {string} userId - 用戶 ID
 * @returns {Promise<number>} 用戶點數
 */
async function getUserPoints(userId) {
  try {
    const user = await db.getUserById(userId);
    return Number(user?.points || 0);
  } catch (error) {
    console.error(`[POINTS] ❌ Failed to get user points:`, error.message);
    throw error;
  }
}

/**
 * 驗證點數操作限制
 * @param {string} operation - 操作類型
 * @param {number} amount - 金額
 * @returns {object} 驗證結果
 */
function validateLimits(operation, amount) {
  if (operation === OPERATION_TYPES.RECHARGE) {
    if (amount < LIMITS.MIN_RECHARGE) {
      return {
        valid: false,
        message: `充值金額不能少於 ${LIMITS.MIN_RECHARGE} 點`,
      };
    }
    if (amount > LIMITS.MAX_RECHARGE) {
      return {
        valid: false,
        message: `單次充值不能超過 ${LIMITS.MAX_RECHARGE} 點`,
      };
    }
  }

  if (operation === OPERATION_TYPES.ADMIN_ADD || operation === OPERATION_TYPES.ADMIN_DEDUCT) {
    if (amount > LIMITS.MAX_ADMIN_ADJUST) {
      return {
        valid: false,
        message: `管理員單次調整不能超過 ${LIMITS.MAX_ADMIN_ADJUST} 點`,
      };
    }
  }

  return { valid: true };
}

module.exports = {
  deductPoints,
  addPoints,
  getUserPoints,
  validateLimits,
  createAuditLog,
  detectAnomalies,
  OPERATION_TYPES,
  LIMITS,
};

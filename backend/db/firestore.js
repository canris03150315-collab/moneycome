// Firestore Database Layer
// 統一管理所有 Firestore 操作

const { Firestore } = require('@google-cloud/firestore');
const crypto = require('crypto');

const firestore = new Firestore();

// Collection 名稱
const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  SESSIONS: 'sessions',
  PRIZES: 'prizeInstances',
  LOTTERY_SETS: 'lotterySets',
  QUEUES: 'queues',
  LOCKS: 'ticketLocks',
  TRANSACTIONS: 'transactions',
  SHIPMENTS: 'shipments',
  PICKUP_REQUESTS: 'pickupRequests',
  SHOP_PRODUCTS: 'shopProducts',
  SHOP_ORDERS: 'shopOrders',
};

// ============================================
// 用戶管理 (User Management)
// ============================================

/**
 * 創建新用戶
 */
async function createUser(userData) {
  const userId = userData.id || crypto.createHash('sha256').update(userData.email).digest('hex').slice(0, 16);
  const user = {
    id: userId,
    email: userData.email,
    username: userData.username || userData.email.split('@')[0],
    password: userData.password, // 生產環境應該使用 bcrypt 加密
    roles: userData.roles || ['user'],
    points: userData.points || 0,
    lotteryStats: userData.lotteryStats || {},
    status: userData.status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  
  await firestore.collection(COLLECTIONS.USERS).doc(userId).set(user);
  console.log(`[DB] User created: ${userId} (${user.email})`);
  return user;
}

/**
 * 通過 Email 查詢用戶
 */
async function getUserByEmail(email) {
  const snapshot = await firestore
    .collection(COLLECTIONS.USERS)
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

/**
 * 通過 ID 獲取用戶
 */
async function getUserById(userId) {
  const doc = await firestore.collection(COLLECTIONS.USERS).doc(userId).get();
  return doc.exists ? doc.data() : null;
}

/**
 * 更新用戶資料
 */
async function updateUser(userId, updates) {
  const updateData = {
    ...updates,
    lastActiveAt: new Date().toISOString()
  };
  
  await firestore.collection(COLLECTIONS.USERS).doc(userId).update(updateData);
  console.log(`[DB] User updated: ${userId}`, Object.keys(updates));
  
  // 返回更新後的用戶
  return getUserById(userId);
}

/**
 * 更新用戶點數
 */
async function updateUserPoints(userId, points) {
  return updateUser(userId, { points });
}

/**
 * 刪除用戶（軟刪除）
 */
async function deleteUser(userId) {
  return updateUser(userId, { status: 'DELETED' });
}

/**
 * 獲取所有活躍用戶
 */
async function getAllActiveUsers() {
  const snapshot = await firestore
    .collection(COLLECTIONS.USERS)
    .where('status', '==', 'ACTIVE')
    .get();
  
  return snapshot.docs.map(doc => doc.data());
}

// ============================================
// 訂單管理 (Order Management)
// ============================================

/**
 * 創建訂單
 */
async function createOrder(orderData) {
  const orderId = orderData.id || crypto.randomBytes(16).toString('hex');
  const order = {
    id: orderId,
    userId: orderData.userId,
    type: orderData.type, // 'LOTTERY_DRAW', 'SHOP_PURCHASE', etc.
    lotterySetId: orderData.lotterySetId,
    costInPoints: orderData.costInPoints || 0,
    items: orderData.items || [],
    status: orderData.status || 'COMPLETED',
    createdAt: new Date().toISOString(),
    ...orderData,
  };
  
  await firestore.collection(COLLECTIONS.ORDERS).doc(orderId).set(order);
  console.log(`[DB] Order created: ${orderId} for user ${order.userId}`);
  return order;
}

/**
 * 獲取用戶的所有訂單
 */
async function getUserOrders(userId) {
  const snapshot = await firestore
    .collection(COLLECTIONS.ORDERS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data());
}

/**
 * 獲取訂單詳情
 */
async function getOrderById(orderId) {
  const doc = await firestore.collection(COLLECTIONS.ORDERS).doc(orderId).get();
  return doc.exists ? doc.data() : null;
}

/**
 * 更新訂單狀態
 */
async function updateOrderStatus(orderId, status) {
  await firestore.collection(COLLECTIONS.ORDERS).doc(orderId).update({
    status,
    updatedAt: new Date().toISOString()
  });
  console.log(`[DB] Order ${orderId} status updated to ${status}`);
}

/**
 * 獲取所有訂單（分頁）
 */
async function getAllOrders(limit = 100, startAfter = null) {
  let query = firestore
    .collection(COLLECTIONS.ORDERS)
    .orderBy('createdAt', 'desc')
    .limit(limit);
  
  if (startAfter) {
    query = query.startAfter(startAfter);
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data());
}

// ============================================
// Session 管理 (Session Management)
// ============================================

const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 天

/**
 * 創建 Session
 */
async function createSession(sessionData) {
  const sid = crypto.randomBytes(24).toString('hex');
  const session = {
    ...sessionData,
    sid,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY,
  };
  
  await firestore.collection(COLLECTIONS.SESSIONS).doc(sid).set(session);
  console.log(`[DB] Session created: ${sid} for user ${sessionData.user?.id}`);
  return sid;
}

/**
 * 獲取 Session
 */
async function getSession(sid) {
  try {
    const doc = await firestore.collection(COLLECTIONS.SESSIONS).doc(sid).get();
    
    if (!doc.exists) return null;
    
    const session = doc.data();
    
    // 檢查是否過期
    if (session.expiresAt < Date.now()) {
      await deleteSession(sid);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error(`[DB] Error getting session ${sid}:`, error.message);
    // Return null instead of throwing - treat as no session
    return null;
  }
}

/**
 * 更新 Session
 */
async function updateSession(sid, updates) {
  await firestore.collection(COLLECTIONS.SESSIONS).doc(sid).update({
    ...updates,
    updatedAt: Date.now()
  });
  console.log(`[DB] Session updated: ${sid}`);
}

/**
 * 刪除 Session（登出）
 */
async function deleteSession(sid) {
  await firestore.collection(COLLECTIONS.SESSIONS).doc(sid).delete();
  console.log(`[DB] Session deleted: ${sid}`);
}

/**
 * 清理過期 Session
 */
async function cleanupExpiredSessions() {
  const now = Date.now();
  const snapshot = await firestore
    .collection(COLLECTIONS.SESSIONS)
    .where('expiresAt', '<', now)
    .get();
  
  const batch = firestore.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`[DB] Cleaned up ${snapshot.size} expired sessions`);
  return snapshot.size;
}

// ============================================
// 獎品實例管理 (Prize Instance Management)
// ============================================

/**
 * 創建獎品實例
 */
async function createPrizeInstance(prizeData) {
  const instanceId = prizeData.instanceId || crypto.randomBytes(16).toString('hex');
  const prize = {
    instanceId,
    userId: prizeData.userId,
    lotterySetId: prizeData.lotterySetId,
    prizeId: prizeData.prizeId,
    prizeName: prizeData.prizeName,
    prizeGrade: prizeData.prizeGrade,
    prizeImageUrl: prizeData.prizeImageUrl || '',
    orderId: prizeData.orderId,
    status: prizeData.status || 'PENDING_SHIPMENT',
    createdAt: new Date().toISOString(),
    ...prizeData,
  };
  
  await firestore.collection(COLLECTIONS.PRIZES).doc(instanceId).set(prize);
  console.log(`[DB] Prize instance created: ${instanceId} for user ${prize.userId}`);
  return prize;
}

/**
 * 獲取用戶的所有獎品
 */
async function getUserPrizes(userId) {
  const snapshot = await firestore
    .collection(COLLECTIONS.PRIZES)
    .where('userId', '==', userId)
    .get();
  
  return snapshot.docs.map(doc => doc.data());
}

/**
 * 更新獎品狀態
 */
async function updatePrizeStatus(instanceId, status) {
  await firestore.collection(COLLECTIONS.PRIZES).doc(instanceId).update({
    status,
    updatedAt: new Date().toISOString()
  });
  console.log(`[DB] Prize ${instanceId} status updated to ${status}`);
}

// ============================================
// 交易記錄管理 (Transaction Management)
// ============================================

/**
 * 創建交易記錄
 */
async function createTransaction(transactionData) {
  const txId = crypto.randomBytes(16).toString('hex');
  const transaction = {
    id: txId,
    userId: transactionData.userId,
    type: transactionData.type, // 'DRAW', 'RECHARGE', 'REFUND', etc.
    amount: transactionData.amount,
    description: transactionData.description || '',
    relatedOrderId: transactionData.relatedOrderId,
    createdAt: new Date().toISOString(),
    ...transactionData,
  };
  
  await firestore.collection(COLLECTIONS.TRANSACTIONS).doc(txId).set(transaction);
  console.log(`[DB] Transaction created: ${txId} for user ${transaction.userId}`);
  return transaction;
}

/**
 * 獲取用戶的所有交易記錄
 */
async function getUserTransactions(userId) {
  const snapshot = await firestore
    .collection(COLLECTIONS.TRANSACTIONS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data());
}

// ============================================
// 抽獎狀態管理 (Lottery State Management)
// ============================================

/**
 * 獲取抽獎狀態
 */
async function getLotteryState(setId) {
  const ref = firestore.collection(COLLECTIONS.LOTTERY_SETS).doc(setId);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() || {}) : {};
  const drawn = Array.isArray(data.drawnTicketIndices) 
    ? data.drawnTicketIndices.map(n => Number(n)) 
    : [];
  return { drawnTicketIndices: drawn };
}

/**
 * 標記籤號已抽出
 */
async function markTicketsDrawn(setId, ticketIndices) {
  const ref = firestore.collection(COLLECTIONS.LOTTERY_SETS).doc(setId);
  const snap = await ref.get();
  
  let existing = [];
  if (snap.exists) {
    const data = snap.data();
    existing = Array.isArray(data.drawnTicketIndices) 
      ? data.drawnTicketIndices.map(Number) 
      : [];
  }
  
  const updated = Array.from(new Set([...existing, ...ticketIndices.map(Number)]));
  await ref.set({ drawnTicketIndices: updated }, { merge: true });
  
  console.log(`[DB] Tickets marked as drawn for ${setId}:`, ticketIndices);
  return updated;
}

// ============================================
// 隊列管理 (Queue Management) - 已有的邏輯
// ============================================

/**
 * 獲取隊列
 */
async function getQueue(setId) {
  const ref = firestore.collection(COLLECTIONS.QUEUES).doc(setId);
  const snap = await ref.get();
  if (!snap.exists) return [];
  const data = snap.data();
  return Array.isArray(data.queue) ? data.queue : [];
}

/**
 * 保存隊列
 */
async function saveQueue(setId, queue) {
  const ref = firestore.collection(COLLECTIONS.QUEUES).doc(setId);
  await ref.set({ queue, updatedAt: Date.now() }, { merge: true });
}

// ============================================
// 工具函數
// ============================================

/**
 * 批量寫入
 */
async function batchWrite(operations) {
  const batch = firestore.batch();
  
  operations.forEach(op => {
    const ref = firestore.collection(op.collection).doc(op.id);
    if (op.type === 'set') {
      batch.set(ref, op.data);
    } else if (op.type === 'update') {
      batch.update(ref, op.data);
    } else if (op.type === 'delete') {
      batch.delete(ref);
    }
  });
  
  await batch.commit();
  console.log(`[DB] Batch write completed: ${operations.length} operations`);
}

// ============================================
// 導出所有函數
// ============================================

module.exports = {
  firestore,
  COLLECTIONS,
  
  // 用戶管理
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  updateUserPoints,
  deleteUser,
  getAllActiveUsers,
  
  // 訂單管理
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
  
  // Session 管理
  createSession,
  getSession,
  updateSession,
  deleteSession,
  cleanupExpiredSessions,
  
  // 獎品管理
  createPrizeInstance,
  getUserPrizes,
  updatePrizeStatus,
  
  // 交易記錄
  createTransaction,
  getUserTransactions,
  
  // 抽獎狀態
  getLotteryState,
  markTicketsDrawn,
  
  // 隊列管理
  getQueue,
  saveQueue,
  
  // 工具
  batchWrite,
};

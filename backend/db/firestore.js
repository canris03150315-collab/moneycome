// Firestore Database Layer
// 統一管理所有 Firestore 操作

const { Firestore } = require('@google-cloud/firestore');
const crypto = require('crypto');

const projectId = process.env.FIRESTORE_PROJECT_ID || 'goodmoney666-jackpot';
console.log(`[DB] Initializing Firestore with projectId: ${projectId}`);

const firestore = new Firestore({
  projectId: projectId,
  databaseId: '(default)', // 使用默認數據庫
});

console.log('[DB] Firestore initialized successfully');

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
  PASSWORD_RESETS: 'passwordResets',
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
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } catch (error) {
    console.error(`[DB] Error getting user by email ${email}:`, error.message);
    // Return null instead of throwing - treat as user not found
    return null;
  }
}

async function getAllShipments() {
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.SHIPMENTS)
      .orderBy('requestedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getAllShipments error: ${error.message}`);
    return [];
  }
}

async function updateShipmentStatus(shipmentId, status, trackingNumber, carrier) {
  const ref = firestore.collection(COLLECTIONS.SHIPMENTS).doc(shipmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('找不到出貨單');
  }
  const prev = snap.data() || {};
  const updated = {
    ...prev,
    status: status || prev.status,
    trackingNumber: trackingNumber !== undefined ? trackingNumber : prev.trackingNumber,
    carrier: carrier !== undefined ? carrier : prev.carrier,
  };
  
  // 只有在狀態為 SHIPPED 時才設定 shippedAt，避免寫入 undefined
  if (status === 'SHIPPED') {
    updated.shippedAt = new Date().toISOString();
  }
  
  await ref.set(updated, { merge: true });
  console.log(`[DB] Shipment ${shipmentId} status updated to ${updated.status}`);
  return updated;
}

async function getAllPickupRequests() {
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.PICKUP_REQUESTS)
      .orderBy('requestedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getAllPickupRequests error: ${error.message}`);
    return [];
  }
}

async function updatePickupRequestStatus(requestId, status) {
  const ref = firestore.collection(COLLECTIONS.PICKUP_REQUESTS).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('找不到自取申請');
  }
  const prev = snap.data() || {};
  const updated = {
    ...prev,
    status: status || prev.status,
  };
  await ref.set(updated, { merge: true });
  console.log(`[DB] Pickup request ${requestId} status updated to ${updated.status}`);
  return updated;
}

// ============================================
// 商城訂單管理 (Shop Order Management)
// ============================================

/**
 * 取得所有商城訂單
 */
async function getAllShopOrders() {
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.SHOP_ORDERS)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getAllShopOrders error: ${error.message}`);
    return [];
  }
}

/**
 * 取得用戶的商城訂單
 */
async function getUserShopOrders(userId) {
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.SHOP_ORDERS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getUserShopOrders error: ${error.message}`);
    return [];
  }
}

/**
 * 更新商城訂單狀態
 */
async function updateShopOrderStatus(orderId, status, trackingNumber, carrier) {
  const ref = firestore.collection(COLLECTIONS.SHOP_ORDERS).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('找不到商城訂單');
  }
  const prev = snap.data() || {};
  const updated = {
    ...prev,
    status: status || prev.status,
    updatedAt: new Date().toISOString(),
  };
  
  // 只在有值時更新 trackingNumber 和 carrier，避免 undefined
  if (trackingNumber !== undefined) {
    updated.trackingNumber = trackingNumber;
  }
  if (carrier !== undefined) {
    updated.carrier = carrier;
  }
  
  await ref.set(updated, { merge: true });
  console.log(`[DB] Shop order ${orderId} status updated to ${updated.status}`);
  return updated;
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
 * 獲取所有用戶（管理員功能）
 * 默認只返回未刪除的用戶
 */
async function getAllUsers(includeDeleted = false) {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.USERS).get();
    const users = snapshot.docs.map(doc => doc.data());
    
    // 過濾掉已刪除的用戶（除非明確要求包含）
    if (!includeDeleted) {
      return users.filter(u => u.status !== 'DELETED');
    }
    
    return users;
  } catch (error) {
    console.error('[DB] getAllUsers error:', error);
    return [];
  }
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
 *
 * 優先使用 (userId ==, createdAt desc) 的複合索引；
 * 若索引尚未建立則降級為僅 userId 的查詢，避免前端拿到空陣列。
 */
async function getUserOrders(userId) {
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.ORDERS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getUserOrders primary query failed (likely missing index): ${error.message}`);
    // Fallback: 只用 userId 篩選，不排序
    try {
      const snapshot = await firestore
        .collection(COLLECTIONS.ORDERS)
        .where('userId', '==', userId)
        .get();
      return snapshot.docs.map(doc => doc.data());
    } catch (e2) {
      console.log(`[DB] getUserOrders fallback query also failed: ${e2.message}`);
      return [];
    }
  }
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

/**
 * 獲取最近的抽獎訂單（用於顯示中獎名單）
 */
async function getRecentOrders(limit = 50) {
  try {
    console.log('[DB] Fetching recent orders, limit:', limit);
    
    // 嘗試查詢 type == 'LOTTERY_DRAW'
    // 注意：這需要複合索引 (type ASC, createdAt DESC)，如果沒有可能會報錯
    // 為了安全起見，如果報錯則降級為只按時間查詢
    const snapshot = await firestore
      .collection(COLLECTIONS.ORDERS)
      .where('type', '==', 'LOTTERY_DRAW')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    console.log(`[DB] Found ${snapshot.docs.length} recent LOTTERY_DRAW orders`);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn(`[DB] getRecentOrders filtered query failed (likely missing index): ${error.message}`);
    console.log('[DB] Falling back to unfiltered query...');
    
    // Fallback: query all recent orders and filter in memory (okay for MVP with low volume)
    try {
      const snapshot = await firestore
        .collection(COLLECTIONS.ORDERS)
        .orderBy('createdAt', 'desc')
        .limit(limit * 2) // fetch more to account for filtering
        .get();
      
      const filtered = snapshot.docs
        .map(doc => doc.data())
        .filter(o => o.type === 'LOTTERY_DRAW')
        .slice(0, limit);
        
      console.log(`[DB] Fallback query found ${filtered.length} LOTTERY_DRAW orders`);
      return filtered;
    } catch (fallbackError) {
      console.error('[DB] Fallback query also failed:', fallbackError.message);
      return [];
    }
  }
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
    status: prizeData.status || 'IN_INVENTORY',
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
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.PRIZES)
      .where('userId', '==', userId)
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getUserPrizes error (index not ready): ${error.message}`);
    return [];
  }
}

/**
 * 取得所有獎品（後台管理用）
 */
async function getAllPrizes() {
  try {
    const snapshot = await firestore
      .collection(COLLECTIONS.PRIZES)
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.log(`[DB] getAllPrizes error: ${error.message}`);
    return [];
  }
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
  const timestamp = new Date().toISOString();
  const transaction = {
    id: txId,
    userId: transactionData.userId,
    type: transactionData.type, // 'DRAW', 'RECHARGE', 'REFUND', etc.
    amount: transactionData.amount,
    description: transactionData.description || '',
    date: timestamp, // 添加 date 字段供前端使用
    createdAt: timestamp, // 保留 createdAt 以保持向後兼容
    // 只在 relatedOrderId 存在時才添加，避免 undefined 導致 Firestore 錯誤
    ...(transactionData.relatedOrderId && { relatedOrderId: transactionData.relatedOrderId }),
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
  try {
    console.log(`[DB] getUserTransactions: querying for userId=${userId}`);
    const snapshot = await firestore
      .collection(COLLECTIONS.TRANSACTIONS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const results = snapshot.docs.map(doc => doc.data());
    console.log(`[DB] getUserTransactions: found ${results.length} transactions (with orderBy)`);
    return results;
  } catch (error) {
    console.log(`[DB] getUserTransactions error (likely index not ready): ${error.message}`);
    console.log(`[DB] getUserTransactions: trying fallback query without orderBy`);
    try {
      // Fallback: 沒有排序，但至少能撈到資料
      const snapshot = await firestore
        .collection(COLLECTIONS.TRANSACTIONS)
        .where('userId', '==', userId)
        .get();
      
      const results = snapshot.docs.map(doc => doc.data());
      // 手動在記憶體中排序
      results.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // desc
      });
      console.log(`[DB] getUserTransactions: found ${results.length} transactions (fallback, no orderBy)`);
      return results;
    } catch (fallbackError) {
      console.error(`[DB] getUserTransactions fallback also failed:`, fallbackError);
      return [];
    }
  }
}

// ============================================
// 物流與自取管理 (Shipments & Pickups)
// ============================================

async function createShipment(data) {
  const id = crypto.randomBytes(16).toString('hex');
  const shipment = {
    id,
    userId: data.userId,
    username: data.username,
    status: data.status || 'PENDING',
    prizeInstanceIds: data.prizeInstanceIds || [],
    shippingAddress: data.shippingAddress,
    shippingCostInPoints: data.shippingCostInPoints || 0,
    totalWeightInGrams: data.totalWeightInGrams || 0,
    carrier: data.carrier || null,
    trackingNumber: data.trackingNumber || null,
    requestedAt: new Date().toISOString(),
    ...data,
  };

  await firestore.collection(COLLECTIONS.SHIPMENTS).doc(id).set(shipment);
  console.log(`[DB] Shipment created: ${id} for user ${shipment.userId}`);
  return shipment;
}

async function getUserShipments(userId) {
  try {
    console.log(`[DB] getUserShipments: querying for userId=${userId}`);
    const snapshot = await firestore
      .collection(COLLECTIONS.SHIPMENTS)
      .where('userId', '==', userId)
      .orderBy('requestedAt', 'desc')
      .get();
    const results = snapshot.docs.map(doc => doc.data());
    console.log(`[DB] getUserShipments: found ${results.length} shipments (with orderBy)`);
    return results;
  } catch (error) {
    console.log(`[DB] getUserShipments error (likely index not ready): ${error.message}`);
    console.log(`[DB] getUserShipments: trying fallback query without orderBy`);
    try {
      // Fallback: 沒有排序，但至少能撈到資料
      const snapshot = await firestore
        .collection(COLLECTIONS.SHIPMENTS)
        .where('userId', '==', userId)
        .get();
      
      const results = snapshot.docs.map(doc => doc.data());
      // 手動在記憶體中排序
      results.sort((a, b) => {
        const dateA = new Date(a.requestedAt || 0).getTime();
        const dateB = new Date(b.requestedAt || 0).getTime();
        return dateB - dateA; // desc
      });
      console.log(`[DB] getUserShipments: found ${results.length} shipments (fallback, no orderBy)`);
      return results;
    } catch (fallbackError) {
      console.error(`[DB] getUserShipments fallback also failed:`, fallbackError);
      return [];
    }
  }
}

async function createPickupRequest(data) {
  const id = crypto.randomBytes(16).toString('hex');
  const request = {
    id,
    userId: data.userId,
    username: data.username,
    status: data.status || 'PENDING',
    prizeInstanceIds: data.prizeInstanceIds || [],
    requestedAt: new Date().toISOString(),
    ...data,
  };

  await firestore.collection(COLLECTIONS.PICKUP_REQUESTS).doc(id).set(request);
  console.log(`[DB] Pickup request created: ${id} for user ${request.userId}`);
  return request;
}

async function getUserPickupRequests(userId) {
  try {
    console.log(`[DB] getUserPickupRequests: querying for userId=${userId}`);
    const snapshot = await firestore
      .collection(COLLECTIONS.PICKUP_REQUESTS)
      .where('userId', '==', userId)
      .orderBy('requestedAt', 'desc')
      .get();
    const results = snapshot.docs.map(doc => doc.data());
    console.log(`[DB] getUserPickupRequests: found ${results.length} requests (with orderBy)`);
    return results;
  } catch (error) {
    console.log(`[DB] getUserPickupRequests error (likely index not ready): ${error.message}`);
    console.log(`[DB] getUserPickupRequests: trying fallback query without orderBy`);
    try {
      // Fallback: 沒有排序，但至少能撈到資料
      const snapshot = await firestore
        .collection(COLLECTIONS.PICKUP_REQUESTS)
        .where('userId', '==', userId)
        .get();
      
      const results = snapshot.docs.map(doc => doc.data());
      // 手動在記憶體中排序
      results.sort((a, b) => {
        const dateA = new Date(a.requestedAt || 0).getTime();
        const dateB = new Date(b.requestedAt || 0).getTime();
        return dateB - dateA; // desc
      });
      console.log(`[DB] getUserPickupRequests: found ${results.length} requests (fallback, no orderBy)`);
      return results;
    } catch (fallbackError) {
      console.error(`[DB] getUserPickupRequests fallback also failed:`, fallbackError);
      return [];
    }
  }
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
// 密碼重置管理 (Password Reset Management)
// ============================================

/**
 * 創建密碼重置記錄
 */
async function createPasswordReset(resetData) {
  const resetId = crypto.randomBytes(16).toString('hex');
  const reset = {
    id: resetId,
    userId: resetData.userId,
    email: resetData.email,
    code: resetData.code,
    expiresAt: resetData.expiresAt,
    used: false,
    createdAt: Date.now(),
  };
  
  await firestore.collection(COLLECTIONS.PASSWORD_RESETS).doc(resetId).set(reset);
  console.log('[DB] Password reset created:', resetId);
  return reset;
}

/**
 * 獲取密碼重置記錄
 */
async function getPasswordReset(email, code) {
  const snapshot = await firestore
    .collection(COLLECTIONS.PASSWORD_RESETS)
    .where('email', '==', email)
    .where('code', '==', code)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  return snapshot.docs[0].data();
}

/**
 * 標記密碼重置記錄為已使用
 */
async function markPasswordResetUsed(resetId) {
  await firestore.collection(COLLECTIONS.PASSWORD_RESETS).doc(resetId).update({
    used: true,
    usedAt: Date.now(),
  });
  console.log('[DB] Password reset marked as used:', resetId);
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
  getAllUsers,
  deleteUser,
  getAllActiveUsers,
  
  // 訂單管理
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
  getRecentOrders,
  
  // Session 管理
  createSession,
  getSession,
  updateSession,
  deleteSession,
  cleanupExpiredSessions,
  
  // 獎品管理
  createPrizeInstance,
  getUserPrizes,
  getAllPrizes,
  updatePrizeStatus,
  
  // 交易記錄
  createTransaction,
  getUserTransactions,
  
  // 抽獎狀態
  getLotteryState,
  markTicketsDrawn,
  
  // 物流與自取
  createShipment,
  getUserShipments,
  getAllShipments,
  updateShipmentStatus,
  createPickupRequest,
  getUserPickupRequests,
  getAllPickupRequests,
  updatePickupRequestStatus,

  // 商城訂單管理
  getAllShopOrders,
  getUserShopOrders,
  updateShopOrderStatus,

  // 隊列管理
  getQueue,
  saveQueue,
  
  // 密碼重置
  createPasswordReset,
  getPasswordReset,
  markPasswordResetUsed,
  
  // 工具
  batchWrite,
  
  // 暴露 Firestore 實例供直接使用
  firestore,
};

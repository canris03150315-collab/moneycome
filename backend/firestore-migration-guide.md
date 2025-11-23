# Firestore 遷移指南

## 為什麼需要遷移？

### 當前架構問題
```javascript
// ❌ 記憶體存儲 - 不適合生產環境
const sessions = new Map();
const db = {
  users: new Map(),
  orders: [],
  prizeInstances: new Map(),
};
```

**致命問題：**
1. 🔴 Backend 重啟 → 所有數據消失
2. 🔴 無法水平擴展（auto-scaling）
3. 🔴 多實例時數據不同步
4. 🔴 記憶體限制

---

## 遷移方案

### 階段 1：用戶數據遷移（優先級：最高）

#### 當前代碼
```javascript
// 記憶體存儲
const db = { users: new Map() };

// 註冊
const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
db.users.set(userId, user);

// 登入
const existing = db.users.get(userId);
```

#### 遷移後代碼
```javascript
// Firestore 存儲
const USERS_COLL = 'users';

// 註冊
async function createUser(email, password, username) {
  const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
  const user = {
    id: userId,
    email,
    username,
    password, // 生產環境應該加密
    roles: ['user'],
    points: 0,
    lotteryStats: {},
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
  
  await firestore.collection(USERS_COLL).doc(userId).set(user);
  return user;
}

// 登入查詢
async function getUserByEmail(email) {
  const snapshot = await firestore
    .collection(USERS_COLL)
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

// 更新點數
async function updateUserPoints(userId, points) {
  await firestore.collection(USERS_COLL).doc(userId).update({ 
    points,
    lastActiveAt: new Date().toISOString() 
  });
}
```

### 階段 2：訂單數據遷移

#### 當前代碼
```javascript
const db = { orders: [] };
db.orders.push(order);
```

#### 遷移後代碼
```javascript
const ORDERS_COLL = 'orders';

async function createOrder(order) {
  const orderId = crypto.randomBytes(16).toString('hex');
  const orderData = {
    ...order,
    id: orderId,
    createdAt: new Date().toISOString(),
  };
  
  await firestore.collection(ORDERS_COLL).doc(orderId).set(orderData);
  return orderData;
}

async function getUserOrders(userId) {
  const snapshot = await firestore
    .collection(ORDERS_COLL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data());
}
```

### 階段 3：Session 管理遷移

#### 選項 A：Firestore Session（簡單）
```javascript
const SESSIONS_COLL = 'sessions';

async function createSession(userId, sessionData) {
  const sid = crypto.randomBytes(24).toString('hex');
  await firestore.collection(SESSIONS_COLL).doc(sid).set({
    ...sessionData,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 天
  });
  return sid;
}

async function getSession(sid) {
  const doc = await firestore.collection(SESSIONS_COLL).doc(sid).get();
  if (!doc.exists) return null;
  
  const session = doc.data();
  if (session.expiresAt < Date.now()) {
    await firestore.collection(SESSIONS_COLL).doc(sid).delete();
    return null;
  }
  return session;
}
```

#### 選項 B：Redis Session（推薦，高性能）
```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

async function createSession(userId, sessionData) {
  const sid = crypto.randomBytes(24).toString('hex');
  await client.set(
    `session:${sid}`, 
    JSON.stringify(sessionData),
    { EX: 7 * 24 * 60 * 60 } // 7 天自動過期
  );
  return sid;
}

async function getSession(sid) {
  const data = await client.get(`session:${sid}`);
  return data ? JSON.parse(data) : null;
}
```

---

## 完整遷移示例

### 修改後的 server.js 結構

```javascript
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

// Collections
const USERS_COLL = 'users';
const ORDERS_COLL = 'orders';
const SESSIONS_COLL = 'sessions';
const PRIZES_COLL = 'prizeInstances';
const LOTTERY_COLL = 'lotterySets';
const QUEUE_COLL = 'queues';

// ===== 用戶管理 =====
async function fsGetUser(userId) {
  const doc = await firestore.collection(USERS_COLL).doc(userId).get();
  return doc.exists ? doc.data() : null;
}

async function fsCreateUser(userData) {
  await firestore.collection(USERS_COLL).doc(userData.id).set(userData);
  return userData;
}

async function fsUpdateUser(userId, updates) {
  await firestore.collection(USERS_COLL).doc(userId).update({
    ...updates,
    lastActiveAt: new Date().toISOString()
  });
}

async function fsGetUserByEmail(email) {
  const snapshot = await firestore.collection(USERS_COLL)
    .where('email', '==', email)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].data();
}

// ===== 訂單管理 =====
async function fsCreateOrder(orderData) {
  const orderId = crypto.randomBytes(16).toString('hex');
  const order = {
    ...orderData,
    id: orderId,
    createdAt: new Date().toISOString()
  };
  await firestore.collection(ORDERS_COLL).doc(orderId).set(order);
  return order;
}

async function fsGetUserOrders(userId) {
  const snapshot = await firestore.collection(ORDERS_COLL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map(doc => doc.data());
}

// ===== Session 管理 =====
async function fsCreateSession(sessionData) {
  const sid = crypto.randomBytes(24).toString('hex');
  await firestore.collection(SESSIONS_COLL).doc(sid).set({
    ...sessionData,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  });
  return sid;
}

async function fsGetSession(sid) {
  const doc = await firestore.collection(SESSIONS_COLL).doc(sid).get();
  if (!doc.exists) return null;
  
  const session = doc.data();
  if (session.expiresAt < Date.now()) {
    await doc.ref.delete();
    return null;
  }
  return session;
}

async function fsUpdateSession(sid, updates) {
  await firestore.collection(SESSIONS_COLL).doc(sid).update(updates);
}

async function fsDeleteSession(sid) {
  await firestore.collection(SESSIONS_COLL).doc(sid).delete();
}

// ===== 獎品實例管理 =====
async function fsCreatePrizeInstance(prizeData) {
  const instanceId = crypto.randomBytes(16).toString('hex');
  const prize = {
    ...prizeData,
    instanceId,
    createdAt: new Date().toISOString()
  };
  await firestore.collection(PRIZES_COLL).doc(instanceId).set(prize);
  return prize;
}

async function fsGetUserPrizes(userId) {
  const snapshot = await firestore.collection(PRIZES_COLL)
    .where('userId', '==', userId)
    .get();
  return snapshot.docs.map(doc => doc.data());
}
```

### 修改後的登入端點

```javascript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 從 Firestore 查詢用戶
  let user = await fsGetUserByEmail(email);
  
  // 如果不存在，檢查硬編碼測試帳號
  if (!user) {
    const ALLOWED = [
      { email: '123123@aaa', password: '123123', username: '測試達人' },
    ];
    const found = ALLOWED.find(u => u.email === email && u.password === password);
    if (!found) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // 創建新用戶到 Firestore
    const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
    const initialPoints = (email === '123123@aaa') ? 2000 : 0;
    user = await fsCreateUser({
      id: userId,
      email,
      username: found.username,
      roles: ['user', 'ADMIN'],
      points: initialPoints,
      lotteryStats: {},
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  } else {
    // 驗證密碼
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // 更新最後活動時間
    await fsUpdateUser(user.id, { lastActiveAt: new Date().toISOString() });
  }
  
  // 獲取用戶的訂單和獎品
  const orders = await fsGetUserOrders(user.id);
  const prizes = await fsGetUserPrizes(user.id);
  const inventory = Object.fromEntries(prizes.map(p => [p.instanceId, p]));
  
  // 創建 Session
  const sessionData = {
    user,
    inventory,
    orders,
    shipments: [],
    pickupRequests: [],
    transactions: [],
    shopOrders: []
  };
  const sid = await fsCreateSession(sessionData);
  
  setSessionCookie(res, sid);
  return res.json(sessionData);
});
```

### 修改後的抽獎端點

```javascript
app.post(`${base}/lottery-sets/:id/draw`, async (req, res) => {
  const sid = getSessionCookie(req);
  if (!sid) return res.status(401).json({ message: 'Unauthorized' });
  
  // 從 Firestore 獲取 Session
  const sess = await fsGetSession(sid);
  if (!sess?.user) return res.status(401).json({ message: 'Unauthorized' });
  
  const setId = req.params.id;
  const { tickets } = req.body;
  
  // ... 抽獎邏輯 ...
  
  // 扣除點數
  const newPoints = sess.user.points - totalCost;
  await fsUpdateUser(sess.user.id, { points: newPoints });
  sess.user.points = newPoints;
  
  // 創建訂單
  const order = await fsCreateOrder({
    userId: sess.user.id,
    type: 'LOTTERY_DRAW',
    lotterySetId: setId,
    costInPoints: totalCost,
    items: results,
  });
  
  // 創建獎品實例
  for (const result of results) {
    await fsCreatePrizeInstance({
      userId: sess.user.id,
      lotterySetId: setId,
      prizeId: result.prizeId,
      // ...
    });
  }
  
  // 更新 Session
  sess.orders.push(order);
  await fsUpdateSession(sid, sess);
  
  return res.json({ success: true, results, user: sess.user });
});
```

---

## 遷移步驟

### 1. 準備階段
- [ ] 備份當前代碼
- [ ] 在 Firestore 創建所需 Collections
- [ ] 設置適當的 Security Rules

### 2. 開發階段
- [ ] 創建 Firestore 輔助函數
- [ ] 逐一遷移端點（先測試，再上線）
- [ ] 保留記憶體作為 fallback（雙寫模式）

### 3. 測試階段
- [ ] 單元測試所有 Firestore 函數
- [ ] 端對端測試關鍵流程
- [ ] 負載測試

### 4. 上線階段
- [ ] 灰度發布（部分流量）
- [ ] 監控錯誤率和性能
- [ ] 完全切換到 Firestore
- [ ] 移除記憶體代碼

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用戶只能讀取自己的數據
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 訂單只能讀取自己的
    match /orders/{orderId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // 獎品實例
    match /prizeInstances/{instanceId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
    }
    
    // Session（後端專用）
    match /sessions/{sessionId} {
      allow read, write: if false; // 只允許後端通過 Admin SDK
    }
    
    // 抽獎狀態（所有人可讀）
    match /lotterySets/{setId} {
      allow read: if true;
      allow write: if false; // 只允許後端
    }
  }
}
```

---

## 成本估算

### Firestore 定價（2024）
- 讀取：$0.06 / 100,000 次
- 寫入：$0.18 / 100,000 次
- 刪除：$0.02 / 100,000 次
- 存儲：$0.18 / GB / 月

### 示例場景
假設每天 1,000 個活躍用戶：
- 登入：1,000 次讀取
- 抽獎：1,000 次寫入 + 1,000 次讀取
- 查詢訂單：1,000 次讀取

**每日成本：**
- 讀取：3,000 次 → $0.0018
- 寫入：1,000 次 → $0.0018
- **總計：約 $0.004 / 天 = $1.2 / 月**

非常便宜！✅

---

## 總結

### 必須遷移的理由
1. ✅ 數據安全（不會丟失）
2. ✅ 可擴展性（支持 auto-scaling）
3. ✅ 生產就緒（符合最佳實踐）
4. ✅ 成本低廉（小規模幾乎免費）
5. ✅ 易於維護（GCP 自動管理）

### 建議
**立即開始遷移！** 從用戶數據和訂單開始，逐步完成。

# 點數系統安全性分析報告

## 🔍 當前點數操作清單

### 1. 點數增加操作
| 操作 | 端點 | 權限 | 風險等級 |
|------|------|------|---------|
| **充值** | `POST /recharge` | 用戶 | 🔴 高 |
| **回收獎品** | `POST /recycle` | 用戶 | 🟡 中 |
| **管理員調整** | `PUT /admin/users/:id/points` | 管理員 | 🔴 高 |

### 2. 點數扣除操作
| 操作 | 端點 | 權限 | 風險等級 |
|------|------|------|---------|
| **抽獎** | `POST /lottery-sets/:id/draw` | 用戶 | 🟡 中 |
| **商城下單** | `POST /shop/orders` | 用戶 | 🔴 高 |
| **商城補款** | `POST /shop/orders/:id/finalize` | 用戶 | 🔴 高 |
| **申請出貨** | `POST /shipments` | 用戶 | 🟡 中 |

---

## ⚠️ 發現的安全問題

### 🔴 嚴重問題

#### 1. **充值功能缺乏驗證**
```javascript
// 當前代碼 (server-firestore.js:1350-1380)
app.post(`${base}/recharge`, async (req, res) => {
  const { amount } = req.body || {};
  // ❌ 沒有驗證支付憑證
  // ❌ 沒有檢查金額合理性
  // ❌ 直接增加點數
  const newPoints = currentPoints + amount;
  await db.updateUserPoints(sess.user.id, newPoints);
});
```

**風險**：
- 用戶可以任意充值點數
- 沒有支付驗證
- 可能被濫用

**影響**：💰 直接金錢損失

---

#### 2. **點數計算缺乏原子性**
```javascript
// 問題：讀取和更新之間有時間差
const currentPoints = sess.user.points;  // 讀取
const newPoints = currentPoints - cost;   // 計算
await db.updateUserPoints(id, newPoints); // 更新
```

**風險**：
- 競態條件（Race Condition）
- 用戶可能同時發起多個請求
- 點數可能被重複扣除或重複增加

**場景**：
```
時間 T1: 用戶 A 點數 1000，發起抽獎請求 1（扣 100）
時間 T2: 用戶 A 點數 1000，發起抽獎請求 2（扣 100）
結果: 兩個請求都看到 1000 點，最終可能只扣一次
```

---

#### 3. **管理員調整點數缺乏限制**
```javascript
// server-firestore.js:3120-3140
app.put(`${base}/admin/users/:id/points`, async (req, res) => {
  const { points } = req.body;
  // ❌ 沒有最大值限制
  // ❌ 沒有審批流程
  await db.updateUser(id, { points });
});
```

**風險**：
- 管理員帳號被盜用
- 內部人員濫用
- 無法追蹤異常調整

---

### 🟡 中等問題

#### 4. **點數檢查不一致**
```javascript
// 有些地方檢查了
if (sess.user.points < cost) {
  return res.status(400).json({ message: '點數不足' });
}

// 有些地方沒檢查或檢查不完整
const newPoints = sess.user.points - cost; // 可能變負數
```

---

#### 5. **交易記錄可能遺漏**
```javascript
// 某些操作有創建交易記錄
await db.createTransaction({ ... });

// 某些操作可能沒有
// 如果中途失敗，點數已扣但記錄未創建
```

---

#### 6. **Session 和 Firestore 不同步**
```javascript
// 更新 Firestore
await db.updateUserPoints(id, newPoints);

// 但 session 可能沒更新
// 或更新失敗
sess.user.points = newPoints; // 可能失敗
```

---

## 🛡️ 安全性增強方案

### 方案 1：點數操作原子性（必須）

#### 使用 Firestore Transaction
```javascript
async function deductPoints(userId, amount, reason) {
  const userRef = db.firestore.collection('users').doc(userId);
  
  return db.firestore.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists) {
      throw new Error('用戶不存在');
    }
    
    const currentPoints = userDoc.data().points || 0;
    
    if (currentPoints < amount) {
      throw new Error('點數不足');
    }
    
    const newPoints = currentPoints - amount;
    
    // 原子性更新
    transaction.update(userRef, {
      points: newPoints,
      lastActiveAt: new Date().toISOString()
    });
    
    return { oldPoints: currentPoints, newPoints, amount };
  });
}
```

---

### 方案 2：充值驗證（必須）

```javascript
app.post(`${base}/recharge`, async (req, res) => {
  const { amount, paymentProof, paymentMethod } = req.body;
  
  // 1. 驗證金額合理性
  if (amount < 100 || amount > 100000) {
    return res.status(400).json({ message: '充值金額不合理' });
  }
  
  // 2. 驗證支付憑證
  if (!paymentProof || !paymentMethod) {
    return res.status(400).json({ message: '缺少支付憑證' });
  }
  
  // 3. 創建待審核的充值記錄
  const rechargeRequest = {
    id: `recharge-${Date.now()}`,
    userId: sess.user.id,
    amount,
    paymentProof,
    paymentMethod,
    status: 'PENDING', // 待審核
    createdAt: new Date().toISOString()
  };
  
  await db.firestore.collection('RECHARGE_REQUESTS').doc(rechargeRequest.id).set(rechargeRequest);
  
  // 4. 通知管理員審核
  // TODO: 發送通知
  
  return res.json({
    success: true,
    message: '充值申請已提交，等待審核',
    requestId: rechargeRequest.id
  });
});

// 管理員審核端點
app.post(`${base}/admin/recharge/:id/approve`, async (req, res) => {
  // 管理員審核通過後才真正增加點數
  // ...
});
```

---

### 方案 3：點數變動審計日誌（必須）

```javascript
async function logPointsChange(data) {
  const log = {
    id: `points-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: data.userId,
    oldPoints: data.oldPoints,
    newPoints: data.newPoints,
    change: data.newPoints - data.oldPoints,
    reason: data.reason,
    operation: data.operation, // 'DRAW', 'RECHARGE', 'RECYCLE', etc.
    relatedId: data.relatedId, // 相關訂單/抽獎 ID
    operatorId: data.operatorId, // 操作者 ID（管理員調整時）
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: new Date().toISOString(),
    metadata: data.metadata || {}
  };
  
  await db.firestore.collection('POINTS_AUDIT_LOG').doc(log.id).set(log);
  
  return log;
}
```

---

### 方案 4：點數操作限制（推薦）

```javascript
// 每日充值限制
const DAILY_RECHARGE_LIMIT = 50000; // 每日最多充值 50000 點

// 單次充值限制
const MIN_RECHARGE = 100;
const MAX_RECHARGE = 10000;

// 管理員調整限制
const MAX_ADMIN_ADJUST = 100000; // 單次最多調整 100000 點
const REQUIRE_APPROVAL_THRESHOLD = 10000; // 超過此值需要二次審批
```

---

### 方案 5：異常檢測（推薦）

```javascript
async function detectAnomalies(userId, operation, amount) {
  // 檢查短時間內的異常操作
  const recentLogs = await db.firestore
    .collection('POINTS_AUDIT_LOG')
    .where('userId', '==', userId)
    .where('timestamp', '>', new Date(Date.now() - 3600000).toISOString()) // 1小時內
    .get();
  
  const recentTotal = recentLogs.docs.reduce((sum, doc) => {
    const change = doc.data().change;
    return sum + (change > 0 ? change : 0);
  }, 0);
  
  // 1小時內增加超過 10000 點
  if (operation === 'ADD' && recentTotal + amount > 10000) {
    // 發送警報
    await sendAlert({
      type: 'POINTS_ANOMALY',
      userId,
      message: `用戶 ${userId} 在 1 小時內增加了 ${recentTotal + amount} 點`,
      severity: 'HIGH'
    });
    
    return { anomaly: true, reason: '短時間內點數增加異常' };
  }
  
  return { anomaly: false };
}
```

---

## 📋 實施優先級

### 🔴 必須立即實施
1. **點數操作原子性** - 防止競態條件
2. **充值驗證機制** - 防止任意充值
3. **審計日誌** - 追蹤所有點數變動

### 🟡 建議盡快實施
4. **點數操作限制** - 防止異常大額操作
5. **異常檢測** - 及時發現可疑行為

### 🟢 可以後續實施
6. **二次驗證** - 大額操作需要二次確認
7. **自動對帳** - 定期檢查點數總和
8. **備份機制** - 定期備份點數數據

---

## 🧪 測試場景

### 測試 1：競態條件
```javascript
// 同時發起 10 個抽獎請求
const promises = Array(10).fill(null).map(() => 
  fetch('/api/lottery-sets/xxx/draw', { method: 'POST' })
);
await Promise.all(promises);

// 檢查：點數是否正確扣除 10 次
```

### 測試 2：負數點數
```javascript
// 用戶只有 100 點
// 嘗試購買 1000 點的商品
// 檢查：是否被拒絕，點數是否變負
```

### 測試 3：充值驗證
```javascript
// 嘗試不提供支付憑證充值
// 檢查：是否被拒絕
```

---

## 📊 監控指標

### 需要監控的指標
1. **異常點數增加** - 單次增加 > 10000
2. **負數點數** - 任何用戶點數 < 0
3. **充值失敗率** - 充值請求失敗比例
4. **點數總和** - 系統總點數變化趨勢
5. **大額操作** - 單次操作 > 5000 點

---

## 🚨 緊急響應計劃

### 發現異常時
1. **立即凍結相關帳號**
2. **查看審計日誌**
3. **評估影響範圍**
4. **回滾異常操作**
5. **修復漏洞**
6. **通知受影響用戶**

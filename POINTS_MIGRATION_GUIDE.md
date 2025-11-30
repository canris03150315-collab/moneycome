# 點數系統遷移指南

## 📋 概述

新的點數管理器 (`pointsManager.js`) 提供：
- ✅ **原子性操作** - 防止競態條件
- ✅ **審計日誌** - 記錄所有點數變動
- ✅ **異常檢測** - 自動檢測可疑操作
- ✅ **操作限制** - 防止異常大額操作

---

## 🔄 遷移步驟

### 步驟 1：引入點數管理器

```javascript
const pointsManager = require('./utils/pointsManager');
```

### 步驟 2：替換現有的點數操作

#### 原始代碼（不安全）
```javascript
// ❌ 舊代碼 - 有競態條件風險
const newPoints = sess.user.points - cost;
await db.updateUserPoints(sess.user.id, newPoints);
sess.user.points = newPoints;
```

#### 新代碼（安全）
```javascript
// ✅ 新代碼 - 原子性操作
const result = await pointsManager.deductPoints(sess.user.id, cost, {
  operation: pointsManager.OPERATION_TYPES.DRAW,
  reason: `抽獎：${lotterySet.title}`,
  relatedId: drawId,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

sess.user.points = result.newPoints;
```

---

## 📝 具體遷移示例

### 示例 1：抽獎扣點

#### 原始代碼 (server-firestore.js:1074-1076)
```javascript
const newPoints = current - totalCost;
await db.updateUserPoints(sess.user.id, newPoints);
sess.user.points = newPoints;
```

#### 遷移後
```javascript
const pointsManager = require('./utils/pointsManager');

try {
  const result = await pointsManager.deductPoints(sess.user.id, totalCost, {
    operation: pointsManager.OPERATION_TYPES.DRAW,
    reason: `抽獎：${setId}，抽取 ${count} 次`,
    relatedId: `draw-${Date.now()}`,
    metadata: {
      lotterySetId: setId,
      drawCount: count,
      prizeIds: wonPrizes.map(p => p.id),
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  sess.user.points = result.newPoints;
  
  console.log(`[DRAW] Points deducted: ${result.oldPoints} -> ${result.newPoints}`);
  
} catch (error) {
  console.error('[DRAW] Failed to deduct points:', error.message);
  return res.status(400).json({ message: error.message });
}
```

---

### 示例 2：充值（需要驗證）

#### 原始代碼 (server-firestore.js:1373-1378)
```javascript
// ❌ 危險：沒有驗證就直接增加點數
const newPoints = currentPoints + amount;
await db.updateUserPoints(sess.user.id, newPoints);
sess.user.points = newPoints;
```

#### 遷移後（兩階段充值）
```javascript
// 階段 1：用戶提交充值申請
app.post(`${base}/recharge/request`, async (req, res) => {
  const sess = await getSession(req);
  if (!sess?.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { amount, paymentProof, paymentMethod } = req.body || {};
  
  // 驗證金額
  const validation = pointsManager.validateLimits(
    pointsManager.OPERATION_TYPES.RECHARGE,
    amount
  );
  
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }
  
  // 驗證支付憑證
  if (!paymentProof || !paymentMethod) {
    return res.status(400).json({ message: '請提供支付憑證' });
  }
  
  // 創建充值申請
  const requestId = `recharge-${Date.now()}`;
  const rechargeRequest = {
    id: requestId,
    userId: sess.user.id,
    username: sess.user.username,
    amount,
    paymentProof,
    paymentMethod,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    ipAddress: req.ip,
  };
  
  await db.firestore.collection('RECHARGE_REQUESTS').doc(requestId).set(rechargeRequest);
  
  console.log(`[RECHARGE] Request created: ${requestId} for user ${sess.user.id}, amount: ${amount}`);
  
  return res.json({
    success: true,
    message: '充值申請已提交，請等待審核',
    requestId,
  });
});

// 階段 2：管理員審核通過
app.post(`${base}/admin/recharge/:id/approve`, async (req, res) => {
  const sess = await getSession(req);
  if (!sess?.user || sess.user.role !== 'ADMIN') {
    return res.status(403).json({ message: '需要管理員權限' });
  }
  
  const { id } = req.params;
  const { notes } = req.body || {};
  
  // 獲取充值申請
  const requestDoc = await db.firestore.collection('RECHARGE_REQUESTS').doc(id).get();
  
  if (!requestDoc.exists) {
    return res.status(404).json({ message: '找不到充值申請' });
  }
  
  const request = requestDoc.data();
  
  if (request.status !== 'PENDING') {
    return res.status(400).json({ message: '此申請已處理' });
  }
  
  try {
    // 使用點數管理器增加點數
    const result = await pointsManager.addPoints(request.userId, request.amount, {
      operation: pointsManager.OPERATION_TYPES.RECHARGE,
      reason: `充值審核通過：${request.paymentMethod}`,
      relatedId: id,
      operatorId: sess.user.id,
      metadata: {
        paymentProof: request.paymentProof,
        paymentMethod: request.paymentMethod,
        approvedBy: sess.user.username,
        notes: notes || '',
      },
      skipAnomalyCheck: true, // 管理員審核通過的充值跳過異常檢測
    });
    
    // 更新申請狀態
    await db.firestore.collection('RECHARGE_REQUESTS').doc(id).update({
      status: 'APPROVED',
      approvedBy: sess.user.id,
      approvedAt: new Date().toISOString(),
      notes: notes || '',
    });
    
    console.log(`[RECHARGE] Approved: ${id}, user: ${request.userId}, amount: ${request.amount}`);
    
    return res.json({
      success: true,
      message: '充值已審核通過',
      newPoints: result.newPoints,
    });
    
  } catch (error) {
    console.error('[RECHARGE] Approval failed:', error.message);
    return res.status(500).json({ message: error.message });
  }
});
```

---

### 示例 3：商城下單

#### 原始代碼 (server-firestore.js:2112-2114)
```javascript
const newPoints = sess.user.points - paidPoints;
const updatedUser = await db.updateUserPoints(sess.user.id, newPoints);
sess.user = updatedUser;
```

#### 遷移後
```javascript
try {
  const result = await pointsManager.deductPoints(sess.user.id, paidPoints, {
    operation: pointsManager.OPERATION_TYPES.SHOP_ORDER,
    reason: `購買商品：${product.title}`,
    relatedId: orderId,
    metadata: {
      productId: productId,
      productTitle: product.title,
      orderType: mode,
      totalPoints: totalPoints,
      paidPoints: paidPoints,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  sess.user.points = result.newPoints;
  
} catch (error) {
  console.error('[SHOP_ORDER] Failed to deduct points:', error.message);
  return res.status(400).json({ message: error.message });
}
```

---

### 示例 4：回收獎品

#### 原始代碼 (server-firestore.js:1795-1800)
```javascript
const newPoints = currentPoints + totalRecycle;
const updatedUser = await db.updateUserPoints(sess.user.id, newPoints);
sess.user = updatedUser;
```

#### 遷移後
```javascript
try {
  const result = await pointsManager.addPoints(sess.user.id, totalRecycle, {
    operation: pointsManager.OPERATION_TYPES.RECYCLE,
    reason: `回收 ${prizeInstanceIds.length} 個獎品`,
    relatedId: null,
    metadata: {
      prizeInstanceIds,
      recycleValues: validPrizes.map(p => ({ id: p.id, value: p.recycleValue })),
      totalRecycle,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  sess.user.points = result.newPoints;
  
} catch (error) {
  console.error('[RECYCLE] Failed to add points:', error.message);
  return res.status(500).json({ message: error.message });
}
```

---

## 🔍 查詢審計日誌

### 查詢用戶的所有點數變動
```javascript
const logs = await db.firestore
  .collection('POINTS_AUDIT_LOG')
  .where('userId', '==', userId)
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();

const history = logs.docs.map(doc => doc.data());
```

### 查詢異常操作
```javascript
const anomalies = await db.firestore
  .collection('POINTS_AUDIT_LOG')
  .where('change', '>', 10000) // 單次變動超過 10000
  .orderBy('change', 'desc')
  .limit(50)
  .get();
```

### 查詢特定時間範圍
```javascript
const startDate = new Date('2025-11-01').toISOString();
const endDate = new Date('2025-12-01').toISOString();

const logs = await db.firestore
  .collection('POINTS_AUDIT_LOG')
  .where('timestamp', '>=', startDate)
  .where('timestamp', '<=', endDate)
  .orderBy('timestamp', 'desc')
  .get();
```

---

## ⚠️ 注意事項

### 1. 錯誤處理
```javascript
try {
  const result = await pointsManager.deductPoints(...);
  // 成功處理
} catch (error) {
  // 點數操作失敗，需要回滾其他操作
  console.error('Points operation failed:', error.message);
  // 返回錯誤給用戶
  return res.status(400).json({ message: error.message });
}
```

### 2. Session 更新
```javascript
// 點數操作成功後，記得更新 session
sess.user.points = result.newPoints;

// 並保存 session
const sid = getSessionCookie(req);
if (sid) {
  await db.updateSession(sid, sess);
}
```

### 3. 事務順序
```javascript
// ✅ 正確順序
// 1. 先扣點數（會自動創建交易記錄）
const result = await pointsManager.deductPoints(...);

// 2. 再創建訂單/執行其他操作
await createOrder(...);

// ❌ 錯誤順序
// 1. 先創建訂單
await createOrder(...);

// 2. 再扣點數（如果失敗，訂單已創建）
const result = await pointsManager.deductPoints(...);
```

---

## 📊 監控建議

### 創建監控儀表板
```javascript
// 獲取統計數據
async function getPointsStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  const logs = await db.firestore
    .collection('POINTS_AUDIT_LOG')
    .where('timestamp', '>=', today)
    .get();
  
  const stats = {
    totalOperations: logs.size,
    totalAdded: 0,
    totalDeducted: 0,
    operations: {},
  };
  
  logs.docs.forEach(doc => {
    const data = doc.data();
    if (data.change > 0) {
      stats.totalAdded += data.change;
    } else {
      stats.totalDeducted += Math.abs(data.change);
    }
    
    stats.operations[data.operation] = (stats.operations[data.operation] || 0) + 1;
  });
  
  return stats;
}
```

---

## 🚀 部署檢查清單

- [ ] 已引入 `pointsManager.js`
- [ ] 已遷移所有點數扣除操作
- [ ] 已遷移所有點數增加操作
- [ ] 已實施充值驗證機制
- [ ] 已測試競態條件
- [ ] 已測試異常檢測
- [ ] 已設置監控警報
- [ ] 已備份現有數據

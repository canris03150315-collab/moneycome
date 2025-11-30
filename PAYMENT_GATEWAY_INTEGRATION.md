# 金流串接充值系統

## 🎯 **架構設計**

### **流程圖**
```
用戶選擇充值金額
    ↓
創建充值訂單
    ↓
生成金流付款連結
    ↓
跳轉到金流頁面
    ↓
用戶完成付款
    ↓
金流回調通知
    ↓
驗證簽名
    ↓
使用點數管理器增加點數（原子性）
    ↓
創建審計日誌
    ↓
更新訂單狀態
    ↓
通知前端（WebSocket/輪詢）
```

---

## 🔧 **實施步驟**

### **步驟 1：移除人工審核端點**

**移除以下端點**：
- `POST /api/user/recharge/request` - 充值申請
- `GET /api/user/recharge/requests` - 查詢申請
- `GET /api/admin/recharge/requests` - 管理員查看申請
- `POST /api/admin/recharge/:id/approve` - 審核通過
- `POST /api/admin/recharge/:id/reject` - 拒絕申請

**保留**：
- `POST /api/user/recharge` - 修改為創建金流訂單

---

### **步驟 2：修改充值端點**

```javascript
// 創建充值訂單（金流版本）
app.post(`${base}/user/recharge`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { amount, paymentMethod } = req.body;
    
    // 驗證金額
    const validation = pointsManager.validateLimits(
      pointsManager.OPERATION_TYPES.RECHARGE,
      amount
    );
    
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }
    
    // 創建充值訂單
    const orderId = `recharge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const rechargeOrder = {
      id: orderId,
      userId: sess.user.id,
      username: sess.user.username || sess.user.email,
      amount,
      paymentMethod: paymentMethod || 'CREDIT_CARD',
      status: 'PENDING_PAYMENT',
      createdAt: new Date().toISOString(),
      ipAddress: req.ip,
    };
    
    await db.firestore.collection('RECHARGE_ORDERS').doc(orderId).set(rechargeOrder);
    
    // 生成金流付款連結
    const paymentUrl = await generatePaymentUrl({
      orderId,
      amount,
      userId: sess.user.id,
      returnUrl: `${process.env.FRONTEND_URL}/recharge/result`,
      notifyUrl: `${process.env.BACKEND_URL}/api/payment/callback`,
    });
    
    console.log(`[RECHARGE] Order created: ${orderId}, amount: ${amount}`);
    
    return res.json({
      success: true,
      orderId,
      paymentUrl,
      amount,
    });
    
  } catch (error) {
    console.error('[RECHARGE] Error:', error);
    return res.status(500).json({ message: '創建充值訂單失敗' });
  }
});
```

---

### **步驟 3：實施金流回調**

```javascript
// 金流回調端點
app.post(`${base}/payment/callback`, async (req, res) => {
  try {
    console.log('[PAYMENT] Callback received:', req.body);
    
    // 1. 驗證金流簽名（防止偽造）
    const isValid = verifyPaymentSignature(req.body);
    if (!isValid) {
      console.error('[PAYMENT] Invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }
    
    const { 
      orderId,           // 訂單 ID
      status,            // 付款狀態
      amount,            // 金額
      transactionId,     // 金流交易 ID
      paymentMethod,     // 付款方式
    } = req.body;
    
    // 2. 獲取充值訂單
    const orderDoc = await db.firestore.collection('RECHARGE_ORDERS').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.error('[PAYMENT] Order not found:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orderDoc.data();
    
    // 3. 防止重複處理
    if (order.status === 'COMPLETED') {
      console.log('[PAYMENT] Order already processed:', orderId);
      return res.json({ success: true, message: 'Already processed' });
    }
    
    // 4. 驗證金額
    if (order.amount !== amount) {
      console.error('[PAYMENT] Amount mismatch:', { expected: order.amount, received: amount });
      return res.status(400).json({ message: 'Amount mismatch' });
    }
    
    // 5. 處理付款結果
    if (status === 'SUCCESS' || status === 'PAID') {
      try {
        // 使用點數管理器增加點數（原子性、安全）
        const result = await pointsManager.addPoints(order.userId, order.amount, {
          operation: pointsManager.OPERATION_TYPES.RECHARGE,
          reason: `金流充值成功：${paymentMethod}`,
          relatedId: orderId,
          metadata: {
            paymentMethod,
            transactionId,
            paymentGateway: 'YOUR_GATEWAY_NAME',
          },
          skipAnomalyCheck: true, // 金流驗證通過的充值跳過異常檢測
        });
        
        // 更新訂單狀態
        await db.firestore.collection('RECHARGE_ORDERS').doc(orderId).update({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          transactionId,
          finalAmount: amount,
        });
        
        console.log(`[PAYMENT] ✅ Recharge completed: ${orderId}, user: ${order.userId}, amount: ${order.amount}`);
        
        // 可選：發送通知給用戶
        // await sendNotification(order.userId, `充值成功！已增加 ${order.amount} 點`);
        
        return res.json({ success: true, message: 'Payment processed' });
        
      } catch (error) {
        console.error('[PAYMENT] Points operation failed:', error);
        
        // 更新訂單狀態為失敗
        await db.firestore.collection('RECHARGE_ORDERS').doc(orderId).update({
          status: 'FAILED',
          failedReason: error.message,
          failedAt: new Date().toISOString(),
        });
        
        return res.status(500).json({ message: 'Points operation failed' });
      }
      
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      // 更新訂單狀態為失敗/取消
      await db.firestore.collection('RECHARGE_ORDERS').doc(orderId).update({
        status: status === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
        failedAt: new Date().toISOString(),
        failedReason: req.body.failureReason || 'Payment failed',
      });
      
      console.log(`[PAYMENT] ❌ Payment ${status.toLowerCase()}: ${orderId}`);
      
      return res.json({ success: true, message: 'Status updated' });
    }
    
    return res.json({ success: false, message: 'Unknown status' });
    
  } catch (error) {
    console.error('[PAYMENT] Callback error:', error);
    return res.status(500).json({ message: 'Callback processing failed' });
  }
});

// 用戶查詢充值訂單狀態
app.get(`${base}/user/recharge/orders/:id`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    const orderDoc = await db.firestore.collection('RECHARGE_ORDERS').doc(id).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ message: '找不到訂單' });
    }
    
    const order = orderDoc.data();
    
    // 驗證訂單所有權
    if (order.userId !== sess.user.id) {
      return res.status(403).json({ message: '無權查看此訂單' });
    }
    
    return res.json(order);
    
  } catch (error) {
    console.error('[RECHARGE] Get order error:', error);
    return res.status(500).json({ message: '查詢訂單失敗' });
  }
});
```

---

### **步驟 4：金流簽名驗證**

```javascript
// utils/paymentGateway.js

const crypto = require('crypto');

/**
 * 生成金流付款連結
 */
async function generatePaymentUrl(options) {
  const {
    orderId,
    amount,
    userId,
    returnUrl,
    notifyUrl,
  } = options;
  
  // 根據你使用的金流商調整
  // 以下是範例（綠界 ECPay）
  
  const params = {
    MerchantID: process.env.PAYMENT_MERCHANT_ID,
    MerchantTradeNo: orderId,
    MerchantTradeDate: new Date().toISOString().replace(/[-:]/g, '').slice(0, 14),
    PaymentType: 'aio',
    TotalAmount: amount,
    TradeDesc: '點數充值',
    ItemName: `充值 ${amount} 點`,
    ReturnURL: notifyUrl,
    ClientBackURL: returnUrl,
    CustomField1: userId,
  };
  
  // 生成檢查碼
  const checkMacValue = generateCheckMacValue(params);
  params.CheckMacValue = checkMacValue;
  
  // 生成付款 URL
  const paymentUrl = `${process.env.PAYMENT_GATEWAY_URL}?${new URLSearchParams(params).toString()}`;
  
  return paymentUrl;
}

/**
 * 驗證金流回調簽名
 */
function verifyPaymentSignature(data) {
  const receivedCheckMac = data.CheckMacValue;
  delete data.CheckMacValue;
  
  const calculatedCheckMac = generateCheckMacValue(data);
  
  return receivedCheckMac === calculatedCheckMac;
}

/**
 * 生成檢查碼
 */
function generateCheckMacValue(params) {
  // 根據金流商規則調整
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const hashKey = process.env.PAYMENT_HASH_KEY;
  const hashIV = process.env.PAYMENT_HASH_IV;
  
  const str = `HashKey=${hashKey}&${sortedParams}&HashIV=${hashIV}`;
  const encoded = encodeURIComponent(str).toLowerCase();
  
  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

module.exports = {
  generatePaymentUrl,
  verifyPaymentSignature,
};
```

---

## 🔒 **安全性考量**

### **1. 簽名驗證（必須）**
- ✅ 驗證金流回調的簽名
- ✅ 防止偽造回調
- ✅ 使用 HTTPS

### **2. 防止重複處理（必須）**
- ✅ 檢查訂單狀態
- ✅ 使用原子性操作
- ✅ 記錄交易 ID

### **3. 金額驗證（必須）**
- ✅ 驗證回調金額與訂單金額一致
- ✅ 驗證訂單所有權

### **4. 審計日誌（必須）**
- ✅ 記錄所有充值操作
- ✅ 包含金流交易 ID
- ✅ 可追溯

---

## 📊 **資料結構**

### **充值訂單 (RECHARGE_ORDERS)**
```javascript
{
  id: "recharge-xxx",
  userId: "user-id",
  username: "user@example.com",
  amount: 1000,
  paymentMethod: "CREDIT_CARD",
  status: "COMPLETED", // PENDING_PAYMENT, COMPLETED, FAILED, CANCELLED
  transactionId: "gateway-transaction-id",
  createdAt: "2025-11-30T08:00:00.000Z",
  completedAt: "2025-11-30T08:05:00.000Z",
  ipAddress: "xxx.xxx.xxx.xxx"
}
```

---

## 🎯 **總結**

### **保留的功能**
- ✅ 點數管理器（原子性操作）
- ✅ 審計日誌
- ✅ 異常檢測（可調整閾值）
- ✅ 操作限制

### **移除的功能**
- ❌ 人工審核流程
- ❌ 支付憑證上傳
- ❌ 管理員審核端點

### **新增的功能**
- ✅ 金流訂單創建
- ✅ 金流回調處理
- ✅ 簽名驗證
- ✅ 自動增加點數

---

**串接金流後，充值會變成完全自動化，但安全性機制仍然保留！** 🔒💰

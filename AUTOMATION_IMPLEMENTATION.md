# 公平性驗證自動化實現方案

## 📋 **三大自動化功能**

### **1. 商品創建時自動生成驗證資訊** ✅

**位置**: `backend/server-firestore.js` - `POST /api/admin/lottery-sets`

**實現**:
```javascript
// 在商品創建時（第 3421-3448 行附近）
// 添加以下代碼：

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
```

**效果**:
- ✅ 每個新商品都會自動生成 `poolCommitmentHash`
- ✅ `poolSeed` 保存在 `_poolSeed` 字段中（不對外公開）
- ✅ 用戶可以在商品頁面看到承諾 Hash

---

### **2. 商品售完時自動公開種子碼** ✅

**位置**: `backend/server-firestore.js` - `POST /api/lottery-sets/:id/draw`

**實現**:
```javascript
// 在抽獎成功後（第 1400 行附近，返回結果之前）
// 添加以下代碼：

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
    
    // 發送通知（見下方）
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
  // ... 其他字段
  isSoldOut // 告訴前端商品是否已售完
});
```

**效果**:
- ✅ 最後一張籤抽完後自動公開種子碼
- ✅ 無需手動運行腳本
- ✅ 即時生效

---

### **3. 種子碼公開時通知用戶** ✅

**實現方案 A: 簡單通知（推薦）**

創建通知函數：
```javascript
// 在 server-firestore.js 頂部添加

async function notifyPoolSeedPublished(setId, setTitle) {
  try {
    console.log(`[NOTIFY] 種子碼已公開：${setTitle} (${setId})`);
    
    // 方案 1: 記錄到系統日誌
    console.log(`[NOTIFY] 📢 商品「${setTitle}」已售完，種子碼已公開！`);
    console.log(`[NOTIFY] 用戶可前往商品頁面或公平性驗證頁面查看`);
    
    // 方案 2: 創建系統通知（保存到 Firestore）
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
    
    // 保存通知到 Firestore（所有用戶可見）
    await db.firestore.collection('SYSTEM_NOTIFICATIONS').doc(notification.id).set(notification);
    console.log('[NOTIFY] ✅ 系統通知已創建');
    
    // 方案 3: 發送給所有參與過此商品的用戶
    const orders = await db.firestore
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
      
      await db.firestore.collection('USER_NOTIFICATIONS').doc(userNotification.id).set(userNotification);
    }
    
    console.log('[NOTIFY] ✅ 用戶通知已發送');
    
  } catch (error) {
    console.error('[NOTIFY] 發送通知失敗:', error);
    // 不影響主流程
  }
}
```

**實現方案 B: 前端輪詢（簡單）**

前端定期檢查商品是否有新的 `poolSeed`：
```typescript
// 在 LotteryPage.tsx 中
useEffect(() => {
  const checkPoolSeed = async () => {
    const response = await apiCall(`/lottery-sets/${lotteryId}`);
    if (response.poolSeed && !hasNotifiedPoolSeed) {
      toast.show({
        type: 'success',
        message: `🎉 商品已售完！種子碼已公開，可前往驗證頁面進行驗證！`,
        duration: 10000
      });
      setHasNotifiedPoolSeed(true);
    }
  };
  
  // 每 30 秒檢查一次
  const interval = setInterval(checkPoolSeed, 30000);
  return () => clearInterval(interval);
}, [lotteryId]);
```

**實現方案 C: WebSocket 即時通知（進階）**

需要額外的 WebSocket 服務器，暫不實現。

---

## 🚀 **實現步驟**

### **Step 1: 修改商品創建端點**
```bash
# 編輯 backend/server-firestore.js
# 在 POST /api/admin/lottery-sets 端點中添加驗證資訊生成代碼
```

### **Step 2: 修改抽獎端點**
```bash
# 編輯 backend/server-firestore.js
# 在 POST /api/lottery-sets/:id/draw 端點中添加售完檢查和種子碼公開代碼
```

### **Step 3: 添加通知函數**
```bash
# 在 backend/server-firestore.js 頂部添加 notifyPoolSeedPublished 函數
```

### **Step 4: 測試**
```bash
# 1. 創建新商品 -> 檢查是否有 poolCommitmentHash
# 2. 抽完所有籤 -> 檢查是否自動公開 poolSeed
# 3. 檢查通知是否發送
```

### **Step 5: 部署**
```bash
cd backend
gcloud builds submit --config=cloudbuild.yaml .
```

---

## 📝 **測試清單**

### **測試 1: 商品創建**
- [ ] 創建新商品
- [ ] 檢查 Firestore 中是否有 `poolCommitmentHash`
- [ ] 檢查 Firestore 中是否有 `_poolSeed`（隱藏）
- [ ] 檢查前端商品頁面是否顯示承諾 Hash

### **測試 2: 自動公開種子碼**
- [ ] 抽完所有籤（包括最後賞）
- [ ] 檢查 Firestore 中是否有 `poolSeed`（公開）
- [ ] 檢查前端商品頁面是否顯示種子碼
- [ ] 檢查控制台是否有公開日誌

### **測試 3: 通知**
- [ ] 檢查系統通知是否創建
- [ ] 檢查用戶通知是否發送
- [ ] 檢查前端是否收到通知

---

## ⚠️ **注意事項**

### **關於 _poolSeed 字段**
- 以 `_` 開頭表示私有字段
- 不應該在 API 響應中返回
- 只在售完時才複製到 `poolSeed` 字段

### **關於通知**
- 通知不應該阻塞主流程
- 如果通知失敗，不影響抽獎
- 使用 try-catch 包裹通知代碼

### **關於性能**
- 檢查售完狀態的開銷很小
- 只在抽獎成功後才檢查
- 不影響抽獎性能

---

## 🎯 **預期效果**

### **用戶體驗**
1. **創建商品** - 管理員創建商品時無需手動生成驗證資訊
2. **抽獎過程** - 用戶正常抽獎，無感知
3. **售完瞬間** - 最後一張籤抽完後，種子碼自動公開
4. **收到通知** - 參與用戶收到通知
5. **前往驗證** - 用戶可以立即驗證公平性

### **管理員體驗**
1. **無需手動操作** - 所有流程自動化
2. **透明可追蹤** - 所有操作都有日誌
3. **安全可靠** - 種子碼在售完前不會洩露

---

## 📊 **實現狀態**

| 功能 | 狀態 | 備註 |
|------|------|------|
| **商品創建時生成驗證資訊** | ⏳ 待實現 | 代碼已準備好 |
| **售完時自動公開種子碼** | ⏳ 待實現 | 代碼已準備好 |
| **發送通知** | ⏳ 待實現 | 多種方案可選 |
| **前端顯示** | ✅ 已完成 | 已在商品頁面顯示 |
| **測試** | ⏳ 待測試 | 需要部署後測試 |

---

**所有代碼已準備好，只需要應用到 server-firestore.js 並部署即可！** 🚀

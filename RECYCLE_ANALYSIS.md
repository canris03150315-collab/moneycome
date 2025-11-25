# 🔍 回收點數流程分析報告

**分析時間：** 2025-11-25  
**狀態：** ✅ 流程正常，但發現潛在問題

---

## 📋 完整流程檢查

### 1️⃣ 前端流程（ProfilePage.tsx）

#### 單個回收
```typescript
const handleConfirmRecycle = async () => {
  if (!recyclingCandidate) return;
  
  setIsRecycling(true);
  try {
    const points = recyclingCandidate.recycleValue || RECYCLE_VALUE;
    await recyclePrize(recyclingCandidate.instanceId);
    toast.success(`成功回收獎品，獲得 ${points.toLocaleString()} P！`);
    setRecyclingCandidate(null);
  } catch (error: any) {
    toast.error('回收失敗：' + error.message);
  } finally {
    setIsRecycling(false);
  }
};
```

**✅ 正常：**
- 使用 `recyclingCandidate.recycleValue` 或預設 `RECYCLE_VALUE`
- 有載入狀態
- 有成功/失敗提示

---

#### 批次回收
```typescript
const handleConfirmBatchRecycle = async () => {
  if (selectedPrizeIds.size === 0) return;
  
  setIsRecycling(true);
  try {
    const count = selectedPrizeIds.size;
    const points = totalRecycleValue;
    await batchRecyclePrizes(Array.from(selectedPrizeIds));
    toast.success(`成功回收 ${count} 件獎品，獲得 ${points.toLocaleString()} P！`);
    setIsBatchConfirmOpen(false);
    setSelectionMode('none');
    setSelectedPrizeIds(new Set());
  } catch (error: any) {
    toast.error('回收失敗：' + error.message);
  } finally {
    setIsRecycling(false);
  }
};
```

**✅ 正常：**
- 計算總回收價值
- 批次回收所有選中的獎品
- 清空選擇狀態

---

#### 回收價值計算
```typescript
const { selectedRecyclePrizes, totalRecycleValue } = useMemo(() => {
  const prizes: PrizeInstance[] = Array.from(selectedPrizeIds)
    .map((id: string) => inventory.find(p => p.instanceId === id))
    .filter((p): p is PrizeInstance => !!p);
  const totalValue: number = prizes.reduce(
    (sum: number, prize: PrizeInstance) => 
      sum + (prize.recycleValue || RECYCLE_VALUE), 
    0
  );
  return {
    selectedRecyclePrizes: prizes,
    totalRecycleValue: totalValue,
  };
}, [selectedPrizeIds, inventory]);
```

**✅ 正常：**
- 使用 `useMemo` 優化性能
- 使用 `prize.recycleValue` 或預設 `RECYCLE_VALUE`

---

### 2️⃣ Store 層（authStore.ts）

```typescript
recyclePrize: async (prizeInstanceId) => {
  await get()._handleInventoryUpdate(
    apiCall('/inventory/recycle', { 
      method: 'POST', 
      body: JSON.stringify({ prizeInstanceIds: [prizeInstanceId] }) 
    })
  );
},

batchRecyclePrizes: async (prizeInstanceIds) => {
  await get()._handleInventoryUpdate(
    apiCall('/inventory/recycle', { 
      method: 'POST', 
      body: JSON.stringify({ prizeInstanceIds }) 
    })
  );
},

_handleInventoryUpdate: async (promise: Promise<any>) => {
  const { updatedUser, newTransaction } = await promise;
  const inventory = await apiCall('/user/inventory');
  set(state => ({
    currentUser: updatedUser,
    transactions: [...state.transactions, newTransaction],
    inventory: inventory
  }));
},
```

**✅ 正常：**
- 調用後端 API
- 更新用戶點數
- 更新庫存
- 添加交易記錄

---

### 3️⃣ 後端 API（server-firestore.js）

```javascript
app.post(`${base}/inventory/recycle`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { prizeInstanceIds } = req.body || {};
    if (!Array.isArray(prizeInstanceIds) || prizeInstanceIds.length === 0) {
      return res.status(400).json({ message: '請提供要回收的獎品 ID' });
    }

    const rawPrizes = await db.getUserPrizes(sess.user.id);
    const byId = new Map(rawPrizes.map(p => [(p.instanceId || p.id), p]));

    let totalRecycle = 0;
    const now = new Date().toISOString();
    const ops = [];

    for (const id of prizeInstanceIds) {
      const p = byId.get(id);
      if (!p) continue;

      // 檢查狀態
      const normalizedStatus = p.status === 'PENDING_SHIPMENT' 
        ? 'IN_INVENTORY' 
        : (p.status || 'IN_INVENTORY');
      if (p.isRecycled || normalizedStatus !== 'IN_INVENTORY') continue;

      // 計算回收價值
      const recycleValue = typeof p.recycleValue === 'number' && p.recycleValue > 0 
        ? p.recycleValue 
        : 20;
      totalRecycle += recycleValue;
      
      ops.push({
        collection: db.COLLECTIONS.PRIZES,
        id,
        type: 'update',
        data: { isRecycled: true, status: 'IN_INVENTORY', updatedAt: now },
      });
    }

    if (totalRecycle <= 0) {
      return res.status(400).json({ message: '沒有可回收的獎品' });
    }

    if (ops.length) {
      await db.batchWrite(ops);
    }

    // 更新用戶點數
    const newPoints = Number(sess.user.points || 0) + totalRecycle;
    const updatedUser = await db.updateUserPoints(sess.user.id, newPoints);
    sess.user = updatedUser;

    // 創建交易記錄
    const newTransaction = await db.createTransaction({
      userId: updatedUser.id,
      username: updatedUser.username,
      type: 'RECYCLE',
      amount: totalRecycle,
      description: `回收 ${ops.length} 件獎品，獲得 ${totalRecycle} P`,
      prizeInstanceIds,
    });

    // 更新 session
    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, { ...sess, user: updatedUser }); } catch {}
    }

    return res.json({ updatedUser, newTransaction });
  } catch (error) {
    console.error('[RECYCLE] Error:', error);
    return res.status(500).json({ message: '回收失敗' });
  }
});
```

**✅ 正常：**
- 驗證用戶登入
- 驗證獎品 ID
- 檢查獎品狀態（未回收、在庫存中）
- 計算回收價值（使用 `recycleValue` 或預設 20）
- 批次更新獎品狀態
- 更新用戶點數
- 創建交易記錄
- 更新 session

---

## ⚠️ 發現的潛在問題

### 問題 1：前後端回收價值不一致 ⚠️

**前端顯示：**
```typescript
const points = recyclingCandidate.recycleValue || RECYCLE_VALUE;  // RECYCLE_VALUE = 20
toast.success(`成功回收獎品，獲得 ${points.toLocaleString()} P！`);
```

**後端計算：**
```javascript
const recycleValue = typeof p.recycleValue === 'number' && p.recycleValue > 0 
  ? p.recycleValue 
  : 20;  // 預設 20
```

**問題：**
- 如果獎品的 `recycleValue` 是 `0` 或 `undefined`，前端顯示 20 P，後端也給 20 P ✅
- 如果獎品的 `recycleValue` 是 `0`（明確設為 0），前端顯示 20 P，後端也給 20 P ✅
- **但是**：如果獎品的 `recycleValue` 是 `0`（不可回收），應該要拒絕回收！

---

### 問題 2：recycleValue = 0 的獎品可以回收 ⚠️

**現狀：**
```javascript
// 後端
const recycleValue = typeof p.recycleValue === 'number' && p.recycleValue > 0 
  ? p.recycleValue 
  : 20;
```

如果獎品的 `recycleValue` 明確設為 `0`（例如 A賞、B賞），後端會給 20 P！

**應該：**
- `recycleValue = 0` → 不可回收，應該拒絕
- `recycleValue = undefined` → 使用預設值 20 P
- `recycleValue > 0` → 使用設定的值

---

### 問題 3：前端沒有檢查是否可回收 ⚠️

**現狀：**
前端允許選擇任何獎品進行回收，包括 A賞、B賞等高價值獎品。

**應該：**
```typescript
// 只顯示可回收的獎品
const recyclableInventory = inventory.filter(prize => {
  const isRecyclableGrade = RECYCLABLE_GRADES.includes(prize.grade);
  const hasRecycleValue = (prize.recycleValue ?? RECYCLE_VALUE) > 0;
  return isRecyclableGrade && hasRecycleValue && !prize.isRecycled;
});
```

---

## 🔧 建議修復

### 修復 1：後端正確處理 recycleValue = 0

```javascript
// 修改後端邏輯
for (const id of prizeInstanceIds) {
  const p = byId.get(id);
  if (!p) continue;

  const normalizedStatus = p.status === 'PENDING_SHIPMENT' 
    ? 'IN_INVENTORY' 
    : (p.status || 'IN_INVENTORY');
  if (p.isRecycled || normalizedStatus !== 'IN_INVENTORY') continue;

  // 🔧 修復：正確處理 recycleValue
  let recycleValue;
  if (typeof p.recycleValue === 'number') {
    // 如果明確設為 0，表示不可回收
    if (p.recycleValue === 0) {
      console.log(`[RECYCLE] Prize ${id} has recycleValue=0, skipping`);
      continue;
    }
    recycleValue = p.recycleValue;
  } else {
    // 如果未設定，使用預設值
    recycleValue = 20;
  }
  
  totalRecycle += recycleValue;
  ops.push({
    collection: db.COLLECTIONS.PRIZES,
    id,
    type: 'update',
    data: { isRecycled: true, status: 'IN_INVENTORY', updatedAt: now },
  });
}
```

---

### 修復 2：前端檢查可回收性

```typescript
// ProfilePage.tsx
const recyclableInventory = useMemo(() => {
  return inventory.filter(prize => {
    // 檢查等級
    const isRecyclableGrade = RECYCLABLE_GRADES.includes(prize.grade);
    
    // 檢查回收價值
    const recycleValue = prize.recycleValue ?? RECYCLE_VALUE;
    const hasRecycleValue = recycleValue > 0;
    
    // 檢查狀態
    const isInInventory = !prize.isRecycled && 
                          prize.status !== 'PENDING_SHIPMENT' && 
                          prize.status !== 'SHIPPED';
    
    return isRecyclableGrade && hasRecycleValue && isInInventory;
  });
}, [inventory]);
```

---

## 📊 測試建議

### 測試案例 1：正常回收
1. 選擇 D賞、E賞等可回收獎品
2. 執行回收
3. **驗證：** 獲得正確點數，獎品標記為已回收

### 測試案例 2：recycleValue = 0 的獎品
1. 嘗試回收 A賞（recycleValue = 0）
2. **驗證：** 
   - 前端應該不顯示在可回收列表
   - 後端應該拒絕回收

### 測試案例 3：批次回收
1. 選擇多個獎品
2. 執行批次回收
3. **驗證：** 總點數正確，所有獎品都標記為已回收

### 測試案例 4：已回收的獎品
1. 嘗試回收已經回收過的獎品
2. **驗證：** 後端拒絕，不重複給點數

---

## 🎯 總結

### 流程狀態
- ✅ **前端邏輯** - 基本正常
- ✅ **Store 層** - 正常
- ⚠️ **後端 API** - 需要修復 recycleValue = 0 的處理
- ⚠️ **前端過濾** - 建議添加可回收性檢查

### 優先級
1. **高優先級** - 修復後端 recycleValue = 0 的處理
2. **中優先級** - 前端添加可回收性過濾
3. **低優先級** - 優化錯誤訊息

### 風險評估
- **當前風險：** 中等
- **影響範圍：** A賞、B賞等高價值獎品可能被誤回收
- **建議：** 立即修復

---

**需要我立即修復這些問題嗎？**

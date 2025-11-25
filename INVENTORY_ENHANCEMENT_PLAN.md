# 收藏庫功能增強計劃

## 🎯 目標
為 ProfilePage 的收藏庫添加完整的篩選、排序、搜尋和分頁功能。

## 📊 當前狀態
- ✅ `fetchInventory` 已在 authStore 中實現
- ✅ `isLoadingInventory` 狀態已存在
- ❌ ProfilePage 未調用 `fetchInventory`
- ❌ InventoryView 沒有篩選、排序、搜尋功能
- ❌ 沒有分頁載入功能

## 🔧 實現步驟

### 步驟 1：添加基礎載入功能 ✅ (已完成文檔)
**文件**: `components/ProfilePage.tsx`

**修改內容**:
1. 從 `useAuthStore` 解構 `isLoadingInventory`, `fetchInventory`, `fetchUserShipments`, `fetchUserPickupRequests`
2. 添加 `useEffect` 在用戶登入後調用這些函數
3. 修復 `allPrizes` 以兼容陣列和對象格式
4. 傳遞 `isLoading={isLoadingInventory}` 給 `InventoryView`
5. 在 `InventoryView` 中添加載入動畫

**預期結果**:
- 用戶進入個人資料頁面時自動載入收藏庫
- 顯示載入動畫
- 525 件獎品正確顯示

### 步驟 2：添加篩選功能 (待實現)
**文件**: `components/ProfilePage.tsx`

**修改內容**:
1. 在 `InventoryView` 添加狀態：
   - `filterStatus`: 'ALL' | 'AVAILABLE' | 'RECYCLED' | 'SHIPPED' | 'PICKUP'
   - `filterGrade`: 'ALL' | 具體等級
   - `filterLottery`: 'ALL' | 具體活動 ID

2. 添加 `useMemo` 計算 `processedPrizes`：
   - 根據 `filterStatus` 篩選
   - 根據 `filterGrade` 篩選
   - 根據 `filterLottery` 篩選

3. 添加 UI 控件：
   - 狀態下拉選單
   - 等級下拉選單
   - 活動下拉選單

**預期結果**:
- 用戶可以按狀態篩選（可用、已回收、運送中、自取中）
- 用戶可以按等級篩選（A賞、B賞等）
- 用戶可以按活動篩選

### 步驟 3：添加排序功能 (待實現)
**文件**: `components/ProfilePage.tsx`

**修改內容**:
1. 添加狀態：`sortBy`: 'grade' | 'date'
2. 在 `processedPrizes` 的 `useMemo` 中添加排序邏輯
3. 添加排序下拉選單

**預期結果**:
- 用戶可以按等級排序（A賞 → 一般賞）
- 用戶可以按最新獲得排序

### 步驟 4：添加搜尋功能 (待實現)
**文件**: `components/ProfilePage.tsx`

**修改內容**:
1. 添加狀態：`searchQuery`: string
2. 在 `processedPrizes` 的 `useMemo` 中添加搜尋邏輯
3. 添加搜尋輸入框

**預期結果**:
- 用戶可以搜尋獎品名稱或等級

### 步驟 5：添加分頁載入功能 (待實現)
**文件**: `components/ProfilePage.tsx`

**修改內容**:
1. 添加狀態：`displayCount`: number (初始值 12)
2. 創建 `displayedPrizes = processedPrizes.slice(0, displayCount)`
3. 添加 `useEffect` 在篩選條件改變時重置 `displayCount`
4. 添加「載入更多」按鈕

**預期結果**:
- 初始顯示 12 件獎品
- 點擊「載入更多」顯示更多獎品
- 篩選條件改變時重置為 12 件

### 步驟 6：添加統計資訊 (待實現)
**文件**: `components/ProfilePage.tsx`

**修改內容**:
1. 顯示「顯示 X / Y 件獎品」
2. 顯示「(已篩選，共 Z 件)」當有篩選時
3. 在選擇模式時顯示警告

**預期結果**:
- 用戶清楚知道當前顯示和總數
- 選擇模式時提示篩選已停用

## 🧪 測試清單

### 步驟 1 測試
- [ ] 進入個人資料頁面時顯示載入動畫
- [ ] 載入完成後顯示獎品
- [ ] Console 顯示 `[AuthStore] Fetching inventory...`
- [ ] Console 顯示 `[AuthStore] Inventory loaded: 525 items`

### 步驟 2 測試
- [ ] 狀態篩選：選擇「可用」只顯示可用獎品
- [ ] 狀態篩選：選擇「已回收」只顯示已回收獎品
- [ ] 等級篩選：選擇「A賞」只顯示 A賞
- [ ] 活動篩選：選擇特定活動只顯示該活動獎品

### 步驟 3 測試
- [ ] 排序：選擇「等級排序」按 A賞→一般賞 排序
- [ ] 排序：選擇「最新獲得」按時間排序

### 步驟 4 測試
- [ ] 搜尋：輸入獎品名稱可以找到對應獎品
- [ ] 搜尋：輸入等級可以找到對應等級獎品

### 步驟 5 測試
- [ ] 初始只顯示 12 件獎品
- [ ] 點擊「載入更多」顯示更多獎品
- [ ] 篩選條件改變時重置為 12 件

### 步驟 6 測試
- [ ] 統計資訊正確顯示
- [ ] 選擇模式時顯示警告

## 📝 注意事項

1. **選擇模式兼容性**：在選擇模式（回收、運送、自取）時，篩選控件應該被禁用
2. **性能優化**：使用 `useMemo` 避免不必要的重新計算
3. **用戶體驗**：篩選條件改變時重置顯示數量，避免混淆
4. **錯誤處理**：處理空結果的情況

## 🚀 部署流程

每完成一個步驟：
1. 測試功能是否正常
2. 提交到 git：`git add . && git commit -m "feat: 步驟X - 功能描述"`
3. 推送到 GitHub：`git push origin feature/firestore-migration`
4. 部署前端：`gcloud run deploy ichiban-frontend --source . --region us-central1 --allow-unauthenticated`
5. 清除瀏覽器緩存測試

## 📅 時間估計

- 步驟 1：10 分鐘（已完成文檔）
- 步驟 2：15 分鐘
- 步驟 3：10 分鐘
- 步驟 4：10 分鐘
- 步驟 5：10 分鐘
- 步驟 6：5 分鐘
- 測試和調試：20 分鐘

**總計：約 80 分鐘**

---

**最後更新**: 2025-11-25 20:25 (UTC+8)

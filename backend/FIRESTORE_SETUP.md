# 🚀 Firestore 版本完整設置指南

## 📋 目錄

1. [快速開始](#快速開始)
2. [文件結構](#文件結構)
3. [本地開發](#本地開發)
4. [部署到生產環境](#部署到生產環境)
5. [數據遷移](#數據遷移)
6. [Firestore Security Rules](#firestore-security-rules)
7. [常見問題](#常見問題)

---

## 快速開始

### ✅ 前置要求

- [x] Node.js 16+
- [x] Google Cloud SDK (`gcloud`)
- [x] Google Cloud 專案
- [x] Firestore 已啟用

### 🔧 設置步驟

```bash
# 1. 安裝依賴
cd backend
npm install

# 2. Google Cloud 認證
gcloud auth application-default login

# 3. 測試 Firestore 連接
node migrations/migrate-to-firestore.js test

# 4. 遷移測試數據
node migrations/migrate-to-firestore.js migrate

# 5. 本地啟動 Firestore 版本
node server-firestore.js
```

---

## 文件結構

```
backend/
├── db/
│   └── firestore.js              # Firestore 數據庫層（核心）
├── migrations/
│   └── migrate-to-firestore.js   # 數據遷移腳本
├── server.js                      # 原始版本（記憶體存儲）
├── server-firestore.js            # Firestore 版本（生產就緒）
├── firestore.rules                # Firestore Security Rules
├── deploy-firestore.sh            # 自動部署腳本
├── FIRESTORE_SETUP.md            # 本文檔
└── package.json
```

### 核心文件說明

#### `db/firestore.js` - 數據庫層

這是所有 Firestore 操作的統一入口：

```javascript
const db = require('./db/firestore');

// 用戶管理
await db.createUser(userData);
await db.getUserByEmail(email);
await db.updateUserPoints(userId, newPoints);

// 訂單管理
await db.createOrder(orderData);
await db.getUserOrders(userId);

// Session 管理
const sid = await db.createSession(sessionData);
const sess = await db.getSession(sid);
await db.updateSession(sid, updates);
```

**優點：**
- ✅ 統一接口，易於維護
- ✅ 包含所有 CRUD 操作
- ✅ 自動處理錯誤和日誌
- ✅ 易於測試和模擬

---

## 本地開發

### 方式 1：使用 Firestore 版本

```bash
# 啟動 Firestore 版本
node server-firestore.js
```

### 方式 2：臨時切換

```bash
# 備份原始版本
cp server.js server.js.backup

# 使用 Firestore 版本
cp server-firestore.js server.js
node server.js

# 恢復原始版本
cp server.js.backup server.js
```

### 本地測試

```bash
# 測試 Health Check
curl http://localhost:8080/health

# 預期輸出：
{
  "status": "healthy",
  "storage": "firestore",
  "timestamp": 1700000000000
}
```

---

## 部署到生產環境

### 自動部署（推薦）

```bash
# 使用部署腳本
chmod +x deploy-firestore.sh
./deploy-firestore.sh
```

腳本會自動：
1. ✅ 備份當前 `server.js`
2. ✅ 切換到 Firestore 版本
3. ✅ 部署到 Cloud Run
4. ✅ 如果失敗，自動恢復

### 手動部署

```bash
# 1. 備份
cp server.js server.js.backup

# 2. 切換版本
cp server-firestore.js server.js

# 3. 部署
gcloud run deploy ichiban-backend-new \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated

# 4. 如果需要，恢復
cp server.js.backup server.js
```

---

## 數據遷移

### 測試連接

```bash
node migrations/migrate-to-firestore.js test
```

**預期輸出：**
```
✅ Firestore 連接成功！
```

### 遷移測試數據

```bash
node migrations/migrate-to-firestore.js migrate
```

這將創建以下測試用戶：
- `123123@aaa` - 測試達人（2000 P）
- `test@example.com` - TestUser（1000 P）

### 從 JSON 文件遷移

```bash
# 1. 準備數據文件（data.json）
{
  "users": [
    {
      "id": "user001",
      "email": "user@example.com",
      "username": "User One",
      "password": "password",
      "points": 1000,
      "roles": ["user"],
      "status": "ACTIVE"
    }
  ],
  "orders": [],
  "prizes": []
}

# 2. 執行遷移
node migrations/migrate-to-firestore.js migrate data.json
```

### 導出數據（備份）

```bash
node migrations/migrate-to-firestore.js export backup.json
```

---

## Firestore Security Rules

### 本地測試 Rules

```bash
# 安裝 Firebase CLI（如果尚未安裝）
npm install -g firebase-tools

# 登入
firebase login

# 初始化 Firestore
firebase init firestore

# 選擇：
# - Use existing project: goodmoney666-jackpot
# - Firestore rules file: backend/firestore.rules
# - Firestore indexes file: firestore.indexes.json
```

### 部署 Security Rules

```bash
# 部署 Rules
firebase deploy --only firestore:rules

# 或部署所有 Firestore 配置
firebase deploy --only firestore
```

### Rules 說明

當前 Rules 的權限設計：

| Collection | 讀取 | 創建 | 更新 | 刪除 |
|-----------|------|------|------|------|
| `users` | 自己 + Admin | Backend | 自己（限制欄位） + Admin | ❌ |
| `orders` | 自己 + Admin | Backend | Admin | ❌ |
| `sessions` | ❌ Backend only | Backend | Backend | Backend |
| `prizeInstances` | 自己 + Admin | Backend | Admin | ❌ |
| `transactions` | 自己 + Admin | Backend | ❌ | ❌ |
| `lotterySets` | ✅ 所有人 | Backend | Backend | ❌ |
| `queues` | ✅ 所有人 | Backend | Backend | ❌ |

**安全性特點：**
- ✅ 用戶只能訪問自己的數據
- ✅ 管理員有完整權限
- ✅ 敏感操作（創建訂單、交易）只能通過 Backend
- ✅ Session 完全隔離，前端無法直接訪問
- ✅ 抽獎狀態和隊列公開可讀，但只能後端修改

---

## Firestore Collections 結構

### `users` Collection

```javascript
{
  id: "abc123",
  email: "user@example.com",
  username: "UserName",
  password: "hashed_password",
  roles: ["user"],  // ["user", "ADMIN"]
  points: 1000,
  lotteryStats: {},
  status: "ACTIVE", // "ACTIVE", "DELETED"
  createdAt: "2024-01-01T00:00:00.000Z",
  lastActiveAt: "2024-01-01T00:00:00.000Z"
}
```

### `orders` Collection

```javascript
{
  id: "order123",
  userId: "abc123",
  type: "LOTTERY_DRAW", // "LOTTERY_DRAW", "SHOP_PURCHASE"
  lotterySetId: "limited-discount-1",
  costInPoints: 800,
  items: [
    {
      ticketIndex: 5,
      prizeId: "ld1-a",
      prizeName: "豪華模型",
      prizeGrade: "A賞"
    }
  ],
  status: "COMPLETED",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### `sessions` Collection

```javascript
{
  sid: "session_abc123",
  user: { /* user object */ },
  inventory: {},
  orders: [],
  transactions: [],
  createdAt: 1700000000000,
  expiresAt: 1700604800000 // 7 days
}
```

### `prizeInstances` Collection

```javascript
{
  instanceId: "prize123",
  userId: "abc123",
  lotterySetId: "limited-discount-1",
  prizeId: "ld1-a",
  prizeName: "豪華模型",
  prizeGrade: "A賞",
  prizeImageUrl: "https://...",
  orderId: "order123",
  status: "PENDING_SHIPMENT", // "PENDING_SHIPMENT", "SHIPPED", "DELIVERED"
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### `transactions` Collection

```javascript
{
  id: "tx123",
  userId: "abc123",
  type: "DRAW", // "DRAW", "RECHARGE", "REFUND"
  amount: -800, // 負數為扣除，正數為增加
  description: "抽獎：限時特價：經典動漫收藏",
  relatedOrderId: "order123",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

---

## 常見問題

### Q1: 如何檢查 Firestore 是否正常工作？

```bash
# 方法 1：使用測試腳本
node migrations/migrate-to-firestore.js test

# 方法 2：檢查 Health 端點
curl http://localhost:8080/health

# 應該看到："storage": "firestore"
```

### Q2: 如何查看 Firestore 中的數據？

1. 開啟 [Firebase Console](https://console.firebase.google.com)
2. 選擇專案：`goodmoney666-jackpot`
3. 點擊左側「Firestore Database」
4. 瀏覽 Collections

### Q3: 部署後還是使用記憶體存儲？

檢查以下幾點：
1. 確認 `server.js` 已切換到 Firestore 版本
2. 檢查 Health 端點：`curl YOUR_URL/health`
3. 查看日誌：`gcloud run logs read ichiban-backend-new --limit=50`

### Q4: 如何回滾到記憶體版本？

```bash
# 如果有備份
cp server.js.backup server.js

# 重新部署
gcloud run deploy ichiban-backend-new --source ./backend --region us-central1
```

### Q5: Session 過期時間如何調整？

在 `db/firestore.js` 中修改：

```javascript
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 天

// 改為 30 天：
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000;
```

### Q6: 如何添加新的 Collection？

1. 在 `db/firestore.js` 的 `COLLECTIONS` 中添加：
   ```javascript
   const COLLECTIONS = {
     // ...
     NEW_COLLECTION: 'newCollection',
   };
   ```

2. 創建對應的 CRUD 函數：
   ```javascript
   async function createNewItem(data) {
     const id = crypto.randomBytes(16).toString('hex');
     await firestore.collection(COLLECTIONS.NEW_COLLECTION).doc(id).set(data);
     return data;
   }
   ```

3. 導出函數並在 `server-firestore.js` 中使用

4. 更新 `firestore.rules` 添加權限規則

### Q7: 成本會很高嗎？

**小規模應用（每天 1000 活躍用戶）：**
- 讀取：約 5,000 次/天
- 寫入：約 2,000 次/天
- **月成本：約 $1-2 USD**

**Firestore 免費額度（每天）：**
- 讀取：50,000 次
- 寫入：20,000 次
- 刪除：20,000 次
- 存儲：1 GB

**結論：小規模完全免費！**

---

## 🎉 完成檢查清單

部署完成後，請確認：

- [ ] Health check 顯示 `"storage": "firestore"`
- [ ] 測試帳號可以成功登入
- [ ] 抽獎功能正常，點數正確扣除
- [ ] 訂單記錄保存到 Firestore
- [ ] Session 在重啟後仍然有效
- [ ] Security Rules 已部署
- [ ] 數據備份機制已設置

---

## 📚 相關文檔

- [Firestore 官方文檔](https://firebase.google.com/docs/firestore)
- [Cloud Run 文檔](https://cloud.google.com/run/docs)
- [Security Rules 指南](https://firebase.google.com/docs/firestore/security/get-started)
- [Node.js Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## 🆘 需要幫助？

如果遇到問題：
1. 查看本文檔的「常見問題」章節
2. 檢查 Cloud Run 日誌
3. 確認 Google Cloud 認證正確
4. 驗證 Firestore 已啟用

祝你部署順利！🚀

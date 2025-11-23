# 🚀 Firestore 遷移完整包

## 📦 已創建的文件

所有 Firestore 遷移所需的文件都已創建完成！

### 核心文件

| 文件 | 說明 | 類型 |
|------|------|------|
| `db/firestore.js` | **Firestore 數據庫層**<br>統一管理所有數據操作 | 🔴 核心 |
| `server-firestore.js` | **生產就緒的 Server**<br>完整使用 Firestore 的 Backend | 🔴 核心 |
| `firestore.rules` | **Firestore Security Rules**<br>數據訪問權限控制 | 🟠 重要 |
| `migrations/migrate-to-firestore.js` | **數據遷移腳本**<br>從記憶體遷移到 Firestore | 🟠 重要 |

### 工具文件

| 文件 | 說明 | 類型 |
|------|------|------|
| `test-firestore.js` | **測試腳本**<br>測試所有 Firestore 功能 | 🟢 工具 |
| `deploy-firestore.sh` | **自動部署腳本**<br>一鍵部署到 Cloud Run | 🟢 工具 |
| `FIRESTORE_SETUP.md` | **完整設置指南**<br>詳細的使用文檔 | 📘 文檔 |
| `FIRESTORE_README.md` | **本文件**<br>快速開始指南 | 📘 文檔 |

---

## ⚡ 快速開始（3 分鐘）

### 步驟 1：測試 Firestore 連接

```bash
node test-firestore.js
```

**預期輸出：**
```
✅ 所有測試通過！
🎉 Firestore 配置正確，所有功能正常工作！
```

### 步驟 2：遷移測試數據

```bash
node migrations/migrate-to-firestore.js migrate
```

這將創建：
- 測試用戶：`123123@aaa` (2000 P)
- 測試用戶：`test@example.com` (1000 P)

### 步驟 3：本地啟動

```bash
node server-firestore.js
```

訪問 http://localhost:8080/health 確認：
```json
{
  "status": "healthy",
  "storage": "firestore"  ← 確認這個！
}
```

### 步驟 4：部署到生產環境

```bash
# 方式 A：自動部署（推薦）
chmod +x deploy-firestore.sh
./deploy-firestore.sh

# 方式 B：手動部署
cp server-firestore.js server.js
gcloud run deploy ichiban-backend-new --source ./backend --region us-central1
```

### 步驟 5：部署 Security Rules

```bash
firebase deploy --only firestore:rules
```

---

## 📚 詳細文檔

### 完整設置指南
請查看 `FIRESTORE_SETUP.md`，包含：
- ✅ 詳細的本地開發指南
- ✅ 部署流程
- ✅ 數據結構說明
- ✅ 常見問題解答
- ✅ 成本估算

### 數據庫層 API

所有數據操作都通過 `db/firestore.js`：

```javascript
const db = require('./db/firestore');

// === 用戶管理 ===
await db.createUser(userData);
await db.getUserByEmail('user@example.com');
await db.getUserById(userId);
await db.updateUser(userId, updates);
await db.updateUserPoints(userId, newPoints);
await db.deleteUser(userId);
await db.getAllActiveUsers();

// === 訂單管理 ===
await db.createOrder(orderData);
await db.getUserOrders(userId);
await db.getOrderById(orderId);
await db.updateOrderStatus(orderId, 'COMPLETED');
await db.getAllOrders(limit, startAfter);

// === Session 管理 ===
const sid = await db.createSession(sessionData);
const session = await db.getSession(sid);
await db.updateSession(sid, updates);
await db.deleteSession(sid);
await db.cleanupExpiredSessions();

// === 獎品管理 ===
await db.createPrizeInstance(prizeData);
await db.getUserPrizes(userId);
await db.updatePrizeStatus(instanceId, 'SHIPPED');

// === 交易記錄 ===
await db.createTransaction(transactionData);
await db.getUserTransactions(userId);

// === 抽獎狀態 ===
await db.getLotteryState(setId);
await db.markTicketsDrawn(setId, [1, 2, 3]);

// === 隊列管理 ===
await db.getQueue(setId);
await db.saveQueue(setId, queue);
```

---

## 🔄 與原版的差異

### 原版 (server.js)

```javascript
// ❌ 記憶體存儲
const db = {
  users: new Map(),
  orders: [],
};

// ❌ 重啟後數據消失
// ❌ 無法水平擴展
// ❌ 無法多實例共享
```

### Firestore 版 (server-firestore.js)

```javascript
// ✅ Firestore 持久化
const db = require('./db/firestore');

// ✅ 數據永久保存
// ✅ 支持 auto-scaling
// ✅ 多實例共享數據
```

---

## 📊 Firestore Collections

### 已實現的 Collections

1. **users** - 用戶資料
2. **orders** - 訂單記錄
3. **sessions** - 會話管理
4. **prizeInstances** - 獎品實例
5. **transactions** - 交易記錄
6. **lotterySets** - 抽獎狀態
7. **queues** - 隊列管理
8. **ticketLocks** - 籤號鎖定

### 數據結構

詳細結構請參考 `FIRESTORE_SETUP.md` 的「Firestore Collections 結構」章節。

---

## 🧪 測試清單

### 本地測試

```bash
# 1. 測試 Firestore 功能
node test-firestore.js

# 2. 測試連接
node migrations/migrate-to-firestore.js test

# 3. 啟動本地 Server
node server-firestore.js

# 4. 測試 Health Check
curl http://localhost:8080/health
```

### 部署後測試

```bash
# 1. Health Check
curl https://YOUR_BACKEND_URL/health

# 2. 登入測試
curl -X POST https://YOUR_BACKEND_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"123123@aaa","password":"123123"}'

# 3. 查看日誌
gcloud run logs read ichiban-backend-new --limit=50
```

---

## ⚠️ 重要提醒

### 部署前

- [ ] 已測試所有功能
- [ ] 已備份原始 `server.js`
- [ ] Google Cloud 認證正確
- [ ] Firestore 已啟用

### 部署後

- [ ] Health check 顯示 `"storage": "firestore"`
- [ ] 測試登入功能
- [ ] 測試抽獎功能
- [ ] 確認數據正確保存
- [ ] 部署 Security Rules

---

## 🆘 故障排除

### 問題 1：Firestore 連接失敗

**症狀：**
```
Error: Could not load the default credentials
```

**解決：**
```bash
gcloud auth application-default login
```

### 問題 2：部署後仍使用記憶體存儲

**檢查：**
```bash
curl YOUR_URL/health | grep storage
# 應該顯示："storage":"firestore"
```

**解決：**
```bash
# 確認 server.js 已切換
cat backend/server.js | head -1
# 應該看到：// Production-ready backend with Firestore integration
```

### 問題 3：測試失敗

**可能原因：**
- Firestore 未啟用
- 權限不足
- Project ID 不正確

**解決：**
1. 檢查 Firestore: https://console.firebase.google.com
2. 確認權限: `gcloud projects get-iam-policy PROJECT_ID`
3. 檢查 Project: `gcloud config get-value project`

---

## 📈 性能優化建議

### 已實現

- ✅ Session 自動過期清理
- ✅ 批量寫入支持
- ✅ 索引優化（通過 Security Rules）
- ✅ 錯誤處理和重試

### 可選優化

1. **添加 Redis 快取**
   - Session 存 Redis
   - 熱門數據快取

2. **實現連接池**
   - 複用 Firestore 連接
   - 減少延遲

3. **添加監控**
   - Cloud Monitoring
   - 錯誤追蹤

---

## 🎯 下一步

### 立即行動

1. ✅ 執行測試腳本
2. ✅ 遷移測試數據
3. ✅ 本地測試
4. ✅ 部署到生產環境
5. ✅ 部署 Security Rules

### 後續改進

- [ ] 添加數據備份定時任務
- [ ] 實現 Redis Session（可選）
- [ ] 添加性能監控
- [ ] 實現自動化測試
- [ ] 添加 CI/CD 流程

---

## 📞 聯繫支持

如果遇到問題：

1. 📖 查看 `FIRESTORE_SETUP.md` 的常見問題
2. 🔍 檢查 Cloud Run 日誌
3. 🧪 執行 `test-firestore.js` 診斷
4. 🌐 查看 [Firestore 文檔](https://firebase.google.com/docs/firestore)

---

## 🎉 恭喜！

你現在擁有一個**生產就緒**的 Firestore Backend！

**特點：**
- ✅ 數據永久保存
- ✅ 支持水平擴展
- ✅ 完整的 Security Rules
- ✅ 自動化部署腳本
- ✅ 完整的測試工具
- ✅ 詳細的文檔

開始部署吧！🚀

# API 前後端對齊檢查報告
生成時間：2025-11-25 23:19

## ⚠️ 發現的問題

### 🔴 後端有但前端未使用的 API

#### 1. 管理員抽獎管理 API
| 端點 | 方法 | 後端實作 | 前端使用 |
|------|------|---------|----------|
| `/api/admin/lottery-sets` | POST | ❌ 未實作 | ✅ siteStore.ts 有調用 |
| `/api/admin/lottery-sets/:id` | PUT | ❌ 未實作 | ✅ siteStore.ts 有調用 |
| `/api/admin/lottery-sets/:id` | DELETE | ❌ 未實作 | ✅ siteStore.ts 有調用 |

**問題**：前端 `siteStore.ts` 調用了這些 API，但後端 `server-firestore.js` 中**沒有實作**！

**影響**：管理員無法通過前端新增、編輯、刪除抽獎活動。

**建議**：需要在後端添加這些端點的實作。

---

#### 2. 管理員網站配置 API
| 端點 | 方法 | 後端實作 | 前端使用 |
|------|------|---------|----------|
| `/api/admin/site-config` | POST | ❌ 未實作 | ✅ siteStore.ts 有調用 |
| `/api/admin/categories` | POST | ❌ 未實作 | ✅ siteStore.ts 有調用 |

**問題**：前端調用了這些 API 來更新網站配置和分類，但後端未實作。

**影響**：管理員無法更新網站配置和分類設定。

**建議**：需要在後端添加這些端點的實作。

---

#### 3. 用戶密碼管理 API
| 端點 | 方法 | 後端實作 | 前端使用 |
|------|------|---------|----------|
| `/api/user/change-password` | POST | ❌ 未實作 | ✅ authStore.ts 有調用 |
| `/api/auth/password-reset/request` | POST | ❌ 未實作 | ✅ authStore.ts 有調用 |
| `/api/auth/password-reset/verify` | POST | ❌ 未實作 | ✅ authStore.ts 有調用 |
| `/api/auth/password-reset/confirm` | POST | ❌ 未實作 | ✅ authStore.ts 有調用 |

**問題**：前端有完整的密碼重置流程，但後端完全未實作。

**影響**：用戶無法更改密碼或重置忘記的密碼。

**建議**：需要實作完整的密碼管理功能。

---

#### 4. 管理員用戶管理 API
| 端點 | 方法 | 後端實作 | 前端使用 |
|------|------|---------|----------|
| `/api/admin/users/:id/points` | POST | ✅ 已實作 | ✅ authStore.ts 有調用 |
| `/api/admin/users/:id/role` | PUT | ✅ 已實作 | ❌ 前端未使用 |

**狀態**：後端已實作，前端也有調用，但需確認功能是否正常。

---

#### 5. 商城訂單運送 API
| 端點 | 方法 | 後端實作 | 前端使用 |
|------|------|---------|----------|
| `/api/shop/orders/:id/request-ship` | POST | ❌ 未實作 | ✅ authStore.ts 有調用 |

**問題**：前端調用此 API 來申請商城訂單出貨，但後端使用的是 `/ship` 而不是 `/request-ship`。

**影響**：商城訂單出貨申請可能失敗。

**建議**：統一端點名稱。

---

### 🟡 後端有但前端未使用的 API

#### 1. 用戶運送/自取紀錄 API
| 端點 | 方法 | 後端實作 | 前端使用 |
|------|------|---------|----------|
| `/api/user/shipments` | GET | ✅ 已實作 | ✅ authStore.ts 有調用 |
| `/api/user/pickups` | GET | ✅ 已實作 | ✅ authStore.ts 有調用 |

**狀態**：已對齊，功能正常。

---

## ✅ 完全對齊的 API

### 認證相關
- ✅ `/api/auth/login` - POST
- ✅ `/api/auth/register` - POST
- ✅ `/api/auth/logout` - POST
- ✅ `/api/auth/session` - GET
- ✅ `/api/auth/verify-admin` - POST

### 抽獎相關
- ✅ `/api/lottery-sets` - GET
- ✅ `/api/lottery-sets/:id` - GET
- ✅ `/api/lottery-sets/:id/draw` - POST
- ✅ `/api/lottery-sets/:id/queue` - GET
- ✅ `/api/lottery-sets/:id/queue/join` - POST
- ✅ `/api/lottery-sets/:id/queue/leave` - POST
- ✅ `/api/lottery-sets/:id/queue/extend` - POST
- ✅ `/api/lottery-sets/:id/tickets/locks` - GET
- ✅ `/api/lottery-sets/:id/tickets/lock` - POST

### 用戶相關
- ✅ `/api/user/recharge` - POST
- ✅ `/api/user/inventory` - GET
- ✅ `/api/user/orders` - GET
- ✅ `/api/user/transactions` - GET
- ✅ `/api/user/addresses` - POST
- ✅ `/api/user/addresses/:id` - PUT
- ✅ `/api/user/addresses/:id` - DELETE
- ✅ `/api/user/addresses/:id/default` - POST
- ✅ `/api/user/shipments` - GET
- ✅ `/api/user/pickups` - GET

### 獎品相關
- ✅ `/api/inventory/recycle` - POST

### 運送/自取相關
- ✅ `/api/shipments` - POST
- ✅ `/api/pickups` - POST

### 商城相關
- ✅ `/api/shop/products` - GET
- ✅ `/api/shop/orders` - POST
- ✅ `/api/shop/orders/:id/finalize` - POST
- ⚠️ `/api/shop/orders/:id/ship` - POST (後端)
- ⚠️ `/api/shop/orders/:id/request-ship` - POST (前端)

### 系統相關
- ✅ `/health` - GET
- ✅ `/api/site-config` - GET
- ✅ `/api/categories` - GET
- ✅ `/api/orders/recent` - GET

### 管理員相關
- ✅ `/api/admin/users` - GET
- ✅ `/api/admin/users/:id/points` - POST
- ✅ `/api/admin/users/:id/role` - PUT
- ✅ `/api/admin/shipments` - GET
- ✅ `/api/admin/shipments/:id/status` - PUT
- ✅ `/api/admin/pickups` - GET
- ✅ `/api/admin/pickups/:id/status` - PUT
- ✅ `/api/admin/shop/products` - GET
- ✅ `/api/admin/shop/products` - POST
- ✅ `/api/admin/shop/products/:id` - DELETE
- ✅ `/api/admin/shop/orders` - GET
- ✅ `/api/admin/shop/orders/:id/status` - PUT

---

## 📊 統計摘要

### 問題統計
- 🔴 **嚴重問題**：9 個 API 前端調用但後端未實作
- 🟡 **輕微問題**：1 個 API 端點名稱不一致
- ✅ **正常運作**：47 個 API 完全對齊

### 優先級修復建議

#### 🔥 高優先級（影響核心功能）
1. **管理員抽獎管理** - 無法管理抽獎活動
   - 需實作：POST `/api/admin/lottery-sets`
   - 需實作：PUT `/api/admin/lottery-sets/:id`
   - 需實作：DELETE `/api/admin/lottery-sets/:id`

2. **用戶密碼管理** - 用戶無法更改密碼
   - 需實作：POST `/api/user/change-password`
   - 需實作：POST `/api/auth/password-reset/request`
   - 需實作：POST `/api/auth/password-reset/verify`
   - 需實作：POST `/api/auth/password-reset/confirm`

#### 🟠 中優先級（影響管理功能）
3. **管理員網站配置** - 無法更新網站設定
   - 需實作：POST `/api/admin/site-config`
   - 需實作：POST `/api/admin/categories`

4. **商城訂單運送** - 端點名稱不一致
   - 需統一：`/ship` vs `/request-ship`

---

## 🔧 建議的修復步驟

### 步驟 1：實作管理員抽獎管理 API
```javascript
// backend/server-firestore.js

// 新增抽獎活動
app.post(`${base}/admin/lottery-sets`, async (req, res) => {
  // 實作邏輯
});

// 更新抽獎活動
app.put(`${base}/admin/lottery-sets/:id`, async (req, res) => {
  // 實作邏輯
});

// 刪除抽獎活動
app.delete(`${base}/admin/lottery-sets/:id`, async (req, res) => {
  // 實作邏輯
});
```

### 步驟 2：實作密碼管理 API
```javascript
// 更改密碼
app.post(`${base}/user/change-password`, async (req, res) => {
  // 實作邏輯
});

// 密碼重置流程
app.post(`${base}/auth/password-reset/request`, async (req, res) => {
  // 實作邏輯
});
```

### 步驟 3：實作網站配置管理 API
```javascript
// 更新網站配置
app.post(`${base}/admin/site-config`, async (req, res) => {
  // 實作邏輯
});

// 更新分類
app.post(`${base}/admin/categories`, async (req, res) => {
  // 實作邏輯
});
```

### 步驟 4：統一商城訂單運送端點
選擇一個端點名稱並統一前後端。

---

## 🎯 結論

雖然核心功能（抽獎、回收、運送）都已完全對齊且正常運作，但仍有 **9 個管理功能 API** 前端有調用但後端未實作。

**建議**：
1. 如果這些功能不需要，可以從前端移除相關代碼
2. 如果需要這些功能，應該盡快實作後端 API

**當前系統狀態**：
- ✅ 用戶核心功能：完全正常
- ⚠️ 管理員功能：部分缺失
- ✅ 最近修復的回收功能：完全正常

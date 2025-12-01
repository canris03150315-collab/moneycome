# 三級權限系統與商品審核機制實施指南

## 📋 概述

本系統實施了三級權限管理和商品審核流程，確保商品上架前經過適當的審核。

實施日期：2025-12-01  
版本：v1.0

---

## 🎯 三級權限系統

### 權限等級

| 等級 | 角色代碼 | 中文名稱 | 權限說明 |
|------|---------|---------|---------|
| **3** | `SUPER_ADMIN` | 最大權限管理員 | 所有權限 + 商品審核 |
| **2** | `ADMIN` | 子管理員 | 管理功能（需審核） |
| **1** | `USER` | 一般玩家 | 基本功能 |

### 權限對比

| 功能 | 最大權限管理員 | 子管理員 | 一般玩家 |
|------|--------------|---------|---------|
| **商品管理** |
| 創建商品 | ✅ 自動上架 | ✅ 需審核 | ❌ |
| 編輯商品 | ✅ 所有商品 | ✅ 自己的未審核商品 | ❌ |
| 刪除商品 | ✅ 所有商品 | ✅ 自己的商品 | ❌ |
| **審核功能** |
| 審核通過 | ✅ | ❌ | ❌ |
| 審核拒絕 | ✅ | ❌ | ❌ |
| 查看待審核列表 | ✅ | ❌ | ❌ |
| 重新提交審核 | ✅ | ✅ 自己的商品 | ❌ |
| **用戶管理** |
| 查看所有用戶 | ✅ | ✅ | ❌ |
| 修改用戶信息 | ✅ 所有用戶 | ⚠️ 僅普通用戶 | ✅ 僅自己 |
| 調整用戶點數 | ✅ | ⚠️ 有限制 | ❌ |
| **系統管理** |
| 查看審計日誌 | ✅ | ⚠️ 部分 | ❌ |
| 系統設置 | ✅ | ❌ | ❌ |
| 數據備份 | ✅ | ❌ | ❌ |

---

## 🔄 商品審核流程

### 流程圖

```
子管理員創建商品
       ↓
   [待審核狀態]
   PENDING_APPROVAL
       ↓
最大權限管理員審核
       ↓
    ┌──────┴──────┐
    ↓             ↓
[審核通過]    [審核拒絕]
 APPROVED      REJECTED
    ↓             ↓
 正式上架      可重新提交
AVAILABLE    → PENDING_APPROVAL
```

### 審核狀態

| 狀態 | 代碼 | 說明 | 前端顯示 |
|------|------|------|---------|
| **待審核** | `PENDING` | 等待超級管理員審核 | 🟡 待審核 |
| **已通過** | `APPROVED` | 審核通過，已上架 | 🟢 已上架 |
| **已拒絕** | `REJECTED` | 審核未通過 | 🔴 已拒絕 |
| **草稿** | `DRAFT` | 未提交的草稿 | ⚪ 草稿 |

### 審核規則

#### 1. 創建商品時

```javascript
// 超級管理員創建
if (user.role === 'SUPER_ADMIN') {
  商品狀態 = 'AVAILABLE'  // 自動上架
  審核狀態 = 'APPROVED'   // 自動通過
}

// 子管理員創建
if (user.role === 'ADMIN') {
  商品狀態 = 'PENDING_APPROVAL'  // 待審核
  審核狀態 = 'PENDING'            // 等待審核
}
```

#### 2. 審核權限

- ✅ **只有超級管理員**可以審核商品
- ✅ 子管理員**不能**審核自己或他人的商品
- ✅ 子管理員可以**重新提交**被拒絕的商品

#### 3. 編輯權限

- ✅ 超級管理員可以編輯所有商品
- ✅ 子管理員只能編輯**自己創建**且**未通過審核**的商品
- ❌ 已通過審核的商品，子管理員無法編輯

---

## 🔧 API 端點

### 商品審核端點

#### 1. 獲取待審核商品列表

```http
GET /api/admin/lottery-sets/pending-approval
```

**權限**：超級管理員專用

**響應**：
```json
{
  "products": [
    {
      "id": "set-123",
      "title": "商品名稱",
      "approval": {
        "status": "PENDING",
        "createdBy": "user-id",
        "createdByName": "admin@example.com",
        "createdAt": 1234567890
      }
    }
  ],
  "count": 5
}
```

#### 2. 審核通過商品

```http
POST /api/admin/lottery-sets/:id/approve
```

**權限**：超級管理員專用

**請求體**：
```json
{
  "note": "審核通過，商品質量良好"
}
```

**響應**：
```json
{
  "message": "商品審核通過",
  "product": {
    "id": "set-123",
    "status": "AVAILABLE",
    "approval": {
      "status": "APPROVED",
      "reviewedBy": "super-admin-id",
      "reviewedByName": "super@example.com",
      "reviewedAt": 1234567890,
      "reviewNote": "審核通過，商品質量良好"
    }
  }
}
```

#### 3. 拒絕商品

```http
POST /api/admin/lottery-sets/:id/reject
```

**權限**：超級管理員專用

**請求體**：
```json
{
  "note": "商品圖片不清晰，請重新上傳"
}
```

**響應**：
```json
{
  "message": "商品已拒絕",
  "product": {
    "id": "set-123",
    "status": "REJECTED",
    "approval": {
      "status": "REJECTED",
      "reviewedBy": "super-admin-id",
      "reviewedByName": "super@example.com",
      "reviewedAt": 1234567890,
      "reviewNote": "商品圖片不清晰，請重新上傳"
    }
  }
}
```

#### 4. 重新提交審核

```http
POST /api/admin/lottery-sets/:id/resubmit
```

**權限**：子管理員（僅自己的商品）

**請求體**：
```json
{
  "note": "已更新商品圖片，重新提交審核"
}
```

**響應**：
```json
{
  "message": "商品已重新提交審核",
  "product": {
    "id": "set-123",
    "status": "PENDING_APPROVAL",
    "approval": {
      "status": "PENDING"
    }
  }
}
```

---

## 📊 數據結構

### 商品審核記錄

```javascript
{
  id: "set-123",
  title: "商品名稱",
  status: "PENDING_APPROVAL",  // 商品狀態
  
  // 審核記錄
  approval: {
    status: "PENDING",           // 審核狀態
    
    // 創建信息
    createdBy: "user-id",
    createdByName: "admin@example.com",
    createdByRole: "ADMIN",
    createdAt: 1234567890,
    
    // 審核信息
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    
    // 歷史記錄
    history: [
      {
        action: "CREATED",
        status: "PENDING",
        userId: "user-id",
        userName: "admin@example.com",
        timestamp: 1234567890,
        note: "商品已創建，等待審核"
      },
      {
        action: "APPROVED",
        status: "APPROVED",
        userId: "super-admin-id",
        userName: "super@example.com",
        timestamp: 1234567900,
        note: "審核通過"
      }
    ]
  }
}
```

---

## 🚀 部署步驟

### 1. 升級現有管理員為超級管理員

```bash
cd backend
node scripts/upgrade-to-super-admin.js 123123@gmail.com
```

**輸出**：
```
[UPGRADE] Starting upgrade process...
[UPGRADE] Target email: 123123@gmail.com
[UPGRADE] Found user: { id: 'xxx', email: '123123@gmail.com', currentRole: 'ADMIN' }
[UPGRADE] ✅ User upgraded to SUPER_ADMIN successfully!
[UPGRADE] New role: SUPER_ADMIN
```

### 2. 創建子管理員

可以通過以下方式創建子管理員：

#### 方式 A：註冊時指定

```javascript
// 在註冊端點中
const user = await db.createUser({
  email: 'subadmin@example.com',
  password: hashedPassword,
  role: 'ADMIN',  // 子管理員
  roles: ['user', 'ADMIN']
});
```

#### 方式 B：升級現有用戶

創建升級腳本 `scripts/upgrade-to-admin.js`：

```javascript
// 將普通用戶升級為子管理員
await userDoc.ref.update({
  role: 'ADMIN',
  roles: ['user', 'ADMIN']
});
```

### 3. 測試審核流程

#### 測試步驟：

1. **子管理員登入**
   ```bash
   POST /api/auth/login
   { "email": "subadmin@example.com", "password": "xxx" }
   ```

2. **創建商品**（應該進入待審核狀態）
   ```bash
   POST /api/admin/lottery-sets
   { "title": "測試商品", "price": 100, ... }
   ```

3. **超級管理員登入**
   ```bash
   POST /api/auth/login
   { "email": "123123@gmail.com", "password": "123123" }
   ```

4. **查看待審核商品**
   ```bash
   GET /api/admin/lottery-sets/pending-approval
   ```

5. **審核通過**
   ```bash
   POST /api/admin/lottery-sets/:id/approve
   { "note": "審核通過" }
   ```

6. **驗證商品已上架**
   ```bash
   GET /api/lottery-sets
   # 應該能看到剛才的商品
   ```

---

## 🔒 安全考慮

### 1. 權限檢查

所有管理端點都應該檢查權限：

```javascript
// 超級管理員專用
app.post('/api/admin/approve', async (req, res) => {
  const sess = await getSession(req);
  if (!isSuperAdmin(sess?.user)) {
    return res.status(403).json({ 
      message: '需要超級管理員權限' 
    });
  }
  // ...
});

// 管理員（包括超級管理員和子管理員）
app.post('/api/admin/products', async (req, res) => {
  const sess = await getSession(req);
  if (!isAdmin(sess?.user)) {
    return res.status(403).json({ 
      message: '需要管理員權限' 
    });
  }
  // ...
});
```

### 2. 操作日誌

所有審核操作都會記錄：

```javascript
logRoleAction(user, 'APPROVE_PRODUCT', {
  productId: id,
  productTitle: product.title,
  note: '審核通過'
});
```

### 3. 前端過濾

前端只顯示已通過審核的商品：

```javascript
// 一般用戶看到的商品列表
const approvedProducts = products.filter(p => 
  p.approval?.status === 'APPROVED'
);

// 管理員看到所有商品（包括待審核）
const allProducts = products;
```

---

## 📱 前端整合

### 1. 權限判斷

```typescript
// 檢查是否為超級管理員
const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

// 檢查是否為管理員（包括超級和子管理員）
const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role);

// 根據權限顯示不同UI
{isSuperAdmin && (
  <Button onClick={handleApprove}>審核通過</Button>
)}
```

### 2. 商品狀態顯示

```typescript
// 審核狀態標籤
const ApprovalBadge = ({ status }) => {
  const config = {
    PENDING: { label: '待審核', color: 'warning' },
    APPROVED: { label: '已上架', color: 'success' },
    REJECTED: { label: '已拒絕', color: 'error' }
  };
  
  const { label, color } = config[status] || {};
  return <Chip label={label} color={color} />;
};
```

### 3. 待審核商品提示

```typescript
// 顯示待審核數量
const PendingCount = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/admin/lottery-sets/pending-approval')
        .then(res => res.json())
        .then(data => setCount(data.count));
    }
  }, [isSuperAdmin]);
  
  return count > 0 && (
    <Badge badgeContent={count} color="warning">
      <NotificationsIcon />
    </Badge>
  );
};
```

---

## 🧪 測試案例

### 測試 1：子管理員創建商品

```bash
# 1. 子管理員登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"subadmin@example.com","password":"xxx"}'

# 2. 創建商品
curl -X POST http://localhost:8080/api/admin/lottery-sets \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{
    "title": "測試商品",
    "price": 100,
    "imageUrl": "https://example.com/image.jpg"
  }'

# 預期結果：
# - 商品創建成功
# - status: "PENDING_APPROVAL"
# - approval.status: "PENDING"
# - message: "商品已創建，等待審核"
```

### 測試 2：超級管理員審核

```bash
# 1. 超級管理員登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"123123@gmail.com","password":"123123"}'

# 2. 查看待審核商品
curl -X GET http://localhost:8080/api/admin/lottery-sets/pending-approval \
  -H "Cookie: session=xxx"

# 3. 審核通過
curl -X POST http://localhost:8080/api/admin/lottery-sets/set-123/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{"note":"審核通過"}'

# 預期結果：
# - 商品狀態變為 "AVAILABLE"
# - approval.status: "APPROVED"
# - 前端可以看到該商品
```

### 測試 3：權限檢查

```bash
# 子管理員嘗試審核（應該失敗）
curl -X POST http://localhost:8080/api/admin/lottery-sets/set-123/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: session=subadmin-session" \
  -d '{"note":"審核通過"}'

# 預期結果：
# - 403 Forbidden
# - message: "需要超級管理員權限"
# - code: "SUPER_ADMIN_ONLY"
```

---

## 📚 相關文件

| 文件 | 說明 |
|------|------|
| `backend/utils/roles.js` | 權限系統核心 |
| `backend/utils/product-approval.js` | 商品審核系統 |
| `backend/scripts/upgrade-to-super-admin.js` | 升級超級管理員腳本 |
| `backend/server-firestore.js` | API 端點實施 |

---

## 🎯 下一步

### 建議功能擴展

1. **批量審核**
   - 一次審核多個商品
   - 批量通過/拒絕

2. **審核通知**
   - Email 通知子管理員審核結果
   - 系統內通知

3. **審核統計**
   - 審核通過率
   - 平均審核時間
   - 各管理員審核數量

4. **審核歷史**
   - 查看所有審核記錄
   - 審核決策追溯

---

**文檔版本**：1.0  
**最後更新**：2025-12-01  
**維護者**：Backend Team

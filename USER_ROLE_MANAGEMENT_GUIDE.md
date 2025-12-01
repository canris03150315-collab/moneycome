# 用戶權限管理指南

## 📋 概述

用戶管理系統現在支持三級權限設置，管理員可以通過 API 設置用戶的角色。

更新日期：2025-12-01  
版本：v2.0

---

## 🎭 三種角色

| 角色代碼 | 中文名稱 | 等級 | 說明 |
|---------|---------|------|------|
| `USER` | 一般玩家 | 1 | 基本功能 |
| `ADMIN` | 子管理員 | 2 | 管理功能（需審核） |
| `SUPER_ADMIN` | 最大權限管理員 | 3 | 所有權限 + 審核 |

---

## 🔑 權限矩陣

### 設置角色權限

| 當前角色 | 可設置的角色 | 限制 |
|---------|------------|------|
| **超級管理員** | USER, ADMIN, SUPER_ADMIN | ✅ 可設置所有角色 |
| **子管理員** | USER, ADMIN | ❌ 不能設置超級管理員 |
| **一般玩家** | - | ❌ 無權限 |

### 修改用戶權限

| 當前角色 | 可修改的用戶 | 限制 |
|---------|------------|------|
| **超級管理員** | 所有用戶 | ✅ 可修改任何用戶 |
| **子管理員** | 僅普通用戶 | ❌ 不能修改其他管理員 |
| **一般玩家** | - | ❌ 無權限 |

---

## 📡 API 端點

### 1. 獲取角色列表

```http
GET /api/admin/roles
Authorization: Bearer {session_token}
```

**權限**：管理員（ADMIN 或 SUPER_ADMIN）

**響應**：

**超級管理員看到的角色列表**：
```json
{
  "roles": [
    { "value": "USER", "label": "一般玩家", "level": 1 },
    { "value": "ADMIN", "label": "子管理員", "level": 2 },
    { "value": "SUPER_ADMIN", "label": "最大權限管理員", "level": 3 }
  ],
  "currentUserRole": "SUPER_ADMIN",
  "currentUserRoleName": "最大權限管理員"
}
```

**子管理員看到的角色列表**：
```json
{
  "roles": [
    { "value": "USER", "label": "一般玩家", "level": 1 },
    { "value": "ADMIN", "label": "子管理員", "level": 2 }
  ],
  "currentUserRole": "ADMIN",
  "currentUserRoleName": "子管理員"
}
```

---

### 2. 獲取用戶列表

```http
GET /api/admin/users
Authorization: Bearer {session_token}
```

**權限**：管理員（ADMIN 或 SUPER_ADMIN）

**響應**：
```json
[
  {
    "id": "user-123",
    "email": "user@example.com",
    "username": "測試用戶",
    "role": "USER",
    "roleName": "一般玩家",
    "points": 1000,
    "createdAt": 1733034000000
  },
  {
    "id": "admin-456",
    "email": "admin@example.com",
    "username": "子管理員",
    "role": "ADMIN",
    "roleName": "子管理員",
    "points": 5000,
    "createdAt": 1733034000000
  },
  {
    "id": "super-789",
    "email": "super@example.com",
    "username": "超級管理員",
    "role": "SUPER_ADMIN",
    "roleName": "最大權限管理員",
    "points": 10000,
    "createdAt": 1733034000000
  }
]
```

---

### 3. 更新用戶角色

```http
PUT /api/admin/users/:id/role
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "role": "ADMIN"
}
```

**權限**：管理員（ADMIN 或 SUPER_ADMIN）

**請求參數**：
- `role`: 新角色，可選值：`USER`, `ADMIN`, `SUPER_ADMIN`

**響應**：

**成功**：
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "role": "ADMIN",
  "roles": ["user", "ADMIN"],
  "updatedAt": 1733034000000,
  "message": "用戶角色已更新為 子管理員"
}
```

**失敗 - 權限不足**：
```json
{
  "message": "只有超級管理員可以設置超級管理員權限",
  "code": "SUPER_ADMIN_ONLY"
}
```

**失敗 - 子管理員嘗試修改其他管理員**：
```json
{
  "message": "子管理員不能修改其他管理員的權限",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**失敗 - 最後一個超級管理員**：
```json
{
  "message": "不能移除最後一個超級管理員",
  "code": "LAST_SUPER_ADMIN"
}
```

---

## 🛡️ 安全規則

### 1. 不能修改自己的角色

```javascript
// ❌ 錯誤示例
PUT /api/admin/users/my-own-id/role
{
  "role": "SUPER_ADMIN"
}

// 響應：
{
  "message": "不能修改自己的角色"
}
```

### 2. 子管理員不能設置超級管理員

```javascript
// 子管理員登入
// ❌ 錯誤示例
PUT /api/admin/users/user-123/role
{
  "role": "SUPER_ADMIN"
}

// 響應：
{
  "message": "只有超級管理員可以設置超級管理員權限",
  "code": "SUPER_ADMIN_ONLY"
}
```

### 3. 子管理員不能修改其他管理員

```javascript
// 子管理員登入
// ❌ 錯誤示例：嘗試修改另一個子管理員
PUT /api/admin/users/another-admin-id/role
{
  "role": "USER"
}

// 響應：
{
  "message": "子管理員不能修改其他管理員的權限",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### 4. 不能移除最後一個超級管理員

```javascript
// ❌ 錯誤示例：系統只有一個超級管理員時
PUT /api/admin/users/last-super-admin-id/role
{
  "role": "ADMIN"
}

// 響應：
{
  "message": "不能移除最後一個超級管理員",
  "code": "LAST_SUPER_ADMIN"
}
```

---

## 🧪 測試案例

### 測試 1：超級管理員設置角色

```bash
# 1. 超級管理員登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@example.com","password":"xxx"}'

# 2. 獲取角色列表
curl -X GET http://localhost:8080/api/admin/roles \
  -H "Cookie: session=xxx"

# 預期結果：3 種角色
# - USER (一般玩家)
# - ADMIN (子管理員)
# - SUPER_ADMIN (最大權限管理員)

# 3. 設置用戶為子管理員
curl -X PUT http://localhost:8080/api/admin/users/user-123/role \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{"role":"ADMIN"}'

# 預期結果：
# - 成功
# - message: "用戶角色已更新為 子管理員"

# 4. 設置用戶為超級管理員
curl -X PUT http://localhost:8080/api/admin/users/user-456/role \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{"role":"SUPER_ADMIN"}'

# 預期結果：
# - 成功
# - message: "用戶角色已更新為 最大權限管理員"
```

### 測試 2：子管理員設置角色

```bash
# 1. 子管理員登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"xxx"}'

# 2. 獲取角色列表
curl -X GET http://localhost:8080/api/admin/roles \
  -H "Cookie: session=xxx"

# 預期結果：2 種角色
# - USER (一般玩家)
# - ADMIN (子管理員)
# ❌ 沒有 SUPER_ADMIN

# 3. 設置普通用戶為子管理員（✅ 應該成功）
curl -X PUT http://localhost:8080/api/admin/users/user-123/role \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{"role":"ADMIN"}'

# 預期結果：
# - 成功
# - message: "用戶角色已更新為 子管理員"

# 4. 嘗試設置超級管理員（❌ 應該失敗）
curl -X PUT http://localhost:8080/api/admin/users/user-456/role \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{"role":"SUPER_ADMIN"}'

# 預期結果：
# - 403 Forbidden
# - message: "只有超級管理員可以設置超級管理員權限"
# - code: "SUPER_ADMIN_ONLY"

# 5. 嘗試修改另一個管理員（❌ 應該失敗）
curl -X PUT http://localhost:8080/api/admin/users/another-admin-id/role \
  -H "Content-Type: application/json" \
  -H "Cookie: session=xxx" \
  -d '{"role":"USER"}'

# 預期結果：
# - 403 Forbidden
# - message: "子管理員不能修改其他管理員的權限"
# - code: "INSUFFICIENT_PERMISSIONS"
```

### 測試 3：驗證角色列表

```bash
# 獲取用戶列表
curl -X GET http://localhost:8080/api/admin/users \
  -H "Cookie: session=xxx"

# 預期結果：每個用戶都有 roleName 字段
# [
#   {
#     "id": "user-123",
#     "email": "user@example.com",
#     "role": "USER",
#     "roleName": "一般玩家"
#   },
#   {
#     "id": "admin-456",
#     "email": "admin@example.com",
#     "role": "ADMIN",
#     "roleName": "子管理員"
#   },
#   {
#     "id": "super-789",
#     "email": "super@example.com",
#     "role": "SUPER_ADMIN",
#     "roleName": "最大權限管理員"
#   }
# ]
```

---

## 🎨 前端整合

### 1. 獲取可用角色

```typescript
// 獲取當前用戶可設置的角色列表
const fetchAvailableRoles = async () => {
  const response = await fetch('/api/admin/roles', {
    credentials: 'include'
  });
  const data = await response.json();
  
  console.log('可用角色:', data.roles);
  // 超級管理員：3 種角色
  // 子管理員：2 種角色
  
  return data.roles;
};
```

### 2. 角色選擇器組件

```typescript
const RoleSelector = ({ userId, currentRole, onUpdate }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // 獲取可用角色
    fetch('/api/admin/roles', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setRoles(data.roles));
  }, []);
  
  const handleRoleChange = async (newRole) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message); // "用戶角色已更新為 子管理員"
        onUpdate(data);
      } else {
        alert(data.message); // 錯誤訊息
      }
    } catch (error) {
      alert('更新失敗');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Select
      value={currentRole}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={loading}
    >
      {roles.map(role => (
        <MenuItem key={role.value} value={role.value}>
          {role.label}
        </MenuItem>
      ))}
    </Select>
  );
};
```

### 3. 用戶列表顯示

```typescript
const UserList = () => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);
  
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Email</TableCell>
          <TableCell>角色</TableCell>
          <TableCell>操作</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Chip 
                label={user.roleName} 
                color={
                  user.role === 'SUPER_ADMIN' ? 'error' :
                  user.role === 'ADMIN' ? 'warning' : 'default'
                }
              />
            </TableCell>
            <TableCell>
              <RoleSelector 
                userId={user.id}
                currentRole={user.role}
                onUpdate={() => fetchUsers()}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

---

## 📊 數據結構

### 用戶對象（新格式）

```javascript
{
  id: "user-123",
  email: "user@example.com",
  username: "測試用戶",
  
  // 新格式：單一 role 字段
  role: "ADMIN",
  
  // 舊格式：roles 陣列（保持兼容性）
  roles: ["user", "ADMIN"],
  
  // 前端顯示用
  roleName: "子管理員",
  
  points: 1000,
  createdAt: 1733034000000,
  updatedAt: 1733034000000
}
```

---

## 📝 操作日誌

所有角色變更都會記錄：

```javascript
{
  timestamp: "2025-12-01T07:44:40.000Z",
  userId: "super-admin-id",
  userEmail: "super@example.com",
  userRole: "SUPER_ADMIN",
  action: "UPDATE_USER_ROLE",
  details: {
    targetUserId: "user-123",
    targetUserEmail: "user@example.com",
    oldRole: "USER",
    newRole: "ADMIN"
  }
}
```

---

## 🚀 部署狀態

| 項目 | 狀態 |
|------|------|
| **Git Commit** | `3c91b24` ✅ |
| **Cloud Build** | SUCCESS (2m12s) ✅ |
| **部署時間** | 2025-12-01 15:44 UTC+8 ✅ |
| **Revision** | `ichiban-backend-new-00180` ✅ |

---

## ✅ 總結

**現在支持的功能**：
- ✅ 三種角色：一般玩家 / 子管理員 / 最大權限管理員
- ✅ 角色列表 API（根據權限返回不同選項）
- ✅ 用戶列表顯示中文角色名稱
- ✅ 完整的權限檢查（超級管理員 > 子管理員 > 一般玩家）
- ✅ 安全規則（不能修改自己、不能移除最後一個超管等）
- ✅ 操作日誌記錄

**前端需要做的**：
1. 調用 `/api/admin/roles` 獲取可用角色列表
2. 在用戶管理頁面顯示角色選擇器
3. 使用 `PUT /api/admin/users/:id/role` 更新角色
4. 顯示 `roleName` 中文名稱

**系統已準備就緒！** 🎉

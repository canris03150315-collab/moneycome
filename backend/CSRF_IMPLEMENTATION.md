# CSRF 保護實施指南

## ⚠️ 重要說明

CSRF 保護需要前後端配合，實施時需要謹慎，避免影響現有功能。

## 📋 **實施步驟**

### **階段 1: 後端準備（已完成）**

✅ 已安裝 `csurf` 和 `cookie-parser`

### **階段 2: 後端配置**

在 `server-firestore.js` 中添加：

```javascript
const csrf = require('csurf');

// 配置 CSRF 保護
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// CSRF token 端點
app.get(`${base}/csrf-token`, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 保護所有狀態變更端點
app.post(`${base}/lottery-sets/:id/draw`, csrfProtection, drawLimiter, async (req, res) => {
  // ... 原有邏輯
});

app.post(`${base}/user/recharge`, csrfProtection, async (req, res) => {
  // ... 原有邏輯
});

app.post(`${base}/auth/register`, csrfProtection, strictLimiter, validate('register'), async (req, res) => {
  // ... 原有邏輯
});

app.post(`${base}/auth/login`, csrfProtection, strictLimiter, validate('login'), async (req, res) => {
  // ... 原有邏輯
});
```

### **階段 3: 前端配置**

在前端 API 調用中添加 CSRF token：

```typescript
// 在 utils/api.ts 或類似文件中

let csrfToken: string | null = null;

async function getCsrfToken() {
  if (!csrfToken) {
    const response = await fetch(`${API_BASE_URL}/csrf-token`, {
      credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

// 修改 apiCall 函數
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 對於狀態變更請求，添加 CSRF token
  if (['POST', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
    const token = await getCsrfToken();
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token
    };
  }
  
  // ... 原有邏輯
}
```

### **階段 4: 測試**

1. **測試 CSRF token 獲取**
   ```bash
   curl http://localhost:8080/api/csrf-token
   ```

2. **測試保護的端點**
   ```bash
   # 沒有 token - 應該失敗
   curl -X POST http://localhost:8080/api/lottery-sets/test/draw
   
   # 有 token - 應該成功
   curl -X POST http://localhost:8080/api/lottery-sets/test/draw \
     -H "X-CSRF-Token: <token>"
   ```

3. **前端測試**
   - 測試登入
   - 測試註冊
   - 測試抽獎
   - 測試充值

## ⚠️ **注意事項**

### **為什麼暫時不實施？**

1. **影響範圍大**: 需要修改所有狀態變更端點
2. **前端配合**: 需要修改前端所有 API 調用
3. **測試複雜**: 需要全面測試所有功能
4. **風險較高**: 可能導致現有功能暫時不可用

### **替代方案（當前使用）**

當前系統已有以下保護措施：

1. ✅ **SameSite Cookie**: 設置為 `none`（允許跨域）
2. ✅ **HttpOnly Cookie**: 防止 XSS 竊取
3. ✅ **Secure Cookie**: HTTPS only
4. ✅ **速率限制**: 防止暴力攻擊
5. ✅ **Session 驗證**: 所有端點都需要驗證

這些措施已經提供了基本的 CSRF 保護。

## 📊 **實施優先級**

| 優先級 | 說明 |
|--------|------|
| 🔴 **高** | 密碼加密（已完成） |
| 🔴 **高** | Session 安全（已完成） |
| 🟡 **中** | CSRF 保護（建議在測試環境先實施） |

## 🎯 **建議實施時機**

1. **測試環境**: 先在測試環境實施並測試
2. **灰度發布**: 逐步開放給部分用戶
3. **全面上線**: 確認無問題後全面上線

## 📝 **實施檢查清單**

### **後端**
- [ ] 添加 CSRF middleware
- [ ] 創建 CSRF token 端點
- [ ] 保護所有 POST/PUT/DELETE 端點
- [ ] 測試所有端點

### **前端**
- [ ] 修改 API 調用函數
- [ ] 添加 CSRF token 獲取邏輯
- [ ] 測試所有功能
- [ ] 處理 token 過期情況

### **測試**
- [ ] 單元測試
- [ ] 集成測試
- [ ] 端到端測試
- [ ] 安全測試

## 🔧 **故障排除**

### **問題 1: Token 無效**
- 檢查 cookie 設置
- 檢查 token 是否正確傳遞
- 檢查 CORS 設置

### **問題 2: 前端無法獲取 token**
- 檢查 CORS credentials
- 檢查 cookie 設置
- 檢查網絡請求

### **問題 3: 現有功能受影響**
- 暫時移除 CSRF 保護
- 逐個端點測試
- 確認前端配置正確

---

**結論**: CSRF 保護是重要的安全措施，但需要謹慎實施。建議先完成密碼加密和 Session 安全改進，然後在測試環境中實施 CSRF 保護。

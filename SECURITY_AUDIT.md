# 🔒 Web 應用滲透測試報告

**應用名稱**: 一番賞抽獎系統  
**測試日期**: 2025-12-01  
**測試範圍**: 前端 + 後端 API  
**測試方法**: 靜態代碼審查 + 架構分析  

---

## 📋 **執行摘要**

### **風險等級統計**
- 🔴 **高風險**: 3 個
- 🟡 **中風險**: 5 個
- 🟢 **低風險**: 4 個
- ✅ **良好實踐**: 6 個

### **關鍵發現**
1. ❌ 密碼以明文形式儲存（高風險）
2. ❌ Session 管理存在安全隱患（高風險）
3. ❌ 缺少 CSRF 保護（高風險）
4. ⚠️ 缺少速率限制（部分端點）
5. ⚠️ 敏感資訊可能洩露

---

## 🔴 **高風險問題**

### **1. 密碼明文儲存 (Critical)**

**位置**: `backend/server-firestore.js`

**問題描述**:
```javascript
// 註冊用戶
const newUser = await db.createUser({
  email,
  password,  // ❌ 明文儲存密碼
  displayName,
  role: 'USER',
  points: 0
});

// 登入驗證
if (user.password !== password) {  // ❌ 明文比對
  return res.status(401).json({ message: '密碼錯誤' });
}
```

**風險**:
- 資料庫洩露時，所有用戶密碼直接暴露
- 內部人員可以看到用戶密碼
- 違反 OWASP Top 10 - A02:2021 Cryptographic Failures

**修復建議**:
```javascript
const bcrypt = require('bcrypt');

// 註冊時加密
const hashedPassword = await bcrypt.hash(password, 10);
const newUser = await db.createUser({
  email,
  password: hashedPassword,  // ✅ 儲存 hash
  displayName,
  role: 'USER',
  points: 0
});

// 登入時驗證
const isValid = await bcrypt.compare(password, user.password);
if (!isValid) {
  return res.status(401).json({ message: '密碼錯誤' });
}
```

**優先級**: 🔴 **立即修復**

---

### **2. Session 管理安全問題 (High)**

**位置**: `backend/server-firestore.js`

**問題描述**:
```javascript
// Session ID 生成不夠安全
const sid = crypto.randomBytes(16).toString('hex');  // ⚠️ 可預測性

// Session 存儲在 Firestore，但沒有加密
await db.createSession({
  id: sid,
  user: { ...user, password: undefined },  // ⚠️ 仍可能洩露敏感資訊
  orders: [],
  createdAt: Date.now(),
  expiresAt: Date.now() + SESSION_DURATION
});

// Cookie 設置缺少安全屬性
res.cookie('sessionId', sid, {
  httpOnly: true,
  maxAge: SESSION_DURATION,
  // ❌ 缺少 secure: true
  // ❌ 缺少 sameSite: 'strict'
});
```

**風險**:
- Session 固定攻擊
- Session 劫持
- XSS 攻擊可能竊取 session

**修復建議**:
```javascript
// 1. 使用更安全的 Session ID 生成
const sid = crypto.randomBytes(32).toString('base64url');

// 2. 加密敏感 Session 數據
const encryptedSession = encrypt(JSON.stringify(sessionData));

// 3. 設置安全的 Cookie 屬性
res.cookie('sessionId', sid, {
  httpOnly: true,
  secure: true,  // ✅ HTTPS only
  sameSite: 'strict',  // ✅ CSRF 保護
  maxAge: SESSION_DURATION,
  path: '/'
});

// 4. 實現 Session 輪換
if (Date.now() - session.lastRotation > 15 * 60 * 1000) {
  const newSid = generateNewSessionId();
  await rotateSession(oldSid, newSid);
}
```

**優先級**: 🔴 **高優先級**

---

### **3. 缺少 CSRF 保護 (High)**

**位置**: 所有 POST/PUT/DELETE 端點

**問題描述**:
```javascript
// 所有狀態變更端點都沒有 CSRF token 驗證
app.post(`${base}/lottery-sets/:id/draw`, async (req, res) => {
  // ❌ 沒有 CSRF token 檢查
  // 攻擊者可以構造惡意請求
});

app.post(`${base}/user/recharge`, async (req, res) => {
  // ❌ 沒有 CSRF token 檢查
});
```

**風險**:
- 跨站請求偽造攻擊
- 攻擊者可以誘導用戶執行非預期操作
- 可能導致未授權的抽獎、充值等操作

**修復建議**:
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// 1. 生成 CSRF token
app.get(`${base}/csrf-token`, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 2. 保護所有狀態變更端點
app.post(`${base}/lottery-sets/:id/draw`, csrfProtection, async (req, res) => {
  // ✅ 自動驗證 CSRF token
});

// 3. 前端發送請求時帶上 token
fetch('/api/lottery-sets/123/draw', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken
  }
});
```

**優先級**: 🔴 **高優先級**

---

## 🟡 **中風險問題**

### **4. 不完整的速率限制 (Medium)**

**位置**: `backend/server-firestore.js`

**問題描述**:
```javascript
// 只有抽獎端點有速率限制
const drawLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: '請求過於頻繁，請稍後再試'
});

app.post(`${base}/lottery-sets/:id/draw`, drawLimiter, ...);

// ❌ 其他端點沒有速率限制
app.post(`${base}/auth/login`, ...);  // 可暴力破解
app.post(`${base}/user/recharge`, ...);  // 可濫用
app.post(`${base}/auth/register`, ...);  // 可大量註冊
```

**風險**:
- 暴力破解登入
- 帳號枚舉攻擊
- 資源耗盡攻擊（DoS）
- 大量註冊假帳號

**修復建議**:
```javascript
// 1. 登入端點速率限制（更嚴格）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分鐘
  max: 5,  // 最多 5 次嘗試
  skipSuccessfulRequests: true,  // 成功登入不計數
  message: '登入嘗試次數過多，請 15 分鐘後再試'
});

// 2. 註冊端點速率限制
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 小時
  max: 3,  // 最多 3 個帳號
  message: '註冊次數過多，請稍後再試'
});

// 3. 充值端點速率限制
const rechargeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: '充值請求過於頻繁'
});

// 4. 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,  // 每分鐘 100 個請求
  message: '請求過於頻繁'
});

app.use(`${base}/`, globalLimiter);
app.post(`${base}/auth/login`, loginLimiter, ...);
app.post(`${base}/auth/register`, registerLimiter, ...);
app.post(`${base}/user/recharge`, rechargeLimiter, ...);
```

**優先級**: 🟡 **中優先級**

---

### **5. SQL/NoSQL 注入風險 (Medium)**

**位置**: Firestore 查詢

**問題描述**:
```javascript
// Firestore 查詢直接使用用戶輸入
const orders = await db.firestore
  .collection(db.COLLECTIONS.ORDERS)
  .where('lotterySetId', '==', setId)  // ⚠️ 如果 setId 來自用戶輸入
  .get();

// 某些地方可能存在注入風險
const user = await db.getUserByEmail(email);  // ⚠️ email 需要驗證
```

**風險**:
- NoSQL 注入攻擊
- 未授權數據訪問
- 數據洩露

**修復建議**:
```javascript
// 1. 輸入驗證和清理
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>\"']/g, '');
}

// 2. 使用參數化查詢（Firestore 已經做了）
// Firestore 的 where 查詢是安全的，但仍需驗證輸入

// 3. 驗證輸入格式
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidSetId(setId) {
  // 只允許字母、數字、連字符
  return /^[a-zA-Z0-9-]+$/.test(setId);
}

// 4. 使用前驗證
app.get(`${base}/lottery-sets/:id`, async (req, res) => {
  const id = req.params.id;
  
  if (!isValidSetId(id)) {
    return res.status(400).json({ message: '無效的商品 ID' });
  }
  
  // 繼續處理...
});
```

**優先級**: 🟡 **中優先級**

---

### **6. 敏感資訊洩露 (Medium)**

**位置**: 多處

**問題描述**:
```javascript
// 1. 錯誤訊息過於詳細
catch (error) {
  console.error('[DRAW] Full error object:', JSON.stringify(error, null, 2));
  return res.status(500).json({ 
    message: '抽獎失敗',
    error: error.message  // ❌ 洩露內部錯誤
  });
}

// 2. 日誌記錄敏感資訊
console.log('[ADMIN][CREATE_LOTTERY_SET] Data:', JSON.stringify(dataToSave, null, 2));
// ⚠️ 可能包含 _poolSeed 等敏感資訊

// 3. API 響應包含不必要的資訊
return res.json({ 
  success: true,
  user: sess.user,  // ⚠️ 可能包含過多用戶資訊
  order: order  // ⚠️ 可能包含內部 ID
});
```

**風險**:
- 洩露系統架構資訊
- 洩露敏感業務邏輯
- 幫助攻擊者進行偵察

**修復建議**:
```javascript
// 1. 使用通用錯誤訊息
catch (error) {
  console.error('[DRAW] Error:', error);  // 只在服務器日誌
  return res.status(500).json({ 
    message: '操作失敗，請稍後再試'  // ✅ 通用訊息
  });
}

// 2. 過濾敏感日誌
function sanitizeLogData(data) {
  const sanitized = { ...data };
  delete sanitized._poolSeed;
  delete sanitized.password;
  return sanitized;
}

console.log('[ADMIN][CREATE_LOTTERY_SET] Data:', 
  JSON.stringify(sanitizeLogData(dataToSave), null, 2));

// 3. 只返回必要的資訊
function sanitizeUserData(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    points: user.points,
    role: user.role
    // ❌ 不返回 password, internalId 等
  };
}

return res.json({ 
  success: true,
  user: sanitizeUserData(sess.user),
  orderId: order.id  // 只返回必要的 ID
});
```

**優先級**: 🟡 **中優先級**

---

### **7. 缺少輸入驗證 (Medium)**

**位置**: 多個 API 端點

**問題描述**:
```javascript
// 缺少完整的輸入驗證
app.post(`${base}/lottery-sets/:id/draw`, async (req, res) => {
  const { ticketCount } = req.body;
  
  // ❌ 沒有驗證 ticketCount 的範圍
  // 攻擊者可能發送負數或超大數字
  
  if (ticketCount < 1 || ticketCount > 10) {
    return res.status(400).json({ message: '每次最多抽 10 張' });
  }
  // ⚠️ 沒有檢查是否為整數
});

// 充值端點
app.post(`${base}/user/recharge`, async (req, res) => {
  const { amount } = req.body;
  
  // ❌ 沒有驗證 amount 是否為正數
  // ❌ 沒有驗證 amount 的上限
});
```

**風險**:
- 業務邏輯繞過
- 數據完整性問題
- 可能導致系統錯誤

**修復建議**:
```javascript
// 使用驗證庫
const Joi = require('joi');

// 定義驗證規則
const drawSchema = Joi.object({
  ticketCount: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
});

const rechargeSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .max(100000)
    .required(),
  packageId: Joi.string()
    .optional()
});

// 驗證中間件
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: '輸入驗證失敗',
        details: error.details[0].message 
      });
    }
    next();
  };
}

// 使用驗證
app.post(`${base}/lottery-sets/:id/draw`, 
  validate(drawSchema), 
  async (req, res) => {
    // ✅ 輸入已驗證
  }
);
```

**優先級**: 🟡 **中優先級**

---

### **8. 權限控制不完整 (Medium)**

**位置**: 管理員端點

**問題描述**:
```javascript
// 只檢查 role，沒有更細緻的權限控制
app.post(`${base}/admin/lottery-sets`, async (req, res) => {
  const sess = await getSession(req);
  if (!sess?.user || sess.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admin only' });
  }
  
  // ❌ 沒有檢查具體操作權限
  // ❌ 沒有審計日誌
  // ❌ 沒有二次驗證
});

// 用戶可以修改任何訂單？
app.put(`${base}/orders/:id`, async (req, res) => {
  const sess = await getSession(req);
  if (!sess?.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // ❌ 沒有檢查訂單是否屬於當前用戶
  const order = await db.getOrder(req.params.id);
  // 應該檢查: order.userId === sess.user.id
});
```

**風險**:
- 水平越權攻擊
- 垂直越權攻擊
- 未授權操作

**修復建議**:
```javascript
// 1. 實現 RBAC（基於角色的訪問控制）
const permissions = {
  ADMIN: ['create:lottery', 'delete:lottery', 'view:all_orders'],
  USER: ['draw:lottery', 'view:own_orders']
};

function hasPermission(user, permission) {
  return permissions[user.role]?.includes(permission) || false;
}

// 2. 權限檢查中間件
function requirePermission(permission) {
  return async (req, res, next) => {
    const sess = await getSession(req);
    if (!sess?.user || !hasPermission(sess.user, permission)) {
      return res.status(403).json({ message: '權限不足' });
    }
    next();
  };
}

// 3. 資源所有權檢查
async function checkOrderOwnership(req, res, next) {
  const sess = await getSession(req);
  const order = await db.getOrder(req.params.id);
  
  if (order.userId !== sess.user.id && sess.user.role !== 'ADMIN') {
    return res.status(403).json({ message: '無權訪問此訂單' });
  }
  
  req.order = order;
  next();
}

// 4. 使用
app.post(`${base}/admin/lottery-sets`, 
  requirePermission('create:lottery'),
  async (req, res) => {
    // ✅ 已驗證權限
  }
);

app.put(`${base}/orders/:id`, 
  checkOrderOwnership,
  async (req, res) => {
    // ✅ 已驗證所有權
  }
);

// 5. 審計日誌
async function auditLog(action, user, resource) {
  await db.createAuditLog({
    action,
    userId: user.id,
    resource,
    timestamp: Date.now(),
    ip: req.ip
  });
}
```

**優先級**: 🟡 **中優先級**

---

## 🟢 **低風險問題**

### **9. 缺少 HTTP 安全標頭 (Low)**

**問題描述**:
```javascript
// 沒有設置安全標頭
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',  // ⚠️ 生產環境不應該用 *
  credentials: true
}));

// ❌ 缺少其他安全標頭
```

**修復建議**:
```javascript
const helmet = require('helmet');

// 使用 helmet 設置安全標頭
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 設置 CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,  // ✅ 明確指定
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**優先級**: 🟢 **低優先級**

---

### **10. 前端 XSS 風險 (Low)**

**位置**: React 組件

**問題描述**:
```typescript
// React 默認會轉義，但某些地方可能有風險
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // ❌ 危險

// 或使用 innerHTML
element.innerHTML = userInput;  // ❌ 危險
```

**修復建議**:
```typescript
// 1. 避免使用 dangerouslySetInnerHTML
// 2. 如果必須使用，先清理輸入
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{ __html: cleanHTML }} />

// 3. 使用 React 的默認轉義
<div>{userInput}</div>  // ✅ 安全
```

**優先級**: 🟢 **低優先級**

---

### **11. 依賴項安全 (Low)**

**問題描述**:
```json
// package.json 可能包含有漏洞的依賴
```

**修復建議**:
```bash
# 1. 檢查漏洞
npm audit

# 2. 自動修復
npm audit fix

# 3. 手動更新
npm update

# 4. 使用 Snyk 持續監控
npm install -g snyk
snyk test
snyk monitor
```

**優先級**: 🟢 **低優先級**

---

### **12. 日誌管理 (Low)**

**問題描述**:
```javascript
// 日誌可能包含敏感資訊
console.log('[DRAW] User', sess.user.id, 'drew tickets');
```

**修復建議**:
```javascript
// 1. 使用專業日誌庫
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 2. 不同環境不同日誌級別
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 3. 過濾敏感資訊
logger.info('User drew tickets', {
  userId: sess.user.id,
  // ❌ 不記錄 password, sessionId 等
});
```

**優先級**: 🟢 **低優先級**

---

## ✅ **良好實踐**

### **已實現的安全措施**

1. ✅ **使用 HTTPS** (Cloud Run 自動提供)
2. ✅ **HttpOnly Cookies** (防止 XSS 竊取 session)
3. ✅ **抽獎端點速率限制** (防止濫用)
4. ✅ **Session 過期機制** (24 小時自動過期)
5. ✅ **Firestore 安全規則** (需要驗證)
6. ✅ **公平性驗證機制** (防止作弊)

---

## 📊 **修復優先級路線圖**

### **Phase 1: 立即修復 (1-2 週)**
1. 🔴 實現密碼加密（bcrypt）
2. 🔴 添加 CSRF 保護
3. 🔴 改善 Session 安全

### **Phase 2: 高優先級 (2-4 週)**
4. 🟡 添加全面的速率限制
5. 🟡 實現輸入驗證
6. 🟡 改善權限控制

### **Phase 3: 中優先級 (1-2 月)**
7. 🟡 防止資訊洩露
8. 🟡 加強 NoSQL 注入防護
9. 🟢 添加安全標頭

### **Phase 4: 持續改進**
10. 🟢 前端 XSS 防護
11. 🟢 依賴項安全監控
12. 🟢 日誌管理改進

---

## 🛠️ **快速修復腳本**

### **安裝安全依賴**
```bash
cd backend
npm install bcrypt helmet csurf joi winston express-rate-limit
```

### **環境變量設置**
```bash
# .env
NODE_ENV=production
SESSION_SECRET=<strong-random-secret>
BCRYPT_ROUNDS=10
CSRF_SECRET=<another-strong-secret>
```

---

## 📝 **合規性檢查**

### **OWASP Top 10 (2021) 對照**

| OWASP 風險 | 狀態 | 說明 |
|-----------|------|------|
| A01: Broken Access Control | ⚠️ 部分 | 需改進權限控制 |
| A02: Cryptographic Failures | ❌ 失敗 | 密碼明文儲存 |
| A03: Injection | ⚠️ 部分 | 需加強輸入驗證 |
| A04: Insecure Design | ✅ 良好 | 架構設計合理 |
| A05: Security Misconfiguration | ⚠️ 部分 | 缺少安全標頭 |
| A06: Vulnerable Components | ⚠️ 未知 | 需執行 npm audit |
| A07: Authentication Failures | ❌ 失敗 | Session 管理問題 |
| A08: Software and Data Integrity | ✅ 良好 | 有公平性驗證 |
| A09: Logging Failures | ⚠️ 部分 | 日誌需改進 |
| A10: SSRF | ✅ 良好 | 無此風險 |

---

## 🎯 **建議的安全測試工具**

### **自動化掃描**
```bash
# 1. OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-app.com

# 2. Nikto
nikto -h https://your-app.com

# 3. npm audit
npm audit --production

# 4. Snyk
snyk test
```

### **手動測試清單**
- [ ] 暴力破解登入
- [ ] SQL/NoSQL 注入
- [ ] XSS 攻擊
- [ ] CSRF 攻擊
- [ ] Session 劫持
- [ ] 權限繞過
- [ ] 業務邏輯漏洞

---

## 📞 **聯絡與支援**

如需協助實施這些安全修復，請：
1. 優先處理高風險問題
2. 逐步實施中風險修復
3. 定期進行安全審計
4. 建立安全開發流程

---

**報告生成時間**: 2025-12-01  
**下次審計建議**: 3 個月後或重大功能更新後  

---

## 🔐 **結論**

您的應用有良好的基礎架構，但存在一些關鍵的安全問題需要立即處理。最重要的是：

1. **密碼加密** - 這是最嚴重的問題
2. **CSRF 保護** - 防止跨站攻擊
3. **Session 安全** - 保護用戶會話

建議按照優先級路線圖逐步修復，並建立持續的安全監控機制。

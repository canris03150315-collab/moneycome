# 🚨 關鍵安全問題快速修復指南

## 📋 **修復清單**

- [ ] 修復 1: 密碼加密
- [ ] 修復 2: CSRF 保護
- [ ] 修復 3: Session 安全
- [ ] 修復 4: 速率限制
- [ ] 修復 5: 輸入驗證

---

## 🔴 **修復 1: 密碼加密 (最高優先級)**

### **步驟 1: 安裝依賴**
```bash
cd backend
npm install bcrypt
```

### **步驟 2: 創建密碼工具模塊**

創建文件: `backend/utils/password.js`

```javascript
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * 加密密碼
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 驗證密碼
 */
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  verifyPassword
};
```

### **步驟 3: 修改註冊端點**

在 `server-firestore.js` 中修改：

```javascript
const { hashPassword, verifyPassword } = require('./utils/password');

// 註冊端點
app.post(`${base}/auth/register`, async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    
    // 驗證輸入
    if (!email || !password || !displayName) {
      return res.status(400).json({ message: '請填寫完整資訊' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: '密碼長度至少 6 個字元' });
    }
    
    // 檢查郵箱是否已存在
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: '此郵箱已被註冊' });
    }
    
    // ✅ 加密密碼
    const hashedPassword = await hashPassword(password);
    
    // 創建用戶
    const newUser = await db.createUser({
      email,
      password: hashedPassword,  // ✅ 儲存加密後的密碼
      displayName,
      role: 'USER',
      points: 0,
      shippingAddresses: [],
      extensions: 0
    });
    
    // 創建 session
    const sid = crypto.randomBytes(32).toString('base64url');
    const sess = {
      id: sid,
      user: { ...newUser, password: undefined },
      orders: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION
    };
    
    await db.createSession(sess);
    
    res.cookie('sessionId', sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION,
      path: '/'
    });
    
    return res.json({ 
      success: true, 
      user: { ...newUser, password: undefined } 
    });
    
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return res.status(500).json({ message: '註冊失敗' });
  }
});
```

### **步驟 4: 修改登入端點**

```javascript
// 登入端點
app.post(`${base}/auth/login`, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ message: '請輸入郵箱和密碼' });
    }
    
    // 查找用戶
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: '郵箱或密碼錯誤' });
    }
    
    // ✅ 驗證密碼
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: '郵箱或密碼錯誤' });
    }
    
    // 創建 session
    const sid = crypto.randomBytes(32).toString('base64url');
    const sess = {
      id: sid,
      user: { ...user, password: undefined },
      orders: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION
    };
    
    await db.createSession(sess);
    
    res.cookie('sessionId', sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION,
      path: '/'
    });
    
    return res.json({ 
      success: true, 
      user: { ...user, password: undefined } 
    });
    
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return res.status(500).json({ message: '登入失敗' });
  }
});
```

### **步驟 5: 遷移現有密碼**

創建遷移腳本: `backend/migrations/hash-passwords.js`

```javascript
const db = require('../db/firestore');
const { hashPassword } = require('../utils/password');

async function migratePasswords() {
  try {
    console.log('開始遷移密碼...');
    
    // 獲取所有用戶
    const usersSnapshot = await db.firestore.collection('USERS').get();
    
    let count = 0;
    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      
      // 檢查密碼是否已加密（bcrypt hash 以 $2b$ 開頭）
      if (!user.password.startsWith('$2b$')) {
        console.log(`遷移用戶: ${user.email}`);
        
        // 加密密碼
        const hashedPassword = await hashPassword(user.password);
        
        // 更新用戶
        await db.firestore.collection('USERS').doc(doc.id).update({
          password: hashedPassword
        });
        
        count++;
      }
    }
    
    console.log(`✅ 完成！共遷移 ${count} 個用戶的密碼`);
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
  }
}

// 執行遷移
migratePasswords().then(() => process.exit(0));
```

執行遷移:
```bash
node backend/migrations/hash-passwords.js
```

---

## 🔴 **修復 2: CSRF 保護**

### **步驟 1: 安裝依賴**
```bash
npm install csurf cookie-parser
```

### **步驟 2: 配置 CSRF**

在 `server-firestore.js` 中添加：

```javascript
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

// 添加 cookie parser
app.use(cookieParser());

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

app.post(`${base}/auth/register`, csrfProtection, async (req, res) => {
  // ... 原有邏輯
});

app.post(`${base}/auth/login`, csrfProtection, async (req, res) => {
  // ... 原有邏輯
});

// 其他 POST/PUT/DELETE 端點也要添加
```

### **步驟 3: 前端獲取並使用 CSRF Token**

在前端 `apiCall` 函數中添加：

```typescript
// 獲取 CSRF token
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

---

## 🔴 **修復 3: Session 安全改進**

### **修改 Session 創建**

```javascript
// 更安全的 Session ID 生成
function generateSessionId() {
  return crypto.randomBytes(32).toString('base64url');
}

// Session 輪換
async function rotateSession(oldSid, user) {
  const newSid = generateSessionId();
  
  // 刪除舊 session
  await db.deleteSession(oldSid);
  
  // 創建新 session
  const newSession = {
    id: newSid,
    user: { ...user, password: undefined },
    orders: [],
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
    lastRotation: Date.now()
  };
  
  await db.createSession(newSession);
  
  return newSid;
}

// 在關鍵操作後輪換 session
app.post(`${base}/auth/login`, async (req, res) => {
  // ... 登入邏輯
  
  // 創建 session
  const sid = generateSessionId();
  const sess = {
    id: sid,
    user: { ...user, password: undefined },
    orders: [],
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
    lastRotation: Date.now()
  };
  
  await db.createSession(sess);
  
  // 設置安全的 cookie
  res.cookie('sessionId', sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // ✅ HTTPS only
    sameSite: 'strict',  // ✅ CSRF 保護
    maxAge: SESSION_DURATION,
    path: '/'
  });
  
  return res.json({ success: true, user: { ...user, password: undefined } });
});

// 定期輪換 session
async function checkSessionRotation(req, res, next) {
  const sess = await getSession(req);
  
  if (sess && sess.lastRotation) {
    const timeSinceRotation = Date.now() - sess.lastRotation;
    
    // 每 15 分鐘輪換一次
    if (timeSinceRotation > 15 * 60 * 1000) {
      const oldSid = getSessionCookie(req);
      const newSid = await rotateSession(oldSid, sess.user);
      
      res.cookie('sessionId', newSid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_DURATION,
        path: '/'
      });
    }
  }
  
  next();
}

// 應用到需要保護的路由
app.use(`${base}/`, checkSessionRotation);
```

---

## 🟡 **修復 4: 全面速率限制**

```javascript
const rateLimit = require('express-rate-limit');

// 1. 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 分鐘
  max: 100,  // 最多 100 個請求
  message: '請求過於頻繁，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. 登入速率限制（嚴格）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分鐘
  max: 5,  // 最多 5 次嘗試
  skipSuccessfulRequests: true,
  message: '登入嘗試次數過多，請 15 分鐘後再試'
});

// 3. 註冊速率限制
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 小時
  max: 3,  // 最多 3 個帳號
  message: '註冊次數過多，請稍後再試'
});

// 4. 充值速率限制
const rechargeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: '充值請求過於頻繁'
});

// 5. 密碼重置速率限制
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 小時
  max: 3,
  message: '密碼重置請求過多'
});

// 應用速率限制
app.use(`${base}/`, globalLimiter);
app.post(`${base}/auth/login`, loginLimiter, ...);
app.post(`${base}/auth/register`, registerLimiter, ...);
app.post(`${base}/user/recharge`, rechargeLimiter, ...);
app.post(`${base}/auth/password-reset/request`, passwordResetLimiter, ...);
```

---

## 🟡 **修復 5: 輸入驗證**

### **步驟 1: 安裝驗證庫**
```bash
npm install joi
```

### **步驟 2: 創建驗證模塊**

創建文件: `backend/utils/validation.js`

```javascript
const Joi = require('joi');

// 驗證規則
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    displayName: Joi.string().min(1).max(50).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  draw: Joi.object({
    ticketCount: Joi.number().integer().min(1).max(10).required()
  }),
  
  recharge: Joi.object({
    amount: Joi.number().positive().max(100000).required(),
    packageId: Joi.string().optional()
  }),
  
  lotterySetId: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).required()
};

// 驗證中間件
function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ message: '驗證配置錯誤' });
    }
    
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

// 驗證路徑參數
function validateParam(paramName, pattern) {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (!pattern.test(value)) {
      return res.status(400).json({ message: `無效的 ${paramName}` });
    }
    
    next();
  };
}

module.exports = {
  validate,
  validateParam,
  schemas
};
```

### **步驟 3: 應用驗證**

```javascript
const { validate, validateParam } = require('./utils/validation');

// 註冊
app.post(`${base}/auth/register`, 
  validate('register'),
  async (req, res) => {
    // ✅ 輸入已驗證
  }
);

// 登入
app.post(`${base}/auth/login`, 
  validate('login'),
  async (req, res) => {
    // ✅ 輸入已驗證
  }
);

// 抽獎
app.post(`${base}/lottery-sets/:id/draw`, 
  validateParam('id', /^[a-zA-Z0-9-]+$/),
  validate('draw'),
  async (req, res) => {
    // ✅ 輸入已驗證
  }
);

// 充值
app.post(`${base}/user/recharge`, 
  validate('recharge'),
  async (req, res) => {
    // ✅ 輸入已驗證
  }
);
```

---

## 📋 **部署檢查清單**

### **部署前**
- [ ] 所有修復已測試
- [ ] 密碼已遷移
- [ ] 環境變量已設置
- [ ] 依賴已安裝

### **部署後**
- [ ] 驗證登入功能
- [ ] 驗證註冊功能
- [ ] 測試 CSRF 保護
- [ ] 檢查速率限制
- [ ] 監控錯誤日誌

### **環境變量**
```bash
# .env
NODE_ENV=production
SESSION_SECRET=<strong-random-secret-32-chars>
BCRYPT_ROUNDS=10
CSRF_SECRET=<another-strong-secret-32-chars>
```

---

## 🧪 **測試腳本**

創建文件: `backend/security-fixes/test-security.js`

```javascript
// 測試密碼加密
async function testPasswordHashing() {
  const { hashPassword, verifyPassword } = require('../utils/password');
  
  const password = 'test123';
  const hash = await hashPassword(password);
  
  console.log('原始密碼:', password);
  console.log('加密後:', hash);
  console.log('驗證正確密碼:', await verifyPassword(password, hash));
  console.log('驗證錯誤密碼:', await verifyPassword('wrong', hash));
}

// 測試輸入驗證
function testValidation() {
  const { schemas } = require('../utils/validation');
  
  const testCases = [
    { schema: 'register', data: { email: 'test@test.com', password: '123456', displayName: 'Test' } },
    { schema: 'register', data: { email: 'invalid', password: '123', displayName: '' } },
    { schema: 'draw', data: { ticketCount: 5 } },
    { schema: 'draw', data: { ticketCount: -1 } },
  ];
  
  testCases.forEach(({ schema, data }) => {
    const result = schemas[schema].validate(data);
    console.log('Schema:', schema);
    console.log('Data:', data);
    console.log('Valid:', !result.error);
    if (result.error) console.log('Error:', result.error.message);
    console.log('---');
  });
}

// 執行測試
testPasswordHashing().then(() => {
  testValidation();
  process.exit(0);
});
```

執行測試:
```bash
node backend/security-fixes/test-security.js
```

---

## 📞 **需要幫助？**

如果在實施過程中遇到問題：
1. 檢查錯誤日誌
2. 確認依賴已安裝
3. 驗證環境變量
4. 測試每個修復

**記住**: 安全是一個持續的過程，不是一次性的任務！

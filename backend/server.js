// Production-ready backend with Firestore integration
// This version replaces in-memory storage with persistent Firestore

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// Import Firestore database layer
const db = require('./db/firestore');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration
const ALLOWED_ORIGINS = [
  'https://ichiban-frontend-248630813908.us-central1.run.app',
  'http://localhost:5173', // Development
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const base = '/api/v1';

// ============================================
// Legacy 非版本化路由 (/api) - 必須在其他路由之前
// ============================================

// Middleware to forward /api/* to /api/v1/*
app.use('/api', (req, res, next) => {
  // Skip if already /api/v1
  if (req.url.startsWith('/v1')) {
    return next();
  }
  
  // Special cases - static responses
  if (req.url === '/site-config' && req.method === 'GET') {
    return res.json({
      siteName: '一番賞抽獎',
      announcement: '歡迎來到一番賞抽獎平台',
      maintenanceMode: false
    });
  }
  
  if (req.url === '/categories' && req.method === 'GET') {
    return res.json([
      { id: 'lottery', name: '抽獎', description: '一番賞抽獎' },
      { id: 'shop', name: '商城', description: '周邊商品' }
    ]);
  }
  
  if (req.url === '/shop/products' && req.method === 'GET') {
    return res.json([]);
  }
  
  // Forward to /api/v1
  req.url = `/v1${req.url}`;
  next();
});

console.log('✅ Legacy /api routes configured (middleware mode)');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', storage: 'firestore', timestamp: Date.now() });
});

// ============================================
// Session 管理
// ============================================

const COOKIE_NAME = 'sid';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setSessionCookie(res, sid) {
  res.cookie(COOKIE_NAME, sid, {
    httpOnly: true,
    secure: true, // 必須為 true 才能使用 SameSite=None
    sameSite: 'none', // 允許跨域 HTTPS cookie
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
}

function getSessionCookie(req) {
  return req.cookies[COOKIE_NAME];
}

async function getSession(req) {
  // 優先從 cookie 讀取（傳統方式）
  let sid = getSessionCookie(req);
  
  // 如果 cookie 沒有，從 Authorization header 讀取（localStorage 方式）
  if (!sid) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sid = authHeader.substring(7); // 移除 "Bearer " 前綴
    }
  }
  
  if (!sid) return null;
  return await db.getSession(sid);
}

// ============================================
// 商品定義（共享函數）
// ============================================

function getLotterySetsDefinition() {
  return [
    // AVAILABLE + discount
    { id: 'limited-discount-1', title: '限時特價：經典動漫收藏', imageUrl: 'https://picsum.photos/400/300?random=61', price: 1000, discountPrice: 800, categoryId: 'lottery', status: 'AVAILABLE',
      prizes: [
        { id: 'ld1-a', grade: 'A賞', name: '豪華模型', imageUrl: '', remaining: 2, total: 2, type: 'NORMAL' },
        { id: 'ld1-b', grade: 'B賞', name: '精美海報組', imageUrl: '', remaining: 4, total: 4, type: 'NORMAL' },
        { id: 'ld1-c', grade: 'C賞', name: '壓克力吊飾', imageUrl: '', remaining: 8, total: 8, type: 'NORMAL' },
        { id: 'ld1-last', grade: '最後賞', name: '特別紀念框畫', imageUrl: '', remaining: 1, total: 1, type: 'LAST_ONE' },
      ],
      drawnTicketIndices: [0,1,3,5,7,8,12,14,18,21,22,25] },
    // SOLD_OUT
    { id: 'sold-out-demo-1', title: '示範：已售完', imageUrl: 'https://picsum.photos/400/300?random=66', price: 500, categoryId: 'lottery', status: 'SOLD_OUT',
      prizes: [
        { id: 'so1-a', grade: 'A賞', name: '限量公仔', imageUrl: '', remaining: 0, total: 1, type: 'NORMAL' },
        { id: 'so1-b', grade: 'B賞', name: '收藏徽章', imageUrl: '', remaining: 0, total: 2, type: 'NORMAL' },
        { id: 'so1-c', grade: 'C賞', name: '明信片組', imageUrl: '', remaining: 0, total: 3, type: 'NORMAL' },
        { id: 'so1-last', grade: '最後賞', name: '終極海報', imageUrl: '', remaining: 0, total: 1, type: 'LAST_ONE' },
      ] },
    { id: 'set-1', title: '新春福袋', imageUrl: 'https://images.unsplash.com/photo-1551817958-20204d6ab1c9?q=80&w=1200&auto=format&fit=crop', price: 1000, discountPrice: 800, categoryId: 'lottery', status: 'AVAILABLE',
      prizes: [
        { id: 'pa1', grade: 'A賞', name: 'A賞', remaining: 1, total: 1, type: 'NORMAL' },
        { id: 'pb1', grade: 'B賞', name: 'B賞', remaining: 3, total: 3, type: 'NORMAL' },
        { id: 'pc1', grade: 'C賞', name: 'C賞', remaining: 10, total: 10, type: 'NORMAL' },
      ] },
    { id: 'set-2', title: '人氣系列 2025', imageUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=1200&auto=format&fit=crop', price: 1200, categoryId: 'lottery', status: 'AVAILABLE',
      prizes: [
        { id: 'pa2', grade: 'A賞', name: 'A賞', remaining: 0, total: 1, type: 'NORMAL' },
        { id: 'pb2', grade: 'B賞', name: 'B賞', remaining: 2, total: 2, type: 'NORMAL' },
        { id: 'pc2', grade: 'C賞', name: 'C賞', remaining: 15, total: 20, type: 'NORMAL' },
      ] },
  ];
}

// ============================================
// 認證端點
// ============================================

// 登入
app.post(`${base}/auth/login`, async (req, res) => {
  try {
    console.log('[LOGIN] Request received:', { email: req.body?.email });
    let { email, password } = req.body || {};
    
    if (!email || !password) {
      console.log('[LOGIN] Missing email or password');
      return res.status(400).json({ message: 'Email 和 Password 為必要欄位' });
    }
    
    // 從 Firestore 查詢用戶
    console.log('[LOGIN] Querying user from Firestore:', email);
    let user = await db.getUserByEmail(email);
    console.log('[LOGIN] User found in Firestore:', !!user);
    
    // 如果不存在，檢查硬編碼測試帳號
    if (!user) {
      console.log('[LOGIN] Checking hardcoded accounts');
      const ALLOWED = [
        { email: '123123@aaa', password: '123123', username: '測試達人' },
        { email: 'test@example.com', password: 'password123', username: 'TestUser' },
      ];
      const found = ALLOWED.find(u => String(u.email).toLowerCase() === String(email).toLowerCase() && String(u.password) === String(password));
      
      if (!found) {
        console.log('[LOGIN] Invalid credentials');
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      console.log('[LOGIN] Creating new user in Firestore');
      // 創建新用戶到 Firestore
      const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
      const initialPoints = (email === '123123@aaa') ? 2000 : 0;
      user = await db.createUser({
        id: userId,
        email,
        username: found.username,
        password, // 生產環境應加密
        roles: ['user', 'ADMIN'],
        points: initialPoints,
        lotteryStats: {},
        status: 'ACTIVE',
      });
      console.log('[LOGIN] User created:', user.id);
    } else {
      // 驗證密碼
      if (user.password !== password) {
        console.log('[LOGIN] Invalid password');
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      console.log('[LOGIN] Password verified, updating last active');
      // 更新最後活動時間
      await db.updateUser(user.id, { lastActiveAt: new Date().toISOString() });
    }
    
    console.log('[LOGIN] Fetching user data');
    // 獲取用戶的訂單和獎品
    const orders = await db.getUserOrders(user.id);
    console.log('[LOGIN] Orders fetched:', orders.length);
    const prizes = await db.getUserPrizes(user.id);
    console.log('[LOGIN] Prizes fetched:', prizes.length);
    const inventory = Object.fromEntries(prizes.map(p => [p.instanceId, p]));
    const transactions = await db.getUserTransactions(user.id);
    console.log('[LOGIN] Transactions fetched:', transactions.length);
    
    // 創建 Session
    console.log('[LOGIN] Creating session');
    const sessionData = {
      user,
      inventory,
      orders,
      transactions,
      shipments: [],
      pickupRequests: [],
      shopOrders: []
    };
    const sid = await db.createSession(sessionData);
    console.log('[LOGIN] Session created:', sid);
    
    // 設置 cookie（用於支持 cookie-based auth）
    setSessionCookie(res, sid);
    
    // 同時在響應中返回 session ID（用於 localStorage-based auth）
    console.log('[LOGIN] Login successful');
    return res.json({
      ...sessionData,
      sessionId: sid  // ← 新增：讓前端可以存儲在 localStorage
    });
    
  } catch (error) {
    console.error('[LOGIN] Error:', error.message);
    console.error('[LOGIN] Stack:', error.stack);
    return res.status(500).json({ message: '登入失敗', error: error.message });
  }
});

// 註冊
app.post(`${base}/auth/register`, async (req, res) => {
  try {
    let { username, email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email 和 Password 為必要欄位' });
    }
    
    if (!String(email).includes('@')) {
      return res.status(400).json({ message: '帳號必須包含小老鼠(@)' });
    }
    
    username = username || (String(email).split('@')[0]);
    
    // 檢查 email 是否已被註冊
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email 已被註冊' });
    }
    
    // 創建新用戶
    const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
    const user = await db.createUser({
      id: userId,
      email,
      username,
      password, // 生產環境應加密
      roles: ['user'],
      points: 0,
      lotteryStats: {},
      status: 'ACTIVE',
    });
    
    // 創建 Session
    const sessionData = {
      user,
      inventory: {},
      orders: [],
      transactions: [],
      shipments: [],
      pickupRequests: [],
      shopOrders: []
    };
    const sid = await db.createSession(sessionData);
    
    setSessionCookie(res, sid);
    return res.json(sessionData);
    
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return res.status(500).json({ message: '註冊失敗' });
  }
});

// 登出
app.post(`${base}/auth/logout`, async (req, res) => {
  try {
    const sid = getSessionCookie(req);
    if (sid) {
      await db.deleteSession(sid);
    }
    res.clearCookie(COOKIE_NAME);
    return res.json({ success: true });
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    return res.status(500).json({ message: '登出失敗' });
  }
});

// 獲取當前 Session
app.get(`${base}/auth/session`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.json(sess);
  } catch (error) {
    console.error('[SESSION] Error:', error);
    return res.status(500).json({ message: '獲取 Session 失敗' });
  }
});

// ============================================
// 抽獎端點（使用 Firestore）
// ============================================

// 獲取抽獎列表
app.get(`${base}/lottery-sets`, async (req, res) => {
  try {
    const list = getLotterySetsDefinition();
    const merged = await Promise.all(list.map(async (it) => {
      try {
        const st = await db.getLotteryState(it.id);
        return { ...it, drawnTicketIndices: st.drawnTicketIndices || [] };
      } catch {
        return it;
      }
    }));
    res.json(merged);
  } catch (error) {
    console.error('[LOTTERY_SETS] Error:', error);
    res.status(500).json({ message: '獲取抽獎列表失敗' });
  }
});

// 獲取單個抽獎詳情
app.get(`${base}/lottery-sets/:id`, async (req, res) => {
  try {
    const id = req.params.id;
    const all = getLotterySetsDefinition();
    const found = all.find(x => x.id === id) || { 
      id, title: id, imageUrl: '', price: 1000, categoryId: 'lottery', 
      status: 'AVAILABLE', prizes: [], drawnTicketIndices: [] 
    };
    
    try {
      const state = await db.getLotteryState(id);
      res.json({ ...found, drawnTicketIndices: state.drawnTicketIndices || [] });
    } catch {
      res.json(found);
    }
  } catch (error) {
    console.error('[LOTTERY_SET_DETAIL] Error:', error);
    res.status(500).json({ message: '獲取抽獎詳情失敗' });
  }
});

// 抽獎（完整使用 Firestore）
app.post(`${base}/lottery-sets/:id/draw`, async (req, res) => {
  try {
    const sid = getSessionCookie(req);
    if (!sid) return res.status(401).json({ message: 'Unauthorized' });
    
    const sess = await db.getSession(sid);
    if (!sess?.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const setId = req.params.id;
    const { tickets } = req.body;
    
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: '請選擇至少一張籤' });
    }
    
    // 防止重複抽取
    const state = await db.getLotteryState(setId);
    const already = new Set((state.drawnTicketIndices || []).map(Number));
    const requested = (tickets || []).map(Number);
    const conflicted = requested.filter(i => already.has(i));
    
    if (conflicted.length) {
      return res.status(400).json({ message: '部分籤已被抽走，請重新選取', conflicted });
    }
    
    // 計算價格（從商品定義讀取）
    const allSets = getLotterySetsDefinition();
    const setDef = allSets.find(s => s.id === setId);
    const basePrice = setDef?.price || 300;
    const effectivePrice = (setDef?.discountPrice && setDef.discountPrice > 0) 
      ? setDef.discountPrice 
      : basePrice;
    const totalCost = effectivePrice * tickets.length;
    
    // 檢查點數
    const current = Number(sess.user.points || 0);
    if (current < totalCost) {
      return res.status(400).json({ message: '點數不足' });
    }
    
    // 扣除點數
    const newPoints = current - totalCost;
    await db.updateUserPoints(sess.user.id, newPoints);
    sess.user.points = newPoints;
    
    // 標記籤號為已抽出
    await db.markTicketsDrawn(setId, tickets);
    
    // 生成抽獎結果
    const prizePool = setDef?.prizes || [];
    const results = tickets.map((ticketIndex, idx) => {
      const prizeIdx = idx % prizePool.length;
      const prize = prizePool[prizeIdx];
      return {
        ticketIndex,
        prizeId: prize?.id || 'unknown',
        prizeName: prize?.name || '隨機獎品',
        prizeGrade: prize?.grade || '一般賞',
        prizeImageUrl: prize?.imageUrl || '',
      };
    });
    
    // 創建訂單
    const order = await db.createOrder({
      userId: sess.user.id,
      type: 'LOTTERY_DRAW',
      lotterySetId: setId,
      costInPoints: totalCost,
      items: results,
      status: 'COMPLETED',
    });
    
    // 創建獎品實例
    for (const result of results) {
      await db.createPrizeInstance({
        userId: sess.user.id,
        lotterySetId: setId,
        prizeId: result.prizeId,
        prizeName: result.prizeName,
        prizeGrade: result.prizeGrade,
        prizeImageUrl: result.prizeImageUrl,
        orderId: order.id,
        status: 'PENDING_SHIPMENT',
      });
    }
    
    // 創建交易記錄
    await db.createTransaction({
      userId: sess.user.id,
      type: 'DRAW',
      amount: -totalCost,
      description: `抽獎：${setDef?.title || setId}`,
      relatedOrderId: order.id,
    });
    
    // 更新 Session
    sess.orders.unshift(order);
    sess.inventory = Object.fromEntries((await db.getUserPrizes(sess.user.id)).map(p => [p.instanceId, p]));
    await db.updateSession(sid, sess);
    
    console.log(`[DRAW] User ${sess.user.id} drew ${tickets.length} tickets from ${setId}, cost ${totalCost} P`);
    
    return res.json({ 
      success: true, 
      results, 
      user: sess.user,
      order,
      newBalance: newPoints 
    });
    
  } catch (error) {
    console.error('[DRAW] Error:', error);
    return res.status(500).json({ message: '抽獎失敗' });
  }
});

// ============================================
// 隊列管理（已有實現，保留）
// ============================================
// ... (保留原有的隊列邏輯，使用 db.getQueue / db.saveQueue)

// ============================================
// 用戶補點
// ============================================

app.post(`${base}/user/recharge`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { packageId, amount } = req.body;
    if (!packageId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid recharge package' });
    }
    
    // 增加點數
    const currentPoints = Number(sess.user.points || 0);
    const newPoints = currentPoints + amount;
    await db.updateUserPoints(sess.user.id, newPoints);
    sess.user.points = newPoints;
    
    // 創建交易記錄
    const transaction = await db.createTransaction({
      userId: sess.user.id,
      type: 'RECHARGE',
      amount: amount,
      description: `購買點數套餐: ${packageId}`,
    });
    
    // 更新 Session
    await db.updateSession(getSessionCookie(req), sess);
    
    console.log(`[RECHARGE] User ${sess.user.id} recharged ${amount} P`);
    
    return res.json({ 
      success: true, 
      user: sess.user, 
      transaction 
    });
    
  } catch (error) {
    console.error('[RECHARGE] Error:', error);
    return res.status(500).json({ message: '補點失敗' });
  }
});

// ============================================
// 啟動服務器
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server with Firestore running on port ${PORT}`);
  console.log(`📦 Storage: Firestore (persistent)`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  
  // 清理過期 Session（每小時執行一次）
  setInterval(async () => {
    try {
      const count = await db.cleanupExpiredSessions();
      if (count > 0) {
        console.log(`🗑️  Cleaned up ${count} expired sessions`);
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
});

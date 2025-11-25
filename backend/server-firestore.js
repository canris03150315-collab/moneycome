// Production-ready backend with Firestore integration
// This version replaces in-memory storage with persistent Firestore

require('dotenv').config(); // 載入環境變數

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const crypto = require('crypto');

// Import Firestore database layer
const db = require('./db/firestore');

// Import security utilities
const {
  checkIPWhitelist,
  logAudit,
  createBackup,
  validateConfirmToken,
  requireIPWhitelist,
} = require('./utils/security');

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

// 啟用 gzip/brotli 壓縮，減少傳輸量
app.use(compression({
  // 只壓縮大於 1KB 的回應
  threshold: 1024,
  // 壓縮等級 (0-9)，6 是平衡效能和壓縮率的最佳選擇
  level: 6
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const base = '/api';

// 與前端保持一致的運費計算常數
const SHIPPING_BASE_FEE_POINTS = 100;
const SHIPPING_BASE_WEIGHT_G = 3000;
const SHIPPING_EXTRA_FEE_PER_KG = 20;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', storage: 'firestore', timestamp: Date.now() });
});

// ============================================
// Session 管理
// ============================================

const COOKIE_NAME = 'sid';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// 後台管理員驗證密碼（可透過環境變數覆蓋）
const ADMIN_VERIFY_PASSWORD = process.env.ADMIN_VERIFY_PASSWORD || '123123';

function setSessionCookie(res, sid) {
  res.cookie(COOKIE_NAME, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
}

function getSessionCookie(req) {
  return req.cookies[COOKIE_NAME];
}

async function getSession(req) {
  // ⚠️ 優先從 Authorization header 讀取（避免舊 cookie 干擾）
  let sid = null;
  const authHeader = req.headers.authorization;
  console.log('[getSession] Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NOT FOUND');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sid = authHeader.substring(7); // 移除 'Bearer ' 前綴
    console.log('[getSession] ✅ Using sessionId from header:', sid ? `${sid.substring(0, 10)}...` : 'FAILED');
  }
  
  // 如果 header 中沒有，才從 cookie 讀取（向後兼容）
  if (!sid) {
    sid = getSessionCookie(req);
    console.log('[getSession] From cookie:', sid ? `${sid.substring(0, 10)}...` : 'NOT FOUND');
  }
  
  if (!sid) {
    console.log('[getSession] ❌ No sessionId found in either header or cookie');
    return null;
  }
  
  console.log('[getSession] Looking up session in Firestore:', `${sid.substring(0, 10)}...`);
  const session = await db.getSession(sid);
  console.log('[getSession] Session found:', session ? `✅ User: ${session.user?.username}` : '❌ NOT FOUND');
  return session;
}

// ============================================
// 商品定義（從 Firestore 讀取）
// ============================================

async function getLotterySetsDefinition() {
  try {
    const snapshot = await db.firestore.collection('LOTTERY_SETS').get();
    const sets = snapshot.docs.map(doc => doc.data());
    console.log(`[LOTTERY_SETS] Loaded ${sets.length} sets from Firestore`);
    return sets;
  } catch (error) {
    console.error('[LOTTERY_SETS] Error loading from Firestore:', error);
    return [];
  }
}

// 舊的寫死商品定義（已移除，改為從 Firestore 讀取）
function getLotterySetsDefinition_OLD() {
  return [
    // AVAILABLE + discount
    { id: 'limited-discount-1', title: '限時特價：經典動漫收藏', imageUrl: 'https://picsum.photos/400/300?random=61', price: 1000, discountPrice: 800, categoryId: 'cat-anime', status: 'AVAILABLE',
      prizes: [
        { id: 'ld1-a', grade: 'A賞', name: '豪華模型', imageUrl: '', remaining: 2, total: 2, type: 'NORMAL' },
        { id: 'ld1-b', grade: 'B賞', name: '精美海報組', imageUrl: '', remaining: 4, total: 4, type: 'NORMAL' },
        { id: 'ld1-c', grade: 'C賞', name: '壓克力吊飾', imageUrl: '', remaining: 8, total: 8, type: 'NORMAL' },
        { id: 'ld1-last', grade: '最後賞', name: '特別紀念框畫', imageUrl: '', remaining: 1, total: 1, type: 'LAST_ONE' },
      ],
      drawnTicketIndices: [0,1,3,5,7,8,12,14,18,21,22,25] },
    // SOLD_OUT
    { id: 'sold-out-demo-1', title: '示範：已售完', imageUrl: 'https://picsum.photos/400/300?random=66', price: 500, categoryId: 'cat-gaming', status: 'SOLD_OUT',
      prizes: [
        { id: 'so1-a', grade: 'A賞', name: '限量公仔', imageUrl: '', remaining: 0, total: 1, type: 'NORMAL' },
        { id: 'so1-b', grade: 'B賞', name: '收藏徽章', imageUrl: '', remaining: 0, total: 2, type: 'NORMAL' },
        { id: 'so1-c', grade: 'C賞', name: '明信片組', imageUrl: '', remaining: 0, total: 3, type: 'NORMAL' },
        { id: 'so1-last', grade: '最後賞', name: '終極海報', imageUrl: '', remaining: 0, total: 1, type: 'LAST_ONE' },
      ] },
    { id: 'set-1', title: '新春福袋', imageUrl: 'https://images.unsplash.com/photo-1551817958-20204d6ab1c9?q=80&w=1200&auto=format&fit=crop', price: 1000, discountPrice: 800, categoryId: 'cat-original', status: 'AVAILABLE',
      prizes: [
        { id: 'pa1', grade: 'A賞', name: 'A賞', remaining: 1, total: 1, type: 'NORMAL' },
        { id: 'pb1', grade: 'B賞', name: 'B賞', remaining: 3, total: 3, type: 'NORMAL' },
        { id: 'pc1', grade: 'C賞', name: 'C賞', remaining: 10, total: 10, type: 'NORMAL' },
      ] },
    { id: 'set-2', title: '人氣系列 2025', imageUrl: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?q=80&w=1200&auto=format&fit=crop', price: 1200, categoryId: 'cat-anime', status: 'AVAILABLE',
      prizes: [
        { id: 'pa2', grade: 'A賞', name: 'A賞', remaining: 0, total: 1, type: 'NORMAL' },
        { id: 'pb2', grade: 'B賞', name: 'B賞', remaining: 2, total: 2, type: 'NORMAL' },
        { id: 'pc2', grade: 'C賞', name: 'C賞', remaining: 15, total: 20, type: 'NORMAL' },
      ] },
    // 測試用商品：大量簽數＋低單價，方便反覆測試排隊與延長邏輯
    { id: 'test-lottery', title: '測試用：高抽數一番賞', imageUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1200&auto=format&fit=crop', price: 100, categoryId: 'cat-original', status: 'AVAILABLE',
      prizes: [
        { id: 't-a', grade: 'A賞', name: '測試 A賞', remaining: 2, total: 2, type: 'NORMAL', weight: 800, recycleValue: 0 },
        { id: 't-b', grade: 'B賞', name: '測試 B賞', remaining: 5, total: 5, type: 'NORMAL', weight: 500, recycleValue: 0 },
        { id: 't-c', grade: 'C賞', name: '測試 C賞', remaining: 20, total: 20, type: 'NORMAL', weight: 300, recycleValue: 30 },
        { id: 't-d', grade: 'D賞', name: '測試 D賞', remaining: 40, total: 40, type: 'NORMAL', weight: 150, recycleValue: 20 },
        { id: 't-e', grade: 'E賞', name: '測試 E賞', remaining: 60, total: 60, type: 'NORMAL', weight: 80, recycleValue: 10 },
      ],
      allowSelfPickup: true },

    { id: 'test-lottery-2', title: '測試用：高價模型賞', imageUrl: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=1200&auto=format&fit=crop', price: 500, categoryId: 'cat-original', status: 'AVAILABLE',
      prizes: [
        { id: 't2-a', grade: 'A賞', name: '大型模型 A', remaining: 1, total: 1, type: 'NORMAL', weight: 2500, recycleValue: 0 },
        { id: 't2-b', grade: 'B賞', name: '中型模型 B', remaining: 3, total: 3, type: 'NORMAL', weight: 1500, recycleValue: 0 },
        { id: 't2-c', grade: 'C賞', name: '小型模型 C', remaining: 10, total: 10, type: 'NORMAL', weight: 600, recycleValue: 60 },
        { id: 't2-d', grade: 'D賞', name: '壓克力立牌 D', remaining: 30, total: 30, type: 'NORMAL', weight: 200, recycleValue: 30 },
        { id: 't2-e', grade: 'E賞', name: '吊飾 E', remaining: 50, total: 50, type: 'NORMAL', weight: 80, recycleValue: 15 },
      ],
      allowSelfPickup: true },

    { id: 'test-lottery-3', title: '測試用：重量運費測試賞', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop', price: 200, categoryId: 'cat-gaming', status: 'AVAILABLE',
      prizes: [
        { id: 't3-a', grade: 'A賞', name: '超重大型公仔', remaining: 1, total: 1, type: 'NORMAL', weight: 5000, recycleValue: 0 },
        { id: 't3-b', grade: 'B賞', name: '重型抱枕', remaining: 4, total: 4, type: 'NORMAL', weight: 2000, recycleValue: 0 },
        { id: 't3-c', grade: 'C賞', name: '玻璃杯組', remaining: 10, total: 10, type: 'NORMAL', weight: 800, recycleValue: 40 },
        { id: 't3-d', grade: 'D賞', name: '毛巾', remaining: 30, total: 30, type: 'NORMAL', weight: 200, recycleValue: 25 },
        { id: 't3-e', grade: 'E賞', name: '小徽章', remaining: 80, total: 80, type: 'NORMAL', weight: 50, recycleValue: 10 },
      ],
      allowSelfPickup: false },

    { id: 'test-lottery-4', title: '測試用：回收價差測試賞', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop', price: 150, categoryId: 'cat-original', status: 'AVAILABLE',
      prizes: [
        { id: 't4-a', grade: 'A賞', name: '限量畫框', remaining: 1, total: 1, type: 'NORMAL', weight: 1200, recycleValue: 0 },
        { id: 't4-b', grade: 'B賞', name: '大抱枕', remaining: 2, total: 2, type: 'NORMAL', weight: 900, recycleValue: 0 },
        { id: 't4-c', grade: 'C賞', name: '小公仔', remaining: 8, total: 8, type: 'NORMAL', weight: 400, recycleValue: 50 },
        { id: 't4-d', grade: 'D賞', name: '資料夾', remaining: 30, total: 30, type: 'NORMAL', weight: 100, recycleValue: 30 },
        { id: 't4-e', grade: 'E賞', name: '貼紙包', remaining: 60, total: 60, type: 'NORMAL', weight: 30, recycleValue: 5 },
      ],
      allowSelfPickup: true },
  ];
}

// 根據各獎項的 total 產生 prizeOrder，讓前端能在 TicketBoard 顯示每張籤對應的獎項
function buildPrizeOrder(prizes = []) {
  const order = [];
  const normals = prizes.filter(p => p && p.type === 'NORMAL');
  normals.forEach(p => {
    const count = typeof p.total === 'number' && p.total > 0 ? p.total : 0;
    for (let i = 0; i < count; i++) {
      order.push(p.id);
    }
  });
  return order;
}

// 根據已抽出的籤號與 prizeOrder，重新計算每個獎項的 remaining
function applyRemainingFromDrawn(prizes = [], drawnTicketIndices = [], prizeOrder = []) {
  if (!Array.isArray(prizes) || prizes.length === 0) return prizes;

  const drawnCountsByPrizeId = new Map();
  (drawnTicketIndices || []).forEach(idx => {
    const prizeId = prizeOrder && prizeOrder[idx];
    if (!prizeId) return;
    drawnCountsByPrizeId.set(prizeId, (drawnCountsByPrizeId.get(prizeId) || 0) + 1);
  });

  return prizes.map(p => {
    const total = typeof p.total === 'number' ? p.total : 0;
    const drawnCount = drawnCountsByPrizeId.get(p.id) || 0;
    const remaining = Math.max(0, total - drawnCount);
    return { ...p, remaining };
  });
}

// ============================================
// 基礎數據端點
// ============================================

// 獲取網站配置
app.get(`${base}/site-config`, async (req, res) => {
  try {
    const config = {
      siteName: 'Kuji Simulator',
      description: '一番賞抽獎模擬器',
      logo: '/logo.png',
      enableRegistration: true,
      enableGuestMode: false,
      maintenanceMode: false,
    };
    return res.json(config);
  } catch (error) {
    console.error('[SITE-CONFIG] Error:', error);
    return res.status(500).json({ message: '獲取網站配置失敗' });
  }
});

// 管理員身分再次驗證（進入後台用）
app.post(`${base}/auth/verify-admin`, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ message: '缺少密碼' });
    }

    if (password !== ADMIN_VERIFY_PASSWORD) {
      return res.status(401).json({ message: '密碼錯誤或驗證失敗' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH][VERIFY_ADMIN] Error:', error);
    return res.status(500).json({ message: '管理員驗證失敗' });
  }
});

// 獲取分類列表（從 Firestore 讀取）
app.get(`${base}/categories`, async (req, res) => {
  try {
    const configRef = db.firestore.collection('SITE_CONFIG').doc('main');
    const configSnap = await configRef.get();
    
    let categories = [];
    if (configSnap.exists) {
      const configData = configSnap.data();
      categories = configData?.categories || [];
    }
    
    // 如果 Firestore 沒有分類，回傳預設分類
    if (categories.length === 0) {
      categories = [
        { id: 'cat-anime', name: '動漫系列', description: '熱門動漫主題抽獎', displayOrder: 1 },
        { id: 'cat-original', name: '原創系列', description: '獨家原創商品', displayOrder: 2 },
        { id: 'cat-gaming', name: '遊戲系列', description: '熱門遊戲周邊', displayOrder: 3 },
        { id: 'cat-shop', name: '商店', description: '直接購買商品', displayOrder: 4 },
      ];
      console.log('[CATEGORIES] No categories in Firestore, returning defaults');
    } else {
      console.log('[CATEGORIES] Loaded', categories.length, 'categories from Firestore');
    }
    
    return res.json(categories);
  } catch (error) {
    console.error('[CATEGORIES] Error:', error);
    return res.status(500).json({ message: '獲取分類列表失敗' });
  }
});

// 獲取商店產品列表
app.get(`${base}/shop/products`, async (req, res) => {
  try {
    // 暫時返回空數組，商店功能未完整實現
    const products = [];
    return res.json(products);
  } catch (error) {
    console.error('[SHOP] Error:', error);
    return res.status(500).json({ message: '獲取商品失敗' });
  }
});

// ============================================
// 認證端點
// ============================================

// 登入
app.post(`${base}/auth/login`, async (req, res) => {
  try {
    console.log('[LOGIN] Login attempt:', req.body?.email);
    let { email, password } = req.body || {};
    
    if (!email || !password) {
      console.log('[LOGIN] Missing credentials');
      return res.status(400).json({ message: 'Email 和 Password 為必要欄位' });
    }
    
    // 從 Firestore 查詢用戶
    console.log('[LOGIN] Querying user from Firestore:', email);
    let user = await db.getUserByEmail(email);
    console.log('[LOGIN] User found in Firestore:', !!user);
    
    // 如果不存在，檢查硬編碼測試帳號
    if (!user) {
      const ALLOWED = [
        { email: '123123@aaa', password: '123123', username: '測試達人' },
        { email: 'test@example.com', password: 'password123', username: 'TestUser' },
      ];
      const found = ALLOWED.find(u => String(u.email).toLowerCase() === String(email).toLowerCase() && String(u.password) === String(password));
      
      if (!found) {
        console.log('[LOGIN] Not in allowed list');
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      console.log('[LOGIN] Creating new user:', email);
      // 創建新用戶到 Firestore
      const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
      const initialPoints = (email === '123123@aaa') ? 99999 : 0;
      console.log('[LOGIN] User ID:', userId, 'Initial points:', initialPoints);
      
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
      console.log('[LOGIN] User created successfully');
    } else {
      // 驗證密碼
      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      // 更新最後活動時間
      await db.updateUser(user.id, { lastActiveAt: new Date().toISOString() });
    }
    
    // Normalize role field from roles array for frontend compatibility
    const rolesArr = Array.isArray(user.roles) ? user.roles : [];
    const primaryRole = rolesArr.includes('ADMIN') ? 'ADMIN' : (user.role || 'USER');
    user = { ...user, role: primaryRole };

    // 獲取用戶的訂單和獎品
    const orders = await db.getUserOrders(user.id);
    const rawPrizes = await db.getUserPrizes(user.id);

    // 將 Firestore 中的欄位 (prizeName/prizeGrade/prizeImageUrl) 正規化為前端期望的欄位 (name/grade/imageUrl)
    const prizes = rawPrizes.map(p => {
      const normalizedStatus = p.status === 'PENDING_SHIPMENT' ? 'IN_INVENTORY' : (p.status || 'IN_INVENTORY');
      return {
        ...p,
        name: p.name || p.prizeName,
        grade: p.grade || p.prizeGrade,
        imageUrl: p.imageUrl || p.prizeImageUrl,
        status: normalizedStatus,
        // 確保 isRecycled 至少有布林值，避免前端判斷出現 undefined
        isRecycled: typeof p.isRecycled === 'boolean' ? p.isRecycled : false,
      };
    });

    // 將獎品實例組成 inventory 映射，鍵為 instanceId
    const inventory = Object.fromEntries(prizes.map(p => [p.instanceId, p]));

    const orderPrizeMap = prizes.reduce((acc, p) => {
      if (p.orderId && p.instanceId) {
        if (!acc[p.orderId]) acc[p.orderId] = [];
        acc[p.orderId].push(p.instanceId);
      }
      return acc;
    }, {});
    
    // 依照 lotterySetId 從定義表補上標題，避免前端顯示 raw ID (如 set-2)
    const allSetsForOrders = await getLotterySetsDefinition();
    const titleById = Object.fromEntries(allSetsForOrders.map(s => [s.id, s.title || s.id]));

    const normalizedOrders = orders.map(o => ({
      ...o,
      // 前端 HistoryView 使用的欄位
      date: o.date || o.createdAt || new Date().toISOString(),
      lotterySetTitle: o.lotterySetTitle || titleById[o.lotterySetId] || o.lotterySetId || '',
      prizeInstanceIds: Array.isArray(o.prizeInstanceIds) ? o.prizeInstanceIds : (orderPrizeMap[o.id] || []),
    }));

    // 交易與物流 / 自取紀錄
    const transactions = await db.getUserTransactions(user.id);
    const shipments = await db.getUserShipments(user.id);
    const pickupRequests = await db.getUserPickupRequests(user.id);
    
    // 創建 Session - 只保存用戶基本資訊，避免超過 Firestore 1MB 限制
    const sessionData = {
      user,
      inventory: {}, // 不在 session 中保存，通過 API 動態獲取
      orders: [], // 不在 session 中保存，通過 API 動態獲取
      transactions: [],
      shipments: [],
      pickupRequests: [],
      shopOrders: []
    };
    const sid = await db.createSession(sessionData);
    console.log('[LOGIN] ✅ Session created:', `${sid.substring(0, 10)}... for user: ${user.username}`);
    
    setSessionCookie(res, sid);
    console.log('[LOGIN] 🍪 Cookie set, returning response with sessionId');
    
    // 只回傳基本資料，避免 Response size too large
    // 前端可以通過 /auth/session 獲取完整資料
    const minimalResponseData = {
      user,
      inventory: [], // 返回空陣列而非空物件
      orders: [],
      transactions: [],
      shipments: [],
      pickupRequests: [],
      shopOrders: [],
      sessionId: sid
    };
    
    console.log('[LOGIN] Returning minimal response to avoid size limit');
    return res.json(minimalResponseData);
    
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    console.error('[LOGIN] Error stack:', error.stack);
    console.error('[LOGIN] Error message:', error.message);
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
      inventory: [], // 返回空陣列而非空物件
      orders: [],
      transactions: [],
      shipments: [],
      pickupRequests: [],
      shopOrders: []
    };
    const sid = await db.createSession(sessionData);
    
    setSessionCookie(res, sid);
    return res.json({ ...sessionData, sessionId: sid });
    
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
    if (!sess || !sess.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('[SESSION] Session check for user:', sess.user.email);

    // 從資料庫獲取最新的用戶資料，確保點數等資訊是最新的
    const freshUser = await db.getUserById(sess.user.id);
    if (!freshUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 更新 session 中的用戶資料
    sess.user = freshUser;
    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch (e) {
        console.error('[SESSION] Failed to update session:', e);
      }
    }

    // 只返回用戶基本資料，避免 Response size too large
    // 前端應該通過專門的 API 獲取訂單和獎品資料
    return res.json({
      user: freshUser,
      inventory: [], // 返回空陣列而非空物件
      orders: [],
      transactions: [],
      shipments: [],
      pickupRequests: [],
      shopOrders: []
    });

  } catch (error) {
    console.error('[SESSION] Error:', error);
    return res.status(500).json({ message: '獲取 Session 失敗' });
  }
});

// 原本的完整 session 資料載入已移除以避免回應過大
// 前端應該通過專門的 API 獲取訂單和獎品資料

// ============================================
// 抽獎端點（使用 Firestore）
// ============================================

// 獲取抽獎列表
app.get(`${base}/lottery-sets`, async (req, res) => {
  try {
    const list = await getLotterySetsDefinition();
    const merged = await Promise.all(list.map(async (it) => {
      try {
        const st = await db.getLotteryState(it.id);
        const drawn = st.drawnTicketIndices || [];
        const baseOrder = buildPrizeOrder(it.prizes || []);
        const prizesWithRemaining = applyRemainingFromDrawn(it.prizes || [], drawn, baseOrder);
        const withState = { ...it, prizes: prizesWithRemaining, drawnTicketIndices: drawn };
        return { ...withState, prizeOrder: baseOrder };
      } catch {
        const baseOrder = buildPrizeOrder(it.prizes || []);
        const prizesWithRemaining = applyRemainingFromDrawn(it.prizes || [], it.drawnTicketIndices || [], baseOrder);
        const withState = { ...it, prizes: prizesWithRemaining };
        return { ...withState, prizeOrder: baseOrder };
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
    const all = await getLotterySetsDefinition();
    const found = all.find(x => x.id === id) || { 
      id, title: id, imageUrl: '', price: 1000, categoryId: 'lottery', 
      status: 'AVAILABLE', prizes: [], drawnTicketIndices: [] 
    };
    
    try {
      const state = await db.getLotteryState(id);
      const drawn = state.drawnTicketIndices || [];
      const baseOrder = buildPrizeOrder(found.prizes || []);
      const prizesWithRemaining = applyRemainingFromDrawn(found.prizes || [], drawn, baseOrder);
      const withState = { ...found, prizes: prizesWithRemaining, drawnTicketIndices: drawn };
      res.json({ 
        ...withState,
        prizeOrder: baseOrder,
      });
    } catch {
      res.json({
        ...found,
        prizes: applyRemainingFromDrawn(found.prizes || [], found.drawnTicketIndices || [], buildPrizeOrder(found.prizes || [])),
        prizeOrder: buildPrizeOrder(found.prizes || []),
      });
    }
  } catch (error) {
    console.error('[LOTTERY_SET_DETAIL] Error:', error);
    res.status(500).json({ message: '獲取抽獎詳情失敗' });
  }
});

// 抽獎（完整使用 Firestore）
app.post(`${base}/lottery-sets/:id/draw`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) return res.status(401).json({ message: 'Unauthorized' });
    
    const setId = req.params.id;
    const { tickets, drawHash, secretKey } = req.body || {};
    
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
    const allSets = await getLotterySetsDefinition();
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
    
    // 驗證商品是否有獎品設定
    const prizePool = setDef?.prizes || [];
    if (!Array.isArray(prizePool) || prizePool.length === 0) {
      console.error('[DRAW] ERROR: No prizes defined for lottery set:', setId);
      console.error('[DRAW] setDef:', JSON.stringify(setDef, null, 2));
      return res.status(400).json({ message: '此商品尚未設定獎品，無法抽獎' });
    }
    
    console.log('[DRAW] Prize pool loaded:', prizePool.length, 'prizes for set', setId);
    
    // 扣除點數
    const newPoints = current - totalCost;
    await db.updateUserPoints(sess.user.id, newPoints);
    sess.user.points = newPoints;
    
    // 更新該抽獎的累積抽數，每滿 10 抽給一次延長機會
    const currentStats = sess.user.lotteryStats?.[setId] || { cumulativeDraws: 0, availableExtensions: 1 };
    const newCumulativeDraws = currentStats.cumulativeDraws + tickets.length;
    const extensionsEarned = Math.floor(newCumulativeDraws / 10) - Math.floor(currentStats.cumulativeDraws / 10);
    const newExtensions = currentStats.availableExtensions + extensionsEarned;
    
    const updatedLotteryStats = {
      ...(sess.user.lotteryStats || {}),
      [setId]: {
        cumulativeDraws: newCumulativeDraws,
        availableExtensions: newExtensions
      }
    };
    
    await db.updateUser(sess.user.id, { lotteryStats: updatedLotteryStats });
    sess.user.lotteryStats = updatedLotteryStats;
    
    if (extensionsEarned > 0) {
      console.log(`[DRAW] User ${sess.user.id} earned ${extensionsEarned} extension(s). Total: ${newExtensions}`);
    }
    
    // 標記籤號為已抽出
    await db.markTicketsDrawn(setId, tickets);
    
    // 檢查是否有最後賞
    const lastOnePrize = prizePool.find(p => p.type === 'LAST_ONE');
    const normalPrizes = prizePool.filter(p => p.type === 'NORMAL');
    
    // 計算總籤數（只計算一般賞）
    const totalNormalTickets = normalPrizes.reduce((sum, p) => sum + (p.total || 0), 0);
    
    // 獲取目前已抽出的籤號
    const currentDrawnState = await db.getLotteryState(setId);
    const currentDrawnTickets = currentDrawnState?.drawnTicketIndices || [];
    
    // 計算抽完本次後的總抽出數
    const afterDrawCount = currentDrawnTickets.length + tickets.length;
    
    console.log('[DRAW] Total normal tickets:', totalNormalTickets);
    console.log('[DRAW] Current drawn:', currentDrawnTickets.length);
    console.log('[DRAW] After this draw:', afterDrawCount);
    console.log('[DRAW] Has LAST_ONE prize:', !!lastOnePrize);
    
    // 生成抽獎結果
    const results = tickets.map((ticketIndex, idx) => {
      // 檢查這張籤是否是最後一張（所有一般賞都抽完了）
      const isLastTicket = (currentDrawnTickets.length + idx + 1) === totalNormalTickets;
      
      let prize;
      if (isLastTicket && lastOnePrize) {
        // 最後一張籤給最後賞
        prize = lastOnePrize;
        console.log('[DRAW] ⭐ LAST ONE PRIZE awarded at ticket', ticketIndex);
      } else {
        // 一般籤從一般賞中輪流分配
        const prizeIdx = idx % normalPrizes.length;
        prize = normalPrizes[prizeIdx];
      }
      
      if (!prize) {
        console.error('[DRAW] ERROR: Prize not found for ticket', ticketIndex);
      }
      
      return {
        ticketIndex,
        prizeId: prize?.id || 'unknown',
        prizeName: prize?.name || '隨機獎品',
        prizeGrade: prize?.grade || '一般賞',
        prizeImageUrl: prize?.imageUrl || '',
        // 將商品設定中的額外欄位一併帶出，供後續實例與前端使用
        weight: prize?.weight ?? 0,
        recycleValue: typeof prize?.recycleValue === 'number' ? prize.recycleValue : null,
        allowSelfPickup: prize?.allowSelfPickup === true,
      };
    });
    
    // 創建訂單，並保存公平性驗證所需欄位
    // 為避免超過 Firestore 1MB 限制，items 只保存必要的摘要資訊
    const orderItems = results.map(r => ({
      ticketIndex: r.ticketIndex,
      prizeId: r.prizeId,
      prizeName: r.prizeName,
      prizeGrade: r.prizeGrade,
    }));
    
    const order = await db.createOrder({
      userId: sess.user.id,
      type: 'LOTTERY_DRAW',
      lotterySetId: setId,
      costInPoints: totalCost,
      items: orderItems,
      drawCount: tickets.length,
      status: 'COMPLETED',
      // 公平性驗證欄位
      drawHash: drawHash || '',
      secretKey: secretKey || '',
      drawnTicketIndices: tickets,
    });
    
    // 創建獎品實例，並帶入重量 / 回收價 / 自取設定
    console.log('[DRAW] Creating prize instances, count:', results.length);
    for (const result of results) {
      const prizeData = {
        userId: sess.user.id,
        lotterySetId: setId,
        prizeId: result.prizeId,
        prizeName: result.prizeName,
        prizeGrade: result.prizeGrade,
        prizeImageUrl: result.prizeImageUrl,
        orderId: order.id,
        status: 'IN_INVENTORY',
        weight: result.weight ?? 0,
        allowSelfPickup: result.allowSelfPickup === true,
      };
      
      // 只在有值時才加入 recycleValue（避免 undefined）
      if (typeof result.recycleValue === 'number') {
        prizeData.recycleValue = result.recycleValue;
      }
      
      console.log('[DRAW] Creating prize instance:', prizeData.prizeId, prizeData.prizeName);
      await db.createPrizeInstance(prizeData);
    }
    console.log('[DRAW] All prize instances created successfully');
    
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

    // 不再將 inventory 存入 session，避免超過 Firestore 文檔大小限制
    // inventory 會通過 /user/inventory API 按需獲取
    
    // 獲取當前使用的 sessionId（優先 header，其次 cookie）
    let currentSid = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      currentSid = authHeader.substring(7);
    } else {
      currentSid = getSessionCookie(req);
    }
    
    if (currentSid) {
      try {
        await db.updateSession(currentSid, sess);
      } catch (sessionError) {
        console.error('[DRAW] Failed to update session:', sessionError.message);
      }
    }
    
    console.log(`[DRAW] User ${sess.user.id} drew ${tickets.length} tickets from ${setId}, cost ${totalCost} P`);
    
    return res.json({ 
      success: true, 
      results, 
      drawnPrizes: results, // Alias for frontend compatibility
      user: sess.user,
      updatedUser: sess.user, // Alias for frontend compatibility
      order,
      newOrder: order, // Alias for frontend compatibility
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
      console.log('[RECHARGE] Unauthorized: No session');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { packageId, amount } = req.body;
    console.log(`[RECHARGE] Request from user ${sess.user.id}: packageId=${packageId}, amount=${amount}`);
    
    // 驗證 amount（packageId 可選）
    if (typeof amount !== 'number' || amount <= 0) {
      console.log('[RECHARGE] Invalid amount:', amount);
      return res.status(400).json({ message: 'Invalid recharge amount' });
    }
    
    // 安全限制：單次充值上限 100,000
    if (amount > 100000) {
      return res.status(400).json({ message: '單次充值上限為 100,000 點' });
    }
    
    // 增加點數
    const currentPoints = Number(sess.user.points || 0);
    const newPoints = currentPoints + amount;
    console.log(`[RECHARGE] Updating points: ${currentPoints} -> ${newPoints}`);
    
    await db.updateUserPoints(sess.user.id, newPoints);
    sess.user.points = newPoints;
    
    // 創建交易記錄
    const transaction = await db.createTransaction({
      userId: sess.user.id,
      type: 'RECHARGE',
      amount: amount,
      description: packageId ? `購買點數套餐: ${packageId}` : `儲值 ${amount} P`,
    });
    console.log(`[RECHARGE] Transaction created:`, transaction.id);
    
    // 更新 Session
    await db.updateSession(getSessionCookie(req), sess);
    
    console.log(`[RECHARGE] ✅ User ${sess.user.id} recharged ${amount} P (${currentPoints} -> ${newPoints})`);
    
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
// 使用者地址管理 (Shipping Addresses)
// ============================================

// 新增地址
app.post(`${base}/user/addresses`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name, phone, address } = req.body || {};
    if (!name || !phone || !address) {
      return res.status(400).json({ message: '請完整填寫收件人姓名、電話與地址' });
    }

    const existing = Array.isArray(sess.user.shippingAddresses) ? sess.user.shippingAddresses : [];
    const isFirst = existing.length === 0;

    const newAddress = {
      id: crypto.randomBytes(8).toString('hex'),
      name: String(name),
      phone: String(phone),
      address: String(address),
      isDefault: isFirst ? true : false,
    };

    const updatedAddresses = isFirst
      ? [newAddress]
      : [...existing, newAddress];

    const updatedUser = await db.updateUser(sess.user.id, { shippingAddresses: updatedAddresses });
    sess.user = updatedUser;

    // 同步更新 session
    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch {}
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error('[ADDR] Create address error:', error);
    return res.status(500).json({ message: '新增地址失敗' });
  }
});

// 更新地址
app.put(`${base}/user/addresses/:id`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const addrId = req.params.id;
    const { name, phone, address } = req.body || {};
    const existing = Array.isArray(sess.user.shippingAddresses) ? sess.user.shippingAddresses : [];

    const updatedAddresses = existing.map(a =>
      a.id === addrId
        ? {
            ...a,
            name: name ?? a.name,
            phone: phone ?? a.phone,
            address: address ?? a.address,
          }
        : a
    );

    const updatedUser = await db.updateUser(sess.user.id, { shippingAddresses: updatedAddresses });
    sess.user = updatedUser;

    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch {}
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error('[ADDR] Update address error:', error);
    return res.status(500).json({ message: '更新地址失敗' });
  }
});

// 刪除地址
app.delete(`${base}/user/addresses/:id`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const addrId = req.params.id;
    const existing = Array.isArray(sess.user.shippingAddresses) ? sess.user.shippingAddresses : [];

    const filtered = existing.filter(a => a.id !== addrId);

    // 確保至少有一個地址是預設
    if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
      filtered[0] = { ...filtered[0], isDefault: true };
    }

    const updatedUser = await db.updateUser(sess.user.id, { shippingAddresses: filtered });
    sess.user = updatedUser;

    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch {}
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error('[ADDR] Delete address error:', error);
    return res.status(500).json({ message: '刪除地址失敗' });
  }
});

// 設為預設地址
app.post(`${base}/user/addresses/:id/default`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const addrId = req.params.id;
    const existing = Array.isArray(sess.user.shippingAddresses) ? sess.user.shippingAddresses : [];

    const updatedAddresses = existing.map(a => ({
      ...a,
      isDefault: a.id === addrId,
    }));

    const updatedUser = await db.updateUser(sess.user.id, { shippingAddresses: updatedAddresses });
    sess.user = updatedUser;

    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch {}
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error('[ADDR] Set default address error:', error);
    return res.status(500).json({ message: '設為預設地址失敗' });
  }
});

// ============================================
// 使用者收藏庫與回收 / 物流申請
// ============================================

// 取得目前使用者的運送紀錄
app.get(`${base}/user/shipments`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const shipments = await db.getUserShipments(sess.user.id);
    return res.json(shipments || []);
  } catch (error) {
    console.error('[USER][SHIPMENTS] Error:', error);
    return res.status(500).json({ message: '獲取運送紀錄失敗' });
  }
});

// 取得目前使用者的自取紀錄
app.get(`${base}/user/pickups`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const pickupRequests = await db.getUserPickupRequests(sess.user.id);
    return res.json(pickupRequests || []);
  } catch (error) {
    console.error('[USER][PICKUPS] Error:', error);
    return res.status(500).json({ message: '獲取自取紀錄失敗' });
  }
});

// 取得目前使用者的獎品收藏庫（支持分頁）
app.get(`${base}/user/inventory`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 分頁參數
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0; // 0 表示返回全部
    const status = req.query.status; // 'AVAILABLE', 'RECYCLED', 'SHIPPED', 'PICKUP'

    const rawPrizes = await db.getUserPrizes(sess.user.id);
    
    // 返回所有獎品（包括已回收），讓前端可以顯示在「已回收」篩選中
    let prizes = rawPrizes.map(p => ({
      instanceId: p.instanceId,
      prizeId: p.prizeId,
      name: p.name || p.prizeName,
      grade: p.grade || p.prizeGrade,
      imageUrl: p.imageUrl || p.prizeImageUrl || '',
      isRecycled: !!p.isRecycled,
      wonAt: p.wonAt,
      drawnAt: p.drawnAt || p.wonAt,
      orderId: p.orderId,
      lotterySetId: p.lotterySetId,
      status: p.status || 'IN_INVENTORY',
      allowSelfPickup: p.allowSelfPickup,
      recycleValue: p.recycleValue || 0,
      weight: p.weight || 100,
      userId: p.userId || sess.user.id,
    }));

    // 按狀態篩選
    if (status === 'AVAILABLE') {
      prizes = prizes.filter(p => !p.isRecycled && p.status === 'IN_INVENTORY');
    } else if (status === 'RECYCLED') {
      prizes = prizes.filter(p => p.isRecycled);
    } else if (status === 'SHIPPED') {
      prizes = prizes.filter(p => p.status === 'IN_SHIPMENT' || p.status === 'SHIPPED');
    } else if (status === 'PICKUP') {
      prizes = prizes.filter(p => p.status === 'PENDING_PICKUP' || p.status === 'PICKED_UP');
    }

    const total = prizes.length;

    // 分頁處理
    if (limit > 0) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      prizes = prizes.slice(startIndex, endIndex);
      
      console.log(`[INVENTORY] Returning page ${page}/${Math.ceil(total / limit)}: ${prizes.length} prizes (total: ${total})`);
      
      return res.json({
        prizes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: endIndex < total
        }
      });
    }

    // 返回全部（向後兼容）
    console.log('[INVENTORY] Returning all', prizes.length, 'prizes (including recycled)');
    return res.json(prizes);
  } catch (error) {
    console.error('[INVENTORY] Error:', error);
    return res.status(500).json({ message: '獲取收藏庫失敗' });
  }
});

// 取得目前使用者的抽獎紀錄
app.get(`${base}/user/orders`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const orders = await db.getUserOrders(sess.user.id);
    
    // 正規化訂單資料
    const normalizedOrders = orders.map(order => ({
      id: order.id,
      userId: order.userId,
      date: order.date || order.createdAt,
      lotterySetTitle: order.lotterySetTitle,
      prizeInstanceIds: order.prizeInstanceIds || [],
      costInPoints: order.costInPoints || 0,
      drawHash: order.drawHash,
      secretKey: order.secretKey,
      drawnTicketIndices: order.drawnTicketIndices || []
    }));

    console.log('[ORDERS] Returning', normalizedOrders.length, 'orders for user', sess.user.id);
    return res.json(normalizedOrders);
  } catch (error) {
    console.error('[ORDERS] Error:', error);
    return res.status(500).json({ message: '獲取抽獎紀錄失敗' });
  }
});

// 取得目前使用者的交易紀錄
app.get(`${base}/user/transactions`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const transactions = await db.getUserTransactions(sess.user.id);
    
    console.log('[TRANSACTIONS] Returning', transactions.length, 'transactions for user', sess.user.id);
    return res.json(transactions);
  } catch (error) {
    console.error('[TRANSACTIONS] Error:', error);
    return res.status(500).json({ message: '獲取交易紀錄失敗' });
  }
});

// 回收獎品換點數
app.post(`${base}/inventory/recycle`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { prizeInstanceIds } = req.body || {};
    if (!Array.isArray(prizeInstanceIds) || prizeInstanceIds.length === 0) {
      return res.status(400).json({ message: '請提供要回收的獎品 ID' });
    }

    const rawPrizes = await db.getUserPrizes(sess.user.id);
    // 兼容舊資料：同時支援 instanceId 與 id 作為 key
    const byId = new Map(rawPrizes.map(p => [(p.instanceId || p.id), p]));

    let totalRecycle = 0;
    const now = new Date().toISOString();
    const ops = [];

    for (const id of prizeInstanceIds) {
      const p = byId.get(id);
      if (!p) continue;

      // 與運送 / 自取一致：將 PENDING_SHIPMENT 視為 IN_INVENTORY
      const normalizedStatus = p.status === 'PENDING_SHIPMENT' ? 'IN_INVENTORY' : (p.status || 'IN_INVENTORY');
      if (p.isRecycled || normalizedStatus !== 'IN_INVENTORY') continue;

      // 正確處理 recycleValue：
      // - 如果明確設為 0，表示不可回收，跳過
      // - 如果未設定 (undefined/null)，使用預設值 20
      // - 如果 > 0，使用設定的值
      let recycleValue;
      if (typeof p.recycleValue === 'number') {
        if (p.recycleValue === 0) {
          console.log(`[RECYCLE] Prize ${id} (${p.name}) has recycleValue=0, not recyclable, skipping`);
          continue;
        }
        recycleValue = p.recycleValue;
      } else {
        recycleValue = 20; // 預設值
      }
      
      totalRecycle += recycleValue;
      ops.push({
        collection: db.COLLECTIONS.PRIZES,
        id,
        type: 'update',
        data: { isRecycled: true, status: 'IN_INVENTORY', updatedAt: now },
      });
    }

    if (totalRecycle <= 0) {
      return res.status(400).json({ message: '沒有可回收的獎品' });
    }

    if (ops.length) {
      await db.batchWrite(ops);
    }

    // 從資料庫獲取最新的用戶資料，避免使用 session 中的舊點數
    const currentUser = await db.getUserById(sess.user.id);
    const currentPoints = Number(currentUser?.points || 0);
    const newPoints = currentPoints + totalRecycle;
    
    console.log(`[RECYCLE] Current points: ${currentPoints}, Adding: ${totalRecycle}, New total: ${newPoints}`);
    
    const updatedUser = await db.updateUserPoints(sess.user.id, newPoints);
    sess.user = updatedUser;

    const newTransaction = await db.createTransaction({
      userId: updatedUser.id,
      username: updatedUser.username,
      type: 'RECYCLE',
      amount: totalRecycle,
      description: `回收 ${ops.length} 件獎品，獲得 ${totalRecycle} P`,
      prizeInstanceIds,
    });

    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, { ...sess, user: updatedUser }); } catch {}
    }

    return res.json({ updatedUser, newTransaction });
  } catch (error) {
    console.error('[RECYCLE] Error:', error);
    return res.status(500).json({ message: '回收失敗' });
  }
});

// 提出運送申請
app.post(`${base}/shipments`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { prizeInstanceIds, shippingAddressId } = req.body || {};
    if (!Array.isArray(prizeInstanceIds) || prizeInstanceIds.length === 0) {
      return res.status(400).json({ message: '請選擇要運送的獎品' });
    }
    if (!shippingAddressId) {
      return res.status(400).json({ message: '請選擇收件地址' });
    }

    let addresses = Array.isArray(sess.user.shippingAddresses) ? sess.user.shippingAddresses : [];
    let addr = addresses.find(a => a.id === shippingAddressId);

    // 如果在 session 中找不到，嘗試從資料庫重新取得最新使用者資料
    if (!addr) {
      try {
        const freshUser = await db.getUserById(sess.user.id);
        if (freshUser) {
          sess.user = freshUser;
          addresses = Array.isArray(freshUser.shippingAddresses) ? freshUser.shippingAddresses : [];
          addr = addresses.find(a => a.id === shippingAddressId);
        }
      } catch (e) {
        console.warn('[SHIPMENT] Failed to refresh user for address lookup:', e.message);
      }
    }

    if (!addr) {
      return res.status(400).json({ message: '找不到指定的收件地址' });
    }

    const rawPrizes = await db.getUserPrizes(sess.user.id);
    const byId = new Map(rawPrizes.map(p => [(p.instanceId || p.id), p]));
    const validPrizes = [];
    let totalWeight = 0;

    for (const id of prizeInstanceIds) {
      const p = byId.get(id);
      if (!p) continue;

      // 與自取邏輯一致：將舊資料中的 PENDING_SHIPMENT 視為 IN_INVENTORY
      const normalizedStatus = p.status === 'PENDING_SHIPMENT' ? 'IN_INVENTORY' : (p.status || 'IN_INVENTORY');
      if (p.isRecycled || normalizedStatus !== 'IN_INVENTORY') continue;

      validPrizes.push(p);
      totalWeight += Number(p.weight || 0);
    }

    if (validPrizes.length === 0) {
      return res.status(400).json({ message: '沒有可運送的獎品' });
    }

    let shippingCost = SHIPPING_BASE_FEE_POINTS;
    if (totalWeight > SHIPPING_BASE_WEIGHT_G) {
      const extraKg = Math.ceil((totalWeight - SHIPPING_BASE_WEIGHT_G) / 1000);
      shippingCost += extraKg * SHIPPING_EXTRA_FEE_PER_KG;
    }

    const currentPoints = Number(sess.user.points || 0);
    if (currentPoints < shippingCost) {
      return res.status(400).json({ message: '點數不足以支付運費' });
    }

    const newPoints = currentPoints - shippingCost;
    const updatedUser = await db.updateUserPoints(sess.user.id, newPoints);
    sess.user = updatedUser;

    const now = new Date().toISOString();
    const ops = validPrizes.map(p => ({
      collection: db.COLLECTIONS.PRIZES,
      id: p.instanceId,
      type: 'update',
      data: { status: 'IN_SHIPMENT', updatedAt: now },
    }));
    if (ops.length) {
      await db.batchWrite(ops);
    }

    const newShipment = await db.createShipment({
      userId: updatedUser.id,
      username: updatedUser.username,
      prizeInstanceIds: validPrizes.map(p => p.instanceId),
      shippingAddress: addr,
      shippingCostInPoints: shippingCost,
      totalWeightInGrams: totalWeight,
      status: 'PENDING',
    });

    const newTransaction = await db.createTransaction({
      userId: updatedUser.id,
      username: updatedUser.username,
      type: 'SHIPPING',
      amount: -shippingCost,
      description: `運送申請：${validPrizes.length} 件獎品，運費 ${shippingCost} P`,
      prizeInstanceIds: validPrizes.map(p => p.instanceId),
    });

    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch {}
    }

    return res.json({ newShipment, updatedUser, newTransaction });
  } catch (error) {
    console.error('[SHIPMENT] Error:', error);
    return res.status(500).json({ message: '運送申請失敗' });
  }
});

// 提出自取申請
app.post(`${base}/pickups`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { prizeInstanceIds } = req.body || {};
    if (!Array.isArray(prizeInstanceIds) || prizeInstanceIds.length === 0) {
      return res.status(400).json({ message: '請選擇要自取的獎品' });
    }

    const rawPrizes = await db.getUserPrizes(sess.user.id);
    const byId = new Map(rawPrizes.map(p => [p.instanceId, p]));
    const validPrizes = [];

    const allSets = await getLotterySetsDefinition();
    const setById = new Map(allSets.map(s => [s.id, s]));

    for (const id of prizeInstanceIds) {
      const p = byId.get(id);
      if (!p) continue;
      const normalizedStatus = p.status === 'PENDING_SHIPMENT' ? 'IN_INVENTORY' : (p.status || 'IN_INVENTORY');
      if (p.isRecycled || normalizedStatus !== 'IN_INVENTORY') continue;

      const set = setById.get(p.lotterySetId);
      const allowSetPickup = !!set?.allowSelfPickup;
      const allowPrizePickup = p.allowSelfPickup === true;
      if (!allowSetPickup && !allowPrizePickup) continue;

      validPrizes.push(p);
    }

    if (validPrizes.length === 0) {
      return res.status(400).json({ message: '選擇的獎品無法自取' });
    }

    const now = new Date().toISOString();
    const ops = validPrizes.map(p => ({
      collection: db.COLLECTIONS.PRIZES,
      id: p.instanceId,
      type: 'update',
      data: { status: 'PENDING_PICKUP', updatedAt: now },
    }));
    if (ops.length) {
      await db.batchWrite(ops);
    }

    const newPickupRequest = await db.createPickupRequest({
      userId: sess.user.id,
      username: sess.user.username,
      prizeInstanceIds: validPrizes.map(p => p.instanceId),
      status: 'PENDING',
    });

    const newTransaction = await db.createTransaction({
      userId: sess.user.id,
      username: sess.user.username,
      type: 'PICKUP_REQUEST',
      amount: 0,
      description: `自取申請：${validPrizes.length} 件獎品`,
      prizeInstanceIds: validPrizes.map(p => p.instanceId),
    });

    const sid = getSessionCookie(req);
    if (sid) {
      try { await db.updateSession(sid, sess); } catch {}
    }

    return res.json({ newPickupRequest, newTransaction });
  } catch (error) {
    console.error('[PICKUP] Error:', error);
    return res.status(500).json({ message: '自取申請失敗' });
  }
});

// ============================================
// 後台：出貨與自取管理
// ============================================

// 取得所有出貨紀錄（後台）
app.get(`${base}/admin/shipments`, async (req, res) => {
  try {
    const list = await db.getAllShipments();
    return res.json(list);
  } catch (error) {
    console.error('[ADMIN][SHIPMENTS] Error:', error);
    return res.status(500).json({ message: '獲取出貨紀錄失敗' });
  }
});

// 更新出貨狀態（後台）
app.put(`${base}/admin/shipments/:id/status`, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier } = req.body || {};

    const updatedShipment = await db.updateShipmentStatus(id, status, trackingNumber, carrier);

    // 若標記為 SHIPPED，對應的 PrizeInstance 也更新為 SHIPPED
    if (status === 'SHIPPED' && Array.isArray(updatedShipment.prizeInstanceIds)) {
      const ops = updatedShipment.prizeInstanceIds.map((pid) => ({
        collection: db.COLLECTIONS.PRIZES,
        id: pid,
        type: 'update',
        data: { status: 'SHIPPED', updatedAt: new Date().toISOString() },
      }));
      if (ops.length) {
        await db.batchWrite(ops);
      }
    }

    return res.json(updatedShipment);
  } catch (error) {
    console.error('[ADMIN][SHIPMENTS][STATUS] Error:', error);
    return res.status(500).json({ message: '更新出貨狀態失敗' });
  }
});

// 取得所有獎品（後台管理用）
app.get(`${base}/admin/prizes`, async (req, res) => {
  try {
    const allPrizes = await db.getAllPrizes();
    const prizes = allPrizes.map(p => ({
      instanceId: p.instanceId,
      prizeId: p.prizeId,
      name: p.name || p.prizeName,
      grade: p.grade || p.prizeGrade,
      isRecycled: p.isRecycled || false,
      wonAt: p.wonAt,
      orderId: p.orderId,
      lotterySetId: p.lotterySetId,
      status: p.status || 'IN_INVENTORY',
      userId: p.userId,
    }));
    console.log('[ADMIN][PRIZES] Returning', prizes.length, 'prizes');
    return res.json(prizes);
  } catch (error) {
    console.error('[ADMIN][PRIZES] Error:', error);
    return res.status(500).json({ message: '獲取獎品資料失敗' });
  }
});

// 取得所有商城訂單（後台）
app.get(`${base}/admin/shop/orders`, async (req, res) => {
  try {
    const { status } = req.query;
    let orders = await db.getAllShopOrders();
    
    // 支援狀態篩選
    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status);
    }
    
    console.log('[ADMIN][SHOP_ORDERS] Returning', orders.length, 'orders');
    return res.json(orders);
  } catch (error) {
    console.error('[ADMIN][SHOP_ORDERS] Error:', error);
    return res.status(500).json({ message: '獲取商城訂單失敗' });
  }
});

// 更新商城訂單狀態（後台）
app.put(`${base}/admin/shop/orders/:id/status`, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier } = req.body || {};
    
    if (!status) {
      return res.status(400).json({ message: '缺少狀態參數' });
    }
    
    const updatedOrder = await db.updateShopOrderStatus(id, status, trackingNumber, carrier);
    console.log('[ADMIN][SHOP_ORDERS] Order', id, 'updated to', status);
    return res.json(updatedOrder);
  } catch (error) {
    console.error('[ADMIN][SHOP_ORDERS][STATUS] Error:', error);
    return res.status(500).json({ message: '更新商城訂單狀態失敗' });
  }
});

// 完成商城訂單準備（後台）
app.post(`${base}/admin/shop/orders/:id/finalize-ready`, async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.body || {};
    
    // 更新訂單狀態為 CONFIRMED
    const updatedOrder = await db.updateShopOrderStatus(id, 'CONFIRMED');
    
    // TODO: 根據 channel 發送通知（站內信或 Email）
    console.log('[ADMIN][SHOP_ORDERS] Order', id, 'finalized via', channel);
    
    return res.json(updatedOrder);
  } catch (error) {
    console.error('[ADMIN][SHOP_ORDERS][FINALIZE] Error:', error);
    return res.status(500).json({ message: '完成訂單準備失敗' });
  }
});

// 取得所有自取申請（後台）
app.get(`${base}/admin/pickups`, async (req, res) => {
  try {
    const list = await db.getAllPickupRequests();
    return res.json(list);
  } catch (error) {
    console.error('[ADMIN][PICKUPS] Error:', error);
    return res.status(500).json({ message: '獲取自取申請失敗' });
  }
});

// 更新自取申請狀態（後台）
app.put(`${base}/admin/pickups/:id/status`, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const updatedRequest = await db.updatePickupRequestStatus(id, status);

    // 若為 COMPLETED，對應的 PrizeInstance 標記為 PICKED_UP
    if (status === 'COMPLETED' && Array.isArray(updatedRequest.prizeInstanceIds)) {
      const ops = updatedRequest.prizeInstanceIds.map((pid) => ({
        collection: db.COLLECTIONS.PRIZES,
        id: pid,
        type: 'update',
        data: { status: 'PICKED_UP', updatedAt: new Date().toISOString() },
      }));
      if (ops.length) {
        await db.batchWrite(ops);
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error('[ADMIN][PICKUPS][STATUS] Error:', error);
    return res.status(500).json({ message: '更新自取申請狀態失敗' });
  }
});

// ============================================
// 排隊系統 API (Queue System)
// ============================================
console.log(`[ROUTES] Registering queue system routes with base: ${base}`);

// 獲取排隊狀態
app.get(`${base}/lottery-sets/:id/queue`, async (req, res) => {
  try {
    const { id } = req.params;
    let queue = await db.getQueue(id);
    const now = Date.now();
    const TURN_DURATION = 3 * 60 * 1000; // 3 分鐘
    
    // 移除所有過期的隊首用戶
    let modified = false;
    while (queue.length > 0 && queue[0].expiresAt && queue[0].expiresAt < now) {
      console.log('[QUEUE] Removing expired user:', queue[0].username, 'expired at:', new Date(queue[0].expiresAt).toISOString());
      queue.shift(); // 移除過期用戶
      modified = true;
      
      // 為新的第一個用戶設置 expiresAt
      if (queue.length > 0) {
        queue[0].expiresAt = now + TURN_DURATION;
      }
    }
    
    // 確保第一個用戶有 expiresAt
    if (queue.length > 0 && !queue[0].expiresAt) {
      queue[0].expiresAt = now + TURN_DURATION;
      modified = true;
    }
    
    // 如果隊列有變化，保存
    if (modified) {
      await db.saveQueue(id, queue);
    }
    
    return res.json(queue);
  } catch (error) {
    console.error('[QUEUE] Get queue error:', error);
    return res.status(500).json({ message: '獲取排隊狀態失敗' });
  }
});

// 加入排隊
app.post(`${base}/lottery-sets/:id/queue/join`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const queue = await db.getQueue(id);
    
    // 檢查是否已在隊列中
    const existingIndex = queue.findIndex((entry) => entry.userId === sess.user.id);
    if (existingIndex === -1) {
      const now = Date.now();
      const TURN_DURATION = 3 * 60 * 1000; // 3 分鐘
      
      // 添加到隊列末尾
      const newEntry = {
        userId: sess.user.id,
        username: sess.user.username,
        joinedAt: now,
        lastActivity: now
      };
      
      // 只有第一個用戶才設置 expiresAt（避免 undefined）
      if (queue.length === 0) {
        newEntry.expiresAt = now + TURN_DURATION;
      }
      
      queue.push(newEntry);
      await db.saveQueue(id, queue);
    }
    
    // 確保第一個用戶有 expiresAt
    if (queue.length > 0 && !queue[0].expiresAt) {
      queue[0].expiresAt = Date.now() + (3 * 60 * 1000);
      await db.saveQueue(id, queue);
    }
    
    return res.json({ success: true, queue });
  } catch (error) {
    console.error('[QUEUE] Join queue error:', error);
    return res.status(500).json({ message: '加入排隊失敗' });
  }
});

// 離開排隊
app.post(`${base}/lottery-sets/:id/queue/leave`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const queue = await db.getQueue(id);
    
    // 從隊列中移除用戶
    const wasInQueue = queue.some((entry) => entry.userId === sess.user.id);
    const filteredQueue = queue.filter((entry) => entry.userId !== sess.user.id);
    
    // 如果用戶確實在隊列中，重置該商品的抽數與延長次數（以排隊 session 為單位）
    if (wasInQueue) {
      const updatedLotteryStats = {
        ...(sess.user.lotteryStats || {}),
        [id]: {
          cumulativeDraws: 0,
          availableExtensions: 1,
        }
      };
      
      await db.updateUser(sess.user.id, { lotteryStats: updatedLotteryStats });
      sess.user.lotteryStats = updatedLotteryStats;
      console.log('[QUEUE] User left queue, stats reset for lottery:', id, updatedLotteryStats[id]);
      
      // 更新 session
      let currentSid = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        currentSid = authHeader.substring(7);
      } else {
        currentSid = getSessionCookie(req);
      }
      
      if (currentSid) {
        try {
          await db.updateSession(currentSid, sess);
        } catch (sessionError) {
          console.error('[QUEUE] Failed to update session after leave:', sessionError.message);
        }
      }
    }
    
    // 如果新的第一個用戶沒有 expiresAt，設置它
    if (filteredQueue.length > 0 && !filteredQueue[0].expiresAt) {
      filteredQueue[0].expiresAt = Date.now() + (3 * 60 * 1000);
    }
    
    await db.saveQueue(id, filteredQueue);
    
    return res.json({ success: true, queue: filteredQueue, user: sess.user });
  } catch (error) {
    console.error('[QUEUE] Leave queue error:', error);
    return res.status(500).json({ message: '離開排隊失敗' });
  }
});

// 延長排隊時間
app.post(`${base}/lottery-sets/:id/queue/extend`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const queue = await db.getQueue(id);
    
    // 檢查用戶的延長次數
    const lotteryStats = sess.user.lotteryStats?.[id] || { cumulativeDraws: 0, availableExtensions: 1 };
    if (lotteryStats.availableExtensions <= 0) {
      return res.status(400).json({ message: '沒有可用的延長次數' });
    }
    
    // 扣減延長次數
    const newStats = {
      ...lotteryStats,
      availableExtensions: lotteryStats.availableExtensions - 1
    };
    
    // 更新用戶的 lotteryStats
    const updatedLotteryStats = {
      ...(sess.user.lotteryStats || {}),
      [id]: newStats
    };
    await db.updateUser(sess.user.id, { lotteryStats: updatedLotteryStats });
    console.log('[QUEUE] Extension used. Remaining:', newStats.availableExtensions);
    
    // 更新隊列的過期時間
    const EXTEND_DURATION = 60 * 1000; // 延長 60 秒
    const now = Date.now();
    
    const updated = queue.map((entry) => {
      if (entry.userId === sess.user.id) {
        // 延長 expiresAt（如果存在）
        const newExpiresAt = entry.expiresAt ? entry.expiresAt + EXTEND_DURATION : now + EXTEND_DURATION;
        return { 
          ...entry, 
          lastActivity: now,
          expiresAt: newExpiresAt
        };
      }
      return entry;
    });
    
    await db.saveQueue(id, updated);
    
    // 更新 session 中的用戶資料
    sess.user.lotteryStats = updatedLotteryStats;
    
    // 獲取當前使用的 sessionId（優先 header，其次 cookie）
    let currentSid = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      currentSid = authHeader.substring(7);
    } else {
      currentSid = getSessionCookie(req);
    }
    
    if (currentSid) {
      try {
        await db.updateSession(currentSid, sess);
        console.log('[QUEUE] Session updated successfully');
      } catch (sessionError) {
        console.error('[QUEUE] Failed to update session, but queue extension succeeded:', sessionError.message);
        // 不影響延長功能，session 更新失敗不致命
      }
    }
    
    return res.json({ success: true, queue: updated, user: sess.user });
  } catch (error) {
    console.error('[QUEUE] Extend queue error:', error);
    return res.status(500).json({ message: '延長時間失敗' });
  }
});

// 獲取票號鎖定狀態
app.get(`${base}/lottery-sets/:id/tickets/locks`, async (req, res) => {
  try {
    const { id } = req.params;
    // 簡化實現：返回空數組（前端會處理）
    // 完整實現需要從 Firestore 查詢鎖定記錄
    return res.json([]);
  } catch (error) {
    console.error('[LOCKS] Get locks error:', error);
    return res.status(500).json({ message: '獲取鎖定狀態失敗' });
  }
});

// 鎖定票號
app.post(`${base}/lottery-sets/:id/tickets/lock`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const { ticketIndices } = req.body;
    
    // 簡化實現：直接返回成功
    // 構造符合前端預期的 TicketLock 對象數組
    const now = Date.now();
    const locks = (ticketIndices || []).map(idx => ({
        lotteryId: id,
        ticketIndex: Number(idx),
        userId: sess.user.id,
        expiresAt: now + 300000 // 5分鐘後過期
    }));
    
    // Fix: Return full lock objects for frontend visual feedback
    const fullLocks = locks.map(lock => ({
      ...lock,
      lockedAt: now,
      lockedBy: sess.user.username,
      status: 'locked'
    }));
    
    return res.json({ success: true, locks: fullLocks });
  } catch (error) {
    console.error('[LOCKS] Lock tickets error:', error);
    return res.status(500).json({ message: '鎖定票號失敗' });
  }
});

// 獲取最近訂單（抽獎記錄）
app.get(`${base}/orders/recent`, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    // 從 Firestore 獲取最近的 LOTTERY_DRAW 訂單
    // 注意：需要 db.js 支援 getRecentOrders，如果沒有則直接查詢 orders 集合
    let orders = [];
    try {
        orders = await db.getRecentOrders(limit);
    } catch (e) {
        // Fallback if dedicated method doesn't exist
        console.warn('[ORDERS] getRecentOrders not implemented, returning empty');
    }
    
    // 豐富訂單數據（添加 masked username）
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
        try {
            // 如果訂單中沒有用戶名，嘗試獲取
            if (!order.username) {
                const user = await db.getUser(order.userId);
                if (user) {
                    // Mask username: T***r
                    const name = user.username || 'User';
                    const masked = name.length > 2 
                        ? `${name[0]}***${name[name.length-1]}` 
                        : `${name[0]}***`;
                    return { ...order, username: name, usernameMasked: masked };
                }
            }
            return order;
        } catch {
            return order;
        }
    }));

    return res.json(enrichedOrders);
  } catch (error) {
    console.error('[ORDERS] Get recent orders error:', error);
    return res.status(500).json({ message: '獲取訂單失敗' });
  }
});

// 獲取所有用戶（管理員功能）
app.get(`${base}/admin/users`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    const users = await db.getAllUsers();
    return res.json(users);
  } catch (error) {
    console.error('[ADMIN] Get users error:', error);
    return res.status(500).json({ message: '獲取用戶列表失敗' });
  }
});

// 批量刪除所有商品（管理員功能 - 測試用）
// 必須放在 :id 路由之前，否則 delete-all 會被當成 id 參數
// ⚠️ 危險操作：IP 白名單 + 確認 token + 審計日誌 + 自動備份
app.post(`${base}/admin/lottery-sets/delete-all`, async (req, res) => {
  const startTime = Date.now();
  let auditData = {
    action: 'DELETE_ALL_LOTTERY_SETS',
    adminEmail: null,
    adminId: null,
    targetResource: 'LOTTERY_SETS',
    targetId: 'ALL',
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    success: false,
    metadata: {}
  };
  
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      auditData.errorMessage = 'Unauthorized: Not admin';
      await logAudit(db.firestore, auditData);
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    auditData.adminEmail = sess.user.email;
    auditData.adminId = sess.user.id;
    
    // 1. IP 白名單檢查
    const ipCheck = checkIPWhitelist(req);
    if (!ipCheck.allowed) {
      auditData.errorMessage = `IP not in whitelist: ${ipCheck.clientIP}`;
      auditData.metadata.clientIP = ipCheck.clientIP;
      auditData.metadata.whitelist = ipCheck.whitelist;
      await logAudit(db.firestore, auditData);
      console.warn('[SECURITY] IP not in whitelist:', ipCheck.clientIP);
      return res.status(403).json({ 
        message: 'IP 地址不在白名單中',
        clientIP: ipCheck.clientIP
      });
    }
    
    // 2. Token 驗證（從環境變數讀取）
    const { confirmToken } = req.body || {};
    const tokenValidation = validateConfirmToken(confirmToken, 'ADMIN_DELETE_TOKEN');
    if (!tokenValidation.valid) {
      auditData.errorMessage = tokenValidation.message;
      await logAudit(db.firestore, auditData);
      console.warn('[SECURITY] Invalid token by:', sess.user.email);
      return res.status(400).json({ 
        message: tokenValidation.message,
        hint: '請在請求 body 中加入正確的 confirmToken'
      });
    }
    
    console.log('[ADMIN][SECURITY] ⚠️ DELETE ALL lottery sets initiated by:', sess.user.email);
    
    // 3. 創建備份
    const snapshot = await db.firestore.collection('LOTTERY_SETS').get();
    const dataToBackup = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const backupId = await createBackup(db.firestore, 'LOTTERY_SETS', dataToBackup);
    
    auditData.metadata.backupId = backupId;
    auditData.metadata.itemCount = snapshot.size;
    
    // 4. 執行刪除
    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    // 5. 記錄成功
    auditData.success = true;
    auditData.metadata.duration = Date.now() - startTime;
    await logAudit(db.firestore, auditData);
    
    console.log('[ADMIN][SECURITY] ✅ All lottery sets deleted, count:', snapshot.size, 'by:', sess.user.email);
    return res.json({ 
      success: true, 
      deletedCount: snapshot.size,
      backupId: backupId,
      duration: auditData.metadata.duration
    });
  } catch (error) {
    auditData.errorMessage = error.message;
    auditData.metadata.error = error.stack;
    await logAudit(db.firestore, auditData);
    console.error('[ADMIN] Delete all lottery sets error:', error);
    return res.status(500).json({ message: '批量刪除商品失敗', error: error.message });
  }
});

// 新增商品（管理員功能）
app.post(`${base}/admin/lottery-sets`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    const lotterySet = req.body;
    if (!lotterySet || !lotterySet.title) {
      return res.status(400).json({ message: '無效的商品資料：缺少標題' });
    }
    
    // 如果沒有 ID，自動生成一個（使用 timestamp + random）
    const id = lotterySet.id || `set-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 確保所有必要欄位都有預設值（Firestore 不允許 undefined，要用 null 或省略）
    const dataToSave = {
      id,
      title: lotterySet.title,
      categoryId: lotterySet.categoryId || '',
      price: Number(lotterySet.price) || 0,
      imageUrl: lotterySet.imageUrl || '',
      status: lotterySet.status || 'AVAILABLE',
      tags: Array.isArray(lotterySet.tags) ? lotterySet.tags : [],
      description: lotterySet.description || '',
      rules: lotterySet.rules || '',
      prizes: Array.isArray(lotterySet.prizes) ? lotterySet.prizes : [],
      drawnTicketIndices: [],  // 新商品沒有已抽出的籤
      allowSelfPickup: !!lotterySet.allowSelfPickup,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // 只在有值時才加入這些欄位（避免 undefined）
    if (lotterySet.discountPrice && Number(lotterySet.discountPrice) > 0) {
      dataToSave.discountPrice = Number(lotterySet.discountPrice);
    }
    if (lotterySet.releaseDate) {
      dataToSave.releaseDate = lotterySet.releaseDate;
    }
    if (lotterySet.prizeOrder) {
      dataToSave.prizeOrder = lotterySet.prizeOrder;
    }
    
    console.log('[ADMIN][CREATE_LOTTERY_SET] Attempting to create:', id);
    console.log('[ADMIN][CREATE_LOTTERY_SET] Data:', JSON.stringify(dataToSave, null, 2));
    
    // 儲存到 Firestore LOTTERY_SETS 集合
    const setRef = db.firestore.collection('LOTTERY_SETS').doc(id);
    await setRef.set(dataToSave);
    
    console.log('[ADMIN][CREATE_LOTTERY_SET] SUCCESS:', id, 'with', dataToSave.prizes?.length || 0, 'prizes');
    return res.json(dataToSave);
  } catch (error) {
    console.error('[ADMIN][CREATE_LOTTERY_SET] ERROR:', error);
    console.error('[ADMIN][CREATE_LOTTERY_SET] Error stack:', error.stack);
    console.error('[ADMIN][CREATE_LOTTERY_SET] Request body:', JSON.stringify(req.body, null, 2));
    return res.status(500).json({ message: '新增商品失敗', error: error.message });
  }
});

// 更新商品（管理員功能）
app.put(`${base}/admin/lottery-sets/:id`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    const { id } = req.params;
    const lotterySet = req.body;
    
    if (!lotterySet) {
      return res.status(400).json({ message: '無效的商品資料' });
    }
    
    // 更新到 Firestore
    const setRef = db.firestore.collection('LOTTERY_SETS').doc(id);
    const snap = await setRef.get();
    
    if (!snap.exists) {
      return res.status(404).json({ message: '商品不存在' });
    }
    
    await setRef.set({
      ...lotterySet,
      id,  // 確保 ID 不變
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    console.log('[ADMIN] Lottery set updated:', id);
    return res.json({ ...lotterySet, id });
  } catch (error) {
    console.error('[ADMIN] Update lottery set error:', error);
    return res.status(500).json({ message: '更新商品失敗' });
  }
});

// 刪除商品（管理員功能）
app.delete(`${base}/admin/lottery-sets/:id`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    const { id } = req.params;
    
    // 從 Firestore 刪除
    const setRef = db.firestore.collection('LOTTERY_SETS').doc(id);
    await setRef.delete();
    
    console.log('[ADMIN] Lottery set deleted:', id);
    return res.json({ success: true, id });
  } catch (error) {
    console.error('[ADMIN] Delete lottery set error:', error);
    return res.status(500).json({ message: '刪除商品失敗' });
  }
});

// 重置用戶資料（管理員功能 - 測試用）
// ⚠️ 危險操作：IP 白名單 + 確認 token + 審計日誌 + 自動備份
app.post(`${base}/admin/users/:userId/reset`, async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.params;
  let auditData = {
    action: 'RESET_USER_DATA',
    adminEmail: null,
    adminId: null,
    targetResource: 'USER',
    targetId: userId,
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    success: false,
    metadata: {}
  };
  
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      auditData.errorMessage = 'Unauthorized: Not admin';
      await logAudit(db.firestore, auditData);
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    auditData.adminEmail = sess.user.email;
    auditData.adminId = sess.user.id;
    
    // 1. IP 白名單檢查
    const ipCheck = checkIPWhitelist(req);
    if (!ipCheck.allowed) {
      auditData.errorMessage = `IP not in whitelist: ${ipCheck.clientIP}`;
      auditData.metadata.clientIP = ipCheck.clientIP;
      await logAudit(db.firestore, auditData);
      return res.status(403).json({ 
        message: 'IP 地址不在白名單中',
        clientIP: ipCheck.clientIP
      });
    }
    
    // 2. Token 驗證
    const { confirmToken } = req.body || {};
    const tokenValidation = validateConfirmToken(confirmToken, 'ADMIN_RESET_TOKEN');
    if (!tokenValidation.valid) {
      auditData.errorMessage = tokenValidation.message;
      await logAudit(db.firestore, auditData);
      return res.status(400).json({ 
        message: tokenValidation.message,
        hint: '請在請求 body 中加入正確的 confirmToken'
      });
    }
    
    console.log('[ADMIN][SECURITY] ⚠️ RESET user data initiated by:', sess.user.email, 'for user:', userId);
    
    // 3. 創建備份
    const prizesSnapshot = await db.firestore.collection('PRIZES').where('userId', '==', userId).get();
    const ordersSnapshot = await db.firestore.collection('ORDERS').where('userId', '==', userId).get();
    const transactionsSnapshot = await db.firestore.collection('TRANSACTIONS').where('userId', '==', userId).get();
    const shipmentsSnapshot = await db.firestore.collection('SHIPMENTS').where('userId', '==', userId).get();
    const pickupsSnapshot = await db.firestore.collection('PICKUP_REQUESTS').where('userId', '==', userId).get();
    
    const backupData = {
      userId,
      prizes: prizesSnapshot.docs.map(doc => doc.data()),
      orders: ordersSnapshot.docs.map(doc => doc.data()),
      transactions: transactionsSnapshot.docs.map(doc => doc.data()),
      shipments: shipmentsSnapshot.docs.map(doc => doc.data()),
      pickupRequests: pickupsSnapshot.docs.map(doc => doc.data()),
    };
    
    const backupId = await createBackup(db.firestore, `USER_${userId}`, backupData);
    auditData.metadata.backupId = backupId;
    
    // 4. 執行刪除
    await Promise.all([
      ...prizesSnapshot.docs.map(doc => doc.ref.delete()),
      ...ordersSnapshot.docs.map(doc => doc.ref.delete()),
      ...transactionsSnapshot.docs.map(doc => doc.ref.delete()),
      ...shipmentsSnapshot.docs.map(doc => doc.ref.delete()),
      ...pickupsSnapshot.docs.map(doc => doc.ref.delete()),
    ]);
    
    console.log('[ADMIN] Deleted - Prizes:', prizesSnapshot.size, 'Orders:', ordersSnapshot.size);
    
    // 5. 重置用戶點數和統計
    await db.updateUser(userId, {
      points: 99999,
      lotteryStats: {},
    });
    
    // 6. 記錄成功
    auditData.success = true;
    auditData.metadata.deleted = {
      prizes: prizesSnapshot.size,
      orders: ordersSnapshot.size,
      transactions: transactionsSnapshot.size,
      shipments: shipmentsSnapshot.size,
      pickupRequests: pickupsSnapshot.size,
    };
    auditData.metadata.duration = Date.now() - startTime;
    await logAudit(db.firestore, auditData);
    
    console.log('[ADMIN][SECURITY] ✅ User data reset completed for:', userId, 'by:', sess.user.email);
    
    return res.json({
      success: true,
      deleted: auditData.metadata.deleted,
      backupId: backupId,
      duration: auditData.metadata.duration
    });
  } catch (error) {
    auditData.errorMessage = error.message;
    auditData.metadata.error = error.stack;
    await logAudit(db.firestore, auditData);
    console.error('[ADMIN] Reset user data error:', error);
    return res.status(500).json({ message: '重置用戶資料失敗', error: error.message });
  }
});

// 儲存分類（管理員功能）
app.post(`${base}/admin/categories`, async (req, res) => {
  try {
    const sess = await getSession(req);
    if (!sess?.user || sess.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }
    
    // 前端直接送 categories 陣列，不是包在物件裡
    const categories = Array.isArray(req.body) ? req.body : (req.body?.categories || []);
    if (!Array.isArray(categories)) {
      return res.status(400).json({ message: '無效的分類資料' });
    }
    
    // 儲存到 Firestore 的 SITE_CONFIG 文件
    const configRef = db.firestore.collection('SITE_CONFIG').doc('main');
    const configSnap = await configRef.get();
    const currentConfig = configSnap.exists ? configSnap.data() : {};
    
    await configRef.set({
      ...currentConfig,
      categories,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    console.log('[ADMIN] Categories saved successfully, count:', categories.length);
    return res.json(categories);  // 直接回傳陣列，符合前端期待
  } catch (error) {
    console.error('[ADMIN] Save categories error:', error);
    return res.status(500).json({ message: '儲存分類失敗' });
  }
});

// ============================================
// 啟動服務器
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server with Firestore running on port ${PORT}`);
  console.log(`📦 Storage: Firestore (persistent)`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🛣️  API Base Path: ${base}`);
  
  // 列出所有註冊的路由
  console.log('📋 Registered routes:');
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      const methods = Object.keys(r.route.methods).join(',').toUpperCase();
      console.log(`   ${methods} ${r.route.path}`);
    }
  });
  
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

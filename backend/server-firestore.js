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

const base = '/api';

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
// 商品定義（共享函數）
// ============================================

function getLotterySetsDefinition() {
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
  ];
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

// 獲取分類列表
app.get(`${base}/categories`, async (req, res) => {
  try {
    const categories = [
      { id: 'cat-anime', name: '動漫系列', description: '熱門動漫主題抽獎', displayOrder: 1 },
      { id: 'cat-original', name: '原創系列', description: '獨家原創商品', displayOrder: 2 },
      { id: 'cat-gaming', name: '遊戲系列', description: '熱門遊戲周邊', displayOrder: 3 },
      { id: 'cat-shop', name: '商店', description: '直接購買商品', displayOrder: 4 },
    ];
    return res.json(categories);
  } catch (error) {
    console.error('[CATEGORIES] Error:', error);
    return res.status(500).json({ message: '獲取分類失敗' });
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
    let { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email 和 Password 為必要欄位' });
    }
    
    // 從 Firestore 查詢用戶
    let user = await db.getUserByEmail(email);
    
    // 如果不存在，檢查硬編碼測試帳號
    if (!user) {
      const ALLOWED = [
        { email: '123123@aaa', password: '123123', username: '測試達人' },
        { email: 'test@example.com', password: 'password123', username: 'TestUser' },
      ];
      const found = ALLOWED.find(u => String(u.email).toLowerCase() === String(email).toLowerCase() && String(u.password) === String(password));
      
      if (!found) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
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
    } else {
      // 驗證密碼
      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      // 更新最後活動時間
      await db.updateUser(user.id, { lastActiveAt: new Date().toISOString() });
    }
    
    // 獲取用戶的訂單和獎品
    const orders = await db.getUserOrders(user.id);
    const prizes = await db.getUserPrizes(user.id);
    const inventory = Object.fromEntries(prizes.map(p => [p.instanceId, p]));
    const transactions = await db.getUserTransactions(user.id);
    
    // 創建 Session
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
    console.log('[LOGIN] ✅ Session created:', `${sid.substring(0, 10)}... for user: ${user.username}`);
    
    setSessionCookie(res, sid);
    console.log('[LOGIN] 🍪 Cookie set, returning response with sessionId');
    return res.json({ ...sessionData, sessionId: sid });
    
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return res.status(500).json({ message: '登入失敗' });
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
// 排隊系統 API (Queue System)
// ============================================
console.log(`[ROUTES] Registering queue system routes with base: ${base}`);

// 獲取排隊狀態
app.get(`${base}/lottery-sets/:id/queue`, async (req, res) => {
  try {
    const { id } = req.params;
    const queue = await db.getQueue(id);
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
      // 添加到隊列末尾
      queue.push({
        userId: sess.user.id,
        username: sess.user.username,
        joinedAt: Date.now(),
        lastActivity: Date.now()
      });
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
    const filteredQueue = queue.filter((entry) => entry.userId !== sess.user.id);
    await db.saveQueue(id, filteredQueue);
    
    return res.json({ success: true, queue: filteredQueue });
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
    
    // 更新最後活動時間
    const updated = queue.map((entry) => {
      if (entry.userId === sess.user.id) {
        return { ...entry, lastActivity: Date.now() };
      }
      return entry;
    });
    
    await db.saveQueue(id, updated);
    return res.json({ success: true, queue: updated });
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
    // 完整實現需要在 Firestore 中記錄鎖定
    return res.json({ success: true, locks: ticketIndices || [] });
  } catch (error) {
    console.error('[LOCKS] Lock tickets error:', error);
    return res.status(500).json({ message: '鎖定票號失敗' });
  }
});

// 獲取最近訂單（抽獎記錄）
app.get(`${base}/orders/recent`, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    // 簡化實現：返回空數組
    // 完整實現需要從 Firestore 查詢最近的訂單
    return res.json([]);
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

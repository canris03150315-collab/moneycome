// Provide pristine default users independent from the mutable mockUsers array
function getDefaultMockUsers() {
  return [
    { id: 'user-1', email: 'test@example.com', password: 'password123', username: 'TestUser', points: 5000, role: 'USER', shippingAddresses: [] },
    { id: 'user-tester', email: '123123@aaa', password: '123123', username: '測試達人', points: 99999, role: 'ADMIN', shippingAddresses: [] },
  ];
}

// Define the base URL for the Cloud Run backend (default fallback)
const API_BASE_URL = "https://ichiban-backend-new-248630813908.us-central1.run.app";

// Optional mock data (used only when VITE_USE_MOCK=true)
import { mockSiteConfig, mockCategories, initialMockLotterySets, mockUsers, mockOrders, mockTransactions, mockShipments, mockPickupRequests, mockShopProducts, mockShopOrders, RECYCLE_VALUE, SHIPPING_BASE_FEE_POINTS, SHIPPING_BASE_WEIGHT_G, SHIPPING_EXTRA_FEE_PER_KG } from './data/mockData';
import { loadMockUser as loadUserLS, saveMockUser as saveUserLS, loadMockUsers as loadUsersLS, saveMockUsers as saveUsersLS, loadMockInventory as loadInvLS, saveMockInventory as saveInvLS, loadPwdResets as loadPwdLS, savePwdResets as savePwdLS, loadMockOrders as loadOrdersLS, saveMockOrders as saveOrdersLS, loadMockTransactions as loadTxsLS, saveMockTransactions as saveTxsLS, loadMockLotterySets as loadLotSetsLS, saveMockLotterySets as saveLotSetsLS, KEYS, CURRENT_SCHEMA_VERSION, isVersionMismatch, resetAllMockData, saveMockVersion, exportAllMockData, importAllMockData } from './utils/mockPersistence';

// In-memory mock state
let MOCK_SITE_CONFIG: any = { ...mockSiteConfig };
let MOCK_CATEGORIES: any[] = [...mockCategories];
let MOCK_LOTTERY_SETS = initialMockLotterySets;
let MOCK_INVENTORY: Record<string, any> = {};

// Resolve API base and prefix from Vite envs, with sensible fallbacks
const ENV = (import.meta as any).env || {};
const DEBUG_MOCK = String(ENV.VITE_DEBUG_MOCK || '').toLowerCase() === 'true';
// Important: honor empty-string VITE_API_BASE_URL (same-origin) and only fall back when undefined
const ENV_BASE = (ENV.VITE_API_BASE_URL === undefined) ? API_BASE_URL : ENV.VITE_API_BASE_URL;
const ENV_PREFIX_RAW = ENV.VITE_API_PREFIX || "";
// Default to mock in development unless explicitly disabled with VITE_USE_MOCK=false
const ENV_MODE = ENV.MODE || ENV.NODE_ENV || 'development';
const USE_MOCK = false; // FORCE DISABLED - Always use real backend
// const USE_MOCK = (() => {
//   const v = ENV.VITE_USE_MOCK;
//   if (typeof v === 'string') return v.toLowerCase() === 'true';
//   return ENV_MODE !== 'production';
// })();

// In mock mode, silence verbose console.info unless DEBUG_MOCK=true
if (USE_MOCK && typeof console !== 'undefined' && !DEBUG_MOCK) {
  try {
    const noop = (..._args: any[]) => {};
    // @ts-ignore
    console.info = noop;
  } catch {}
}

// In-memory mock auth state (persisted to localStorage in browser)
let MOCK_CURRENT_USER: any = null;

const LS_KEY = KEYS.currentUser;
function loadMockUser() { return loadUserLS(); }

// Mask a username: keep first and last char, middle replaced by '*'; handle short names
function maskUsername(name: string): string {
  if (!name) return '匿名';
  const s = String(name).trim();
  const len = s.length;
  if (len <= 1) return s;
  if (len === 2) return `${s[0]}*`;
  return `${s[0]}${'*'.repeat(len - 2)}${s[len - 1]}`;
}

function getEffectivePrice(set: any) {
  return (set && typeof set.discountPrice === 'number' && set.discountPrice > 0) ? set.discountPrice : set.price;
}

function pickPrize(prizes: any[]): number {
  const pool = prizes
    .map((p, idx) => ({ idx, w: Math.max(0, p.remaining) }))
    .filter(x => x.w > 0);
  const total = pool.reduce((s, x) => s + x.w, 0);
  if (total <= 0) return -1;
  let r = Math.random() * total;
  for (const x of pool) { if ((r -= x.w) <= 0) return x.idx; }
  return pool[pool.length - 1].idx;
}
function saveMockUser(user: any | null) { return saveUserLS(user); }

// Keep mockUsers list in sync with current user's latest state (e.g., points)
function syncMockUserList(updated: any) {
  try {
    const idx = (mockUsers || []).findIndex((u:any) => u.id === updated?.id);
    if (idx !== -1) {
      const prev = mockUsers[idx] as any;
      const merged = { ...prev, ...updated } as any;
      if (updated?.password === undefined) {
        merged.password = prev.password;
      }
      mockUsers[idx] = merged;
      saveMockUsers(mockUsers);
    }
  } catch {}
}

// Persist all mock users to localStorage, and load on startup
function loadMockUsers(): any[] { return loadUsersLS(); }
function saveMockUsers(usersArr: any[]) { return saveUsersLS(usersArr); }
// initialize from storage when in mock
if (USE_MOCK) {
  // Schema version check/migration (simple reset to seed when mismatch)
  if (isVersionMismatch()) {
    resetAllMockData();
    saveMockVersion(CURRENT_SCHEMA_VERSION);
  }
  const u = loadMockUser();
  if (u) MOCK_CURRENT_USER = u;
  // Hydrate mockUsers from localStorage if present
  const savedUsers = loadMockUsers();
  if (Array.isArray(savedUsers) && savedUsers.length > 0) {
    // Replace contents in-place to preserve references
    (mockUsers as any).length = 0;
    (mockUsers as any).push(...savedUsers);
  } else {
    // Save initial seed to storage for persistence across reloads
    saveMockUsers(mockUsers);
  }
  // Hydrate lottery sets from LS if present
  const savedSets = loadLotSetsLS();
  if (Array.isArray(savedSets) && savedSets.length > 0) {
    MOCK_LOTTERY_SETS = savedSets as any;
  } else {
    saveLotSetsLS(MOCK_LOTTERY_SETS);
  }
  // Hydrate orders/transactions
  const savedOrders = loadOrdersLS();
  if (Array.isArray(savedOrders)) { (mockOrders as any).length = 0; (mockOrders as any).push(...savedOrders); }
  const savedTxs = loadTxsLS();
  if (Array.isArray(savedTxs)) { (mockTransactions as any).length = 0; (mockTransactions as any).push(...savedTxs); }
}

const LS_INV_KEY = KEYS.inventory;
function loadMockInventory() { return loadInvLS(); }
function saveMockInventory(inv: Record<string, any>) { return saveInvLS(inv); }

// After declarations, load inventory when in mock
if (USE_MOCK) {
  try { MOCK_INVENTORY = loadMockInventory(); } catch {}
}

// Ensure we always see latest snapshots written by other tabs
type RefreshOpts = { currentUser?: boolean; users?: boolean; inventory?: boolean; orders?: boolean; transactions?: boolean; lotterySets?: boolean };
let lastRefreshStamp = 0;
let lastRefreshed: RefreshOpts = {};
function refreshSnapshotsSelective(opts: RefreshOpts) {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const within = (now - lastRefreshStamp) < 20; // ~1 frame
  const already = within ? lastRefreshed : {} as RefreshOpts;
  const need = {
    currentUser: !!opts.currentUser && !already.currentUser,
    users: !!opts.users && !already.users,
    inventory: !!opts.inventory && !already.inventory,
    orders: !!opts.orders && !already.orders,
    transactions: !!opts.transactions && !already.transactions,
    lotterySets: !!opts.lotterySets && !already.lotterySets,
  };

  if (need.currentUser) {
    try { const cu = loadMockUser(); if (cu || cu === null) { MOCK_CURRENT_USER = cu; } } catch {}
  }
  if (need.users) {
    try { const users = loadMockUsers(); if (Array.isArray(users)) { (mockUsers as any).length = 0; (mockUsers as any).push(...users); } } catch {}
  }
  if (need.inventory) {
    try { const inv = loadMockInventory(); if (inv && typeof inv === 'object') { MOCK_INVENTORY = inv; } } catch {}
  }
  if (need.orders) {
    try { const orders = loadOrdersLS(); if (Array.isArray(orders)) { (mockOrders as any).length = 0; (mockOrders as any).push(...orders); } } catch {}
  }
  if (need.transactions) {
    try { const txs = loadTxsLS(); if (Array.isArray(txs)) { (mockTransactions as any).length = 0; (mockTransactions as any).push(...txs); } } catch {}
  }
  if (need.lotterySets) {
    try { const sets = loadLotSetsLS(); if (Array.isArray(sets)) { MOCK_LOTTERY_SETS = sets as any; } } catch {}
  }
  lastRefreshStamp = now;
  lastRefreshed = within ? { ...lastRefreshed, ...opts } : { ...opts };
}

function ensureLotterySetIds() {
  let mutated = false;
  MOCK_LOTTERY_SETS = MOCK_LOTTERY_SETS.map(s => {
    if (!s || typeof s.id !== 'string' || s.id.trim() === '') {
      mutated = true;
      return { ...s, id: 'set-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    }
    return s;
  });
  return mutated;
}

// Normalize prefix: remove trailing slashes, ensure leading slash only when present
const ENV_PREFIX = ENV_PREFIX_RAW
  ? '/' + String(ENV_PREFIX_RAW).replace(/^\/+|\/+$|\s+/g, '').replace(/^/, '').replace(/\/+/g, '/')
  : '';

// Log configuration on initialization (only once)
if (typeof window !== 'undefined' && !window.__API_CONFIG_LOGGED__) {
  console.log('[API Config]', {
    ENV_BASE,
    ENV_PREFIX,
    USE_MOCK
  });
  (window as any).__API_CONFIG_LOGGED__ = true;
}

function buildUrl(endpoint: string) {
  const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${ENV_BASE}${ENV_PREFIX}${ep}`;
}

/**
 * A generic API call utility to communicate with the backend.
 * It automatically handles JSON content type, includes credentials (cookies),
 * and provides standardized error handling.
 * @param endpoint The API endpoint to call (e.g., '/lottery-sets').
 * @param options Standard fetch options (method, body, etc.).
 * @returns The JSON response from the server, or undefined for no-content responses.
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
    try {
        // Lightweight mock handling for core GET endpoints when USE_MOCK=true
        const method = (options.method || 'GET').toString().toUpperCase();
        if (USE_MOCK && method === 'GET') {
            const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const qIndex = ep.indexOf('?');
            const pathOnly = qIndex >= 0 ? ep.slice(0, qIndex) : ep;
            const search = qIndex >= 0 ? new URLSearchParams(ep.slice(qIndex + 1)) : null;
            if (ep === '/site-config') {
                console.info('[API][MOCK] GET /site-config');
                return Promise.resolve(mockSiteConfig);
            }
            if (ep === '/admin/shop/products') {
                console.info('[API][MOCK] GET /admin/shop/products');
                return Promise.resolve(mockShopProducts);
            }
            if (ep === '/categories') {
                console.info('[API][MOCK] GET /categories');
                return Promise.resolve(mockCategories);
            }
            if (ep === '/lottery-sets') {
                console.info('[API][MOCK] GET /lottery-sets');
                refreshSnapshotsSelective({ lotterySets: true });
                ensureLotterySetIds();
                return Promise.resolve(MOCK_LOTTERY_SETS);
            }
            if (ep === '/shop/products') {
                console.info('[API][MOCK] GET /shop/products');
                return Promise.resolve(mockShopProducts);
            }
            if (ep === '/auth/session') {
                console.info('[API][MOCK] GET /auth/session');
                refreshSnapshotsSelective({ currentUser: true, users: true, inventory: true, orders: true, transactions: true });
                const invItems = Object.values(MOCK_INVENTORY).filter((pi: any) => pi.userId === MOCK_CURRENT_USER?.id);
                const invObj = Object.fromEntries(invItems.map((pi: any) => [pi.instanceId, pi]));
                const myShopOrders = (mockShopOrders || []).filter((o:any) => o.userId === MOCK_CURRENT_USER?.id);
                return Promise.resolve({
                  user: MOCK_CURRENT_USER,
                  inventory: invObj,
                  orders: mockOrders,
                  shipments: mockShipments,
                  pickupRequests: mockPickupRequests,
                  transactions: mockTransactions,
                  shopOrders: myShopOrders,
                });
            }
            if (ep === '/admin/shop/orders') {
                console.info('[API][MOCK] GET /admin/shop/orders');
                return Promise.resolve(mockShopOrders);
            }
            if (ep === '/admin/shop/products') {
                console.info('[API][MOCK] GET /admin/shop/products');
                return Promise.resolve(mockShopProducts);
            }
            if (ep === '/user/inventory') {
                console.info('[API][MOCK] GET /user/inventory');
                refreshSnapshotsSelective({ currentUser: true, inventory: true });
                if (!MOCK_CURRENT_USER) return Promise.resolve({});
                const items = Object.values(MOCK_INVENTORY).filter((pi: any) => pi.userId === MOCK_CURRENT_USER.id);
                const obj = Object.fromEntries(items.map((pi: any) => [pi.instanceId, pi]));
                return Promise.resolve(obj);
            }
            if (ep === '/admin/users') {
                console.info('[API][MOCK] GET /admin/users');
                refreshSnapshotsSelective({ users: true });
                return Promise.resolve(mockUsers);
            }
            if (pathOnly === '/orders/recent') {
                console.info('[API][MOCK] GET /orders/recent');
                refreshSnapshotsSelective({ orders: true, users: true, inventory: true });
                const sorted = [...(mockOrders || [])].sort((a:any,b:any)=>{
                  const ta = new Date(a.createdAt || a.time || 0).getTime();
                  const tb = new Date(b.createdAt || b.time || 0).getTime();
                  return tb - ta;
                });
                const lim = search ? parseInt(String(search.get('limit') || ''), 10) : NaN;
                const take = Number.isFinite(lim) && lim > 0 ? sorted.slice(0, lim) : sorted;
                const enriched = take.map((o: any) => {
                    const userObj = (mockUsers || []).find((u:any) => u.id === o.userId);
                    const username = (o.username && String(o.username).trim()) || userObj?.username || '';
                    const usernameMasked = maskUsername(username);
                    const gradeByInstance: Record<string, string> = {};
                    for (const pid of (o.prizeInstanceIds || [])) {
                        const inst = MOCK_INVENTORY[pid];
                        if (inst && typeof inst.grade === 'string') gradeByInstance[pid] = inst.grade;
                    }
                    const prizeSummary: Record<string, number> = {};
                    Object.values(gradeByInstance).forEach((g) => {
                        prizeSummary[g] = (prizeSummary[g] || 0) + 1;
                    });
                    return { ...o, gradeByInstance, prizeSummary, username, usernameMasked };
                });
                return Promise.resolve(enriched);
            }
        }

        // Mock: PUT endpoints
        if (USE_MOCK && method === 'PUT') {
            refreshSnapshotsSelective({ currentUser: true, users: true, inventory: true, orders: false, transactions: false });
            const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
            const addrPut = ep.match(/^\/user\/addresses\/([^/]+)$/);
            if (addrPut) {
                console.info('[API][MOCK] PUT /user/addresses/:id');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const id = addrPut[1];
                const list = [...(MOCK_CURRENT_USER.shippingAddresses || [])];
                const idx = list.findIndex((a:any) => a.id === id);
                if (idx === -1) throw new Error('地址不存在');
                const updatedAddr = { ...list[idx], ...body, id: list[idx].id };
                list[idx] = updatedAddr;
                const updatedUser = { ...MOCK_CURRENT_USER, shippingAddresses: list };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                return Promise.resolve(updatedUser);
            }
            const adminShipStatus = ep.match(/^\/admin\/shipments\/([^/]+)\/status$/);
            if (adminShipStatus) {
                console.info('[API][MOCK] PUT /admin/shipments/:id/status');
                const id = adminShipStatus[1];
                const { status, trackingNumber, carrier } = body || {} as any;
                const idx = mockShipments.findIndex((s:any) => s.id === id);
                if (idx === -1) throw new Error('找不到出貨單');
                const prev = mockShipments[idx];
                const updatedShipment = {
                    ...prev,
                    status: status || prev.status,
                    trackingNumber: trackingNumber ?? prev.trackingNumber,
                    carrier: carrier ?? prev.carrier,
                    shippedAt: (status === 'SHIPPED') ? new Date().toISOString() : prev.shippedAt,
                };
                mockShipments[idx] = updatedShipment;
                // Update inventory item statuses if shipped
                if (status === 'SHIPPED') {
                    for (const piId of updatedShipment.prizeInstanceIds) {
                        const pi = MOCK_INVENTORY[piId];
                        if (pi) {
                            MOCK_INVENTORY[piId] = { ...pi, status: 'SHIPPED' };
                        }
                    }
                    saveMockInventory(MOCK_INVENTORY);
                }
                return Promise.resolve(updatedShipment);
            }
            const adminShopOrderStatus = ep.match(/^\/admin\/shop\/orders\/([^/]+)\/status$/);
            if (adminShopOrderStatus) {
                console.info('[API][MOCK] PUT /admin/shop/orders/:id/status');
                const id = adminShopOrderStatus[1];
                const { status, trackingNumber, carrier } = body || {} as any;
                const idx = mockShopOrders.findIndex((o:any) => o.id === id);
                if (idx === -1) throw new Error('找不到商城訂單');
                const prev = mockShopOrders[idx];
                const updated = {
                    ...prev,
                    status: status || prev.status,
                    trackingNumber: trackingNumber ?? prev.trackingNumber,
                    carrier: carrier ?? prev.carrier,
                };
                mockShopOrders[idx] = updated as any;
                return Promise.resolve(updated);
            }
            const rolePut = ep.match(/^\/admin\/users\/([^/]+)\/role$/);
            if (rolePut) {
                console.info('[API][MOCK] PUT /admin/users/:id/role');
                const id = rolePut[1];
                const { role } = body || {} as any;
                const idx = mockUsers.findIndex((u:any) => u.id === id);
                if (idx === -1) throw new Error('找不到使用者');
                const updated = { ...mockUsers[idx], role: role || mockUsers[idx].role } as any;
                mockUsers[idx] = updated;
                if (MOCK_CURRENT_USER && MOCK_CURRENT_USER.id === id) {
                    MOCK_CURRENT_USER = { ...MOCK_CURRENT_USER, role: updated.role };
                    saveMockUser(MOCK_CURRENT_USER);
                }
                return Promise.resolve(updated);
            }
        }

        // Mock: DELETE endpoints
        if (USE_MOCK && method === 'DELETE') {
            refreshSnapshotsSelective({ currentUser: true, users: true, inventory: true });
            const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const addrDelete = ep.match(/^\/user\/addresses\/([^/]+)$/);
            if (addrDelete) {
                console.info('[API][MOCK] DELETE /user/addresses/:id');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const id = addrDelete[1];
                const list = (MOCK_CURRENT_USER.shippingAddresses || []).filter((a:any) => a.id !== id);
                // ensure one default remains if list not empty
                if (list.length > 0 && !list.some((a:any) => a.isDefault)) {
                    list[0].isDefault = true;
                }
                const updatedUser = { ...MOCK_CURRENT_USER, shippingAddresses: list };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                return Promise.resolve(updatedUser);
            }
            const delShopProd = ep.match(/^\/admin\/shop\/products\/([^/]+)$/);
            if (delShopProd) {
                console.info('[API][MOCK] DELETE /admin/shop/products/:id');
                const id = delShopProd[1];
                const idx = mockShopProducts.findIndex((p:any) => p.id === id);
                if (idx !== -1) (mockShopProducts as any).splice(idx, 1);
                return Promise.resolve({ ok: true });
            }
        }

        // Lightweight mock handling for core auth POST endpoints
        if (USE_MOCK && method === 'POST') {
            refreshSnapshotsSelective({ currentUser: true, users: true });
            const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            // CRITICAL: Skip mock for all lottery/queue operations - always use real backend
            if (ep.includes('/lottery-sets/') || ep.includes('/queue')) {
                // Fall through to real API call below
            } else {
            const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
            // Password reset helpers
            const PWD_EXPIRE_MS = 15 * 60 * 1000; // 15 minutes
            // Admin: mock tools
            if (ep === '/admin/mock/reset') {
                console.info('[API][MOCK] POST /admin/mock/reset');
                resetAllMockData();
                saveMockVersion(CURRENT_SCHEMA_VERSION);
                // re-seed from initial defaults
                saveMockUsers(getDefaultMockUsers());
                saveLotSetsLS(initialMockLotterySets);
                saveMockInventory({});
                saveOrdersLS([]);
                saveTxsLS([]);
                saveUserLS(null);
                // clear password reset store
                try { savePwdLS({}); } catch {}
                // refresh all snapshots, including lottery sets
                refreshSnapshotsSelective({ currentUser: true, users: true, inventory: true, orders: true, transactions: true, lotterySets: true });
                return Promise.resolve({ ok: true });
            }
            if (ep === '/admin/mock/export') {
                console.info('[API][MOCK] POST /admin/mock/export');
                const dump = exportAllMockData();
                return Promise.resolve(dump);
            }
            if (ep === '/admin/mock/import') {
                console.info('[API][MOCK] POST /admin/mock/import');
                importAllMockData(body || {});
                refreshSnapshotsSelective({ currentUser: true, users: true, inventory: true, orders: true, transactions: true });
                return Promise.resolve({ ok: true });
            }
            if (ep === '/admin/shop/products') {
                console.info('[API][MOCK] POST /admin/shop/products');
                if (!MOCK_CURRENT_USER || MOCK_CURRENT_USER.role !== 'ADMIN') throw new Error('需要管理員身份');
                const { id, title, description, imageUrl, price, depositPrice, allowDirectBuy, allowPreorderFull, allowPreorderDeposit, stockStatus } = body || {} as any;
                if (!title || !imageUrl || !stockStatus) throw new Error('缺少必要欄位');
                const payload = {
                    id: id && typeof id === 'string' ? id : ('shop-prod-' + Date.now()),
                    title: String(title),
                    description: String(description || ''),
                    imageUrl: String(imageUrl),
                    price: Number(price || 0),
                    depositPrice: (depositPrice === undefined || depositPrice === null || depositPrice === '') ? undefined : Number(depositPrice),
                    allowDirectBuy: !!allowDirectBuy,
                    allowPreorderFull: !!allowPreorderFull,
                    allowPreorderDeposit: !!allowPreorderDeposit,
                    stockStatus: String(stockStatus),
                } as any;
                const idx = (mockShopProducts as any[]).findIndex((p:any) => p.id === payload.id);
                if (idx === -1) {
                    (mockShopProducts as any).push(payload);
                } else {
                    (mockShopProducts as any)[idx] = { ...(mockShopProducts as any)[idx], ...payload };
                }
                return Promise.resolve(payload);
            }
            const shopOrderCreate = ep === '/shop/orders';
            if (shopOrderCreate) {
                console.info('[API][MOCK] POST /shop/orders');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const { productId, mode, contactName, contactPhone, remark } = body || {} as any;
                const product = (mockShopProducts || []).find((p:any) => p.id === productId);
                if (!product) throw new Error('找不到商品');
                const nowIso = new Date().toISOString();
                let orderType: 'DIRECT' | 'PREORDER_FULL' | 'PREORDER_DEPOSIT' = 'DIRECT';
                let payDelta = 0;
                let payment: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
                let status: 'PENDING' | 'CONFIRMED' | 'FULFILLING' | 'SHIPPED' | 'OUT_OF_STOCK' | 'COMPLETED' | 'CANCELLED' = 'PENDING';
                if (mode === 'DIRECT') {
                    if (product.stockStatus !== 'IN_STOCK' || !product.allowDirectBuy) throw new Error('目前無法直接購買');
                    orderType = 'DIRECT';
                    payDelta = product.price;
                    payment = 'PAID';
                    status = 'CONFIRMED';
                } else if (mode === 'PREORDER_FULL') {
                    if (!product.allowPreorderFull) throw new Error('不支援全額預購');
                    orderType = 'PREORDER_FULL';
                    payDelta = product.price;
                    payment = 'PAID';
                    status = 'PENDING';
                } else if (mode === 'PREORDER_DEPOSIT') {
                    if (!product.allowPreorderDeposit || typeof product.depositPrice !== 'number') throw new Error('不支援訂金預購');
                    orderType = 'PREORDER_DEPOSIT';
                    payDelta = product.depositPrice || 0;
                    payment = 'PARTIALLY_PAID';
                    status = 'PENDING';
                } else {
                    throw new Error('無效的下單模式');
                }
                if ((MOCK_CURRENT_USER.points || 0) < payDelta) throw new Error('點數不足');
                const updatedUser = { ...MOCK_CURRENT_USER, points: (MOCK_CURRENT_USER.points || 0) - payDelta };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                syncMockUserList(updatedUser);
                const newOrder = {
                    id: 'shop-ord-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    productTitle: product.title,
                    productImageUrl: product.imageUrl,
                    type: orderType,
                    payment,
                    status,
                    totalPoints: product.price,
                    paidPoints: payDelta,
                    createdAt: nowIso,
                    contactName: contactName || undefined,
                    contactPhone: contactPhone || undefined,
                    remark: remark || undefined,
                    canFinalize: false,
                };
                (mockShopOrders as any).push(newOrder);
                // record transaction using ADMIN_ADJUSTMENT for visibility
                const tx = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'ADMIN_ADJUSTMENT',
                    amount: -payDelta,
                    date: nowIso,
                    description: orderType === 'PREORDER_DEPOSIT' ? `商城訂金預購：${product.title}` : `商城購買/預購：${product.title}`,
                };
                mockTransactions.push(tx as any);
                return Promise.resolve({ newOrder, updatedUser, newTransaction: tx });
            }
            const shopFinalize = ep.match(/^\/shop\/orders\/([^/]+)\/finalize$/);
            if (shopFinalize) {
                console.info('[API][MOCK] POST /shop/orders/:id/finalize');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const id = shopFinalize[1];
                const idx = mockShopOrders.findIndex((o:any) => o.id === id);
                if (idx === -1) throw new Error('找不到訂單');
                const o = mockShopOrders[idx];
                if (o.type !== 'PREORDER_DEPOSIT') throw new Error('非訂金預購');
                if (!o.canFinalize) throw new Error('尚未開放補款');
                const remain = Math.max(0, (o.totalPoints || 0) - (o.paidPoints || 0));
                if ((MOCK_CURRENT_USER.points || 0) < remain) throw new Error('點數不足');
                const updatedUser = { ...MOCK_CURRENT_USER, points: (MOCK_CURRENT_USER.points || 0) - remain };
                MOCK_CURRENT_USER = updatedUser; saveMockUser(updatedUser); syncMockUserList(updatedUser);
                const updatedOrder = { ...o, paidPoints: (o.paidPoints || 0) + remain, payment: 'PAID' as const };
                mockShopOrders[idx] = updatedOrder as any;
                const tx = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'ADMIN_ADJUSTMENT',
                    amount: -remain,
                    date: new Date().toISOString(),
                    description: `商城補繳尾款：${o.productTitle}`,
                };
                mockTransactions.push(tx as any);
                return Promise.resolve({ updatedOrder, updatedUser, newTransaction: tx });
            }
            const shopRequestShip = ep.match(/^\/shop\/orders\/([^/]+)\/request-ship$/);
            if (shopRequestShip) {
                console.info('[API][MOCK] POST /shop/orders/:id/request-ship');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const id = shopRequestShip[1];
                const { shippingAddressId } = body || {} as any;
                const idx = mockShopOrders.findIndex((o:any) => o.id === id && o.userId === MOCK_CURRENT_USER.id);
                if (idx === -1) throw new Error('找不到訂單');
                const o = mockShopOrders[idx];
                if (o.payment !== 'PAID') throw new Error('尚未付清');
                const addr = (MOCK_CURRENT_USER.shippingAddresses || []).find((a:any) => a.id === shippingAddressId) || (MOCK_CURRENT_USER.shippingAddresses || [])[0];
                if (!addr) throw new Error('找不到收件地址');
                const updatedOrder = { ...o, status: 'CONFIRMED' as const, shippingAddress: addr };
                mockShopOrders[idx] = updatedOrder as any;
                return Promise.resolve({ updatedOrder });
            }
            const adminFinalizeReady = ep.match(/^\/admin\/shop\/orders\/([^/]+)\/finalize-ready$/);
            if (adminFinalizeReady) {
                console.info('[API][MOCK] POST /admin/shop/orders/:id/finalize-ready');
                const id = adminFinalizeReady[1];
                const { channel } = body || {} as any;
                const idx = mockShopOrders.findIndex((o:any) => o.id === id);
                if (idx === -1) throw new Error('找不到訂單');
                const o = mockShopOrders[idx];
                if (o.type !== 'PREORDER_DEPOSIT') throw new Error('僅適用訂金預購');
                const updatedOrder = { ...o, canFinalize: true, finalizeNotifiedAt: new Date().toISOString(), finalizeNotifyChannel: channel || '站內信' };
                mockShopOrders[idx] = updatedOrder as any;
                return Promise.resolve({ updatedOrder });
            }
            if (ep === '/auth/password-reset/request') {
                console.info('[API][MOCK] POST /auth/password-reset/request');
                const { email } = body || {};
                const user = (mockUsers || []).find((u:any) => u.email === email);
                // Always respond successful to avoid user enumeration; but only create code if user exists
                const store = loadPwdLS();
                if (user) {
                    const now = Date.now();
                    const rec = store[email] || {} as any;
                    // simple rate limit: max 3 per 10 minutes
                    const within = (now - (rec.lastReqAt || 0)) < (10 * 60 * 1000) ? (rec.reqCount || 0) + 1 : 1;
                    rec.reqCount = within;
                    rec.lastReqAt = now;
                    if (within > 3) {
                        // silently accept but do not generate a new code
                    } else {
                        const code = Math.floor(100000 + Math.random() * 900000).toString();
                        rec.code = code;
                        rec.expiresAt = now + PWD_EXPIRE_MS;
                        rec.attempts = 0;
                        rec.lockedUntil = 0;
                        store[email] = rec;
                        savePwdLS(store);
                        const masked = String(email).replace(/(^.).*(@.).*(\..+$)/, '$1***$2***$3');
                        return Promise.resolve({ sentTo: masked, code }); // UI 直接顯示 code（Mock）
                    }
                    store[email] = rec;
                    savePwdLS(store);
                }
                const masked = String(email || 'user@example.com').replace(/(^.).*(@.).*(\..+$)/, '$1***$2***$3');
                return Promise.resolve({ sentTo: masked, code: undefined });
            }
            if (ep === '/auth/password-reset/confirm') {
                console.info('[API][MOCK] POST /auth/password-reset/confirm');
                const { email, code, newPassword } = body || {};
                const store = loadPwdLS();
                const rec = store[email];
                const now = Date.now();
                if (!rec) throw new Error('重設代碼無效，請重新申請');
                if (rec.lockedUntil && now < rec.lockedUntil) throw new Error('嘗試過多，請稍後再試');
                if (!rec.code || !rec.expiresAt || now > rec.expiresAt) {
                    delete store[email];
                    savePwdLS(store);
                    throw new Error('代碼已過期，請重新申請');
                }
                if (String(code) !== String(rec.code)) {
                    rec.attempts = (rec.attempts || 0) + 1;
                    if (rec.attempts >= 5) {
                        rec.lockedUntil = now + 10 * 60 * 1000; // 10 min lock
                    }
                    store[email] = rec;
                    savePwdLS(store);
                    throw new Error('代碼錯誤');
                }
                // success
                const idx = (mockUsers || []).findIndex((u:any) => u.email === email);
                if (idx === -1) throw new Error('找不到帳號');
                const updated = { ...mockUsers[idx], password: String(newPassword || '') } as any;
                mockUsers[idx] = updated;
                saveMockUsers(mockUsers);
                delete store[email];
                savePwdLS(store);
                return Promise.resolve({ success: true });
            }
            // Mock draw endpoint - DISABLED: always use real backend for lottery operations
            const drawMatch = false; // ep.match(/^\/lottery-sets\/([^/]+)\/draw$/);
            if (drawMatch) {
                console.info('[API][MOCK] POST /lottery-sets/:id/draw');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const setId = decodeURIComponent(drawMatch[1]);
                const { tickets = [], drawHash, secretKey } = body || {};
                const setIndex = MOCK_LOTTERY_SETS.findIndex(s => s.id === setId);
                if (setIndex === -1) throw new Error('找不到一番賞');
                const setObj = { ...MOCK_LOTTERY_SETS[setIndex] };
                const taken = new Set<number>(setObj.drawnTicketIndices || []);
                const validTickets: number[] = Array.isArray(tickets) ? tickets.filter((t: number) => Number.isInteger(t) && !taken.has(t)) : [];
                if (validTickets.length === 0) throw new Error('未選擇有效籤');
                const costPer = getEffectivePrice(setObj);
                const totalCost = costPer * validTickets.length;
                if ((MOCK_CURRENT_USER.points || 0) < totalCost) throw new Error('點數不足');

                // Build prize instances
                const originalPrizes = [...(setObj.prizes || [])];
                const normalPrizes = originalPrizes.filter((p:any) => p.type === 'NORMAL').map(p => ({ ...p }));
                let lastOnePrize = originalPrizes.find((p:any) => p.type === 'LAST_ONE');
                const prizeInstances: any[] = [];
                const prizeOrder: string[] = setObj.prizeOrder ? [...setObj.prizeOrder] : Array(originalPrizes.filter((p:any)=>p.type==='NORMAL').reduce((s:number,p:any)=>s+p.total,0)).fill('');
                for (const ticketIdx of validTickets) {
                    const pickIdx = pickPrize(normalPrizes);
                    if (pickIdx === -1) break;
                    const p = { ...normalPrizes[pickIdx] };
                    p.remaining = Math.max(0, (p.remaining || 0) - 1);
                    normalPrizes[pickIdx] = p;
                    prizeOrder[ticketIdx] = p.id;
                    prizeInstances.push({
                        instanceId: 'pi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                        lotterySetId: setObj.id,
                        userId: MOCK_CURRENT_USER.id,
                        status: 'IN_INVENTORY',
                        isRecycled: false,
                        recycleValue: typeof p.recycleValue === 'number' ? p.recycleValue : (typeof RECYCLE_VALUE === 'number' ? RECYCLE_VALUE : 0),
                        ...p,
                    });
                }

                // If after this draw, all NORMAL prizes are gone and LAST_ONE remains, award LAST_ONE to this user
                const remainingNormal = normalPrizes.reduce((sum:number, p:any) => sum + (p.remaining || 0), 0);
                if (remainingNormal === 0 && lastOnePrize && (lastOnePrize.remaining || 0) > 0) {
                    const lp = { ...lastOnePrize };
                    lp.remaining = Math.max(0, (lp.remaining || 0) - 1);
                    lastOnePrize = lp;
                    // award LAST_ONE instance to current user (no ticket index association)
                    prizeInstances.push({
                        instanceId: 'pi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                        lotterySetId: setObj.id,
                        userId: MOCK_CURRENT_USER.id,
                        status: 'IN_INVENTORY',
                        isRecycled: false,
                        recycleValue: typeof lp.recycleValue === 'number' ? lp.recycleValue : (typeof RECYCLE_VALUE === 'number' ? RECYCLE_VALUE : 0),
                        ...lp,
                    });
                }

                // Compose updated prizes: updated NORMALs + LAST_ONE (updated if present)
                const updatedPrizes = lastOnePrize ? [...normalPrizes, lastOnePrize] : [...normalPrizes];

                const updatedSet = {
                    ...setObj,
                    drawnTicketIndices: [...(setObj.drawnTicketIndices || []), ...validTickets].sort((a:number,b:number)=>a-b),
                    prizes: updatedPrizes,
                    prizeOrder,
                };
                MOCK_LOTTERY_SETS = MOCK_LOTTERY_SETS.map((s:any) => s.id === setId ? updatedSet : s);
                saveLotSetsLS(MOCK_LOTTERY_SETS);

                const date = new Date().toISOString();
                const updatedUser = { ...MOCK_CURRENT_USER, points: (MOCK_CURRENT_USER.points || 0) - totalCost };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                syncMockUserList(updatedUser);

                const newOrder = {
                    id: 'ord-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    date,
                    lotterySetTitle: setObj.title,
                    prizeInstanceIds: prizeInstances.map(p => p.instanceId),
                    prizeSummary: prizeInstances.reduce((acc: Record<string, number>, p: any) => {
                        const g = String(p.grade || '').trim();
                        if (!g) return acc;
                        acc[g] = (acc[g] || 0) + 1;
                        return acc;
                    }, {}),
                    costInPoints: totalCost,
                    drawHash: String(drawHash || ''),
                    secretKey: String(secretKey || ''),
                    drawnTicketIndices: validTickets,
                };
                const newTransaction = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'DRAW',
                    amount: -totalCost,
                    date,
                    description: `抽獎 ${setObj.title} x${validTickets.length}`,
                    prizeInstanceIds: prizeInstances.map(p => p.instanceId),
                };

                // Persist to mock inventory so recycle and inventory views work
                for (const pi of prizeInstances) {
                    MOCK_INVENTORY[pi.instanceId] = pi;
                }
                saveMockInventory(MOCK_INVENTORY);

                // Persist order and transaction so recent winners can see them
                mockOrders.push(newOrder as any);
                saveOrdersLS(mockOrders);
                mockTransactions.push(newTransaction as any);
                saveMockUsers(mockUsers);
                saveTxsLS(mockTransactions);

                return Promise.resolve({
                    drawnPrizes: prizeInstances,
                    updatedUser,
                    newOrder,
                    newTransaction,
                    updatedLotterySet: updatedSet,
                });
            }
            // Inventory recycle
            if (ep === '/inventory/recycle') {
                console.info('[API][MOCK] POST /inventory/recycle');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const { prizeInstanceIds } = body || {};
                const ids: string[] = Array.isArray(prizeInstanceIds) ? prizeInstanceIds : [];
                if (ids.length === 0) throw new Error('沒有要回收的獎品');
                let gained = 0;
                const updated: any[] = [];
                for (const id of ids) {
                    const pi = MOCK_INVENTORY[id];
                    if (!pi) continue;
                    if (pi.userId !== MOCK_CURRENT_USER.id) continue;
                    if (pi.isRecycled) continue;
                    const value = Number((pi.recycleValue != null ? pi.recycleValue : (typeof RECYCLE_VALUE === 'number' ? RECYCLE_VALUE : 0)) || 0);
                    gained += value;
                    const newPi = { ...pi, isRecycled: true };
                    MOCK_INVENTORY[id] = newPi;
                    updated.push(newPi);
                }
                const date = new Date().toISOString();
                const updatedUser = { ...MOCK_CURRENT_USER, points: (MOCK_CURRENT_USER.points || 0) + gained };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                const newTransaction = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'RECYCLE',
                    amount: gained,
                    date,
                    description: `回收 ${updated.length} 件獎品`,
                    prizeInstanceIds: updated.map(u => u.instanceId),
                };
                saveMockInventory(MOCK_INVENTORY);
                return Promise.resolve({ updatedUser, newTransaction });
            }
            // Create shipment
            if (ep === '/shipments') {
                console.info('[API][MOCK] POST /shipments');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const { prizeInstanceIds, shippingAddressId } = body || {};
                const ids: string[] = Array.isArray(prizeInstanceIds) ? prizeInstanceIds : [];
                if (!ids.length) throw new Error('未選擇要運送的獎品');
                const addr = (MOCK_CURRENT_USER.shippingAddresses || []).find((a:any) => a.id === shippingAddressId) || (MOCK_CURRENT_USER.shippingAddresses || [])[0];
                if (!addr) throw new Error('找不到收件地址');
                const prizes = ids
                    .map(id => MOCK_INVENTORY[id])
                    .filter((p:any) => p && p.userId === MOCK_CURRENT_USER.id && p.status === 'IN_INVENTORY' && !p.isRecycled);
                if (prizes.length !== ids.length) throw new Error('包含不可運送的獎品');
                const totalWeight = prizes.reduce((s:number, p:any) => s + (p.weight || 0), 0);
                let shippingCost = SHIPPING_BASE_FEE_POINTS;
                if (totalWeight > SHIPPING_BASE_WEIGHT_G) {
                    const extraKg = Math.ceil((totalWeight - SHIPPING_BASE_WEIGHT_G) / 1000);
                    shippingCost += extraKg * SHIPPING_EXTRA_FEE_PER_KG;
                }
                if ((MOCK_CURRENT_USER.points || 0) < shippingCost) throw new Error('點數不足以支付運費');
                // deduct points
                const date = new Date().toISOString();
                const updatedUser = { ...MOCK_CURRENT_USER, points: (MOCK_CURRENT_USER.points || 0) - shippingCost };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                syncMockUserList(updatedUser);
                // update inventory status
                for (const p of prizes) {
                    MOCK_INVENTORY[p.instanceId] = { ...p, status: 'IN_SHIPMENT' };
                }
                saveMockInventory(MOCK_INVENTORY);
                // create shipment
                const newShipment = {
                    id: 'shp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    prizeInstanceIds: ids,
                    shippingAddress: addr,
                    shippingCostInPoints: shippingCost,
                    totalWeightInGrams: totalWeight,
                    requestedAt: date,
                    status: 'PENDING',
                } as any;
                mockShipments.push(newShipment);
                const newTransaction = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'SHIPPING',
                    amount: -shippingCost,
                    date,
                    description: `申請運送，扣除運費 ${shippingCost} P`,
                } as any;
                mockTransactions.push(newTransaction as any);
                saveTxsLS(mockTransactions);
                return Promise.resolve({ newShipment, updatedUser, newTransaction });
            }
            if (ep === '/pickups') {
                console.info('[API][MOCK] POST /pickups');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const { prizeInstanceIds } = body || {};
                const ids: string[] = Array.isArray(prizeInstanceIds) ? prizeInstanceIds : [];
                if (!ids.length) throw new Error('未選擇要自取的獎品');
                const pickPrizes = ids
                    .map((id: string) => MOCK_INVENTORY[id])
                    .filter((p: any) => {
                        if (!p) return false;
                        const owned = p.userId === MOCK_CURRENT_USER.id;
                        const eligibleStatus = p.status === 'IN_INVENTORY' && !p.isRecycled;
                        // Per-prize flag or fallback to set-level flag for backward compatibility
                        const perPrize = p.allowSelfPickup === true;
                        const setObj = (MOCK_LOTTERY_SETS || []).find((s:any) => s.id === p.lotterySetId);
                        const fallbackSet = !!setObj?.allowSelfPickup;
                        const allowPickup = perPrize || fallbackSet;
                        return owned && eligibleStatus && allowPickup;
                    });
                if (pickPrizes.length !== ids.length) throw new Error('包含不可自取的獎品');
                const pickDate = new Date().toISOString();
                for (const p of pickPrizes) {
                    MOCK_INVENTORY[p.instanceId] = { ...p, status: 'PENDING_PICKUP' };
                }
                saveMockInventory(MOCK_INVENTORY);
                const newPickupRequest = {
                    id: 'pku-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    userId: MOCK_CURRENT_USER.id,
                    username: MOCK_CURRENT_USER.username,
                    prizeInstanceIds: pickPrizes.map((p: any) => p.instanceId),
                    status: 'PENDING',
                    requestedAt: pickDate,
                } as any;
                mockPickupRequests.push(newPickupRequest);
                const newTransaction2 = {
                    id: 'txn-' + Date.now(),
                    userId: MOCK_CURRENT_USER.id,
                    username: MOCK_CURRENT_USER.username,
                    type: 'PICKUP_REQUEST',
                    amount: 0,
                    date: pickDate,
                    description: `申請自取 ${ids.length} 件`,
                    prizeInstanceIds: ids,
                } as any;
                mockTransactions.push(newTransaction2 as any);
                saveTxsLS(mockTransactions);
                return Promise.resolve({ newPickupRequest, newTransaction: newTransaction2 });
            }
            // Shipping addresses CRUD
            if (ep === '/user/addresses') {
                console.info('[API][MOCK] POST /user/addresses');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const addr = body || {};
                const newAddr = {
                    id: 'addr-' + Date.now(),
                    name: addr.name || '',
                    phone: addr.phone || '',
                    address: addr.address || '',
                    isDefault: (MOCK_CURRENT_USER.shippingAddresses || []).length === 0 ? true : false,
                };
                const updatedUser = {
                    ...MOCK_CURRENT_USER,
                    shippingAddresses: [ ...(MOCK_CURRENT_USER.shippingAddresses || []), newAddr ],
                };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                return Promise.resolve(updatedUser);
            }
            const addrDefault = ep.match(/^\/user\/addresses\/([^/]+)\/default$/);
            if (addrDefault && method === 'POST') {
                console.info('[API][MOCK] POST /user/addresses/:id/default');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const id = addrDefault[1];
                const list = [...(MOCK_CURRENT_USER.shippingAddresses || [])].map((a:any) => ({ ...a, isDefault: a.id === id }));
                const updatedUser = { ...MOCK_CURRENT_USER, shippingAddresses: list };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                return Promise.resolve(updatedUser);
            }
            // Recharge points
            if (ep === '/user/recharge') {
                console.info('[API][MOCK] POST /user/recharge');
                if (!MOCK_CURRENT_USER) throw new Error('尚未登入');
                const { amount } = body || {};
                const amt = Math.max(0, Number(amount || 0));
                const date = new Date().toISOString();
                const updatedUser = { ...MOCK_CURRENT_USER, points: (MOCK_CURRENT_USER.points || 0) + amt };
                MOCK_CURRENT_USER = updatedUser;
                saveMockUser(updatedUser);
                syncMockUserList(updatedUser);
                const newTransaction = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'RECHARGE',
                    amount: amt,
                    date,
                    description: `儲值 ${amt} P`,
                };
                mockTransactions.push(newTransaction as any);
                saveTxsLS(mockTransactions);
                return Promise.resolve({ updatedUser, newTransaction });
            }
            // Admin: adjust user points
            const pointsPost = ep.match(/^\/admin\/users\/([^/]+)\/points$/);
            if (pointsPost) {
                console.info('[API][MOCK] POST /admin/users/:id/points');
                const id = pointsPost[1];
                const { points, notes } = body || {} as any;
                const idx = mockUsers.findIndex((u:any) => u.id === id);
                if (idx === -1) throw new Error('找不到使用者');
                const prevUser = mockUsers[idx] as any;
                const newPoints = Number(points);
                const safePrev = Number(prevUser.points || 0);
                const delta = (isFinite(newPoints) ? newPoints : safePrev) - safePrev;
                const updatedUser = { ...prevUser, points: isFinite(newPoints) ? newPoints : safePrev } as any;
                mockUsers[idx] = updatedUser;
                saveMockUsers(mockUsers);
                if (MOCK_CURRENT_USER && MOCK_CURRENT_USER.id === id) {
                    MOCK_CURRENT_USER = { ...MOCK_CURRENT_USER, points: updatedUser.points };
                    saveMockUser(MOCK_CURRENT_USER);
                }
                const date = new Date().toISOString();
                const newTransaction = {
                    id: 'txn-' + Date.now(),
                    userId: updatedUser.id,
                    username: updatedUser.username,
                    type: 'ADMIN_ADJUSTMENT',
                    amount: delta,
                    date,
                    description: `管理員調整點數${typeof notes === 'string' && notes ? `：${notes}` : ''}`,
                    prizeInstanceIds: [],
                } as any;
                mockTransactions.push(newTransaction);
                return Promise.resolve({ updatedUser, newTransaction });
            }
            if (ep === '/auth/register') {
                console.info('[API][MOCK] POST /auth/register');
                const { username, email, password } = body || {};
                if (!email || !password) throw new Error('缺少 email 或 password');
                const exists = mockUsers.find(u => u.email === email);
                if (exists) throw new Error('Email 已被使用');
                const newUser = { id: 'user-' + Date.now(), username: username || email, email, password, points: 0, role: 'USER', shippingAddresses: [] };
                mockUsers.push(newUser as any);
                saveMockUsers(mockUsers);
                MOCK_CURRENT_USER = { ...newUser, password: undefined };
                saveMockUser(MOCK_CURRENT_USER);
                return Promise.resolve({ user: MOCK_CURRENT_USER });
            }
            if (ep === '/auth/login') {
                console.info('[API][MOCK] POST /auth/login');
                const { email, password } = body || {};
                const found = mockUsers.find(u => u.email === email && u.password === password);
                if (!found) throw new Error('帳號或密碼錯誤');
                MOCK_CURRENT_USER = { ...found, password: undefined };
                saveMockUser(MOCK_CURRENT_USER);
                return Promise.resolve({
                  user: MOCK_CURRENT_USER,
                  inventory: {},
                  orders: mockOrders,
                  shipments: mockShipments,
                  pickupRequests: mockPickupRequests,
                  transactions: mockTransactions,
                });
            }
            if (ep === '/auth/logout') {
                console.info('[API][MOCK] POST /auth/logout');
                MOCK_CURRENT_USER = null;
                saveMockUser(null);
                return Promise.resolve(undefined);
            }
            if (ep === '/auth/verify-admin') {
                console.info('[API][MOCK] POST /auth/verify-admin');
                // In mock mode, if current user is ADMIN and provided any password, accept
                if (MOCK_CURRENT_USER?.role === 'ADMIN') {
                    return Promise.resolve(undefined);
                }
                throw new Error('需要管理員身份');
            }
            if (ep === '/auth/oauth/google') {
                console.info('[API][MOCK] POST /auth/oauth/google');
                const { email, username } = body || {};
                const base = email || `google_user_${Date.now()}@example.com`;
                let found = mockUsers.find(u => u.email === base);
                if (!found) {
                    found = { id: 'user-' + Date.now(), email: base, password: 'oauth', username: username || 'GoogleUser', points: 1000, role: 'USER', shippingAddresses: [] } as any;
                    mockUsers.push(found);
                    saveMockUsers(mockUsers);
                }
                MOCK_CURRENT_USER = { ...found, password: undefined };
                return Promise.resolve({
                  user: MOCK_CURRENT_USER,
                  inventory: {},
                  orders: mockOrders,
                  shipments: mockShipments,
                  pickupRequests: mockPickupRequests,
                  transactions: mockTransactions,
                });
            }
            if (ep === '/auth/oauth/line') {
                console.info('[API][MOCK] POST /auth/oauth/line');
                const { email, username } = body || {};
                const base = email || `line_user_${Date.now()}@example.com`;
                let found = mockUsers.find(u => u.email === base);
                if (!found) {
                    found = { id: 'user-' + Date.now(), email: base, password: 'oauth', username: username || 'LineUser', points: 1000, role: 'USER', shippingAddresses: [] } as any;
                    mockUsers.push(found);
                    saveMockUsers(mockUsers);
                }
                MOCK_CURRENT_USER = { ...found, password: undefined };
                return Promise.resolve({
                  user: MOCK_CURRENT_USER,
                  inventory: {},
                  orders: mockOrders,
                  shipments: mockShipments,
                  pickupRequests: mockPickupRequests,
                  transactions: mockTransactions,
                });
            }

            // Admin product management (mock)
            if (ep === '/admin/site-config') {
                console.info('[API][MOCK] POST /admin/site-config');
                if (MOCK_CURRENT_USER?.role !== 'ADMIN') throw new Error('需要管理員身份');
                MOCK_SITE_CONFIG = { ...MOCK_SITE_CONFIG, ...(body || {}) };
                return Promise.resolve(MOCK_SITE_CONFIG);
            }
            if (ep === '/admin/categories') {
                console.info('[API][MOCK] POST /admin/categories');
                if (MOCK_CURRENT_USER?.role !== 'ADMIN') throw new Error('需要管理員身份');
                MOCK_CATEGORIES = Array.isArray(body) ? body : (body?.categories || []);
                return Promise.resolve(MOCK_CATEGORIES);
            }
            if (ep === '/admin/lottery-sets') {
                console.info('[API][MOCK] POST /admin/lottery-sets');
                if (MOCK_CURRENT_USER?.role !== 'ADMIN') throw new Error('需要管理員身份');
                const newSet = { ...(body || {}), id: (body && body.id && String(body.id).trim()) ? body.id : ('set-' + Date.now()) };
                // If prize remaining totals not provided, leave as is
                MOCK_LOTTERY_SETS = [...MOCK_LOTTERY_SETS, newSet];
                saveLotSetsLS(MOCK_LOTTERY_SETS);
                return Promise.resolve(newSet);
            }
            } // End of else block that skips lottery/queue mock
        }

        // Admin PUT/DELETE routes in mock
        if (USE_MOCK && (method === 'PUT' || method === 'DELETE')) {
            const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            if (ep.startsWith('/admin/users/') && ep.endsWith('/role') && method === 'PUT') {
                // After role change, save users
                saveMockUsers(mockUsers);
            }
            // Admin: update pickup request status
            const pickupMatch = ep.match(/^\/admin\/pickups\/([^/]+)\/status$/);
            if (pickupMatch && method === 'PUT') {
                console.info('[API][MOCK] PUT /admin/pickups/:id/status');
                const id = pickupMatch[1];
                const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
                const { status } = body as { status: 'READY_FOR_PICKUP' | 'COMPLETED' };
                const idx = mockPickupRequests.findIndex(r => r.id === id);
                if (idx === -1) throw new Error('找不到自取單');
                const req = mockPickupRequests[idx] as any;
                const updated = { ...req, status } as any;
                if (status === 'COMPLETED') {
                    updated.completedAt = new Date().toISOString();
                }
                // Update related inventory statuses
                const prizeIds: string[] = (req.prizeInstanceIds || []) as any;
                for (const pid of prizeIds) {
                    const item = MOCK_INVENTORY[pid];
                    if (!item) continue;
                    if (status === 'READY_FOR_PICKUP') {
                        MOCK_INVENTORY[pid] = { ...item, status: 'PENDING_PICKUP' } as any;
                    } else if (status === 'COMPLETED') {
                        MOCK_INVENTORY[pid] = { ...item, status: 'PICKED_UP' } as any;
                    }
                }
                saveMockInventory(MOCK_INVENTORY);
                mockPickupRequests[idx] = updated;
                return Promise.resolve(updated);
            }
            if (ep.startsWith('/admin/lottery-sets/')) {
                if (MOCK_CURRENT_USER?.role !== 'ADMIN') throw new Error('需要管理員身份');
                const id = ep.split('/').pop() as string;
                if (method === 'PUT') {
                    console.info('[API][MOCK] PUT /admin/lottery-sets/:id');
                    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
                    MOCK_LOTTERY_SETS = MOCK_LOTTERY_SETS.map(s => s.id === id ? { ...s, ...body } : s);
                    const updated = MOCK_LOTTERY_SETS.find(s => s.id === id);
                    saveLotSetsLS(MOCK_LOTTERY_SETS);
                    return Promise.resolve(updated);
                } else {
                    console.info('[API][MOCK] DELETE /admin/lottery-sets/:id');
                    MOCK_LOTTERY_SETS = MOCK_LOTTERY_SETS.filter(s => s.id !== id);
                    saveLotSetsLS(MOCK_LOTTERY_SETS);
                    return Promise.resolve(undefined);
                }
            }
        }

        // Non-mock path: add timeout + retry with backoff for robustness
        // 從 localStorage 讀取 session ID 並添加到 Authorization header
        const sessionId = localStorage.getItem('sessionId');
        const authHeaders = sessionId ? { 'Authorization': `Bearer ${sessionId}` } : {};
        
        const response = await fetchWithRetry(buildUrl(endpoint), {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,  // ← 添加 Authorization header
                ...options.headers,
            },
            // Include credentials (like cookies) in requests for session management
            credentials: 'include', 
        }, { retries: 2, timeoutMs: 10000, backoffMs: 600 });

        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            let errorData = { message: `HTTP error! status: ${response.status}` };
            if (contentType && contentType.includes("application/json")) {
                errorData = await response.json();
            }
            // Use the message from the backend error response if available
            throw new Error(errorData.message || `API request to ${endpoint} failed`);
        }
        
        // Handle responses with no content (e.g., HTTP 204)
        if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
            return; 
        }
        
        return response.json();
    } catch (error) {
        console.error(`API Call Error to ${endpoint}:`, error);
        throw error; // Re-throw to be caught by the calling function
    }
}

// Helper: fetch with timeout and simple retry/backoff (used only in non-mock path)
async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, opts: { retries: number; timeoutMs: number; backoffMs: number }) {
  const { retries, timeoutMs, backoffMs } = opts;
  let attempt = 0;
  let lastError: any = null;
  while (attempt <= retries) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (e: any) {
      clearTimeout(id);
      lastError = e;
      if (attempt === retries) break;
      const delay = backoffMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
    attempt++;
  }
  throw lastError || new Error('Network error');
}

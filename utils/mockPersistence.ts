// Centralized mock persistence utilities
// Keys and versioning
export const KEYS = {
  currentUser: '__mock_current_user__',
  users: '__mock_users_all__',
  inventory: '__mock_inventory__',
  pwdResets: '__mock_pwd_reset__',
  orders: '__mock_orders__',
  transactions: '__mock_transactions__',
  lotterySets: '__mock_lottery_sets__',
  version: '__mock_version__',
} as const;

// Bump this if mock storage schema changes
export const CURRENT_SCHEMA_VERSION = '2';

function safeParse<T>(v: string | null, fallback: T): T {
  if (!v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

export function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}
export function saveToLS(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    if (data === undefined || data === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// Current user
export function loadMockUser() {
  return loadFromLS<any>(KEYS.currentUser, null);
}
export function saveMockUser(user: any | null) {
  saveToLS(KEYS.currentUser, user);
}

// Users list
export function loadMockUsers(): any[] {
  return loadFromLS<any[]>(KEYS.users, []);
}
export function saveMockUsers(usersArr: any[]) {
  saveToLS(KEYS.users, usersArr);
}

// Inventory
export function loadMockInventory(): Record<string, any> {
  return loadFromLS<Record<string, any>>(KEYS.inventory, {});
}
export function saveMockInventory(inv: Record<string, any>) {
  saveToLS(KEYS.inventory, inv);
}

// Password reset store
export type PwdResetRecord = { code: string; expiresAt: number; attempts: number; lockedUntil?: number; reqCount?: number; lastReqAt?: number };
export function loadPwdResets(): Record<string, PwdResetRecord> {
  return loadFromLS<Record<string, PwdResetRecord>>(KEYS.pwdResets, {} as any);
}
export function savePwdResets(obj: Record<string, PwdResetRecord>) {
  saveToLS(KEYS.pwdResets, obj);
}

// Orders & Transactions
export function loadMockOrders(): any[] {
  return loadFromLS<any[]>(KEYS.orders, []);
}
export function saveMockOrders(orders: any[]) {
  saveToLS(KEYS.orders, orders);
}
export function loadMockTransactions(): any[] { 
  return loadFromLS<any[]>(KEYS.transactions, []); 
}
export function saveMockTransactions(txs: any[]) {
  saveToLS(KEYS.transactions, txs);
}

// Lottery sets
export function loadMockLotterySets(): any[] { 
  return loadFromLS<any[]>(KEYS.lotterySets, []); 
}
export function saveMockLotterySets(list: any[]) { 
  saveToLS(KEYS.lotterySets, list); 
}

// Versioning helpers (optional)
export function loadMockVersion(): string | null {
  return loadFromLS<string | null>(KEYS.version, null);
}
export function saveMockVersion(v: string) {
  saveToLS(KEYS.version, v);
}

export function isVersionMismatch(): boolean {
  const v = loadMockVersion();
  return v !== CURRENT_SCHEMA_VERSION;
}

// Reset helpers
export function resetAllMockData() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEYS.currentUser);
    window.localStorage.removeItem(KEYS.users);
    window.localStorage.removeItem(KEYS.inventory);
    window.localStorage.removeItem(KEYS.pwdResets);
    window.localStorage.removeItem(KEYS.orders);
    window.localStorage.removeItem(KEYS.transactions);
  } catch {}
}

// Export/Import helpers
export function exportAllMockData() {
  return {
    version: loadMockVersion(),
    currentUser: loadMockUser(),
    users: loadMockUsers(),
    inventory: loadMockInventory(),
    orders: loadMockOrders(),
    transactions: loadMockTransactions(),
    pwdResets: loadPwdResets(),
  };
}

export function importAllMockData(data: any) {
  try {
    if (!data || typeof data !== 'object') return;
    saveMockUser(data.currentUser ?? null);
    saveMockUsers(Array.isArray(data.users) ? data.users : []);
    saveMockInventory(data.inventory && typeof data.inventory === 'object' ? data.inventory : {});
    saveMockOrders(Array.isArray(data.orders) ? data.orders : []);
    saveMockTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    savePwdResets(data.pwdResets && typeof data.pwdResets === 'object' ? data.pwdResets : {});
    saveMockVersion(String(data.version || CURRENT_SCHEMA_VERSION));
  } catch {}
}

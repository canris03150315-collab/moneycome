import { create } from 'zustand';
import { apiCall, clearApiCache } from '../api';
import type { User, PrizeInstance, Order, Shipment, PickupRequest, Transaction, ShippingAddress, ShopOrder } from '../types';
import { useSiteStore } from './siteDataStore';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoadingInventory: boolean;
    error: string | null;
    inventory: PrizeInstance[]; // 改為陣列，避免相同獎品互相覆蓋
    users: User[];
    orders: Order[];
    shipments: Shipment[];
    pickupRequests: PickupRequest[];
    transactions: Transaction[];
    shopOrders: ShopOrder[];
    
    checkSession: (forceRefresh?: boolean) => Promise<void>;
    fetchInventory: () => Promise<void>;
    fetchOrders: () => Promise<void>;
    fetchTransactions: () => Promise<void>;
    login: (email: string, pass: string) => Promise<boolean>;
    register: (username: string, email: string, pass: string) => Promise<boolean>;
    logout: () => Promise<void>;
    verifyAdminPassword: (password: string) => Promise<boolean>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    requestPasswordReset: (email: string) => Promise<{ success: boolean; sentTo?: string; code?: string; message?: string }>;
    confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;

    // OAuth
    loginWithOAuth: (provider: 'google' | 'line', payload: { credential?: string; idToken?: string; email?: string; username?: string }) => Promise<boolean>;

    // User Actions
    draw: (lotterySetId: string, tickets: number[], drawHash: string, secretKey: string) => Promise<{ success: boolean; message?: string; drawnPrizes?: PrizeInstance[] }>;
    rechargePoints: (amount: number) => Promise<void>;
    recyclePrize: (prizeInstanceId: string) => Promise<void>;
    batchRecyclePrizes: (prizeInstanceIds: string[]) => Promise<void>;
    saveShippingAddress: (address: Omit<ShippingAddress, 'id' | 'isDefault'>) => Promise<void>;
    updateShippingAddress: (addressId: string, addressData: Omit<ShippingAddress, 'id' | 'isDefault'>) => Promise<void>;
    deleteShippingAddress: (addressId: string) => Promise<void>;
    setDefaultShippingAddress: (addressId: string) => Promise<void>;
    requestShipment: (prizeInstanceIds: string[], shippingAddress: ShippingAddress) => Promise<{ success: boolean; message?: string; }>;
    requestPickup: (prizeInstanceIds: string[]) => Promise<{ success: boolean; message?: string; }>;
    // Shop (non-lottery) user actions
    createShopOrder: (params: { productId: string; mode: 'DIRECT' | 'PREORDER_FULL' | 'PREORDER_DEPOSIT'; contactName?: string; contactPhone?: string; remark?: string; }) => Promise<{ success: boolean; message?: string; }>;
    finalizeShopOrder: (orderId: string) => Promise<{ success: boolean; message?: string; }>;
    requestShipShopOrder: (orderId: string, shippingAddressId: string) => Promise<{ success: boolean; message?: string; }>;

    // Admin Actions
    adminAdjustUserPoints: (userId: string, newPoints: number, notes: string) => Promise<void>;
    updateUserRole: (userId: string, newRole: 'USER' | 'ADMIN') => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    adminChangeUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
    adminUpdateAdminVerifyPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean }>;
    fetchUsers: () => Promise<void>;
    fetchAllPrizes: () => Promise<void>;
    fetchUserShipments: () => Promise<void>;
    fetchUserPickupRequests: () => Promise<void>;
    fetchShipments: () => Promise<void>;
    fetchPickupRequests: () => Promise<void>;
    updateShipmentStatus: (shipmentId: string, status: 'PROCESSING' | 'SHIPPED', trackingNumber?: string, carrier?: string) => Promise<void>;
    updatePickupRequestStatus: (requestId: string, status: 'READY_FOR_PICKUP' | 'COMPLETED') => Promise<void>;
    // Admin: shop orders
    fetchAdminShopOrders: () => Promise<ShopOrder[]>;
    adminFinalizeReady: (orderId: string, channel: '站內信' | 'Email') => Promise<void>;
    adminUpdateShopOrderStatus: (orderId: string, status: 'PENDING' | 'CONFIRMED' | 'FULFILLING' | 'SHIPPED' | 'OUT_OF_STOCK' | 'COMPLETED' | 'CANCELLED', trackingNumber?: string, carrier?: string) => Promise<void>;

    // Internal helper
    _handleInventoryUpdate?: (promise: Promise<any>) => Promise<void>;
    // Queue helpers
    useExtension: (lotteryId: string) => boolean;
    // Storage sync helper
    syncFromStorage: (keys: string[]) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    currentUser: null,
    isAuthenticated: false,
    isLoading: true,
    isLoadingInventory: false,
    error: null,
    inventory: [],
    users: [],
    orders: [],
    shipments: [],
    pickupRequests: [],
    transactions: [],
    shopOrders: [],

    checkSession: async (forceRefresh = false) => {
        console.log('[AuthStore] checkSession() called, forceRefresh:', forceRefresh);
        
        // 先檢查 localStorage 中是否有 sessionId
        const sessionId = localStorage.getItem('sessionId');
        console.log('[AuthStore] localStorage sessionId:', sessionId ? 'EXISTS' : 'NOT FOUND');
        
        // 如果沒有 sessionId，直接設置為未登入狀態，不浪費 API 請求
        if (!sessionId) {
            console.log('[AuthStore] No sessionId in localStorage, skipping API call');
            set({ currentUser: null, isAuthenticated: false, isLoading: false });
            return;
        }
        
        // 快取機制：如果已經有用戶資料且不是強制刷新，直接返回
        const currentState = get();
        const lastCheckTime = (currentState as any)._lastCheckTime || 0;
        const cacheValidDuration = 30000; // 30 秒快取
        
        if (!forceRefresh && currentState.isAuthenticated && currentState.currentUser && (Date.now() - lastCheckTime < cacheValidDuration)) {
            console.log('[AuthStore] Using cached session data, skipping API call');
            return;
        }
        
        // 有 sessionId 就調用 API 驗證並恢復狀態
        set({ isLoading: true });
        try {
            console.log('[AuthStore] Calling /auth/session API...');
            const sessionData = await apiCall('/auth/session');
            console.log('[AuthStore] API response received:', sessionData ? 'SUCCESS' : 'EMPTY');
            
            if (sessionData && sessionData.user) {
                const { user, inventory, orders, shipments, pickupRequests, transactions, shopOrders } = sessionData;
                console.log('[AuthStore] Setting authenticated state for user:', user.username);
                set({
                    currentUser: user,
                    isAuthenticated: true,
                    inventory: inventory || [],
                    orders: orders || [],
                    shipments: Array.from(new Map<string, Shipment>((shipments || []).map(s => [s.id, s])).values()),
                    pickupRequests: pickupRequests || [],
                    transactions: transactions || [],
                    shopOrders: shopOrders || [],
                    isLoading: false,
                    _lastCheckTime: Date.now(), // 記錄最後檢查時間
                } as any);
                
                // 不在 checkSession 時自動獲取 inventory，避免登入太慢
                // inventory 會在需要時（如進入會員頁面）才載入
                console.log('[AuthStore] Session restored, inventory will be loaded on demand');
            } else {
                console.log('[AuthStore] No user data in response, setting unauthenticated');
                 set({ currentUser: null, isAuthenticated: false, isLoading: false });
            }
        } catch (error: any) {
            console.error('[AuthStore] checkSession failed:', error.message);
            
            // 只有在 401 Unauthorized 時才清除 session（session 過期或無效）
            // 其他錯誤（網絡錯誤、timeout等）保留現有狀態
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                console.log('[AuthStore] Session expired or invalid (401), clearing state');
                localStorage.removeItem('sessionId');
                set({ currentUser: null, isAuthenticated: false, isLoading: false });
            } else {
                console.log('[AuthStore] Network/API error, keeping existing state');
                // 保留當前認證狀態，只設置 isLoading = false
                set({ isLoading: false });
            }
        }
    },

    fetchInventory: async () => {
        try {
            console.log('[AuthStore] Fetching inventory...');
            set({ isLoadingInventory: true });
            const response = await apiCall('/user/inventory');
            // 後端直接返回陣列，不是 { inventory: [...] }
            if (response && Array.isArray(response)) {
                console.log('[AuthStore] Inventory loaded:', response.length, 'items');
                set({ inventory: response, isLoadingInventory: false });
            } else if (response && response.inventory) {
                // 兼容舊格式
                console.log('[AuthStore] Inventory loaded:', response.inventory.length, 'items');
                set({ inventory: response.inventory, isLoadingInventory: false });
            } else {
                console.log('[AuthStore] No inventory data in response');
                set({ inventory: [], isLoadingInventory: false });
            }
        } catch (error: any) {
            console.error('[AuthStore] Failed to fetch inventory:', error.message);
            set({ inventory: [], isLoadingInventory: false });
        }
    },

    fetchOrders: async () => {
        try {
            console.log('[AuthStore] Fetching orders...');
            const response = await apiCall('/user/orders');
            if (response && Array.isArray(response)) {
                console.log('[AuthStore] Orders loaded:', response.length, 'items');
                set({ orders: response });
            } else {
                console.log('[AuthStore] No orders data in response');
                set({ orders: [] });
            }
        } catch (error: any) {
            console.error('[AuthStore] Failed to fetch orders:', error.message);
            set({ orders: [] });
        }
    },

    fetchTransactions: async () => {
        try {
            console.log('[AuthStore] Fetching transactions...');
            const response = await apiCall('/user/transactions');
            if (response && Array.isArray(response)) {
                console.log('[AuthStore] Transactions loaded:', response.length, 'items');
                set({ transactions: response });
            } else {
                console.log('[AuthStore] No transactions data in response');
                set({ transactions: [] });
            }
        } catch (error: any) {
            console.error('[AuthStore] Failed to fetch transactions:', error.message);
            set({ transactions: [] });
        }
    },

    // Shop (non-lottery) user actions
    createShopOrder: async ({ productId, mode, contactName, contactPhone, remark }) => {
        try {
            const response = await apiCall('/shop/orders', { method: 'POST', body: JSON.stringify({ productId, mode, contactName, contactPhone, remark }) });
            const { newOrder, updatedUser, newTransaction } = response || {};
            
            if (!newOrder) throw new Error('Order creation failed');

            set(state => ({
                currentUser: updatedUser || state.currentUser,
                transactions: newTransaction ? [...state.transactions, newTransaction] : state.transactions,
                shopOrders: [...state.shopOrders, newOrder],
            }));
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },
    finalizeShopOrder: async (orderId) => {
        try {
            const response = await apiCall(`/shop/orders/${orderId}/finalize`, { method: 'POST' });
            const { updatedOrder, updatedUser, newTransaction } = response || {};
            
            if (!updatedOrder) throw new Error('Order finalization failed');

            set(state => ({
                currentUser: updatedUser || state.currentUser,
                transactions: newTransaction ? [...state.transactions, newTransaction] : state.transactions,
                shopOrders: state.shopOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o),
            }));
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },
    requestShipShopOrder: async (orderId, shippingAddressId) => {
        try {
            const response = await apiCall(`/shop/orders/${orderId}/request-ship`, { method: 'POST', body: JSON.stringify({ shippingAddressId }) });
            const { updatedOrder } = response || {};
            
            if (!updatedOrder) throw new Error('Shipment request failed');

            set(state => ({
                shopOrders: state.shopOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            }));
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },
    fetchUsers: async () => {
        try {
            const users = await apiCall('/admin/users');
            set({ users });
        } catch {}
    },
    
    useExtension: (lotteryId) => {
        const user = get().currentUser;
        if (!user) return false;
        const stats = user.lotteryStats?.[lotteryId] || { cumulativeDraws: 0, availableExtensions: 1 };
        if ((stats.availableExtensions ?? 0) <= 0) return false;
        const newStats = { ...stats, availableExtensions: (stats.availableExtensions ?? 1) - 1 };
        set({ currentUser: { ...user, lotteryStats: { ...(user.lotteryStats || {}), [lotteryId]: newStats } } });
        return true;
    },

    login: async (email, password) => {
        console.log('[AuthStore] login() called with email:', email);
        set({ isLoading: true, error: null });
        try {
            console.log('[AuthStore] Calling login API...');
            const response: any = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            console.log('[AuthStore] API response received:', response ? 'SUCCESS' : 'EMPTY');
            
            const { user, inventory, orders, shipments, pickupRequests, transactions, shopOrders, sessionId } = response;
            console.log('[AuthStore] User from response:', user?.username, '| SessionId:', sessionId ? 'EXISTS' : 'MISSING');
            
            // 存儲 session ID 到 localStorage
            if (sessionId) {
                localStorage.setItem('sessionId', sessionId);
                console.log('[AuthStore] ✅ Session ID saved to localStorage:', sessionId);
            } else {
                console.error('[AuthStore] ❌ No sessionId in response!');
            }
            
            console.log('[AuthStore] Updating store state...');
            set({
                currentUser: user,
                isAuthenticated: true,
                inventory: inventory || [],
                orders: orders || [],
                shipments: Array.from(new Map<string, Shipment>((shipments || []).map(s => [s.id, s])).values()),
                pickupRequests: pickupRequests || [],
                transactions: transactions || [],
                shopOrders: shopOrders || [],
                isLoading: false,
                _lastCheckTime: Date.now(), // 記錄登入時間
            } as any);
            console.log('[AuthStore] ✅ Store state updated. isAuthenticated:', true);
            
            // 清除所有快取，確保獲取最新資料
            clearApiCache();
            console.log('[AuthStore] ✅ API cache cleared');
            
            // 登入後立即獲取完整資料（強制刷新）
            console.log('[AuthStore] Fetching full user data...');
            get().checkSession(true).catch(err => console.log('[AuthStore] Failed to fetch full data:', err));
            
            console.log('[AuthStore] ✅ Login completed successfully');
            return true;
        } catch (error: any) {
            console.error('[AuthStore] ❌ Login failed:', error.message);
            set({ error: error.message || "登入失敗。", isLoading: false });
            return false;
        }
    },

    register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
            const response: any = await apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
            });

            const { user, inventory, orders, shipments, pickupRequests, transactions, shopOrders, sessionId } = response || {};

            // 與 login 一致：將 sessionId 保存到 localStorage 供 /auth/session 使用
            if (sessionId) {
                localStorage.setItem('sessionId', sessionId);
                console.log('[AuthStore] ✅ Session ID saved to localStorage (register):', sessionId);
            } else {
                console.error('[AuthStore] ❌ No sessionId in register response!');
            }

            // 清除所有快取，確保獲取最新資料
            clearApiCache();
            console.log('[AuthStore] ✅ API cache cleared on register');
            
            set({
                currentUser: user,
                isAuthenticated: true,
                inventory: inventory || [],
                orders: orders || [],
                shipments: Array.from(new Map<string, Shipment>((shipments || []).map(s => [s.id, s])).values()),
                pickupRequests: pickupRequests || [],
                transactions: transactions || [],
                shopOrders: shopOrders || [],
                isLoading: false,
                error: null,
            });
            return true;
        } catch (error: any) {
            set({ error: error.message || "註冊失敗。", isLoading: false });
            return false;
        }
    },

    logout: async () => {
        try {
            await apiCall('/auth/logout', { method: 'POST' });
            // 清除 localStorage 中的 session ID
            localStorage.removeItem('sessionId');
            console.log('[AuthStore] Session ID cleared from localStorage');
            
            // 清除所有快取，防止下次登入看到舊資料
            clearApiCache();
            console.log('[AuthStore] ✅ API cache cleared on logout');
            
            set({
                currentUser: null,
                isAuthenticated: false,
                inventory: [],
                orders: [],
                shipments: [],
                pickupRequests: [],
                transactions: [],
                shopOrders: [],
            });
        } catch (error: any) {
            set({ error: error.message });
        }
    },
    
    verifyAdminPassword: async (password) => {
        try {
            await apiCall('/auth/verify-admin', { method: 'POST', body: JSON.stringify({ password }) });
            return true;
        } catch (error) {
            console.error("Admin verification failed:", error);
            return false;
        }
    },

    changePassword: async (currentPassword, newPassword) => {
        try {
            await apiCall('/user/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
            return { success: true, message: '密碼已成功更新！' };
        } catch(error: any) {
            return { success: false, message: error.message || '密碼更新失敗。' };
        }
    },

    requestPasswordReset: async (email) => {
        try {
            const res = await apiCall('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
            return { success: true, sentTo: res?.sentTo, code: res?.code };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },
    confirmPasswordReset: async (email, code, newPassword) => {
        try {
            await apiCall('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },

    loginWithOAuth: async (provider, payload) => {
        set({ isLoading: true, error: null });
        try {
            // 調用對應的 OAuth 端點
            const { user } = await apiCall(`/auth/${provider}`, {
                method: 'POST',
                body: JSON.stringify(payload || {}),
            });
            
            // 設置 sessionId
            const sessionId = document.cookie
                .split('; ')
                .find(row => row.startsWith('sessionId='))
                ?.split('=')[1];
            
            if (sessionId) {
                localStorage.setItem('sessionId', sessionId);
            }
            
            set({
                currentUser: user,
                isAuthenticated: true,
                inventory: [],
                orders: [],
                shipments: [],
                pickupRequests: [],
                transactions: [],
                shopOrders: [],
                isLoading: false,
            });
            
            // 登入成功後獲取完整數據
            await useAuthStore.getState().fetchInventory();
            await useAuthStore.getState().fetchOrders();
            await useAuthStore.getState().fetchTransactions();
            
            return true;
        } catch (error: any) {
            set({ error: error.message || '第三方登入失敗。', isLoading: false });
            return false;
        }
    },

    draw: async (lotterySetId, tickets, drawHash, secretKey) => {
        try {
            const response = await apiCall(`/lottery-sets/${lotterySetId}/draw`, {
                method: 'POST',
                body: JSON.stringify({ tickets, drawHash, secretKey }),
            });
            
            // Map backend response to store expectations
            const drawnPrizes = response.results || response.drawnPrizes || [];
            const updatedUser = response.user || response.updatedUser;
            const newOrder = response.order || response.newOrder;
            const newTransaction = response.transaction || response.newTransaction; // Backend might not return transaction yet
            const updatedLotterySet = response.updatedLotterySet || {}; // Backend might not return updatedLotterySet
            
            // Normalize prize fields for UI (DrawResultModal) and inventory
            const normalizedDrawnPrizes: PrizeInstance[] = (drawnPrizes as any[]).map((p: any, idx: number) => {
                const id = p.id || p.prizeId || `draw-${lotterySetId}-${Date.now()}-${idx}`;
                const instanceId = p.instanceId || p.prizeInstanceId || id;
                return {
                    // Prize base fields
                    id,
                    grade: p.grade || p.prizeGrade || '一般賞',
                    name: p.name || p.prizeName || '隨機獎品',
                    imageUrl: p.imageUrl || p.prizeImageUrl || '',
                    total: p.total ?? 1,
                    remaining: p.remaining ?? 0,
                    type: p.type || 'NORMAL',
                    weight: p.weight ?? 0,
                    allowSelfPickup: p.allowSelfPickup === true,
                    // PrizeInstance extension
                    instanceId,
                    lotterySetId: lotterySetId,
                    isRecycled: !!p.isRecycled,
                    userId: updatedUser?.id || (p.userId ?? ''),
                    status: p.status || 'IN_INVENTORY',
                } as PrizeInstance;
            });
            
            set(state => {
                const prevUser = state.currentUser;
                const baseUser = updatedUser || prevUser;
                
                // Merge stats logic (backend already handles this, but keeping for safety)
                const prevStats = (baseUser?.lotteryStats && baseUser.lotteryStats[lotterySetId]) || { cumulativeDraws: 0, availableExtensions: 1 };
                const mergedLotteryStats = baseUser?.lotteryStats || {
                    ...(prevUser?.lotteryStats || {}),
                    [lotterySetId]: {
                        cumulativeDraws: prevStats.cumulativeDraws,
                        availableExtensions: prevStats.availableExtensions,
                    },
                };

                // Normalize order for history view (frontend Order type)
                const normalizedOrder: Order | undefined = newOrder
                    ? {
                        id: newOrder.id,
                        userId: baseUser?.id || newOrder.userId,
                        date: newOrder.date || newOrder.createdAt || new Date().toISOString(),
                        lotterySetTitle: newOrder.lotterySetTitle || updatedLotterySet.title || lotterySetId,
                        prizeInstanceIds: normalizedDrawnPrizes.map(p => p.instanceId),
                        costInPoints: newOrder.costInPoints ?? 0,
                        drawHash,
                        secretKey,
                        drawnTicketIndices: Array.isArray(newOrder.drawnTicketIndices) ? newOrder.drawnTicketIndices : tickets,
                    }
                    : undefined;

                return {
                    currentUser: baseUser ? { ...baseUser, lotteryStats: mergedLotteryStats } : updatedUser,
                    orders: normalizedOrder ? [normalizedOrder, ...state.orders] : state.orders,
                    transactions: newTransaction ? [newTransaction, ...state.transactions] : state.transactions,
                    inventory: [...normalizedDrawnPrizes, ...state.inventory]
                };
            });
            
            // Refresh lottery sets to get updated status
            useSiteStore.getState().fetchLotterySets();
            
            // 不在抽獎後立即刷新 inventory，避免阻塞抽獎流程
            // inventory 會在進入會員頁面時自動刷新
            console.log('[AuthStore] Draw successful, inventory will refresh when needed');

            return { success: true, drawnPrizes: normalizedDrawnPrizes };
        } catch (error: any) {
            useSiteStore.getState().fetchLotterySets();
            return { success: false, message: error.message || '抽獎失敗，請稍後再試。' };
        }
    },
    
    rechargePoints: async (amount: number) => {
        try {
            console.log('[AuthStore] rechargePoints() called with amount:', amount);
            const response = await apiCall('/user/recharge', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    packageId: `RECHARGE_${amount}`,  // 添加 packageId
                    amount 
                }) 
            });
            console.log('[AuthStore] Recharge response:', response);
            
            if (!response) {
                throw new Error('Empty response from recharge API');
            }
            
            // 後端返回 { success, user, transaction }
            const { user, transaction } = response;
            
            if (!user) {
                console.error('[AuthStore] ❌ No user in response:', response);
                throw new Error('Invalid response format: missing user data');
            }
            
            console.log('[AuthStore] Updated user points:', user.points);
            
            set(state => ({
                currentUser: user,
                transactions: transaction ? [...state.transactions, transaction] : state.transactions
            }));
            
            console.log('[AuthStore] ✅ Points recharged successfully. New balance:', user.points);
        } catch (error: any) {
            console.error('[AuthStore] ❌ rechargePoints failed:', error);
            console.error('[AuthStore] Error details:', error.message);
            throw error;  // 重新拋出錯誤，讓調用方知道失敗了
        }
    },
    
    _handleInventoryUpdate: async (promise: Promise<any>) => {
        const { updatedUser, newTransaction } = await promise;
        console.log('[AuthStore] Received updatedUser:', updatedUser);
        console.log('[AuthStore] New points:', updatedUser?.points);
        console.log('[AuthStore] New transaction:', newTransaction);
        
        // 清除 inventory 緩存，確保獲取最新數據
        clearApiCache('/user/inventory');
        const inventory = await apiCall('/user/inventory');
        
        set(state => ({
            currentUser: updatedUser,
            transactions: newTransaction ? [...state.transactions, newTransaction] : state.transactions,
            inventory: inventory
        }));
        
        console.log('[AuthStore] ✅ State updated - Points:', updatedUser?.points, 'Inventory items:', inventory.length);
    },

    recyclePrize: async (prizeInstanceId) => {
        await get()._handleInventoryUpdate(apiCall('/inventory/recycle', { method: 'POST', body: JSON.stringify({ prizeInstanceIds: [prizeInstanceId] }) }));
    },

    batchRecyclePrizes: async (prizeInstanceIds) => {
        await get()._handleInventoryUpdate(apiCall('/inventory/recycle', { method: 'POST', body: JSON.stringify({ prizeInstanceIds }) }));
    },
    
    saveShippingAddress: async (address) => {
        const updatedUser = await apiCall('/user/addresses', { method: 'POST', body: JSON.stringify(address) });
        set({ currentUser: updatedUser });
    },
    
    updateShippingAddress: async (addressId, addressData) => {
        const updatedUser = await apiCall(`/user/addresses/${addressId}`, { method: 'PUT', body: JSON.stringify(addressData) });
        set({ currentUser: updatedUser });
    },
    
    deleteShippingAddress: async (addressId) => {
        const updatedUser = await apiCall(`/user/addresses/${addressId}`, { method: 'DELETE' });
        set({ currentUser: updatedUser });
    },

    setDefaultShippingAddress: async (addressId) => {
        const updatedUser = await apiCall(`/user/addresses/${addressId}/default`, { method: 'POST' });
        set({ currentUser: updatedUser });
    },
    
    requestShipment: async (prizeInstanceIds, shippingAddress) => {
        try {
            const { newShipment, updatedUser, newTransaction } = await apiCall('/shipments', { method: 'POST', body: JSON.stringify({ prizeInstanceIds, shippingAddressId: shippingAddress.id }) });
            const inventory = await apiCall('/user/inventory');
            set(state => {
                const unique = new Map<string, Shipment>([
                    ...state.shipments.map(s => [s.id, s] as const),
                    [newShipment.id, newShipment],
                ]);
                return {
                    shipments: Array.from(unique.values()),
                    currentUser: updatedUser,
                    transactions: [...state.transactions, newTransaction],
                    inventory: inventory
                };
            });
            return { success: true };
        } catch(error: any) {
            return { success: false, message: error.message };
        }
    },

    requestPickup: async (prizeInstanceIds) => {
        try {
            const { newPickupRequest, newTransaction } = await apiCall('/pickups', { method: 'POST', body: JSON.stringify({ prizeInstanceIds }) });
            const inventory = await apiCall('/user/inventory');
            set(state => {
                const unique = new Map<string, PickupRequest>([
                    ...state.pickupRequests.map(r => [r.id, r] as const),
                    [newPickupRequest.id, newPickupRequest]
                ]);
                return {
                    pickupRequests: Array.from(unique.values()),
                    transactions: [...state.transactions, newTransaction],
                    inventory: inventory
                };
            });
            return { success: true };
        } catch(error: any) {
            return { success: false, message: error.message };
        }
    },
    
    // Admin Actions
    adminAdjustUserPoints: async (userId, newPoints, notes) => {
        // This is a complex action that affects other users, so we refetch all users.
        const { updatedUser, newTransaction } = await apiCall(`/admin/users/${userId}/points`, { method: 'POST', body: JSON.stringify({ points: newPoints, notes }) });
        // In a real app, we'd have a useUsersStore. For now, we update our own if it's us.
        if(get().currentUser?.id === updatedUser.id) set({ currentUser: updatedUser });
        set(state => ({ 
            transactions: [...state.transactions, newTransaction],
            users: state.users.length ? state.users.map(u => u.id === updatedUser.id ? updatedUser : u) : state.users,
        }));
    },
    
    updateUserRole: async (userId, newRole) => {
        const updated = await apiCall(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
        set(state => ({ users: state.users.length ? state.users.map(u => u.id === updated.id ? updated : u) : state.users }));
    },

    deleteUser: async (userId) => {
        await apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
        // 從用戶列表中移除已刪除的用戶
        set(state => ({ 
            users: state.users.filter(u => u.id !== userId)
        }));
    },

    adminChangeUserPassword: async (userId, newPassword) => {
        const res = await apiCall(`/admin/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) });
        const updatedUser = res?.updatedUser;
        if (updatedUser) {
            set(state => ({
                users: state.users.length ? state.users.map(u => u.id === updatedUser.id ? updatedUser : u) : state.users,
                currentUser: state.currentUser && state.currentUser.id === updatedUser.id ? { ...state.currentUser, ...updatedUser } : state.currentUser,
            }));
        }
        return true;
    },

    // Admin: update admin verify password used by /api/auth/verify-admin
    adminUpdateAdminVerifyPassword: async (currentPassword: string, newPassword: string) => {
        await apiCall('/admin/settings/verify-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
        return { success: true };
    },
    
    fetchAllPrizes: async () => {
        const prizes = await apiCall('/admin/prizes');
        set({ inventory: prizes || [] });
    },
    
    // User: fetch user's own shipments and pickups
    fetchUserShipments: async () => {
        try {
            const shipments = await apiCall('/user/shipments');
            set({ shipments: shipments || [] });
        } catch (error) {
            console.error('[AuthStore] Failed to fetch user shipments:', error);
            set({ shipments: [] });
        }
    },
    
    fetchUserPickupRequests: async () => {
        try {
            const pickupRequests = await apiCall('/user/pickups');
            set({ pickupRequests: pickupRequests || [] });
        } catch (error) {
            console.error('[AuthStore] Failed to fetch user pickup requests:', error);
            set({ pickupRequests: [] });
        }
    },
    
    // Admin: fetch all shipments and pickups
    fetchShipments: async () => {
        const shipments = await apiCall('/admin/shipments');
        set({ shipments: shipments || [] });
    },
    
    fetchPickupRequests: async () => {
        const pickupRequests = await apiCall('/admin/pickups');
        set({ pickupRequests: pickupRequests || [] });
    },
    
    updateShipmentStatus: async (shipmentId, status, trackingNumber, carrier) => {
        const updatedShipment = await apiCall(`/admin/shipments/${shipmentId}/status`, { method: 'PUT', body: JSON.stringify({ status, trackingNumber, carrier }) });
        set(state => ({
            shipments: state.shipments.map(s => s.id === updatedShipment.id ? updatedShipment : s)
        }));
    },
    
    updatePickupRequestStatus: async (requestId, status) => {
        const updatedRequest = await apiCall(`/admin/pickups/${requestId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
        set(state => ({
            pickupRequests: state.pickupRequests.map(p => p.id === updatedRequest.id ? updatedRequest : p)
        }));
    },

    // Admin: shop orders
    fetchAdminShopOrders: async () => {
        const list = await apiCall('/admin/shop/orders');
        return list as ShopOrder[];
    },
    adminFinalizeReady: async (orderId, channel) => {
        await apiCall(`/admin/shop/orders/${orderId}/finalize-ready`, { method: 'POST', body: JSON.stringify({ channel }) });
    },
    adminUpdateShopOrderStatus: async (orderId, status, trackingNumber, carrier) => {
        await apiCall(`/admin/shop/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, trackingNumber, carrier }) });
    },

    // Precise refresh based on changed localStorage keys (Mock only)
    syncFromStorage: async (keys) => {
        try {
            // If only inventory changed, just refresh inventory to avoid full session cost
            const setKeys = new Set(keys || []);
            const invOnly = setKeys.size === 1 && setKeys.has('__mock_inventory__');
            if (invOnly) {
                const inventory = await apiCall('/user/inventory');
                set({ inventory });
                return;
            }
            // For user, orders, transactions, current user or multiple keys, do a full session refresh
            if (setKeys.has('__mock_current_user__') || setKeys.has('__mock_users_all__') || setKeys.has('__mock_orders__') || setKeys.has('__mock_transactions__') || setKeys.has('__mock_pwd_reset__') || setKeys.size > 1) {
                await get().checkSession();
            }
        } catch {}
    },
}));

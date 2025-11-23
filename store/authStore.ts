import { create } from 'zustand';
import { apiCall } from '../api';
import type { User, PrizeInstance, Order, Shipment, PickupRequest, Transaction, ShippingAddress, ShopOrder } from '../types';
import { useSiteStore } from './siteDataStore';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    inventory: { [key: string]: PrizeInstance };
    users: User[];
    orders: Order[];
    shipments: Shipment[];
    pickupRequests: PickupRequest[];
    transactions: Transaction[];
    shopOrders: ShopOrder[];
    
    checkSession: () => Promise<void>;
    login: (email: string, pass: string) => Promise<boolean>;
    register: (username: string, email: string, pass: string) => Promise<boolean>;
    logout: () => Promise<void>;
    verifyAdminPassword: (password: string) => Promise<boolean>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    requestPasswordReset: (email: string) => Promise<{ success: boolean; sentTo?: string; code?: string; message?: string }>;
    confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;

    // OAuth
    loginWithOAuth: (provider: 'google' | 'line', payload: { idToken?: string; email?: string; username?: string }) => Promise<boolean>;

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
    adminChangeUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
    adminUpdateAdminVerifyPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean }>;
    fetchUsers: () => Promise<void>;
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
    error: null,
    inventory: {},
    users: [],
    orders: [],
    shipments: [],
    pickupRequests: [],
    transactions: [],
    shopOrders: [],

    checkSession: async () => {
        console.log('[AuthStore] checkSession() called');
        
        // 先檢查 localStorage 中是否有 sessionId
        const sessionId = localStorage.getItem('sessionId');
        console.log('[AuthStore] localStorage sessionId:', sessionId ? 'EXISTS' : 'NOT FOUND');
        
        // 如果沒有 sessionId，直接設置為未登入狀態，不浪費 API 請求
        if (!sessionId) {
            console.log('[AuthStore] No sessionId in localStorage, skipping API call');
            set({ currentUser: null, isAuthenticated: false, isLoading: false });
            return;
        }
        
        // 有 sessionId 就調用 API 驗證並恢復狀態
        // 不跳過 API 調用，確保狀態始終與後端同步
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
                    inventory: inventory || {},
                    orders: orders || [],
                    shipments: Array.from(new Map<string, Shipment>((shipments || []).map(s => [s.id, s])).values()),
                    pickupRequests: pickupRequests || [],
                    transactions: transactions || [],
                    shopOrders: shopOrders || [],
                    isLoading: false,
                });
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

    // Shop (non-lottery) user actions
    createShopOrder: async ({ productId, mode, contactName, contactPhone, remark }) => {
        try {
            const { newOrder, updatedUser, newTransaction } = await apiCall('/shop/orders', { method: 'POST', body: JSON.stringify({ productId, mode, contactName, contactPhone, remark }) });
            set(state => ({
                currentUser: updatedUser,
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
            const { updatedOrder, updatedUser, newTransaction } = await apiCall(`/shop/orders/${orderId}/finalize`, { method: 'POST' });
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
            const { updatedOrder } = await apiCall(`/shop/orders/${orderId}/request-ship`, { method: 'POST', body: JSON.stringify({ shippingAddressId }) });
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
                inventory: inventory || {},
                orders: orders || [],
                shipments: Array.from(new Map<string, Shipment>((shipments || []).map(s => [s.id, s])).values()),
                pickupRequests: pickupRequests || [],
                transactions: transactions || [],
                shopOrders: shopOrders || [],
                isLoading: false,
            });
            console.log('[AuthStore] ✅ Store state updated. isAuthenticated:', true);
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
            const { user } = await apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
            });
            set({ currentUser: user, isAuthenticated: true, isLoading: false, error: null });
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
            set({
                currentUser: null,
                isAuthenticated: false,
                inventory: {},
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
            const { user, inventory, orders, shipments, pickupRequests, transactions, shopOrders } = await apiCall(`/auth/oauth/${provider}`, {
                method: 'POST',
                body: JSON.stringify(payload || {}),
            });
            set({
                currentUser: user,
                isAuthenticated: true,
                inventory: inventory || {},
                orders: orders || [],
                shipments: Array.from(new Map<string, Shipment>((shipments || []).map(s => [s.id, s])).values()),
                pickupRequests: pickupRequests || [],
                transactions: transactions || [],
                shopOrders: shopOrders || [],
                isLoading: false,
            });
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
            
            set(state => {
                const prevUser = state.currentUser;
                const baseUser = updatedUser || prevUser;
                
                // Merge stats logic (backend already handles this, but keeping for safety)
                const prevStats = (baseUser?.lotteryStats && baseUser.lotteryStats[lotterySetId]) || { cumulativeDraws: 0, availableExtensions: 1 };
                // Only calc if backend didn't provide updated stats
                const mergedLotteryStats = baseUser.lotteryStats || {
                   ...(prevUser?.lotteryStats || {}),
                   [lotterySetId]: {
                       cumulativeDraws: prevStats.cumulativeDraws,
                       availableExtensions: prevStats.availableExtensions
                   }
                };

                return {
                    currentUser: baseUser ? { ...baseUser, lotteryStats: mergedLotteryStats } : updatedUser,
                    orders: newOrder ? [newOrder, ...state.orders] : state.orders,
                    transactions: newTransaction ? [newTransaction, ...state.transactions] : state.transactions,
                    inventory: { ...state.inventory, ...Object.fromEntries(drawnPrizes.map((p: PrizeInstance) => [p.instanceId, p])) }
                };
            });
            
            // Refresh lottery sets to get updated status
            useSiteStore.getState().fetchLotterySets();

            return { success: true, drawnPrizes };
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
        const inventory = await apiCall('/user/inventory');
        set(state => ({
            currentUser: updatedUser,
            transactions: [...state.transactions, newTransaction],
            inventory: inventory
        }));
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

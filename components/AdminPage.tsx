import React, { useState } from 'react';
import { AdminSiteSettings } from './AdminSiteSettings';
import { AdminProductManagement } from './AdminProductManagement';
import { AdminCategoryManagement } from './AdminCategoryManagement';
import { AdminShopCategoryManagement } from './AdminShopCategoryManagement';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminTransactionHistory } from './AdminTransactionHistory';
import { AdminFinancialReport } from './AdminFinancialReport';
import { AdminShopProducts } from './AdminShopProducts';
import { AdminShopOrders } from './AdminShopOrders';
import { AdminShipmentManagement } from './AdminShipmentManagement';
import { AdminPickupManagement } from './AdminPickupManagement';
import { AdminProductApproval } from './AdminProductApproval';
import { ListBulletIcon, CogIcon, UsersIcon, TicketIcon, ChartBarIcon, TruckIcon, BuildingStorefrontIcon, CheckCircleIcon } from './icons';
import { apiCall } from '../api';
import type { LotterySet } from '../types';
import { useSiteStore } from '../store/siteDataStore';
import { useAuthStore } from '../store/authStore';

type AdminTab = 'site' | 'products' | 'categories' | 'shopCategories' | 'users' | 'transactions' | 'financials' | 'shipments' | 'pickups' | 'shopProducts' | 'shopOrders' | 'approval' | 'mocktools';

export const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const qp = (url.searchParams.get('tab') as AdminTab | null);
            if (qp) return qp;
            const saved = localStorage.getItem('__admin_active_tab__') as AdminTab | null;
            if (saved) return saved;
        }
        return 'products';
    });
    const [transactionFilter, setTransactionFilter] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // Get state from stores
    const { siteConfig, lotterySets, categories, shopCategories, isLoading: isSiteDataLoading, ...siteActions } = useSiteStore();
    const { currentUser, inventory, orders, shipments, pickupRequests, transactions, users, fetchUsers, fetchAllPrizes, fetchShipments, fetchPickupRequests, fetchAdminShopOrders, ...authActions } = useAuthStore();

    // 將 inventory 陣列轉換為物件，供後台管理組件使用
    const inventoryMap = React.useMemo(() => {
        if (!inventory || !Array.isArray(inventory)) return {};
        return Object.fromEntries(inventory.map(p => [p.instanceId, p]));
    }, [inventory]);

    // 商城訂單狀態
    const [shopOrders, setShopOrders] = React.useState<any[]>([]);
    
    const pendingShipments = (shipments || []).filter(s => s.status === 'PENDING').length;
    const pendingPickups = (pickupRequests || []).filter(p => p.status === 'PENDING').length;
    const pendingShopOrders = (shopOrders || []).filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED').length;

    // 初始載入出貨、自取和商城訂單數據以顯示徽章計數
    React.useEffect(() => {
        const loadBadgeCounts = async () => {
            try {
                console.log('[AdminPage] Loading badge counts...');
                const [shipmentsData, pickupsData, shopOrdersData] = await Promise.all([
                    fetchShipments(),
                    fetchPickupRequests(),
                    fetchAdminShopOrders()
                ]);
                setShopOrders(shopOrdersData || []);
                console.log('[AdminPage] Badge counts loaded');
            } catch (error) {
                console.error('[AdminPage] Failed to load badge counts:', error);
            }
        };
        loadBadgeCounts();
    }, [fetchShipments, fetchPickupRequests, fetchAdminShopOrders]); // 依賴這些函數

    const handleViewUserTransactions = (username: string) => {
        setTransactionFilter(username);
        setActiveTab('transactions');
    };

const MockToolsPanel: React.FC = () => {
    const { checkSession } = useAuthStore();
    const { fetchSiteData } = useSiteStore();
    const [dump, setDump] = React.useState<any | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const loadDump = async () => {
        try {
            setLoading(true);
            const res = await apiCall('/admin/mock/export', { method: 'POST' });
            setDump(res || {});
        } catch (e: any) {
            setError(e?.message || '讀取失敗');
        } finally { setLoading(false); }
    };
    React.useEffect(() => { loadDump(); }, []);

    const onReset = async () => {
        setError(null); setLoading(true);
        try { await apiCall('/admin/mock/reset', { method: 'POST' }); await loadDump(); await checkSession(); await fetchSiteData(); } 
        catch (e:any){ setError(e?.message || '重置失敗'); }
        finally { setLoading(false); }
    };

    const onExport = async () => {
        setError(null);
        try {
            const data = await apiCall('/admin/mock/export', { method: 'POST' });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'mock-export.json'; a.click(); URL.revokeObjectURL(url);
        } catch (e:any) {
            setError(e?.message || '匯出失敗');
        }
    };

    const onImport = async (file?: File) => {
        if (!file) return;
        setError(null); setLoading(true);
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            await apiCall('/admin/mock/import', { method: 'POST', body: JSON.stringify(json) });
            await loadDump();
            await checkSession();
            await fetchSiteData();
        } catch (e:any){ setError(e?.message || '匯入失敗'); }
        finally { setLoading(false); }
    };

    const counts = React.useMemo(() => ({
        users: dump?.users?.length || 0,
        orders: dump?.orders?.length || 0,
        transactions: dump?.transactions?.length || 0,
        inventory: dump?.inventory ? Object.keys(dump.inventory).length : 0,
        version: dump?.version || '(未設定)'
    }), [dump]);

    return (
        <div className="space-y-3">
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">版本</div>
                    <div className="font-semibold">{counts.version}</div>
                </div>
                <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">使用者</div>
                    <div className="font-semibold">{counts.users}</div>
                </div>
                <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">訂單</div>
                    <div className="font-semibold">{counts.orders}</div>
                </div>
                <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">交易</div>
                    <div className="font-semibold">{counts.transactions}</div>
                </div>
                <div className="p-3 border rounded col-span-2 md:col-span-4">
                    <div className="text-xs text-gray-500">Inventory 筆數</div>
                    <div className="font-semibold">{counts.inventory}</div>
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
                <button onClick={onReset} disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50">重置</button>
                <button onClick={onExport} disabled={loading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">匯出 JSON</button>
                <label className="px-4 py-2 rounded bg-gray-800 text-white cursor-pointer disabled:opacity-50">
                    匯入 JSON
                    <input type="file" accept="application/json" className="hidden" onChange={(e) => onImport(e.target.files?.[0] || undefined)} />
                </label>
                <button onClick={loadDump} disabled={loading} className="px-4 py-2 rounded border">重新整理統計</button>
            </div>
        </div>
    );
};
    
    const handleTabClick = async (tab: AdminTab) => {
        if (tab !== 'transactions') {
            setTransactionFilter('');
        }
        
        // 顯示載入動畫
        setIsLoadingData(true);
        
        try {
            if (tab === 'users' && (!users || users.length === 0)) {
                await fetchUsers();
            }
            if (tab === 'transactions' && (!transactions || transactions.length === 0)) {
                await authActions.fetchTransactions();
            }
            if (tab === 'financials') {
                // 財務報表需要載入 users, transactions, orders
                const promises = [];
                if (!users || users.length === 0) promises.push(fetchUsers());
                if (!transactions || transactions.length === 0) promises.push(authActions.fetchTransactions());
                if (!orders || orders.length === 0) promises.push(authActions.fetchOrders());
                await Promise.all(promises);
            }
            if (tab === 'shipments') {
                await Promise.all([fetchShipments(), fetchAllPrizes()]);
            }
            if (tab === 'pickups') {
                await Promise.all([fetchPickupRequests(), fetchAllPrizes()]);
            }
        } catch (error) {
            console.error('[AdminPage] Failed to load data:', error);
        } finally {
            setIsLoadingData(false);
        }
        
        setActiveTab(tab);
        try {
            localStorage.setItem('__admin_active_tab__', tab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState(null, '', url.toString());
        } catch {}
    }

    React.useEffect(() => {
        try {
            localStorage.setItem('__admin_active_tab__', activeTab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', activeTab);
            window.history.replaceState(null, '', url.toString());
        } catch {}
    }, [activeTab]);

    // Re-apply tab when頁面回到前景，避免外部因素造成的狀態錯覺重置
    React.useEffect(() => {
        const apply = () => {
            try {
                const url = new URL(window.location.href);
                const qp = url.searchParams.get('tab') as AdminTab | null;
                const saved = (localStorage.getItem('__admin_active_tab__') as AdminTab | null) || undefined;
                const next = (qp || saved) as AdminTab | undefined;
                if (next && next !== activeTab) setActiveTab(next);
            } catch {}
        };
        const onVis = () => { if (!document.hidden) apply(); };
        window.addEventListener('focus', apply);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.removeEventListener('focus', apply);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [activeTab]);

    const handleSaveLotterySet = async (set: LotterySet): Promise<void> => {
      const exists = lotterySets.some(s => s.id === set.id);
      if (exists) {
          await siteActions.updateLotterySet(set);
      } else {
          // The backend should assign an ID
          await siteActions.addLotterySet(set);
      }
    };

    const renderTabContent = () => {
        // 顯示載入動畫（初始載入或切換 tab 時）
        if (isSiteDataLoading || isLoadingData) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-[#ffc400] mb-4"></div>
                    <p className="text-gray-600 text-lg font-semibold">載入資料中...</p>
                    <p className="text-gray-500 text-sm mt-2">請稍候，正在從伺服器獲取資料</p>
                </div>
            );
        }
        
        switch (activeTab) {
            case 'site':
                return <AdminSiteSettings 
                            siteConfig={siteConfig} 
                            onSaveSiteConfig={siteActions.updateSiteConfig}
                            onChangePassword={authActions.changePassword}
                            lotterySets={lotterySets}
                            categories={categories}
                            onUpdateAdminVerifyPassword={authActions.adminUpdateAdminVerifyPassword}
                        />;
            case 'products':
                return <AdminProductManagement 
                            lotterySets={lotterySets}
                            categories={categories}
                            onSaveLotterySet={handleSaveLotterySet}
                            onDeleteLotterySet={siteActions.deleteLotterySet}
                        />;
            case 'categories':
                return <AdminCategoryManagement 
                            categories={categories}
                            onSaveCategory={siteActions.saveCategories}
                        />;
            case 'shopCategories':
                return <AdminShopCategoryManagement 
                            categories={shopCategories}
                            onSaveCategory={siteActions.saveShopCategories}
                        />;
            case 'users':
                return <AdminUserManagement 
                            users={users}
                            currentUser={currentUser}
                            transactions={transactions}
                            onUpdateUserPoints={authActions.adminAdjustUserPoints}
                            onUpdateUserRole={authActions.updateUserRole}
                            onDeleteUser={authActions.deleteUser}
                            onViewUserTransactions={handleViewUserTransactions}
                            onChangeUserPassword={authActions.adminChangeUserPassword}
                        />;
            case 'transactions':
                return <AdminTransactionHistory transactions={transactions} inventory={inventoryMap} initialFilter={transactionFilter} />;
            case 'financials':
                return <AdminFinancialReport 
                            transactions={transactions} 
                            users={users}
                            orders={orders}
                            lotterySets={lotterySets}
                        />;
            case 'shopProducts':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">商城商品</h2>
                        <AdminShopProducts />
                    </div>
                );
            case 'shopOrders':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">商城訂單</h2>
                        <AdminShopOrders />
                    </div>
                );
            case 'approval':
                return <AdminProductApproval />;
            case 'shipments':
                return <AdminShipmentManagement 
                            shipments={shipments}
                            users={users}
                            inventory={inventoryMap}
                            onUpdateShipmentStatus={authActions.updateShipmentStatus}
                            canManage={currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'}
                        />;
            case 'pickups':
                return <AdminPickupManagement
                            pickupRequests={pickupRequests}
                            inventory={inventoryMap}
                            onUpdatePickupRequestStatus={authActions.updatePickupRequestStatus}
                        />;
            case 'mocktools':
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Mock 工具</h2>
                        <MockToolsPanel />
                    </div>
                );
            default:
                return null;
        }
    };
    
    const TabButton: React.FC<{tab: AdminTab, label: string, icon: React.ReactNode, disabled?: boolean, badgeCount?: number}> = ({ tab, label, icon, disabled, badgeCount }) => (
        <button
            onClick={() => handleTabClick(tab)}
            disabled={disabled}
            className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === tab 
                ? 'bg-black text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed'
            }`}
        >
            {icon}
            <span className="flex items-center gap-2">
                {label}
                {badgeCount && badgeCount > 0 && (
                    <span className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 ${activeTab === tab ? 'bg-white text-black' : 'bg-red-600 text-white'}`}>
                        {badgeCount}
                    </span>
                )}
            </span>
        </button>
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">後台管理</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 items-start">
                <aside className="md:col-span-1 lg:col-span-1">
                    <nav className="space-y-2 sticky top-24 bg-white p-4 rounded-lg shadow-md">
                        <TabButton tab="financials" label="財務報表" icon={<ChartBarIcon className="w-5 h-5"/>} />
                        <TabButton tab="approval" label="商品審核" icon={<CheckCircleIcon className="w-5 h-5 text-orange-500" />} />
                        <TabButton tab="shopProducts" label="商城商品" icon={<BuildingStorefrontIcon className="w-5 h-5" />} />
                        <TabButton tab="shopOrders" label="商城訂單" icon={<ListBulletIcon className="w-5 h-5" />} badgeCount={pendingShopOrders} />
                        <TabButton tab="shipments" label="出貨管理" icon={<TruckIcon className="w-5 h-5" />} badgeCount={pendingShipments} />
                        <TabButton tab="pickups" label="自取管理" icon={<BuildingStorefrontIcon className="w-5 h-5" />} badgeCount={pendingPickups} />
                        <TabButton tab="products" label="商品管理" icon={<TicketIcon className="w-5 h-5"/>} />
                        <TabButton tab="categories" label="一番賞分類" icon={<ListBulletIcon className="w-5 h-5" />} />
                        <TabButton tab="shopCategories" label="商城分類" icon={<ListBulletIcon className="w-5 h-5" />} />
                        <TabButton tab="users" label="使用者管理" icon={<UsersIcon className="w-5 h-5" />} />
                        <TabButton tab="transactions" label="交易紀錄" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                        <TabButton tab="site" label="網站設定" icon={<CogIcon className="w-5 h-5" />} />
                        {/* Mock 工具已隱藏 - 系統已完全使用 Firestore 後端 */}
                        {/* <TabButton tab="mocktools" label="Mock 工具" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.3 1.046a1 1 0 00-1.6 0L7.35 3.86 4.06 4.35a1 1 0 00-.55 1.7l2.1 2.05-.5 3.26a1 1 0 001.45 1.04L10 11.5l3.44 1.89a1 1 0 001.45-1.04l-.5-3.26 2.1-2.05a1 1 0 00-.55-1.7l-3.29-.49-2.35-2.815z"/></svg>} /> */}
                    </nav>
                </aside>
                <main className="md:col-span-3 lg:col-span-4">
                    {(pendingShopOrders > 0 || pendingShipments > 0 || pendingPickups > 0) && (
                        <div className="mb-4 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 flex flex-wrap items-center gap-4">
                            {pendingShopOrders > 0 && (
                                <button onClick={() => handleTabClick('shopOrders')} className="underline font-semibold">
                                    商城訂單待處理：{pendingShopOrders} 筆
                                </button>
                            )}
                            {pendingShipments > 0 && (
                                <button onClick={() => handleTabClick('shipments')} className="underline font-semibold">
                                    待出貨：{pendingShipments} 筆
                                </button>
                            )}
                            {pendingPickups > 0 && (
                                <button onClick={() => handleTabClick('pickups')} className="underline font-semibold">
                                    自取申請待處理：{pendingPickups} 筆
                                </button>
                            )}
                        </div>
                    )}
                    {renderTabContent()}
                </main>
            </div>
        </div>
    );
};
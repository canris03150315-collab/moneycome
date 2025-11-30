import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';

// Child Components
import { HomePage } from './components/HomePage';
import { LotteryPage } from './components/LotteryPage';
import { AuthPage } from './components/AuthPage';
import { GoogleCallback } from './components/GoogleCallback';
import { ProfilePage } from './components/ProfilePage';
import { AdminPage } from './components/AdminPage';
import { VerificationPage } from './components/VerificationPage';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ShopPage } from './components/ShopPage';
import { ShopProductPage } from './components/ShopProductPage';
import { FAQPage } from './components/FAQPage';
import { DiagnosticPage } from './components/DiagnosticPage';
import { UserIcon, CogIcon, LogoutIcon } from './components/icons';
import { useAuthStore } from './store/authStore';
import { useSiteStore } from './store/siteDataStore';
import type { User } from './types';
import { apiCall } from './api';
import { ToastProvider, useToast } from './components/ToastProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- HEADER & FOOTER ---
const Header: React.FC<{ storeName: string; currentUser: User | null; onNavigate: (path: string) => void; onLogout: () => void; onAdminClick: () => void; onReset?: () => void; isMock?: boolean; }> = ({ storeName, currentUser, onNavigate, onLogout, onAdminClick, onReset, isMock }) => (
    <header className="sticky top-0 z-40 bg-white shadow-md" role="banner">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
                <button onClick={() => onNavigate('/')} aria-label="返回首頁" className="text-2xl font-bold text-black hover:text-gray-700 transition-colors">{storeName}</button>
                <nav className="hidden md:flex items-center space-x-6" role="navigation" aria-label="主導覽">
                    <button onClick={() => onNavigate('/')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">首頁</button>
                    <button onClick={() => onNavigate('/shop')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">商城商品</button>
                    <button onClick={() => onNavigate('/faq')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">常見問題</button>
                    <button onClick={() => onNavigate('/verification')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">公平性驗證</button>
                </nav>
            </div>
            <div className="flex items-center space-x-4">
                {currentUser ? (<>
                    <div className="hidden sm:block text-sm">
                        <span className="text-gray-600">你好, </span><button onClick={() => onNavigate('/profile')} className="font-semibold text-black hover:underline">{currentUser.username}</button>
                        <span className="text-gray-600 mx-2">|</span><span className="font-semibold text-yellow-500">{currentUser.points.toLocaleString()} P</span>
                    </div>
                    <button onClick={() => onNavigate('/profile')} aria-label="個人資料" className="text-gray-500 hover:text-yellow-500" title="個人資料"><UserIcon className="w-6 h-6" /></button>
                    <button onClick={onLogout} aria-label="登出" className="text-gray-500 hover:text-yellow-500" title="登出"><LogoutIcon className="w-6 h-6" /></button>
                </>) : (
                    <button onClick={() => onNavigate('/auth')} className="bg-[#ffc400] text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition-colors shadow-md border-2 border-black">登入/註冊</button>
                )}
                {(currentUser?.role === 'ADMIN' || currentUser?.roles?.includes('ADMIN') || currentUser?.roles?.includes('admin')) && (
                    <button onClick={onAdminClick} aria-label="後台管理" className="text-gray-500 hover:text-yellow-500" title="後台管理"><CogIcon className="w-6 h-6" /></button>
                )}
                {isMock && (
                    <button
                      onClick={onReset}
                      className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                      title="重置測試資料到初始狀態"
                    >
                      重置測試資料
                    </button>
                )}
            </div>
        </div></div>
    </header>
);

const Footer: React.FC = () => (
    <footer className="bg-gray-800 text-white mt-16"><div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8"><div className="text-center"><p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} KujiSim. All rights reserved.</p></div></div></footer>
);

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { siteConfig, fetchSiteData } = useSiteStore();
    const { currentUser, logout, verifyAdminPassword, checkSession } = useAuthStore();
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [isReAuthModalOpen, setIsReAuthModalOpen] = useState(false);
    const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const toast = useToast();
    
    // 追蹤上次檢查時間，避免頻繁調用
    const lastCheckTimeRef = useRef<number>(0);

    const handleAdminClick = () => {
        if (isAdminAuthenticated) {
            navigate('/admin');
        } else if (currentUser?.role === 'ADMIN' || currentUser?.roles?.includes('ADMIN') || currentUser?.roles?.includes('admin')) {
            setAdminAuthError(null);
            setIsReAuthModalOpen(true);
        }
    };

    // 路由變化時檢查 session（使用快取機制，不會頻繁調用 API）
    useEffect(() => {
        console.log('[Layout] Route changed to:', location.pathname);
        
        // 使用快取機制的 checkSession，不會頻繁調用 API
        checkSession().catch(err => console.log('[Layout] Session check failed:', err));
    }, [location.pathname, checkSession]);
    
    const handleAdminPasswordVerify = async (password: string) => {
        const success = await verifyAdminPassword(password);
        if (success) {
            setIsAdminAuthenticated(true);
            setIsReAuthModalOpen(false);
            navigate('/admin');
        } else {
            setAdminAuthError('密碼錯誤或驗證失敗');
        }
    };

    const isMock = String((import.meta as any).env?.VITE_USE_MOCK || '').toLowerCase() === 'true';
    const handleResetData = async () => {
        try {
            await apiCall('/admin/mock/reset', { method: 'POST' });
            await checkSession();
            await fetchSiteData();
            toast.show({ type: 'success', message: '已重置測試資料。' });
        } catch (e) {
            console.error('重置失敗', e);
            toast.show({ type: 'error', message: '重置失敗，請稍後再試。' });
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded">跳到主內容</a>
            <Header
                storeName={siteConfig?.storeName || 'KujiSim'}
                currentUser={currentUser}
                onNavigate={(path) => {
                    navigate(path);
                    window.scrollTo(0, 0);
                }}
                onLogout={() => {
                  logout();
                  setIsAdminAuthenticated(false);
                  navigate('/');
                }}
                onAdminClick={handleAdminClick}
                onReset={isMock ? () => setIsResetModalOpen(true) : undefined}
                isMock={isMock}
            />
            <main id="main-content" className="flex-grow" role="main">
                <Outlet />
            </main>
            {isReAuthModalOpen && (
                <AdminAuthModal
                    authError={adminAuthError}
                    onClose={() => setIsReAuthModalOpen(false)}
                    onVerifyPassword={handleAdminPasswordVerify}
                />
            )}
            <ConfirmationModal
                isOpen={isResetModalOpen}
                title="重置測試資料"
                message="確定要重置測試資料到初始狀態嗎？此操作將清空目前的模擬資料。"
                onCancel={() => setIsResetModalOpen(false)}
                onConfirm={async () => { setIsResetModalOpen(false); await handleResetData(); }}
            />
            <Footer />
        </div>
    );
};

interface ProtectedRouteProps {
    adminOnly?: boolean;
    children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ adminOnly = false, children }) => {
    const { isAuthenticated, currentUser, isLoading } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return <div className="text-center p-16">驗證使用者身份中...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (adminOnly && !(currentUser?.role === 'ADMIN' || currentUser?.roles?.includes('ADMIN') || currentUser?.roles?.includes('admin'))) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
  const { checkSession, syncFromStorage: authSync } = useAuthStore();
  const { fetchSiteData, startPollingLotterySets, syncFromStorage: siteSync } = useSiteStore();
  const lastRefetchAt = useRef(0);

  useEffect(() => {
    // Initial data load
    console.log('[App] Initial mount, checking session...');
    // 頁面初次載入時強制刷新，確保獲取最新數據（特別是商城訂單）
    checkSession(true).catch(err => console.log('[App] Session check failed:', err));
    fetchSiteData().catch(err => console.log('[App] Site data fetch failed:', err));

    // Start polling for lottery set updates
    const stopPolling = startPollingLotterySets();
    
    // Cleanup on component unmount
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在初始掛載時執行一次

  // Cross-tab sync: refresh session/site data when mock localStorage changes
  useEffect(() => {
    const shouldRefetch = () => {
      const now = Date.now();
      // 僅在距離上次 refetch 超過 60 秒才觸發，避免切回視窗即刻造成閃爍
      if (now - lastRefetchAt.current > 60000) { lastRefetchAt.current = now; return true; }
      return false;
    };
    const handler = (e: StorageEvent) => {
      if (!e.key) return;
      const keys = ['__mock_users_all__', '__mock_inventory__', '__mock_pwd_reset__', '__mock_current_user__', '__mock_lottery_sets__'];
      if (keys.includes(e.key)) {
        // Precise refresh for changed key
        authSync([e.key]);
        siteSync([e.key]);
      }
    };
    window.addEventListener('storage', handler);
    const refetchIfNeeded = () => { 
      // 如果在管理頁面，不要因為 focus 觸發 refetch（避免中斷編輯流程，例如上傳圖片）
      if (window.location.pathname.startsWith('/admin')) return;
      if (shouldRefetch()) { checkSession(); fetchSiteData(); } 
    };
    window.addEventListener('focus', refetchIfNeeded);
    const visHandler = () => { 
      if (document.visibilityState === 'visible') refetchIfNeeded(); 
    };
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', refetchIfNeeded);
      document.removeEventListener('visibilitychange', visHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只設置一次事件監聽器

  return (
      <ToastProvider>
        <ErrorBoundary>
          <Routes>
              <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/lottery/:lotteryId" element={<LotteryPage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/products/:id" element={<ShopProductPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/google/callback" element={<GoogleCallback />} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPage /></ProtectedRoute>} />
                  <Route path="/verification" element={<VerificationPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/diagnostic" element={<DiagnosticPage />} />
              </Route>
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
  );
}

export default App;
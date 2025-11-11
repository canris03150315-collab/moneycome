import React, { useState, useEffect, useCallback, useReducer, useMemo, useRef } from 'react';

// Child Components
import { HomePage } from './HomePage';
import { LotteryPage } from './LotteryPage';
import { AuthPage } from './AuthPage';
import { ProfilePage } from './ProfilePage';
import { AdminPage } from './AdminPage';
import { VerificationPage } from './VerificationPage';
import { AdminAuthModal } from './AdminAuthModal';
import { FAQPage } from './FAQPage';
import { UserIcon, CogIcon, LogoutIcon } from './icons';

// Types and Data
import type { SiteConfig, LotterySet, Category, User, Order, Transaction, Prize, TicketLock, QueueEntry, Banner, PrizeInstance, Shipment, ShippingAddress, PickupRequest, AppState, AdminModalMode } from '../types';
import { appReducer, initialState } from '../store/appReducer';


// --- API Configuration ---
const API_BASE_URL = "https://ichiban-backend-510223165951.us-central1.run.app";

async function apiCall(endpoint: string, options: RequestInit = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Assumes cookie-based authentication
        });

        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            let errorData = { message: `HTTP error! status: ${response.status}` };
            if (contentType && contentType.includes("application/json")) {
                errorData = await response.json();
            }
            throw new Error(errorData.message || 'API request failed');
        }
        
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        return; // Return undefined for non-JSON responses (e.g., 204 No Content)
    } catch (error) {
        console.error(`API Call Error to ${endpoint}:`, error);
        throw error; // Re-throw to be caught by the calling function
    }
}

// --- STATE, REDUCER ---
type View = 'home' | 'lottery' | 'auth' | 'profile' | 'admin' | 'verification' | 'faq';

const LOCK_DURATION_MS = 60 * 1000;
const TURN_DURATION_MS = 3 * 60 * 1000;

// --- HEADER & FOOTER ---
const Header: React.FC<{ storeName: string; currentUser: User | null; onNavigate: (view: View) => void; onLogout: () => void; onAdminClick: () => void; }> = ({ storeName, currentUser, onNavigate, onLogout, onAdminClick }) => (
    <header className="sticky top-0 z-40 bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
                <button onClick={() => onNavigate('home')} className="text-2xl font-bold text-black hover:text-gray-700 transition-colors">{storeName}</button>
                <nav className="hidden md:flex items-center space-x-6">
                    <button onClick={() => onNavigate('home')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">首頁</button>
                    <button onClick={() => onNavigate('faq')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">常見問題</button>
                    <button onClick={() => onNavigate('verification')} className="font-medium text-gray-600 hover:text-yellow-500 transition-colors">公平性驗證</button>
                </nav>
            </div>
            <div className="flex items-center space-x-4">
                {currentUser ? (<>
                    <div className="hidden sm:block text-sm">
                        <span className="text-gray-600">你好, </span><button onClick={() => onNavigate('profile')} className="font-semibold text-black hover:underline">{currentUser.username}</button>
                        <span className="text-gray-600 mx-2">|</span><span className="font-semibold text-yellow-500">{currentUser.points.toLocaleString()} P</span>
                    </div>
                    <button onClick={() => onNavigate('profile')} className="text-gray-500 hover:text-yellow-500" title="個人資料"><UserIcon className="w-6 h-6" /></button>
                    <button onClick={onLogout} className="text-gray-500 hover:text-yellow-500" title="登出"><LogoutIcon className="w-6 h-6" /></button>
                </>) : (
                    <button onClick={() => onNavigate('auth')} className="bg-[#ffc400] text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition-colors shadow-md border-2 border-black">登入/註冊</button>
                )}
                {currentUser?.role === 'ADMIN' && (
                    <button onClick={onAdminClick} className="text-gray-500 hover:text-yellow-500" title="後台管理"><CogIcon className="w-6 h-6" /></button>
                )}
            </div>
        </div></div>
    </header>
);

const Footer: React.FC = () => (
    <footer className="bg-gray-800 text-white mt-16"><div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8"><div className="text-center"><p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} KujiSim. All rights reserved.</p></div></div></footer>
);

// --- GLOBAL STATE MANAGER COMPONENT ---
export const GlobalStateManager: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [view, setView] = useState<View>('home');
  const [selectedLottery, setSelectedLottery] = useState<LotterySet | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const getState = useCallback(() => stateRef.current, []);

  // --- ACTIONS ---
  const advanceQueue = useCallback((lotteryId: string) => {
    // This logic is now likely handled by the backend via WebSockets or polling.
    // Kept here for potential client-side fallback or simple queue visuals.
  }, []);

  const fetchLotterySets = useCallback(async () => {
     try {
        const sets = await apiCall('/lottery-sets');
        dispatch({ type: 'SET_LOTTERY_SETS', payload: sets });
     } catch(e) { console.error(e); }
  }, []);
    
  const actions = useMemo(() => {
    const allActions: any = {
      login: async (email, pass) => {
          dispatch({ type: 'SET_AUTH_ERROR', payload: null });
          try {
              const { user, inventory, orders, shipments, pickupRequests, transactions } = await apiCall('/auth/login', {
                  method: 'POST',
                  body: JSON.stringify({ email, password: pass }),
              });
              dispatch({ type: 'SET_CURRENT_USER', payload: user });
              dispatch({ type: 'SET_INVENTORY', payload: inventory || {} });
              dispatch({ type: 'SET_ORDERS', payload: orders || [] });
              dispatch({ type: 'SET_SHIPMENTS', payload: shipments || [] });
              dispatch({ type: 'SET_PICKUP_REQUESTS', payload: pickupRequests || [] });
              dispatch({ type: 'SET_TRANSACTIONS', payload: transactions || [] });
              return true;
          } catch (error: any) {
              dispatch({ type: 'SET_AUTH_ERROR', payload: error.message || "登入失敗。" });
              return false;
          }
      },
      register: async (username, email, pass) => {
          dispatch({ type: 'SET_AUTH_ERROR', payload: null });
          try {
              const { user } = await apiCall('/auth/register', {
                  method: 'POST',
                  body: JSON.stringify({ username, email, password: pass }),
              });
              dispatch({ type: 'SET_CURRENT_USER', payload: user });
              return true;
          } catch (error: any) {
              dispatch({ type: 'SET_AUTH_ERROR', payload: error.message || "註冊失敗。" });
              return false;
          }
      },
      googleLogin: async () => {
         // This would typically redirect. For a pure backend API, it might involve a popup.
         // For now, we'll assume a simplified API flow.
         window.location.href = `${API_BASE_URL}/auth/google`;
      },
      lineLogin: async () => {
         window.location.href = `${API_BASE_URL}/auth/line`;
      },
      logout: async () => {
          await apiCall('/auth/logout', { method: 'POST' });
          setIsAdminAuthenticated(false);
          dispatch({ type: 'SET_CURRENT_USER', payload: null });
      },
      fetchLotterySets,
      fetchQueue: async (lotteryId: string) => {
        try {
            const queue = await apiCall(`/lottery-sets/${lotteryId}/queue`);
            dispatch({ type: 'UPDATE_SINGLE_QUEUE', payload: { lotteryId, queue } });
        } catch (error) {
            console.error(`Failed to fetch queue for ${lotteryId}:`, error);
        }
      },
      addLotterySet: async (set: LotterySet) => {
          const newSet = await apiCall('/admin/lottery-sets', { method: 'POST', body: JSON.stringify(set) });
          dispatch({ type: 'ADD_LOTTERY_SET', payload: newSet });
      },
      updateLotterySet: async (set: LotterySet) => {
          const updatedSet = await apiCall(`/admin/lottery-sets/${set.id}`, { method: 'PUT', body: JSON.stringify(set) });
          dispatch({ type: 'UPDATE_LOTTERY_SET', payload: updatedSet });
      },
      deleteLotterySet: async (setId: string) => {
          await apiCall(`/admin/lottery-sets/${setId}`, { method: 'DELETE' });
          dispatch({ type: 'DELETE_LOTTERY_SET', payload: setId });
      },
      lockOrUnlockTickets: async (lotteryId, ticketIndices, action) => {
          try {
              await apiCall(`/lottery-sets/${lotteryId}/tickets/lock`, {
                  method: 'POST',
                  body: JSON.stringify({ ticketIndices, action }),
              });
              // Locking/unlocking would be confirmed via a real-time update (e.g. WebSocket)
              // For now, we'll optimistically do nothing and wait for polling to update state.
              return { success: true };
          } catch(error: any) {
              return { success: false, message: error.message };
          }
      },
      joinQueue: async (lotteryId) => {
        await apiCall(`/lottery-sets/${lotteryId}/queue/join`, { method: 'POST' });
        allActions.fetchQueue(lotteryId);
      },
      leaveQueue: async (lotteryId) => {
        await apiCall(`/lottery-sets/${lotteryId}/queue/leave`, { method: 'POST' });
        allActions.fetchQueue(lotteryId);
      },
      extendTurn: async (lotteryId) => {
        await apiCall(`/lottery-sets/${lotteryId}/queue/extend`, { method: 'POST' });
        allActions.fetchQueue(lotteryId);
      },
      draw: async (lotterySetId, selectedTickets, costInPoints, drawHash, secretKey) => {
          try {
              const { drawnPrizes, updatedUser, newOrder, newTransaction } = await apiCall(`/lottery-sets/${lotterySetId}/draw`, {
                  method: 'POST',
                  body: JSON.stringify({ tickets: selectedTickets, drawHash, secretKey }),
              });
              
              dispatch({ type: 'UPDATE_USER', payload: updatedUser });
              dispatch({ type: 'ADD_ORDER', payload: newOrder });
              dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
  
              const newInventoryEntries = Object.fromEntries(drawnPrizes.map((p: PrizeInstance) => [p.instanceId, p]));
              dispatch({ type: 'SET_INVENTORY', payload: { ...getState().inventory, ...newInventoryEntries } });
  
              const updatedLotterySet = await apiCall(`/lottery-sets/${lotterySetId}`);
              dispatch({ type: 'UPDATE_LOTTERY_SET', payload: updatedLotterySet });
              
              return { success: true, drawnPrizes };
          } catch (error: any) {
              fetchLotterySets(); // Refresh data on error
              return { success: false, message: error.message || '抽獎失敗，請稍後再試。' };
          }
      },
      rechargePoints: async (amount) => {
          const { updatedUser, newTransaction } = await apiCall('/user/recharge', { method: 'POST', body: JSON.stringify({ amount }) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      },
      recyclePrize: async (prizeInstanceId) => {
          const { updatedUser, newTransaction } = await apiCall('/inventory/recycle', { method: 'POST', body: JSON.stringify({ prizeInstanceIds: [prizeInstanceId] }) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
          // Refresh inventory
          const inventory = await apiCall('/user/inventory');
          dispatch({ type: 'SET_INVENTORY', payload: inventory });
      },
      batchRecyclePrizes: async (prizeInstanceIds) => {
          const { updatedUser, newTransaction } = await apiCall('/inventory/recycle', { method: 'POST', body: JSON.stringify({ prizeInstanceIds }) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
          const inventory = await apiCall('/user/inventory');
          dispatch({ type: 'SET_INVENTORY', payload: inventory });
      },
      adminAdjustUserPoints: async (userId, newPoints, notes) => {
          const { updatedUser, newTransaction } = await apiCall(`/admin/users/${userId}/points`, { method: 'POST', body: JSON.stringify({ points: newPoints, notes }) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      },
      updateUserRole: async (userId, newRole) => {
          const updatedUser = await apiCall(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      },
      saveShippingAddress: async (address) => {
          const updatedUser = await apiCall('/user/addresses', { method: 'POST', body: JSON.stringify(address) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      },
      updateShippingAddress: async (addressId, addressData) => {
          const updatedUser = await apiCall(`/user/addresses/${addressId}`, { method: 'PUT', body: JSON.stringify(addressData) });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      },
      deleteShippingAddress: async (addressId) => {
          const updatedUser = await apiCall(`/user/addresses/${addressId}`, { method: 'DELETE' });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      },
      setDefaultShippingAddress: async (addressId) => {
          const updatedUser = await apiCall(`/user/addresses/${addressId}/default`, { method: 'POST' });
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      },
      requestShipment: async (prizeInstanceIds, shippingAddress) => {
          try {
              const { newShipment, updatedUser, newTransaction } = await apiCall('/shipments', { method: 'POST', body: JSON.stringify({ prizeInstanceIds, shippingAddressId: shippingAddress.id }) });
              dispatch({ type: 'ADD_SHIPMENT', payload: newShipment });
              dispatch({ type: 'UPDATE_USER', payload: updatedUser });
              dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
              const inventory = await apiCall('/user/inventory');
              dispatch({ type: 'SET_INVENTORY', payload: inventory });
              return { success: true };
          } catch(error: any) {
              return { success: false, message: error.message };
          }
      },
      updateShipmentStatus: async (shipmentId, status, trackingNumber, carrier) => {
          const updatedShipment = await apiCall(`/admin/shipments/${shipmentId}/status`, { method: 'PUT', body: JSON.stringify({ status, trackingNumber, carrier }) });
          dispatch({ type: 'UPDATE_SHIPMENT', payload: updatedShipment });
      },
      requestPickup: async (prizeInstanceIds) => {
          try {
              const { newPickupRequest, newTransaction } = await apiCall('/pickups', { method: 'POST', body: JSON.stringify({ prizeInstanceIds }) });
              dispatch({ type: 'ADD_PICKUP_REQUEST', payload: newPickupRequest });
              dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
              const inventory = await apiCall('/user/inventory');
              dispatch({ type: 'SET_INVENTORY', payload: inventory });
              return { success: true };
          } catch(error: any) {
              return { success: false, message: error.message };
          }
      },
      updatePickupRequestStatus: async (requestId, status) => {
          const updatedRequest = await apiCall(`/admin/pickups/${requestId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
          dispatch({ type: 'UPDATE_PICKUP_REQUEST', payload: updatedRequest });
      },
    };
    return allActions;
  }, [getState, fetchLotterySets]);
  
  useEffect(() => {
    const fetchInitialData = async () => {
        dispatch({ type: 'SET_LOADING_SETS', payload: true });
        try {
            const [sets, siteConfig, categories, sessionUser] = await Promise.all([
                apiCall('/lottery-sets'),
                apiCall('/site-config'),
                apiCall('/categories'),
                apiCall('/auth/session').catch(() => null) // Check for existing session
            ]);
            dispatch({ type: 'SET_LOTTERY_SETS', payload: sets });
            dispatch({ type: 'UPDATE_SITE_CONFIG', payload: siteConfig });
            dispatch({ type: 'SET_CATEGORIES', payload: categories });

            if (sessionUser) {
                 const { user, inventory, orders, shipments, pickupRequests, transactions } = sessionUser;
                 dispatch({ type: 'SET_CURRENT_USER', payload: user });
                 dispatch({ type: 'SET_INVENTORY', payload: inventory || {} });
                 dispatch({ type: 'SET_ORDERS', payload: orders || [] });
                 dispatch({ type: 'SET_SHIPMENTS', payload: shipments || [] });
                 dispatch({ type: 'SET_PICKUP_REQUESTS', payload: pickupRequests || [] });
                 dispatch({ type: 'SET_TRANSACTIONS', payload: transactions || [] });
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        } finally {
            dispatch({ type: 'SET_LOADING_SETS', payload: false });
        }
    };
    fetchInitialData();
    
    // Polling or WebSocket would replace this for real-time updates
    const intervalId = setInterval(() => {
        fetchLotterySets();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchLotterySets]);

  // --- Navigation & Admin ---
  const navigateTo = useCallback((targetView: View) => {
    setView(targetView);
    window.scrollTo(0, 0);
  }, []);

  const handleSelectLottery = useCallback((lottery: LotterySet) => {
    setSelectedLottery(lottery);
    navigateTo('lottery');
  }, [navigateTo]);
  
  const handleAdminClick = () => {
      if (isAdminAuthenticated) {
          navigateTo('admin');
      } else if (state.currentUser?.role === 'ADMIN') {
          setAdminAuthError(null);
          dispatch({ type: 'SET_ADMIN_MODAL_MODE', payload: 're-auth' });
      }
  };
  
   const handleAdminPasswordVerify = async (password: string) => {
        try {
            await apiCall('/auth/verify-admin', { method: 'POST', body: JSON.stringify({ password }) });
            setIsAdminAuthenticated(true);
            dispatch({ type: 'SET_ADMIN_MODAL_MODE', payload: 'hidden' });
            navigateTo('admin');
        } catch (error: any) {
            setAdminAuthError(error.message || '密碼錯誤。');
        }
    };
    
    const handleChangePassword = async (currentPassword, newPassword) => {
        try {
            await apiCall('/user/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
            return { success: true, message: '密碼已成功更新！' };
        } catch(error: any) {
            return { success: false, message: error.message || '密碼更新失敗。' };
        }
    };


  const renderContent = () => {
    if (state.isLoadingSets && view === 'home') return <div className="text-center p-16">載入中...</div>;
    switch(view) {
        case 'lottery':
            if (!selectedLottery) { navigateTo('home'); return null; }
            const currentLotteryData = state.lotterySets.find(l => l.id === selectedLottery.id) || selectedLottery;
            return <LotteryPage lotterySet={currentLotteryData} onSelectLottery={handleSelectLottery} onBack={() => navigateTo('home')} state={state} actions={actions} />;
        case 'auth': return <AuthPage onAuthSuccess={() => navigateTo('home')} state={state} actions={actions} />;
        case 'profile':
            if (!state.currentUser) { navigateTo('auth'); return null; }
            return <ProfilePage user={state.currentUser} onBack={() => navigateTo('home')} state={state} actions={actions} />;
        case 'admin':
            if (!isAdminAuthenticated) { navigateTo('home'); return null; }
            return <AdminPage state={state} dispatch={dispatch} actions={actions} onChangePassword={handleChangePassword} />;
        case 'verification': return <VerificationPage onBack={() => navigateTo('home')} state={state} />;
        case 'faq': return <FAQPage onBack={() => navigateTo('home')} />;
        case 'home': default:
            return <HomePage onSelectLottery={handleSelectLottery} onSelectLotteryById={(id) => {
                const lottery = state.lotterySets.find(set => set.id === id);
                if (lottery) handleSelectLottery(lottery);
            }} state={state} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header storeName={state.siteConfig.storeName} currentUser={state.currentUser} onNavigate={navigateTo} onLogout={actions.logout} onAdminClick={handleAdminClick} />
      <main className="flex-grow">{renderContent()}</main>
      {state.adminModalMode === 're-auth' && (
          <AdminAuthModal 
            authError={adminAuthError} 
            onClose={() => dispatch({ type: 'SET_ADMIN_MODAL_MODE', payload: 'hidden' })} 
            onVerifyPassword={handleAdminPasswordVerify}
          />
      )}
      <Footer />
    </div>
  );
};
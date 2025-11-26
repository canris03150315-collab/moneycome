import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleIcon } from './icons';
import { useToast } from './ToastProvider';
import { useAuthStore } from '../store/authStore';

// Google Client ID (前端可以公開，不是敏感資訊)
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '248630813908-jjcv5u6b94aevmn0v0tn932htmg7ekd1.apps.googleusercontent.com';

// Google Sign-In API types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}


export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithOAuth, error: authError, isLoading, requestPasswordReset, confirmPasswordReset } = useAuthStore();
  const toast = useToast();
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [sentTo, setSentTo] = useState<string | undefined>('');
  const [issuedCode, setIssuedCode] = useState<string | undefined>('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleInitialized, setGoogleInitialized] = useState(false);

  const from = location.state?.from?.pathname || "/";

  // 初始化 Google Sign-In 並渲染按鈕（只執行一次）
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleInitialized) return;
    
    const initGoogle = () => {
      if (typeof window.google === 'undefined') {
        // Google 腳本還沒載入，稍後重試
        setTimeout(initGoogle, 100);
        return;
      }
      
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            console.log('[Google Auth] Callback triggered');
            try {
              const success = await loginWithOAuth('google', { credential: response.credential });
              if (success) {
                toast.show({ type: 'success', message: 'Google 登入成功！' });
                navigate(from, { replace: true });
              } else {
                toast.show({ type: 'error', message: authError || 'Google 登入失敗' });
              }
            } catch (error: any) {
              console.error('[Google Auth] Callback error:', error);
              toast.show({ type: 'error', message: error.message || 'Google 登入失敗' });
            }
          },
        });
        
        // 渲染 Google 按鈕到隱藏的 div 中
        const buttonDiv = document.getElementById('google-signin-button');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: buttonDiv.offsetWidth || 250,
          });
        }
        
        setGoogleInitialized(true);
        console.log('[Google Auth] Initialized successfully');
      } catch (error) {
        console.error('[Google Auth] Initialization error:', error);
      }
    };
    
    initGoogle();
  }, [GOOGLE_CLIENT_ID, googleInitialized, loginWithOAuth, toast, navigate, from, authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AuthPage] handleSubmit called, isLoginView:', isLoginView);
    console.log('[AuthPage] Email:', email);
    
    let success = false;
    if (isLoginView) {
      console.log('[AuthPage] Calling login()...');
      success = await login(email, password);
      console.log('[AuthPage] Login returned:', success);
      
      // 驗證 localStorage
      const sessionId = localStorage.getItem('sessionId');
      console.log('[AuthPage] localStorage sessionId after login:', sessionId ? 'EXISTS' : 'NOT FOUND');
      
      // 驗證 authStore 狀態
      const authState = useAuthStore.getState();
      console.log('[AuthPage] authStore.isAuthenticated:', authState.isAuthenticated);
      console.log('[AuthPage] authStore.currentUser:', authState.currentUser?.username);
    } else {
      console.log('[AuthPage] Calling register()...');
      success = await register(username, email, password);
      console.log('[AuthPage] Register returned:', success);
    }
    
    if (success) {
      console.log('[AuthPage] Success! Navigating to:', from);
      // 等待 50ms 確保狀態已完全更新
      await new Promise(resolve => setTimeout(resolve, 50));
      navigate(from, { replace: true });
    } else {
      console.error('[AuthPage] Login/Register failed, success =', success);
    }
  };

  const openReset = () => {
    setIsResetOpen(true);
    setResetStep(1);
    setResetEmail(email);
    setResetCode('');
    setNewPwd('');
    setSentTo(undefined);
    setIssuedCode(undefined);
    setResetError(null);
  };

  const handleRequestCode = async () => {
    setResetLoading(true);
    setResetError(null);
    const res = await requestPasswordReset(resetEmail);
    setResetLoading(false);
    if (res.success) {
      setSentTo(res.sentTo);
      setIssuedCode(res.code);
      if (res.code) setResetCode(res.code);
      setResetStep(2);
    } else {
      setResetError(res.message || '請求失敗');
    }
  };

  const handleConfirmReset = async () => {
    if (!resetEmail || !resetCode || !newPwd) { setResetError('請完整填寫'); return; }
    setResetLoading(true);
    setResetError(null);
    const res = await confirmPasswordReset(resetEmail, resetCode, newPwd);
    setResetLoading(false);
    if (res.success) {
      setIsResetOpen(false);
      setIsLoginView(true);
      setEmail(resetEmail);
      setPassword(newPwd);
    } else {
      setResetError(res.message || '重設失敗');
    }
  };

  
  const handleLineClick = async () => {
    // await lineLogin();
    toast.show({ type: 'info', message: 'Google/LINE 登入將以 Firebase Redirect 實作（Mock 提示）' });
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLoginView ? '登入您的帳戶' : '建立新帳戶'}
          </h2>
        </div>
        <div className="flex justify-center border-b border-gray-200">
            <button 
                onClick={() => setIsLoginView(true)} 
                className={`px-6 py-2 font-semibold ${isLoginView ? 'text-black border-b-2 border-black' : 'text-gray-500'}`}
            >
                登入
            </button>
            <button 
                onClick={() => setIsLoginView(false)} 
                className={`px-6 py-2 font-semibold ${!isLoginView ? 'text-black border-b-2 border-black' : 'text-gray-500'}`}
            >
                註冊
            </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Google 按鈕容器 - Google 會在這裡渲染真正的按鈕 */}
            <div id="google-signin-button" className="w-full"></div>
            <button
              type="button"
              onClick={handleLineClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00B900] hover:bg-[#00A300] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00B900] disabled:opacity-50"
            >
              使用 LINE 帳號
            </button>
        </div>
        
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                    或
                </span>
            </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLoginView && (
              <div>
                <label htmlFor="username" className="sr-only">使用者名稱</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 focus:z-10 sm:text-sm"
                  placeholder="使用者名稱"
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">電子郵件</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLoginView ? 'rounded-t-md' : ''} focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 focus:z-10 sm:text-sm`}
                placeholder="電子郵件"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">密碼</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 focus:z-10 sm:text-sm"
                placeholder="密碼"
              />
            </div>
          </div>

          {authError && (
              <div className="text-red-500 text-sm text-center">{authError}</div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500"></span>
            <button type="button" className="text-indigo-600 hover:underline" onClick={openReset}>忘記密碼？</button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border-2 border-black text-sm font-medium rounded-md text-black bg-[#ffc400] hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:bg-yellow-200"
            >
              {isLoading ? '處理中...' : (isLoginView ? '登入' : '註冊')}
            </button>
          </div>
        </form>
    {isResetOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={() => setIsResetOpen(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
          <h3 id="reset-title" className="text-xl font-bold mb-4">重設密碼</h3>
          {resetStep === 1 ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full border p-2 rounded-md mb-3" placeholder="example@mail.com" />
              {resetError && <div className="text-sm text-red-600 mb-2">{resetError}</div>}
              <button onClick={handleRequestCode} disabled={resetLoading || !resetEmail} className="w-full bg-black text-white font-semibold py-2 rounded-md disabled:bg-gray-400">{resetLoading ? '發送中...' : '取得重設代碼'}</button>
              {sentTo && (
                <p className="text-xs text-gray-500 mt-3">已寄送到：{sentTo}</p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                {issuedCode && (
                  <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 text-sm p-3 rounded-md">
                    測試用代碼（Mock）：<span className="font-mono font-bold">{issuedCode}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">重設代碼</label>
                  <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                {resetError && <div className="text-sm text-red-600">{resetError}</div>}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setResetStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md">上一步</button>
                  <button onClick={handleConfirmReset} disabled={resetLoading || !resetEmail || !resetCode || !newPwd} className="flex-1 bg-black text-white font-semibold py-2 rounded-md disabled:bg-gray-400">{resetLoading ? '送出中...' : '確認重設'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )}
      </div>
    </div>
  );
}
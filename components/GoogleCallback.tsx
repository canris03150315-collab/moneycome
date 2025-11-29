import React, { useEffect } from 'react';
import { logger } from '../utils/logger';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from './ToastProvider';

export const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithOAuth } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('[Google Callback] Error:', error);
        toast.show({ type: 'error', message: 'Google 登入失敗' });
        navigate('/auth');
        return;
      }

      if (!code) {
        console.error('[Google Callback] No code received');
        toast.show({ type: 'error', message: '未收到授權碼' });
        navigate('/auth');
        return;
      }

      logger.log('[Google Callback] Received code, exchanging for token...');

      try {
        // 將 code 發送到後端換取 token
        const success = await loginWithOAuth('google', { code });
        
        if (success) {
          toast.show({ type: 'success', message: 'Google 登入成功！' });
          
          // 返回到之前的頁面
          const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
          sessionStorage.removeItem('auth_redirect');
          navigate(redirectTo, { replace: true });
        } else {
          toast.show({ type: 'error', message: 'Google 登入失敗' });
          navigate('/auth');
        }
      } catch (error: any) {
        console.error('[Google Callback] Error:', error);
        toast.show({ type: 'error', message: error.message || 'Google 登入失敗' });
        navigate('/auth');
      }
    };

    handleCallback();
  }, [searchParams, navigate, loginWithOAuth, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-600">正在處理 Google 登入...</p>
      </div>
    </div>
  );
};

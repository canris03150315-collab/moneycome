import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const DiagnosticPage: React.FC = () => {
  const { currentUser, isAuthenticated, login } = useAuthStore();
  const [testResults, setTestResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 顯示環境配置
    const env = import.meta.env as any;
    const config = {
      ENV_BASE: env.VITE_API_BASE_URL || 'NOT SET',
      ENV_PREFIX: env.VITE_API_PREFIX || 'NOT SET',
      USE_MOCK: env.VITE_USE_MOCK || 'NOT SET',
      FRONTEND_URL: window.location.origin,
    };
    setTestResults((prev: any) => ({ ...prev, config }));
  }, []);

  const testLoginAPI = async () => {
    setIsLoading(true);
    try {
      const env = import.meta.env as any;
      const apiBase = env.VITE_API_BASE_URL || 'https://ichiban-backend-new-248630813908.us-central1.run.app';
      const apiPrefix = env.VITE_API_PREFIX || '/api';
      const url = `${apiBase}${apiPrefix}/auth/login`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: '123123@aaa', password: '123123' })
      });

      const data = await response.json();
      const cookies = document.cookie;

      setTestResults((prev: any) => ({
        ...prev,
        apiTest: {
          success: response.ok,
          status: response.status,
          url,
          data: data,
          cookies: cookies || 'No cookies found',
          headers: {
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
            'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
          }
        }
      }));
    } catch (error: any) {
      setTestResults((prev: any) => ({
        ...prev,
        apiTest: {
          success: false,
          error: error.message,
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const testStoreLogin = async () => {
    setIsLoading(true);
    try {
      const success = await login('123123@aaa', '123123');
      setTestResults((prev: any) => ({
        ...prev,
        storeTest: {
          success,
          currentUser: useAuthStore.getState().currentUser,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
        }
      }));
    } catch (error: any) {
      setTestResults((prev: any) => ({
        ...prev,
        storeTest: {
          success: false,
          error: error.message,
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 系統診斷頁面</h1>

        {/* 當前狀態 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">當前認證狀態</h2>
          <div className="space-y-2">
            <p><strong>登入狀態：</strong> {isAuthenticated ? '✅ 已登入' : '❌ 未登入'}</p>
            {currentUser && (
              <>
                <p><strong>用戶名：</strong> {currentUser.username}</p>
                <p><strong>郵箱：</strong> {currentUser.email}</p>
                <p><strong>點數：</strong> {currentUser.points} P</p>
              </>
            )}
          </div>
        </div>

        {/* 環境配置 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">環境配置</h2>
          {testResults.config && (
            <div className="space-y-2 font-mono text-sm">
              <p><strong>API Base URL:</strong> {testResults.config.ENV_BASE}</p>
              <p><strong>API Prefix:</strong> {testResults.config.ENV_PREFIX}</p>
              <p><strong>Use Mock:</strong> {testResults.config.USE_MOCK}</p>
              <p><strong>Frontend URL:</strong> {testResults.config.FRONTEND_URL}</p>
            </div>
          )}
        </div>

        {/* 測試按鈕 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">測試功能</h2>
          <div className="space-x-4">
            <button
              onClick={testLoginAPI}
              disabled={isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? '測試中...' : '測試登入 API (fetch)'}
            </button>
            <button
              onClick={testStoreLogin}
              disabled={isLoading}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {isLoading ? '測試中...' : '測試 Store 登入'}
            </button>
          </div>
        </div>

        {/* API 測試結果 */}
        {testResults.apiTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {testResults.apiTest.success ? '✅' : '❌'} 登入 API 測試結果
            </h2>
            <div className="space-y-2 font-mono text-sm">
              <p><strong>Status:</strong> {testResults.apiTest.status}</p>
              <p><strong>URL:</strong> {testResults.apiTest.url}</p>
              {testResults.apiTest.success ? (
                <>
                  <p><strong>用戶名:</strong> {testResults.apiTest.data?.user?.username}</p>
                  <p><strong>點數:</strong> {testResults.apiTest.data?.user?.points} P</p>
                  <p><strong>Cookies:</strong> {testResults.apiTest.cookies}</p>
                  <p><strong>CORS Origin:</strong> {testResults.apiTest.headers['access-control-allow-origin']}</p>
                  <p><strong>CORS Credentials:</strong> {testResults.apiTest.headers['access-control-allow-credentials']}</p>
                </>
              ) : (
                <p className="text-red-600"><strong>Error:</strong> {testResults.apiTest.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Store 測試結果 */}
        {testResults.storeTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {testResults.storeTest.success ? '✅' : '❌'} Store 登入測試結果
            </h2>
            <div className="space-y-2 font-mono text-sm">
              <p><strong>Success:</strong> {testResults.storeTest.success ? 'true' : 'false'}</p>
              <p><strong>Is Authenticated:</strong> {testResults.storeTest.isAuthenticated ? 'true' : 'false'}</p>
              {testResults.storeTest.currentUser && (
                <>
                  <p><strong>用戶名:</strong> {testResults.storeTest.currentUser.username}</p>
                  <p><strong>點數:</strong> {testResults.storeTest.currentUser.points} P</p>
                </>
              )}
              {testResults.storeTest.error && (
                <p className="text-red-600"><strong>Error:</strong> {testResults.storeTest.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Cookies */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">當前 Cookies</h2>
          <div className="font-mono text-sm bg-gray-100 p-4 rounded">
            {document.cookie || '(無 cookies)'}
          </div>
        </div>
      </div>
    </div>
  );
};

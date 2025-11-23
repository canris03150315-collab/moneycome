import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const DiagnosticPage: React.FC = () => {
  const { currentUser, isAuthenticated, login } = useAuthStore();
  const [testResults, setTestResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // 顯示環境配置
    const env = import.meta.env as any;
    const config = {
      ENV_BASE: env.VITE_API_BASE_URL || 'NOT SET',
      ENV_PREFIX: env.VITE_API_PREFIX || 'NOT SET',
      USE_MOCK: env.VITE_USE_MOCK || 'NOT SET',
      FRONTEND_URL: window.location.origin,
      FRONTEND_VERSION: 'ichiban-frontend-00060-z79', // 硬編碼版本號
    };
    setTestResults((prev: any) => ({ ...prev, config }));
    addLog('診斷頁面初始化完成');
  }, []);

  const testLoginAPI = async () => {
    setIsLoading(true);
    addLog('開始測試登入 API...');
    try {
      const env = import.meta.env as any;
      const apiBase = env.VITE_API_BASE_URL || 'https://ichiban-backend-new-248630813908.us-central1.run.app';
      const apiPrefix = env.VITE_API_PREFIX || '/api';
      const url = `${apiBase}${apiPrefix}/auth/login`;
      addLog(`API URL: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: '123123@aaa', password: '123123' })
      });
      addLog(`API 響應狀態: ${response.status}`);

      const data = await response.json();
      addLog(`收到數據: ${JSON.stringify(data.user ? {username: data.user.username, points: data.user.points} : 'no user')}`);
      
      const cookies = document.cookie;
      const sessionId = data.sessionId;
      addLog(`SessionId in response: ${sessionId ? 'YES' : 'NO'}`);
      addLog(`Cookies: ${cookies || 'None'}`);

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
      addLog('API 測試完成！');
    } catch (error: any) {
      addLog(`❌ API 測試失敗: ${error.message}`);
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
    addLog('開始測試 Store 登入...');
    try {
      addLog('調用 login() 函數...');
      const success = await login('123123@aaa', '123123');
      addLog(`Login 結果: ${success ? '成功' : '失敗'}`);
      
      const state = useAuthStore.getState();
      addLog(`當前認證狀態: ${state.isAuthenticated ? '已登入' : '未登入'}`);
      addLog(`當前用戶: ${state.currentUser?.username || '無'}`);
      
      const lsSessionId = localStorage.getItem('sessionId');
      addLog(`localStorage sessionId: ${lsSessionId ? 'EXISTS' : 'NOT FOUND'}`);
      
      setTestResults((prev: any) => ({
        ...prev,
        storeTest: {
          success,
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
        }
      }));
      addLog('Store 登入測試完成！');
    } catch (error: any) {
      addLog(`❌ Store 登入失敗: ${error.message}`);
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

        {/* 實時日誌 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 實時診斷日誌</h2>
          <div className="font-mono text-xs bg-gray-900 text-green-400 p-4 rounded max-h-96 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            ) : (
              <div className="text-gray-500">等待測試操作...</div>
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            清除日誌
          </button>
        </div>

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

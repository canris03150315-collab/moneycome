import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

// 登入流程診斷組件
export const LoginDebugger: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const { currentUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    // 監聽 localStorage 變化
    const checkStorage = () => {
      const sessionId = localStorage.getItem('sessionId');
      addLog(`localStorage sessionId: ${sessionId ? 'EXISTS ✅' : 'NOT FOUND ❌'}`);
    };

    // 初始檢查
    checkStorage();

    // 定期檢查
    const interval = setInterval(checkStorage, 2000);

    // 監聽認證狀態變化
    addLog(`Auth State: isAuthenticated=${isAuthenticated}, user=${currentUser?.username || 'null'}`);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  if (process.env.NODE_ENV === 'production') {
    return null; // 生產環境不顯示
  }

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '10px',
      width: '350px',
      maxHeight: '400px',
      background: 'rgba(0,0,0,0.9)',
      color: '#0f0',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'monospace',
      zIndex: 10000,
      overflow: 'auto',
    }}>
      <div style={{ marginBottom: '10px', color: '#fff', fontWeight: 'bold' }}>
        🔍 登入診斷工具
      </div>
      <div style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
        <div>認證狀態: {isAuthenticated ? '✅ 已登入' : '❌ 未登入'}</div>
        <div>用戶名: {currentUser?.username || 'null'}</div>
        <div>localStorage: {localStorage.getItem('sessionId') ? '✅' : '❌'}</div>
      </div>
      <div style={{ fontSize: '10px', color: '#888' }}>最近日誌：</div>
      {logs.slice(-10).map((log, i) => (
        <div key={i} style={{ padding: '2px 0' }}>{log}</div>
      ))}
      <button
        onClick={() => setLogs([])}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '10px',
        }}
      >
        清除日誌
      </button>
    </div>
  );
};

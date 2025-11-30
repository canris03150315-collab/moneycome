import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './version';  // 自動顯示版本號
import { initSentry } from './utils/sentry';  // Sentry 錯誤監控
import * as serviceWorkerRegistration from './serviceWorkerRegistration';  // Service Worker

// 初始化 Sentry
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// 註冊 Service Worker（僅在生產環境）
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: () => {
      console.log('[App] Service Worker registered successfully. App is ready for offline use.');
    },
    onUpdate: (registration) => {
      console.log('[App] New version available! Please refresh.');
      // 可以在這裡顯示更新提示
    },
  });
} else {
  console.log('[App] Service Worker disabled in development mode');
}
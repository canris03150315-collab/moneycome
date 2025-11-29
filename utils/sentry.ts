/**
 * Sentry 錯誤監控配置
 */

import * as Sentry from "@sentry/react";

// 只在生產環境啟用 Sentry
const isProduction = import.meta.env.PROD;

export function initSentry() {
  if (!isProduction) {
    console.log('[Sentry] 開發環境，跳過初始化');
    return;
  }

  // 暴露 Sentry 到全局（方便測試）
  if (typeof window !== 'undefined') {
    (window as any).Sentry = Sentry;
  }

  Sentry.init({
    // TODO: 替換為你的 Sentry DSN
    // 註冊 Sentry 帳號後在 https://sentry.io/ 獲取
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    
    // 環境
    environment: import.meta.env.MODE,
    
    // 追蹤取樣率（1.0 = 100%）
    tracesSampleRate: 1.0,
    
    // 整合
    integrations: [
      // 瀏覽器追蹤
      Sentry.browserTracingIntegration(),
      
      // 重播整合（記錄用戶操作）
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Session Replay 取樣率
    replaysSessionSampleRate: 0.1, // 10% 的正常 session
    replaysOnErrorSampleRate: 1.0, // 100% 的錯誤 session
    
    // 忽略特定錯誤
    ignoreErrors: [
      // 瀏覽器擴展錯誤
      'top.GLOBALS',
      // 隨機插件/擴展
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Facebook 相關
      'fb_xd_fragment',
      // 其他
      'Non-Error promise rejection captured',
    ],
    
    // 過濾敏感資訊
    beforeSend(event, hint) {
      // 移除敏感的 URL 參數
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          url.searchParams.delete('token');
          url.searchParams.delete('password');
          event.request.url = url.toString();
        } catch (e) {
          // URL 解析失敗，忽略
        }
      }
      
      return event;
    },
  });

  console.log('[Sentry] 已初始化');
}

/**
 * 手動記錄錯誤
 */
export function logError(error: Error, context?: Record<string, any>) {
  if (isProduction) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('[Error]', error, context);
  }
}

/**
 * 記錄訊息
 */
export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (isProduction) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level.toUpperCase()}]`, message);
  }
}

/**
 * 設置用戶資訊
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  if (isProduction) {
    Sentry.setUser(user);
  }
}

/**
 * 清除用戶資訊
 */
export function clearUser() {
  if (isProduction) {
    Sentry.setUser(null);
  }
}

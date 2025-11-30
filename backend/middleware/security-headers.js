/**
 * 安全 HTTP Headers 中間件
 * 
 * 實施 OWASP 推薦的安全 Headers
 * 防止常見的 Web 攻擊（XSS, Clickjacking, MIME Sniffing 等）
 */

/**
 * 設置安全 HTTP Headers
 */
function securityHeaders() {
  return (req, res, next) => {
    // 1. X-Content-Type-Options
    // 防止 MIME 類型嗅探攻擊
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // 2. X-Frame-Options
    // 防止點擊劫持（Clickjacking）攻擊
    res.setHeader('X-Frame-Options', 'DENY');
    
    // 3. X-XSS-Protection
    // 啟用瀏覽器的 XSS 過濾器（舊版瀏覽器）
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // 4. Strict-Transport-Security (HSTS)
    // 強制使用 HTTPS（僅在生產環境）
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // 5. Content-Security-Policy (CSP)
    // 防止 XSS 和數據注入攻擊
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.run.app https://*.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', cspDirectives);
    
    // 6. Referrer-Policy
    // 控制 Referer Header 的發送
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 7. Permissions-Policy (舊稱 Feature-Policy)
    // 控制瀏覽器功能的訪問權限
    const permissionsPolicy = [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', ');
    
    res.setHeader('Permissions-Policy', permissionsPolicy);
    
    // 8. X-Permitted-Cross-Domain-Policies
    // 控制跨域策略文件
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // 9. Cache-Control（針對敏感端點）
    if (req.path.includes('/admin') || req.path.includes('/auth')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // 10. X-Powered-By
    // 移除伺服器指紋信息（已在 app.disable('x-powered-by') 處理）
    
    next();
  };
}

/**
 * CORS 安全配置
 * @param {Array<string>} allowedOrigins - 允許的來源列表
 */
function secureCORS(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    // 檢查來源是否在白名單中
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // 允許的 HTTP 方法
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // 允許的 Headers
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
    );
    
    // 允許發送 Cookies
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Preflight 請求的緩存時間
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 小時
    
    // 處理 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  };
}

/**
 * 安全響應 Headers（針對 API 響應）
 */
function apiSecurityHeaders() {
  return (req, res, next) => {
    // 確保 API 響應為 JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 防止 MIME 嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // 不緩存敏感數據
    if (req.path.includes('/admin') || req.path.includes('/user')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
    
    next();
  };
}

/**
 * 速率限制 Headers
 * @param {number} limit - 請求限制
 * @param {number} remaining - 剩餘請求數
 * @param {number} reset - 重置時間（Unix 時間戳）
 */
function rateLimitHeaders(limit, remaining, reset) {
  return (req, res, next) => {
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);
    
    if (remaining === 0) {
      res.setHeader('Retry-After', Math.ceil((reset - Date.now()) / 1000));
    }
    
    next();
  };
}

module.exports = {
  securityHeaders,
  secureCORS,
  apiSecurityHeaders,
  rateLimitHeaders
};

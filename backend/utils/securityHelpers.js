/**
 * 安全輔助工具
 * 包含 HTML 轉義、日誌脫敏、Session 驗證等
 */

const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');

/**
 * HTML 轉義 - 防止 XSS 攻擊
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * 清理 HTML - 移除所有 HTML 標籤
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return sanitizeHtml(input, {
    allowedTags: [], // 不允許任何標籤
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}

/**
 * 清理對象中的所有字串
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * 日誌脫敏 - 移除敏感資訊
 */
function sanitizeLog(data) {
  if (!data || typeof data !== 'object') return data;
  
  // 敏感欄位列表
  const sensitiveFields = [
    'password',
    'token',
    'sessionId',
    'authorization',
    'cookie',
    'secret',
    'apiKey',
    'privateKey',
    'accessToken',
    'refreshToken',
    'paymentProof', // 支付憑證可能包含敏感資訊
  ];
  
  const sanitized = JSON.parse(JSON.stringify(data)); // 深拷貝
  
  function redactSensitive(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      
      // 檢查是否為敏感欄位
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof obj[key] === 'string' && obj[key].length > 0) {
          // 保留前3個字符，其餘用 * 替代
          const visible = obj[key].substring(0, 3);
          const hidden = '*'.repeat(Math.min(obj[key].length - 3, 10));
          obj[key] = visible + hidden;
        } else {
          obj[key] = '***REDACTED***';
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactSensitive(obj[key]);
      }
    }
  }
  
  redactSensitive(sanitized);
  return sanitized;
}

/**
 * 生成 CSRF Token
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 驗證 CSRF Token
 */
function verifyCsrfToken(sessionToken, requestToken) {
  if (!sessionToken || !requestToken) return false;
  return sessionToken === requestToken;
}

/**
 * 驗證 Session 安全性（IP + User Agent）
 */
function verifySessionSecurity(session, req) {
  if (!session) return { valid: false, reason: 'No session' };
  
  const currentIp = req.ip || req.connection.remoteAddress;
  const currentUserAgent = req.get('user-agent') || '';
  
  // 檢查 IP
  if (session.ipAddress && session.ipAddress !== currentIp) {
    console.warn(`[SECURITY] IP mismatch for session. Expected: ${session.ipAddress}, Got: ${currentIp}`);
    return { 
      valid: false, 
      reason: 'IP_MISMATCH',
      message: '檢測到異常登入位置，請重新登入'
    };
  }
  
  // 檢查 User Agent
  if (session.userAgent && session.userAgent !== currentUserAgent) {
    console.warn(`[SECURITY] User Agent mismatch for session`);
    return { 
      valid: false, 
      reason: 'USER_AGENT_MISMATCH',
      message: '檢測到異常登入設備，請重新登入'
    };
  }
  
  return { valid: true };
}

/**
 * 為 Session 添加安全資訊
 */
function addSessionSecurity(session, req) {
  return {
    ...session,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || '',
    csrfToken: generateCsrfToken(),
    createdAt: session.createdAt || new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
}

/**
 * 安全日誌記錄（自動脫敏）
 */
function secureLog(level, message, data = {}) {
  const sanitizedData = sanitizeLog(data);
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...sanitizedData,
  };
  
  switch (level) {
    case 'error':
      console.error(`[${timestamp}] [ERROR]`, message, sanitizedData);
      break;
    case 'warn':
      console.warn(`[${timestamp}] [WARN]`, message, sanitizedData);
      break;
    case 'info':
      console.log(`[${timestamp}] [INFO]`, message, sanitizedData);
      break;
    default:
      console.log(`[${timestamp}] [LOG]`, message, sanitizedData);
  }
  
  return logEntry;
}

/**
 * 驗證輸入格式
 */
function validateInput(value, type, options = {}) {
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
      
    case 'number':
      const num = Number(value);
      if (isNaN(num)) return false;
      if (options.min !== undefined && num < options.min) return false;
      if (options.max !== undefined && num > options.max) return false;
      return true;
      
    case 'string':
      if (typeof value !== 'string') return false;
      if (options.minLength && value.length < options.minLength) return false;
      if (options.maxLength && value.length > options.maxLength) return false;
      if (options.pattern && !new RegExp(options.pattern).test(value)) return false;
      return true;
      
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
      
    default:
      return true;
  }
}

module.exports = {
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  sanitizeLog,
  generateCsrfToken,
  verifyCsrfToken,
  verifySessionSecurity,
  addSessionSecurity,
  secureLog,
  validateInput,
};

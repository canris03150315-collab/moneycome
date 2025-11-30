/**
 * 注入攻擊防護工具
 * 
 * 防護類型：
 * 1. NoSQL 注入
 * 2. SQL 注入（如果使用 SQL）
 * 3. 命令注入
 * 4. 路徑遍歷
 */

/**
 * 清理字符串，移除潛在的注入字符
 * @param {string} input - 輸入字符串
 * @returns {string} 清理後的字符串
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // 移除控制字符和特殊字符
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
    .trim();
}

/**
 * 清理 ID（只允許字母、數字、連字符、底線）
 * @param {string} id - ID 字符串
 * @returns {string} 清理後的 ID
 */
function sanitizeId(id) {
  if (typeof id !== 'string') {
    return String(id);
  }
  
  // 只保留安全字符
  return id.replace(/[^a-zA-Z0-9-_]/g, '');
}

/**
 * 清理 Email
 * @param {string} email - Email 地址
 * @returns {string} 清理後的 Email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }
  
  // 基本清理
  const cleaned = email.toLowerCase().trim();
  
  // 驗證格式
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format');
  }
  
  return cleaned;
}

/**
 * 清理數字
 * @param {any} num - 數字輸入
 * @param {Object} options - 選項
 * @returns {number} 清理後的數字
 */
function sanitizeNumber(num, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    integer = false
  } = options;
  
  let value = Number(num);
  
  if (isNaN(value)) {
    throw new Error('Invalid number');
  }
  
  if (integer) {
    value = Math.floor(value);
  }
  
  if (value < min || value > max) {
    throw new Error(`Number out of range: ${min} to ${max}`);
  }
  
  return value;
}

/**
 * 驗證和清理排序字段（防止注入）
 * @param {string} field - 排序字段
 * @param {Array<string>} allowedFields - 允許的字段白名單
 * @returns {string} 驗證後的字段
 */
function sanitizeSortField(field, allowedFields) {
  if (!allowedFields.includes(field)) {
    throw new Error(`Invalid sort field: ${field}`);
  }
  return field;
}

/**
 * 驗證和清理排序方向
 * @param {string} direction - 排序方向
 * @returns {string} 驗證後的方向
 */
function sanitizeSortDirection(direction) {
  const normalized = String(direction).toLowerCase();
  
  if (!['asc', 'desc'].includes(normalized)) {
    throw new Error('Invalid sort direction');
  }
  
  return normalized;
}

/**
 * 清理 Firestore 查詢參數（防止 NoSQL 注入）
 * @param {Object} params - 查詢參數
 * @returns {Object} 清理後的參數
 */
function sanitizeQueryParams(params) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(params)) {
    // 檢查鍵名是否安全
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      console.warn(`[INJECTION] Suspicious query key: ${key}`);
      continue;
    }
    
    // 清理值
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null) {
      sanitized[key] = null;
    } else if (Array.isArray(value)) {
      // 清理數組中的每個元素
      sanitized[key] = value.map(v => 
        typeof v === 'string' ? sanitizeString(v) : v
      );
    } else if (typeof value === 'object') {
      // 遞歸清理對象
      sanitized[key] = sanitizeQueryParams(value);
    }
  }
  
  return sanitized;
}

/**
 * 檢測 NoSQL 注入模式
 * @param {any} input - 輸入數據
 * @returns {boolean} 是否檢測到注入
 */
function detectNoSQLInjection(input) {
  if (typeof input === 'string') {
    // 檢測常見的 NoSQL 注入模式
    const patterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /\$or/i,
      /\$and/i,
      /\$in/i,
      /\$nin/i,
      /javascript:/i,
      /\{\s*\$.*\}/
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }
  
  if (typeof input === 'object' && input !== null) {
    // 檢查對象鍵
    const keys = Object.keys(input);
    return keys.some(key => key.startsWith('$'));
  }
  
  return false;
}

/**
 * 防止路徑遍歷攻擊
 * @param {string} path - 文件路徑
 * @returns {string} 安全的路徑
 */
function sanitizePath(path) {
  if (typeof path !== 'string') {
    throw new Error('Invalid path');
  }
  
  // 移除危險字符
  const cleaned = path.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
  
  // 檢測路徑遍歷
  if (cleaned.includes('..') || cleaned.includes('~')) {
    throw new Error('Path traversal detected');
  }
  
  return cleaned;
}

/**
 * 清理 URL 參數
 * @param {string} url - URL 字符串
 * @returns {string} 清理後的 URL
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    throw new Error('Invalid URL');
  }
  
  try {
    const parsed = new URL(url);
    
    // 只允許 http 和 https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    
    return parsed.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * 中間件：檢測和阻止注入攻擊
 */
function injectionProtectionMiddleware() {
  return (req, res, next) => {
    try {
      // 檢查請求體
      if (req.body) {
        checkForInjection(req.body, 'body');
      }
      
      // 檢查查詢參數
      if (req.query) {
        checkForInjection(req.query, 'query');
      }
      
      // 檢查路徑參數
      if (req.params) {
        checkForInjection(req.params, 'params');
      }
      
      next();
    } catch (error) {
      console.error('[INJECTION] Attack detected:', error.message);
      return res.status(400).json({
        message: '請求包含非法字符',
        error: 'Invalid input detected'
      });
    }
  };
}

/**
 * 遞歸檢查注入
 */
function checkForInjection(obj, source) {
  if (typeof obj === 'string') {
    if (detectNoSQLInjection(obj)) {
      throw new Error(`NoSQL injection detected in ${source}`);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    if (detectNoSQLInjection(obj)) {
      throw new Error(`NoSQL injection detected in ${source}`);
    }
    
    for (const [key, value] of Object.entries(obj)) {
      checkForInjection(value, `${source}.${key}`);
    }
  }
}

/**
 * 安全的 Firestore 查詢構建器
 */
class SafeQueryBuilder {
  constructor(collection) {
    this.collection = collection;
    this.query = collection;
  }
  
  where(field, operator, value) {
    // 驗證字段名
    if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    
    // 驗證操作符
    const validOperators = ['==', '!=', '<', '<=', '>', '>=', 'in', 'not-in', 'array-contains', 'array-contains-any'];
    if (!validOperators.includes(operator)) {
      throw new Error(`Invalid operator: ${operator}`);
    }
    
    // 清理值
    let cleanValue = value;
    if (typeof value === 'string') {
      cleanValue = sanitizeString(value);
      
      // 檢測注入
      if (detectNoSQLInjection(cleanValue)) {
        throw new Error('NoSQL injection detected in where clause');
      }
    }
    
    this.query = this.query.where(field, operator, cleanValue);
    return this;
  }
  
  orderBy(field, direction = 'asc') {
    // 驗證字段名
    if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    
    // 驗證方向
    const cleanDirection = sanitizeSortDirection(direction);
    
    this.query = this.query.orderBy(field, cleanDirection);
    return this;
  }
  
  limit(count) {
    const cleanCount = sanitizeNumber(count, { min: 1, max: 1000, integer: true });
    this.query = this.query.limit(cleanCount);
    return this;
  }
  
  async get() {
    return await this.query.get();
  }
}

module.exports = {
  sanitizeString,
  sanitizeId,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeSortField,
  sanitizeSortDirection,
  sanitizeQueryParams,
  sanitizePath,
  sanitizeUrl,
  detectNoSQLInjection,
  injectionProtectionMiddleware,
  SafeQueryBuilder
};

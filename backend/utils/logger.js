/**
 * 簡單的日誌系統 - 支援環境變數控制
 * 
 * 日誌級別：
 * - ERROR: 錯誤（總是顯示）
 * - WARN: 警告
 * - INFO: 一般資訊
 * - DEBUG: 調試資訊（僅開發環境）
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 從環境變數讀取日誌級別，預設為 INFO
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// 是否為生產環境
const isProduction = process.env.NODE_ENV === 'production';

/**
 * 格式化日誌訊息
 */
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (args.length > 0) {
    return `${prefix} ${message}`;
  }
  return `${prefix} ${message}`;
}

/**
 * 日誌輸出函數
 */
const logger = {
  /**
   * 錯誤日誌（總是顯示）
   */
  error: (message, ...args) => {
    console.error(formatMessage('ERROR', message), ...args);
  },

  /**
   * 警告日誌
   */
  warn: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message), ...args);
    }
  },

  /**
   * 一般資訊日誌
   */
  info: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message), ...args);
    }
  },

  /**
   * 調試日誌（僅開發環境）
   */
  debug: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.DEBUG && !isProduction) {
      console.log(formatMessage('DEBUG', message), ...args);
    }
  },

  /**
   * 保留原始 console.log 的別名（向後兼容）
   * 在生產環境會被靜默
   */
  log: (message, ...args) => {
    if (!isProduction) {
      console.log(message, ...args);
    }
  }
};

module.exports = logger;

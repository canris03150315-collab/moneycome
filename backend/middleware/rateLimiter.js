/**
 * API 請求頻率限制中間件
 * 防止濫用和 DDoS 攻擊
 */

const rateLimit = require('express-rate-limit');

/**
 * 一般 API 限制
 * 每個 IP 每 15 分鐘最多 100 個請求
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 最多 100 個請求
  message: {
    success: false,
    message: '請求過於頻繁，請稍後再試'
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
  // 根據用戶 ID 或 IP 限制
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

/**
 * 嚴格限制（登入、註冊等敏感操作）
 * 每個 IP 每 15 分鐘最多 5 個請求
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 最多 5 個請求
  message: {
    success: false,
    message: '操作過於頻繁，請 15 分鐘後再試'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // 成功的請求也計數
});

/**
 * 抽獎限制
 * 每個用戶每分鐘最多 10 次抽獎
 */
const drawLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 10, // 最多 10 次
  message: {
    success: false,
    message: '抽獎過於頻繁，請稍後再試'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // 管理員不受限制
    return req.user?.role === 'admin';
  }
});

/**
 * 圖片上傳限制
 * 每個 IP 每小時最多 20 次上傳
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 20, // 最多 20 次
  message: {
    success: false,
    message: '上傳過於頻繁，請稍後再試'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  strictLimiter,
  drawLimiter,
  uploadLimiter
};

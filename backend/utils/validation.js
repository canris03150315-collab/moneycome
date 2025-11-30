const Joi = require('joi');

// 驗證規則
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': '請輸入有效的郵箱地址',
      'any.required': '郵箱為必填項'
    }),
    password: Joi.string().min(6).max(100).required().messages({
      'string.min': '密碼長度至少 6 個字元',
      'string.max': '密碼長度不能超過 100 個字元',
      'any.required': '密碼為必填項'
    }),
    displayName: Joi.string().min(1).max(50).required().messages({
      'string.min': '顯示名稱不能為空',
      'string.max': '顯示名稱不能超過 50 個字元',
      'any.required': '顯示名稱為必填項'
    })
  }),
  
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': '請輸入有效的郵箱地址',
      'any.required': '郵箱為必填項'
    }),
    password: Joi.string().required().messages({
      'any.required': '密碼為必填項'
    })
  }),
  
  draw: Joi.object({
    ticketCount: Joi.number().integer().min(1).max(10).required().messages({
      'number.base': '抽獎數量必須是數字',
      'number.integer': '抽獎數量必須是整數',
      'number.min': '至少抽 1 張',
      'number.max': '最多抽 10 張',
      'any.required': '抽獎數量為必填項'
    })
  }),
  
  recharge: Joi.object({
    amount: Joi.number().positive().max(100000).required().messages({
      'number.base': '充值金額必須是數字',
      'number.positive': '充值金額必須大於 0',
      'number.max': '單次充值不能超過 100000',
      'any.required': '充值金額為必填項'
    }),
    packageId: Joi.string().optional()
  }),
  
  lotterySetId: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).required().messages({
    'string.pattern.base': '商品 ID 格式無效',
    'any.required': '商品 ID 為必填項'
  })
};

/**
 * 驗證中間件
 * @param {string} schemaName - 驗證規則名稱
 * @returns {Function} Express 中間件
 */
function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      console.error(`[VALIDATION] Schema not found: ${schemaName}`);
      return res.status(500).json({ message: '驗證配置錯誤' });
    }
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,  // 返回所有錯誤
      stripUnknown: true  // 移除未知字段
    });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      console.log(`[VALIDATION] Failed for ${schemaName}:`, errors);
      return res.status(400).json({ 
        message: errors[0],  // 返回第一個錯誤
        errors: errors  // 返回所有錯誤
      });
    }
    
    // 使用驗證後的值（已清理）
    req.body = value;
    next();
  };
}

/**
 * 驗證路徑參數
 * @param {string} paramName - 參數名稱
 * @param {RegExp} pattern - 驗證正則表達式
 * @returns {Function} Express 中間件
 */
function validateParam(paramName, pattern) {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (!value) {
      return res.status(400).json({ message: `缺少參數: ${paramName}` });
    }
    
    if (!pattern.test(value)) {
      console.log(`[VALIDATION] Invalid param ${paramName}:`, value);
      return res.status(400).json({ message: `無效的 ${paramName}` });
    }
    
    next();
  };
}

/**
 * 驗證郵箱格式
 * @param {string} email - 郵箱地址
 * @returns {boolean} 是否有效
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 清理輸入（防止 XSS）
 * @param {string} input - 輸入字符串
 * @returns {string} 清理後的字符串
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>\"']/g, '');
}

module.exports = {
  validate,
  validateParam,
  schemas,
  isValidEmail,
  sanitizeInput
};

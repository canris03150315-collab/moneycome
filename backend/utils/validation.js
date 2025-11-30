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
    // 兼容前端：username 和 displayName 都可以，且為可選
    username: Joi.string().min(1).max(50).optional().messages({
      'string.min': '用戶名稱不能為空',
      'string.max': '用戶名稱不能超過 50 個字元'
    }),
    displayName: Joi.string().min(1).max(50).optional().messages({
      'string.min': '顯示名稱不能為空',
      'string.max': '顯示名稱不能超過 50 個字元'
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
  }),
  
  // 抽獎商品管理
  createLotterySet: Joi.object({
    id: Joi.string().pattern(/^[a-zA-Z0-9-]+$/).optional(),
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': '商品標題不能為空',
      'string.max': '商品標題不能超過 200 個字元',
      'any.required': '商品標題為必填項'
    }),
    description: Joi.string().max(2000).optional().allow(''),
    imageUrl: Joi.string().uri().required().messages({
      'string.uri': '圖片 URL 格式無效',
      'any.required': '圖片 URL 為必填項'
    }),
    price: Joi.number().integer().min(0).required().messages({
      'number.base': '價格必須是數字',
      'number.integer': '價格必須是整數',
      'number.min': '價格不能為負數',
      'any.required': '價格為必填項'
    }),
    discountPrice: Joi.number().integer().min(0).optional(),
    totalTickets: Joi.number().integer().min(1).max(10000).required().messages({
      'number.min': '總票數至少為 1',
      'number.max': '總票數不能超過 10000',
      'any.required': '總票數為必填項'
    }),
    prizes: Joi.array().items(Joi.object({
      grade: Joi.string().required(),
      name: Joi.string().required(),
      imageUrl: Joi.string().uri().required(),
      quantity: Joi.number().integer().min(0).required()
    })).min(1).required().messages({
      'array.min': '至少需要一個獎品',
      'any.required': '獎品列表為必填項'
    }),
    categories: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SOLD_OUT').optional()
  }),
  
  // 商城商品管理
  createShopProduct: Joi.object({
    id: Joi.string().optional(),
    title: Joi.string().min(1).max(200).required().messages({
      'any.required': '商品標題為必填項'
    }),
    description: Joi.string().max(2000).optional().allow(''),
    imageUrl: Joi.string().uri().required().messages({
      'string.uri': '圖片 URL 格式無效',
      'any.required': '圖片 URL 為必填項'
    }),
    price: Joi.number().integer().min(0).required(),
    depositPrice: Joi.number().integer().min(0).optional(),
    weight: Joi.number().min(0).optional(),
    allowDirectBuy: Joi.boolean().optional(),
    allowPreorderFull: Joi.boolean().optional(),
    allowPreorderDeposit: Joi.boolean().optional(),
    stockStatus: Joi.string().valid('IN_STOCK', 'PRE_ORDER', 'OUT_OF_STOCK').required()
  }),
  
  // 訂單狀態更新
  updateOrderStatus: Joi.object({
    status: Joi.string().valid(
      'PENDING_PAYMENT',
      'PAID',
      'CONFIRMED',
      'PREPARING',
      'READY_TO_SHIP',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED'
    ).required().messages({
      'any.only': '無效的訂單狀態',
      'any.required': '訂單狀態為必填項'
    })
  }),
  
  // 用戶點數調整
  adjustUserPoints: Joi.object({
    amount: Joi.number().integer().required().messages({
      'number.base': '點數必須是數字',
      'number.integer': '點數必須是整數',
      'any.required': '點數為必填項'
    }),
    reason: Joi.string().max(200).optional().messages({
      'string.max': '原因不能超過 200 個字元'
    })
  }),
  
  // 用戶角色更新
  updateUserRole: Joi.object({
    role: Joi.string().valid('USER', 'ADMIN', 'MODERATOR').required().messages({
      'any.only': '無效的角色',
      'any.required': '角色為必填項'
    })
  }),
  
  // 分類管理
  updateCategories: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().min(1).max(50).required(),
      order: Joi.number().integer().min(0).optional()
    })
  ).min(0).required(),
  
  // 獎品實例更新
  updatePrizeStatus: Joi.object({
    status: Joi.string().valid(
      'IN_INVENTORY',
      'PENDING_SHIPMENT',
      'SHIPPED',
      'DELIVERED',
      'RECYCLED'
    ).required().messages({
      'any.only': '無效的獎品狀態',
      'any.required': '獎品狀態為必填項'
    })
  }),
  
  // ID 驗證（通用）
  mongoId: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).required().messages({
    'string.pattern.base': 'ID 格式無效',
    'any.required': 'ID 為必填項'
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

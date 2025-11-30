/**
 * 敏感數據加密工具
 * 
 * 使用 AES-256-GCM 加密算法
 * 提供認證加密（Authenticated Encryption）
 */

const crypto = require('crypto');

// 加密配置
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,  // 256 bits
  ivLength: 16,   // 128 bits
  saltLength: 64,
  tagLength: 16,
  iterations: 100000,
  digest: 'sha512'
};

/**
 * 數據加密類
 */
class DataEncryption {
  constructor(masterKey) {
    if (!masterKey) {
      throw new Error('Master encryption key is required');
    }
    
    // 從主密鑰派生加密密鑰
    this.masterKey = masterKey;
  }
  
  /**
   * 派生加密密鑰
   * @param {string} salt - 鹽值
   * @returns {Buffer} 派生的密鑰
   */
  deriveKey(salt) {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.digest
    );
  }
  
  /**
   * 加密數據
   * @param {string} plaintext - 明文
   * @returns {Object} 加密結果 { encrypted, iv, authTag, salt }
   */
  encrypt(plaintext) {
    if (!plaintext) {
      return null;
    }
    
    try {
      // 生成隨機鹽值和 IV
      const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      
      // 派生密鑰
      const key = this.deriveKey(salt);
      
      // 創建加密器
      const cipher = crypto.createCipheriv(
        ENCRYPTION_CONFIG.algorithm,
        key,
        iv
      );
      
      // 加密數據
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 獲取認證標籤
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      console.error('[ENCRYPTION] Encrypt error:', error);
      throw new Error('Encryption failed');
    }
  }
  
  /**
   * 解密數據
   * @param {Object} encryptedData - 加密數據對象
   * @returns {string} 明文
   */
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) {
      return null;
    }
    
    try {
      const { encrypted, iv, authTag, salt } = encryptedData;
      
      // 派生密鑰
      const key = this.deriveKey(Buffer.from(salt, 'hex'));
      
      // 創建解密器
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_CONFIG.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );
      
      // 設置認證標籤
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      // 解密數據
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[ENCRYPTION] Decrypt error:', error);
      throw new Error('Decryption failed');
    }
  }
  
  /**
   * 加密對象中的敏感字段
   * @param {Object} obj - 原始對象
   * @param {Array<string>} sensitiveFields - 需要加密的字段列表
   * @returns {Object} 加密後的對象
   */
  encryptObject(obj, sensitiveFields) {
    const encrypted = { ...obj };
    
    for (const field of sensitiveFields) {
      if (obj[field]) {
        const encryptedData = this.encrypt(String(obj[field]));
        
        // 存儲加密數據
        encrypted[`${field}_encrypted`] = encryptedData.encrypted;
        encrypted[`${field}_iv`] = encryptedData.iv;
        encrypted[`${field}_tag`] = encryptedData.authTag;
        encrypted[`${field}_salt`] = encryptedData.salt;
        
        // 刪除明文字段
        delete encrypted[field];
      }
    }
    
    return encrypted;
  }
  
  /**
   * 解密對象中的敏感字段
   * @param {Object} obj - 加密的對象
   * @param {Array<string>} sensitiveFields - 需要解密的字段列表
   * @returns {Object} 解密後的對象
   */
  decryptObject(obj, sensitiveFields) {
    const decrypted = { ...obj };
    
    for (const field of sensitiveFields) {
      if (obj[`${field}_encrypted`]) {
        try {
          const encryptedData = {
            encrypted: obj[`${field}_encrypted`],
            iv: obj[`${field}_iv`],
            authTag: obj[`${field}_tag`],
            salt: obj[`${field}_salt`]
          };
          
          decrypted[field] = this.decrypt(encryptedData);
          
          // 刪除加密字段
          delete decrypted[`${field}_encrypted`];
          delete decrypted[`${field}_iv`];
          delete decrypted[`${field}_tag`];
          delete decrypted[`${field}_salt`];
        } catch (error) {
          console.error(`[ENCRYPTION] Failed to decrypt field: ${field}`, error);
          decrypted[field] = null;
        }
      }
    }
    
    return decrypted;
  }
}

/**
 * 單向哈希（用於不需要解密的敏感數據）
 * @param {string} data - 數據
 * @param {string} salt - 鹽值（可選）
 * @returns {Object} { hash, salt }
 */
function hashData(data, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(32).toString('hex');
  }
  
  const hash = crypto.pbkdf2Sync(
    data,
    salt,
    100000,
    64,
    'sha512'
  ).toString('hex');
  
  return { hash, salt };
}

/**
 * 驗證哈希
 * @param {string} data - 原始數據
 * @param {string} hash - 哈希值
 * @param {string} salt - 鹽值
 * @returns {boolean} 是否匹配
 */
function verifyHash(data, hash, salt) {
  const { hash: computedHash } = hashData(data, salt);
  return computedHash === hash;
}

/**
 * 生成安全的隨機 Token
 * @param {number} length - Token 長度（bytes）
 * @returns {string} Token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 掩碼敏感數據（用於日誌）
 * @param {string} data - 敏感數據
 * @param {Object} options - 選項
 * @returns {string} 掩碼後的數據
 */
function maskSensitiveData(data, options = {}) {
  if (!data) return '';
  
  const {
    type = 'default',
    showFirst = 0,
    showLast = 0,
    maskChar = '*'
  } = options;
  
  const str = String(data);
  
  switch (type) {
    case 'email':
      // example@domain.com -> e****e@domain.com
      const [local, domain] = str.split('@');
      if (!domain) return str;
      return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    
    case 'phone':
      // 0912345678 -> 0912***678
      if (str.length < 6) return str;
      return `${str.slice(0, 4)}${'*'.repeat(str.length - 7)}${str.slice(-3)}`;
    
    case 'card':
      // 1234567890123456 -> 1234 **** **** 3456
      if (str.length < 8) return str;
      return `${str.slice(0, 4)} ${'*'.repeat(4)} ${'*'.repeat(4)} ${str.slice(-4)}`;
    
    case 'address':
      // 只顯示城市
      const parts = str.split(/[,，]/);
      return parts.length > 1 ? `${parts[0]}...` : str.slice(0, 10) + '...';
    
    default:
      // 自定義掩碼
      if (str.length <= showFirst + showLast) return str;
      const masked = maskChar.repeat(str.length - showFirst - showLast);
      return `${str.slice(0, showFirst)}${masked}${str.slice(-showLast)}`;
  }
}

/**
 * 敏感字段配置
 */
const SENSITIVE_FIELDS = {
  user: ['address', 'phone', 'idNumber'],
  order: ['recipientName', 'recipientPhone', 'recipientAddress', 'notes'],
  payment: ['cardNumber', 'cvv', 'accountNumber']
};

/**
 * 中間件：自動加密響應中的敏感數據
 */
function encryptionMiddleware(encryption, sensitiveFields) {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // 如果是敏感端點，加密數據
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          data = data.map(item => 
            encryption.encryptObject(item, sensitiveFields)
          );
        } else {
          data = encryption.encryptObject(data, sensitiveFields);
        }
      }
      
      originalJson.call(this, data);
    };
    
    next();
  };
}

// 創建全局加密實例
let globalEncryption = null;

/**
 * 初始化加密系統
 * @param {string} masterKey - 主密鑰
 */
function initEncryption(masterKey) {
  if (!masterKey) {
    console.warn('[ENCRYPTION] No master key provided, encryption disabled');
    return null;
  }
  
  globalEncryption = new DataEncryption(masterKey);
  console.log('[ENCRYPTION] Encryption system initialized');
  return globalEncryption;
}

/**
 * 獲取加密實例
 */
function getEncryption() {
  if (!globalEncryption) {
    throw new Error('Encryption not initialized. Call initEncryption first.');
  }
  return globalEncryption;
}

module.exports = {
  DataEncryption,
  hashData,
  verifyHash,
  generateSecureToken,
  maskSensitiveData,
  SENSITIVE_FIELDS,
  encryptionMiddleware,
  initEncryption,
  getEncryption
};

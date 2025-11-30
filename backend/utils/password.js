const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * 加密密碼
 * @param {string} password - 明文密碼
 * @returns {Promise<string>} 加密後的密碼 hash
 */
async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('[PASSWORD] Hash error:', error);
    throw new Error('密碼加密失敗');
  }
}

/**
 * 驗證密碼
 * @param {string} password - 明文密碼
 * @param {string} hashedPassword - 加密後的密碼 hash
 * @returns {Promise<boolean>} 密碼是否匹配
 */
async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('[PASSWORD] Verify error:', error);
    return false;
  }
}

/**
 * 檢查密碼是否已加密
 * @param {string} password - 密碼字符串
 * @returns {boolean} 是否為 bcrypt hash
 */
function isHashed(password) {
  // bcrypt hash 以 $2a$, $2b$, 或 $2y$ 開頭
  return /^\$2[aby]\$/.test(password);
}

module.exports = {
  hashPassword,
  verifyPassword,
  isHashed
};

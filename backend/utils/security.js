/**
 * 安全工具模組
 * 包含 IP 白名單檢查、審計日誌、備份機制
 */

const crypto = require('crypto');

/**
 * 檢查 IP 是否在白名單中
 */
function checkIPWhitelist(req) {
  const whitelist = process.env.ADMIN_IP_WHITELIST || '';
  
  // 如果白名單為空，表示不限制
  if (!whitelist || whitelist.trim() === '') {
    return { allowed: true };
  }
  
  const allowedIPs = whitelist.split(',').map(ip => ip.trim());
  
  // 獲取客戶端 IP
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() 
    || req.headers['x-real-ip'] 
    || req.connection.remoteAddress 
    || req.socket.remoteAddress;
  
  const isAllowed = allowedIPs.includes(clientIP);
  
  return {
    allowed: isAllowed,
    clientIP,
    whitelist: allowedIPs
  };
}

/**
 * 記錄審計日誌到 Firestore
 */
async function logAudit(firestore, data) {
  if (process.env.ENABLE_AUDIT_LOG !== 'true') {
    return;
  }
  
  try {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: data.action,
      adminEmail: data.adminEmail,
      adminId: data.adminId,
      targetResource: data.targetResource,
      targetId: data.targetId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      success: data.success,
      errorMessage: data.errorMessage || null,
      metadata: data.metadata || {},
      auditId: crypto.randomBytes(16).toString('hex'),
    };
    
    await firestore.collection('AUDIT_LOGS').add(auditLog);
    console.log('[AUDIT]', auditLog.action, 'by', auditLog.adminEmail, '- Success:', auditLog.success);
  } catch (error) {
    console.error('[AUDIT] Failed to log audit:', error.message);
  }
}

/**
 * 創建備份到 Firestore 的 BACKUPS 集合
 */
async function createBackup(firestore, collectionName, data) {
  if (process.env.ENABLE_AUTO_BACKUP !== 'true') {
    return null;
  }
  
  try {
    const backup = {
      collectionName,
      backupTime: new Date().toISOString(),
      dataCount: Array.isArray(data) ? data.length : 1,
      data: data,
      backupId: crypto.randomBytes(16).toString('hex'),
    };
    
    const backupRef = await firestore.collection('BACKUPS').add(backup);
    console.log('[BACKUP] Created backup:', backupRef.id, 'for', collectionName, '- Items:', backup.dataCount);
    
    return backupRef.id;
  } catch (error) {
    console.error('[BACKUP] Failed to create backup:', error.message);
    return null;
  }
}

/**
 * 驗證確認 token
 */
function validateConfirmToken(providedToken, requiredTokenEnvKey) {
  const requiredToken = process.env[requiredTokenEnvKey];
  
  if (!requiredToken) {
    console.error('[SECURITY] Environment variable not set:', requiredTokenEnvKey);
    return {
      valid: false,
      message: '伺服器配置錯誤：未設定安全 token'
    };
  }
  
  if (providedToken !== requiredToken) {
    return {
      valid: false,
      message: '確認 token 不正確'
    };
  }
  
  return { valid: true };
}

/**
 * 安全中介層 - 檢查 IP 白名單
 */
function requireIPWhitelist(req, res, next) {
  const ipCheck = checkIPWhitelist(req);
  
  if (!ipCheck.allowed) {
    console.warn('[SECURITY] IP not in whitelist:', ipCheck.clientIP);
    return res.status(403).json({
      message: 'IP 地址不在白名單中',
      clientIP: ipCheck.clientIP
    });
  }
  
  next();
}

module.exports = {
  checkIPWhitelist,
  logAudit,
  createBackup,
  validateConfirmToken,
  requireIPWhitelist,
};

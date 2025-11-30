/**
 * Session 安全管理工具
 * 
 * 功能：
 * 1. Session 輪換（防止 Session 固定攻擊）
 * 2. Session 過期管理
 * 3. Session 活動追蹤
 */

const crypto = require('crypto');

// Session 配置
const SESSION_CONFIG = {
  // Session 總過期時間（7 天）
  MAX_AGE: 7 * 24 * 60 * 60 * 1000,
  
  // Session 閒置超時（30 分鐘）
  IDLE_TIMEOUT: 30 * 60 * 1000,
  
  // Session 輪換間隔（15 分鐘）
  ROTATION_INTERVAL: 15 * 60 * 1000,
  
  // 敏感操作後強制輪換
  FORCE_ROTATION_ACTIONS: [
    'login',
    'password_change',
    'role_change',
    'privilege_escalation'
  ]
};

/**
 * 生成安全的 Session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  // 使用 32 bytes (256 bits) 隨機數據
  const randomBytes = crypto.randomBytes(32);
  // 使用 base64url 編碼（URL 安全）
  return randomBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 檢查 Session 是否需要輪換
 * @param {Object} session - Session 對象
 * @returns {boolean} 是否需要輪換
 */
function shouldRotateSession(session) {
  if (!session) return false;
  
  const now = Date.now();
  
  // 檢查是否超過輪換間隔
  const lastRotation = session.lastRotation || session.createdAt;
  const timeSinceRotation = now - lastRotation;
  
  return timeSinceRotation >= SESSION_CONFIG.ROTATION_INTERVAL;
}

/**
 * 檢查 Session 是否過期
 * @param {Object} session - Session 對象
 * @returns {Object} { expired: boolean, reason: string }
 */
function isSessionExpired(session) {
  if (!session) {
    return { expired: true, reason: 'Session 不存在' };
  }
  
  const now = Date.now();
  
  // 檢查總過期時間
  if (session.expiresAt && now >= session.expiresAt) {
    return { expired: true, reason: 'Session 已過期' };
  }
  
  // 檢查閒置超時
  const lastActivity = session.lastActivity || session.createdAt;
  const idleTime = now - lastActivity;
  
  if (idleTime >= SESSION_CONFIG.IDLE_TIMEOUT) {
    return { expired: true, reason: 'Session 閒置超時' };
  }
  
  return { expired: false };
}

/**
 * 輪換 Session ID
 * @param {Object} db - 數據庫實例
 * @param {string} oldSid - 舊 Session ID
 * @param {Object} sessionData - Session 數據
 * @returns {Promise<string>} 新 Session ID
 */
async function rotateSession(db, oldSid, sessionData) {
  try {
    // 生成新的 Session ID
    const newSid = generateSessionId();
    const now = Date.now();
    
    // 創建新 Session（保留用戶數據）
    const newSession = {
      ...sessionData,
      sid: newSid,
      lastRotation: now,
      lastActivity: now,
      rotationCount: (sessionData.rotationCount || 0) + 1,
      previousSid: oldSid  // 記錄舊 Session ID 用於審計
    };
    
    // 保存新 Session
    await db.firestore.collection(db.COLLECTIONS.SESSIONS).doc(newSid).set(newSession);
    
    // 刪除舊 Session（延遲刪除，給予寬限期）
    setTimeout(async () => {
      try {
        await db.firestore.collection(db.COLLECTIONS.SESSIONS).doc(oldSid).delete();
        console.log(`[SESSION] Old session deleted: ${oldSid}`);
      } catch (error) {
        console.error(`[SESSION] Error deleting old session:`, error);
      }
    }, 5000); // 5 秒寬限期
    
    console.log(`[SESSION] Session rotated: ${oldSid} -> ${newSid}`);
    
    return newSid;
  } catch (error) {
    console.error('[SESSION] Rotation error:', error);
    throw error;
  }
}

/**
 * 更新 Session 活動時間
 * @param {Object} db - 數據庫實例
 * @param {string} sid - Session ID
 * @returns {Promise<void>}
 */
async function updateSessionActivity(db, sid) {
  try {
    const sessionRef = db.firestore.collection(db.COLLECTIONS.SESSIONS).doc(sid);
    await sessionRef.update({
      lastActivity: Date.now()
    });
  } catch (error) {
    console.error('[SESSION] Update activity error:', error);
  }
}

/**
 * 清理過期 Session
 * @param {Object} db - 數據庫實例
 * @returns {Promise<number>} 清理的 Session 數量
 */
async function cleanupExpiredSessions(db) {
  try {
    const now = Date.now();
    const cutoffTime = now - SESSION_CONFIG.MAX_AGE;
    
    const snapshot = await db.firestore
      .collection(db.COLLECTIONS.SESSIONS)
      .where('createdAt', '<', cutoffTime)
      .get();
    
    const batch = db.firestore.batch();
    let count = 0;
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`[SESSION] Cleaned up ${count} expired sessions`);
    }
    
    return count;
  } catch (error) {
    console.error('[SESSION] Cleanup error:', error);
    return 0;
  }
}

/**
 * Session 輪換中間件
 * 自動檢查並輪換需要更新的 Session
 */
function sessionRotationMiddleware(db) {
  return async (req, res, next) => {
    try {
      // 獲取當前 Session
      const sid = req.cookies?.session || req.headers.authorization?.substring(7);
      
      if (!sid) {
        return next();
      }
      
      const sessionDoc = await db.firestore.collection(db.COLLECTIONS.SESSIONS).doc(sid).get();
      
      if (!sessionDoc.exists) {
        return next();
      }
      
      const session = sessionDoc.data();
      
      // 檢查是否過期
      const expiredCheck = isSessionExpired(session);
      if (expiredCheck.expired) {
        // 刪除過期 Session
        await db.firestore.collection(db.COLLECTIONS.SESSIONS).doc(sid).delete();
        res.clearCookie('session');
        return res.status(401).json({ message: expiredCheck.reason });
      }
      
      // 更新活動時間
      await updateSessionActivity(db, sid);
      
      // 檢查是否需要輪換
      if (shouldRotateSession(session)) {
        const newSid = await rotateSession(db, sid, session);
        
        // 更新 Cookie
        res.cookie('session', newSid, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: SESSION_CONFIG.MAX_AGE,
          path: '/'
        });
        
        // 通知前端更新 Session ID
        res.setHeader('X-Session-Rotated', 'true');
        res.setHeader('X-New-Session-Id', newSid);
      }
      
      next();
    } catch (error) {
      console.error('[SESSION] Middleware error:', error);
      next();
    }
  };
}

module.exports = {
  SESSION_CONFIG,
  generateSessionId,
  shouldRotateSession,
  isSessionExpired,
  rotateSession,
  updateSessionActivity,
  cleanupExpiredSessions,
  sessionRotationMiddleware
};

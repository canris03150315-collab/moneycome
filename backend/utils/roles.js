/**
 * 三級權限系統
 * 
 * 權限等級：
 * 1. SUPER_ADMIN - 最大權限管理員（超級管理員）
 * 2. ADMIN - 子管理員
 * 3. USER - 一般玩家
 */

// 權限等級定義
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',  // 最大權限管理員
  ADMIN: 'ADMIN',              // 子管理員
  USER: 'USER'                 // 一般玩家
};

// 權限等級（數字越大權限越高）
const ROLE_LEVELS = {
  [ROLES.USER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPER_ADMIN]: 3
};

// 權限顯示名稱
const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: '最大權限管理員',
  [ROLES.ADMIN]: '子管理員',
  [ROLES.USER]: '一般玩家'
};

/**
 * 檢查用戶是否有指定角色
 * @param {Object} user - 用戶對象
 * @param {string} requiredRole - 需要的角色
 * @returns {boolean}
 */
function hasRole(user, requiredRole) {
  if (!user || !user.role) {
    return false;
  }
  
  // 支持舊的 roles 數組格式
  if (Array.isArray(user.roles)) {
    return user.roles.includes(requiredRole);
  }
  
  // 新的單一 role 格式
  return user.role === requiredRole;
}

/**
 * 檢查用戶是否至少有指定等級的權限
 * @param {Object} user - 用戶對象
 * @param {string} requiredRole - 需要的最低角色
 * @returns {boolean}
 */
function hasMinRole(user, requiredRole) {
  if (!user || !user.role) {
    return false;
  }
  
  const userLevel = ROLE_LEVELS[user.role] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * 檢查是否為超級管理員
 * @param {Object} user - 用戶對象
 * @returns {boolean}
 */
function isSuperAdmin(user) {
  return hasRole(user, ROLES.SUPER_ADMIN);
}

/**
 * 檢查是否為管理員（包括超級管理員和子管理員）
 * @param {Object} user - 用戶對象
 * @returns {boolean}
 */
function isAdmin(user) {
  return hasMinRole(user, ROLES.ADMIN);
}

/**
 * 檢查是否為子管理員（不包括超級管理員）
 * @param {Object} user - 用戶對象
 * @returns {boolean}
 */
function isSubAdmin(user) {
  return hasRole(user, ROLES.ADMIN);
}

/**
 * 檢查是否為普通用戶
 * @param {Object} user - 用戶對象
 * @returns {boolean}
 */
function isUser(user) {
  return hasRole(user, ROLES.USER);
}

/**
 * 獲取用戶權限等級
 * @param {Object} user - 用戶對象
 * @returns {number}
 */
function getUserLevel(user) {
  if (!user || !user.role) {
    return 0;
  }
  return ROLE_LEVELS[user.role] || 0;
}

/**
 * 獲取角色顯示名稱
 * @param {string} role - 角色
 * @returns {string}
 */
function getRoleName(role) {
  return ROLE_NAMES[role] || '未知角色';
}

/**
 * 驗證角色是否有效
 * @param {string} role - 角色
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * 權限檢查中間件工廠
 * @param {string} requiredRole - 需要的最低角色
 * @returns {Function} Express 中間件
 */
function requireRole(requiredRole) {
  return async (req, res, next) => {
    try {
      // 獲取 Session
      const sessionId = req.cookies?.session;
      if (!sessionId) {
        return res.status(401).json({ 
          message: '未登入',
          code: 'UNAUTHORIZED'
        });
      }
      
      // 獲取用戶信息（從 req.session 或重新查詢）
      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ 
          message: '無效的 Session',
          code: 'INVALID_SESSION'
        });
      }
      
      // 檢查權限
      if (!hasMinRole(user, requiredRole)) {
        return res.status(403).json({ 
          message: `需要 ${getRoleName(requiredRole)} 或更高權限`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required: getRoleName(requiredRole),
          current: getRoleName(user.role)
        });
      }
      
      next();
    } catch (error) {
      console.error('[ROLE] Permission check error:', error);
      return res.status(500).json({ 
        message: '權限檢查失敗',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * 超級管理員專用中間件
 */
function requireSuperAdmin() {
  return requireRole(ROLES.SUPER_ADMIN);
}

/**
 * 管理員專用中間件（包括超級管理員和子管理員）
 */
function requireAdmin() {
  return requireRole(ROLES.ADMIN);
}

/**
 * 檢查用戶是否可以修改目標用戶
 * @param {Object} currentUser - 當前用戶
 * @param {Object} targetUser - 目標用戶
 * @returns {boolean}
 */
function canModifyUser(currentUser, targetUser) {
  // 超級管理員可以修改所有人
  if (isSuperAdmin(currentUser)) {
    return true;
  }
  
  // 子管理員只能修改普通用戶
  if (isAdmin(currentUser) && isUser(targetUser)) {
    return true;
  }
  
  // 用戶只能修改自己
  if (currentUser.id === targetUser.id) {
    return true;
  }
  
  return false;
}

/**
 * 權限操作日誌
 * @param {Object} user - 操作用戶
 * @param {string} action - 操作
 * @param {Object} details - 詳情
 */
function logRoleAction(user, action, details = {}) {
  console.log('[ROLE]', {
    timestamp: new Date().toISOString(),
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action,
    details
  });
}

module.exports = {
  // 常量
  ROLES,
  ROLE_LEVELS,
  ROLE_NAMES,
  
  // 檢查函數
  hasRole,
  hasMinRole,
  isSuperAdmin,
  isAdmin,
  isSubAdmin,
  isUser,
  getUserLevel,
  getRoleName,
  isValidRole,
  canModifyUser,
  
  // 中間件
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  
  // 工具
  logRoleAction
};

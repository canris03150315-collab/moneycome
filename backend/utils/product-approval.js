/**
 * 商品審核系統
 * 
 * 審核流程：
 * 1. 子管理員創建商品 -> 狀態：PENDING（待審核）
 * 2. 超級管理員審核 -> 狀態：APPROVED（已通過）或 REJECTED（已拒絕）
 * 3. 只有 APPROVED 的商品才會在前端顯示
 */

// 商品審核狀態
const APPROVAL_STATUS = {
  PENDING: 'PENDING',       // 待審核
  APPROVED: 'APPROVED',     // 已通過
  REJECTED: 'REJECTED',     // 已拒絕
  DRAFT: 'DRAFT'           // 草稿
};

// 狀態顯示名稱
const STATUS_NAMES = {
  [APPROVAL_STATUS.PENDING]: '待審核',
  [APPROVAL_STATUS.APPROVED]: '已通過',
  [APPROVAL_STATUS.REJECTED]: '已拒絕',
  [APPROVAL_STATUS.DRAFT]: '草稿'
};

// 狀態顏色（用於前端顯示）
const STATUS_COLORS = {
  [APPROVAL_STATUS.PENDING]: 'warning',
  [APPROVAL_STATUS.APPROVED]: 'success',
  [APPROVAL_STATUS.REJECTED]: 'error',
  [APPROVAL_STATUS.DRAFT]: 'default'
};

/**
 * 創建審核記錄
 * @param {Object} params - 參數
 * @returns {Object} 審核記錄
 */
function createApprovalRecord(params) {
  const {
    productId,
    productType,  // 'LOTTERY' 或 'SHOP'
    createdBy,
    createdByName,
    createdByRole
  } = params;
  
  return {
    status: APPROVAL_STATUS.PENDING,
    createdBy,
    createdByName,
    createdByRole,
    createdAt: Date.now(),
    
    // 審核信息
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    
    // 歷史記錄
    history: [{
      action: 'CREATED',
      status: APPROVAL_STATUS.PENDING,
      userId: createdBy,
      userName: createdByName,
      timestamp: Date.now(),
      note: '商品已創建，等待審核'
    }]
  };
}

/**
 * 審核商品
 * @param {Object} approval - 審核記錄
 * @param {Object} params - 審核參數
 * @returns {Object} 更新後的審核記錄
 */
function approveProduct(approval, params) {
  const {
    reviewerId,
    reviewerName,
    note = ''
  } = params;
  
  const now = Date.now();
  
  return {
    ...approval,
    status: APPROVAL_STATUS.APPROVED,
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
    reviewNote: note,
    history: [
      ...approval.history,
      {
        action: 'APPROVED',
        status: APPROVAL_STATUS.APPROVED,
        userId: reviewerId,
        userName: reviewerName,
        timestamp: now,
        note: note || '商品已通過審核'
      }
    ]
  };
}

/**
 * 拒絕商品
 * @param {Object} approval - 審核記錄
 * @param {Object} params - 審核參數
 * @returns {Object} 更新後的審核記錄
 */
function rejectProduct(approval, params) {
  const {
    reviewerId,
    reviewerName,
    note = ''
  } = params;
  
  const now = Date.now();
  
  return {
    ...approval,
    status: APPROVAL_STATUS.REJECTED,
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
    reviewNote: note,
    history: [
      ...approval.history,
      {
        action: 'REJECTED',
        status: APPROVAL_STATUS.REJECTED,
        userId: reviewerId,
        userName: reviewerName,
        timestamp: now,
        note: note || '商品審核未通過'
      }
    ]
  };
}

/**
 * 重新提交審核
 * @param {Object} approval - 審核記錄
 * @param {Object} params - 參數
 * @returns {Object} 更新後的審核記錄
 */
function resubmitForApproval(approval, params) {
  const {
    userId,
    userName,
    note = ''
  } = params;
  
  const now = Date.now();
  
  return {
    ...approval,
    status: APPROVAL_STATUS.PENDING,
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    history: [
      ...approval.history,
      {
        action: 'RESUBMITTED',
        status: APPROVAL_STATUS.PENDING,
        userId,
        userName,
        timestamp: now,
        note: note || '商品已重新提交審核'
      }
    ]
  };
}

/**
 * 檢查商品是否已通過審核
 * @param {Object} product - 商品對象
 * @returns {boolean}
 */
function isApproved(product) {
  return product.approval?.status === APPROVAL_STATUS.APPROVED;
}

/**
 * 檢查商品是否待審核
 * @param {Object} product - 商品對象
 * @returns {boolean}
 */
function isPending(product) {
  return product.approval?.status === APPROVAL_STATUS.PENDING;
}

/**
 * 檢查商品是否被拒絕
 * @param {Object} product - 商品對象
 * @returns {boolean}
 */
function isRejected(product) {
  return product.approval?.status === APPROVAL_STATUS.REJECTED;
}

/**
 * 獲取狀態顯示名稱
 * @param {string} status - 狀態
 * @returns {string}
 */
function getStatusName(status) {
  return STATUS_NAMES[status] || '未知狀態';
}

/**
 * 獲取狀態顏色
 * @param {string} status - 狀態
 * @returns {string}
 */
function getStatusColor(status) {
  return STATUS_COLORS[status] || 'default';
}

/**
 * 過濾已通過審核的商品（用於前端顯示）
 * @param {Array} products - 商品列表
 * @returns {Array} 已通過審核的商品
 */
function filterApprovedProducts(products) {
  return products.filter(product => isApproved(product));
}

/**
 * 獲取待審核商品數量
 * @param {Array} products - 商品列表
 * @returns {number}
 */
function getPendingCount(products) {
  return products.filter(product => isPending(product)).length;
}

/**
 * 生成審核通知消息
 * @param {Object} product - 商品
 * @param {string} action - 操作
 * @returns {Object} 通知消息
 */
function generateNotification(product, action) {
  const messages = {
    CREATED: {
      title: '新商品待審核',
      message: `商品「${product.title}」已創建，等待審核`,
      type: 'info'
    },
    APPROVED: {
      title: '商品審核通過',
      message: `商品「${product.title}」已通過審核，現已上架`,
      type: 'success'
    },
    REJECTED: {
      title: '商品審核未通過',
      message: `商品「${product.title}」審核未通過：${product.approval?.reviewNote || '無說明'}`,
      type: 'error'
    },
    RESUBMITTED: {
      title: '商品重新提交審核',
      message: `商品「${product.title}」已重新提交審核`,
      type: 'info'
    }
  };
  
  return messages[action] || {
    title: '商品狀態更新',
    message: `商品「${product.title}」狀態已更新`,
    type: 'info'
  };
}

/**
 * 驗證審核權限
 * @param {Object} user - 用戶
 * @param {Object} product - 商品
 * @returns {Object} { canApprove, canReject, canEdit, reason }
 */
function validateApprovalPermission(user, product) {
  const { isSuperAdmin, isAdmin } = require('./roles');
  
  // 超級管理員可以審核所有商品
  if (isSuperAdmin(user)) {
    return {
      canApprove: true,
      canReject: true,
      canEdit: true,
      reason: null
    };
  }
  
  // 子管理員只能編輯自己創建的商品（且未通過審核）
  if (isAdmin(user)) {
    const isOwner = product.approval?.createdBy === user.id;
    const notApproved = !isApproved(product);
    
    return {
      canApprove: false,
      canReject: false,
      canEdit: isOwner && notApproved,
      reason: !isOwner ? '只能編輯自己創建的商品' : 
              isApproved(product) ? '已通過審核的商品無法編輯' : null
    };
  }
  
  // 普通用戶無權限
  return {
    canApprove: false,
    canReject: false,
    canEdit: false,
    reason: '權限不足'
  };
}

module.exports = {
  // 常量
  APPROVAL_STATUS,
  STATUS_NAMES,
  STATUS_COLORS,
  
  // 核心函數
  createApprovalRecord,
  approveProduct,
  rejectProduct,
  resubmitForApproval,
  
  // 檢查函數
  isApproved,
  isPending,
  isRejected,
  
  // 工具函數
  getStatusName,
  getStatusColor,
  filterApprovedProducts,
  getPendingCount,
  generateNotification,
  validateApprovalPermission
};

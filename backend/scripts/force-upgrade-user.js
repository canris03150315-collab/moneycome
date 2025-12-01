/**
 * 強制升級指定用戶為超級管理員
 * 直接使用現有的 db 模組
 */

require('dotenv').config();
const db = require('../db/firestore');
const { ROLES } = require('../utils/roles');

async function forceUpgrade(email) {
  try {
    console.log('[UPGRADE] 開始升級用戶...');
    console.log('[UPGRADE] 目標 Email:', email);
    
    // 方法 1: 通過 email 查找
    console.log('[UPGRADE] 嘗試通過 email 查找...');
    const usersSnapshot = await db.firestore
      .collection('USERS')
      .where('email', '==', email)
      .get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const user = userDoc.data();
      
      console.log('[UPGRADE] ✅ 找到用戶：');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Username:', user.username);
      console.log('  當前角色:', user.role || '未設置');
      
      // 更新為超級管理員
      await userDoc.ref.update({
        role: ROLES.SUPER_ADMIN,
        roles: ['user', ROLES.SUPER_ADMIN],
        updatedAt: Date.now()
      });
      
      console.log('[UPGRADE] ✅ 升級成功！');
      console.log('[UPGRADE] 新角色: SUPER_ADMIN');
      
      process.exit(0);
    }
    
    // 方法 2: 列出所有用戶
    console.log('[UPGRADE] 通過 email 找不到，列出所有用戶...');
    const allUsers = await db.getAllUsers();
    console.log(`[UPGRADE] 找到 ${allUsers.length} 個用戶`);
    
    if (allUsers.length === 0) {
      console.log('[UPGRADE] ⚠️ 數據庫中沒有用戶');
      console.log('[UPGRADE] 用戶可能存儲在記憶體中');
      console.log('[UPGRADE] 請使用 API 端點升級：');
      console.log('[UPGRADE] POST /api/admin/upgrade-me-to-super-admin');
      process.exit(1);
    }
    
    // 顯示所有用戶
    console.log('[UPGRADE] 可用的用戶：');
    allUsers.forEach(user => {
      console.log(`  - Email: ${user.email}, Username: ${user.username}, Role: ${user.role || 'N/A'}`);
    });
    
    // 嘗試通過 email 匹配（不區分大小寫）
    const targetUser = allUsers.find(u => 
      u.email && u.email.toLowerCase() === email.toLowerCase()
    );
    
    if (targetUser) {
      console.log('[UPGRADE] ✅ 找到匹配的用戶:', targetUser.email);
      
      // 直接更新
      await db.updateUser(targetUser.id, {
        role: ROLES.SUPER_ADMIN,
        roles: ['user', ROLES.SUPER_ADMIN],
        updatedAt: Date.now()
      });
      
      console.log('[UPGRADE] ✅ 升級成功！');
      console.log('[UPGRADE] 新角色: SUPER_ADMIN');
      
      process.exit(0);
    }
    
    console.log('[UPGRADE] ❌ 找不到用戶:', email);
    process.exit(1);
    
  } catch (error) {
    console.error('[UPGRADE] ❌ 錯誤:', error);
    console.error('[UPGRADE] 錯誤堆棧:', error.stack);
    process.exit(1);
  }
}

// 執行升級
forceUpgrade('123123@gmail.com');

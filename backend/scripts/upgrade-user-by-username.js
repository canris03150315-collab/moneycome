/**
 * 根據用戶名升級用戶為超級管理員
 * 
 * 使用方法：
 * node scripts/upgrade-user-by-username.js <username>
 * 
 * 例如：
 * node scripts/upgrade-user-by-username.js 1111
 */

require('dotenv').config();
const db = require('../db/firestore');
const { ROLES } = require('../utils/roles');

async function upgradeByUsername(username) {
  try {
    console.log('[UPGRADE] Starting upgrade process...');
    console.log('[UPGRADE] Target username:', username);
    
    // 查找用戶（通過用戶名）
    const usersSnapshot = await db.firestore
      .collection('USERS')
      .where('username', '==', username)
      .get();
    
    if (usersSnapshot.empty) {
      console.error('[UPGRADE] ❌ User not found:', username);
      console.log('[UPGRADE] Trying to list all users...');
      
      // 列出所有用戶
      const allUsers = await db.firestore.collection('USERS').get();
      console.log(`[UPGRADE] Total users in database: ${allUsers.size}`);
      
      if (allUsers.size > 0) {
        console.log('[UPGRADE] Available users:');
        allUsers.forEach(doc => {
          const user = doc.data();
          console.log(`  - Username: ${user.username}, Email: ${user.email}, ID: ${user.id}`);
        });
      }
      
      process.exit(1);
    }
    
    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();
    
    console.log('[UPGRADE] Found user:', {
      id: user.id,
      username: user.username,
      email: user.email,
      currentRole: user.role,
      currentRoles: user.roles
    });
    
    // 檢查是否已經是超級管理員
    if (user.role === ROLES.SUPER_ADMIN) {
      console.log('[UPGRADE] ✅ User is already a SUPER_ADMIN');
      process.exit(0);
    }
    
    // 更新為超級管理員
    await userDoc.ref.update({
      role: ROLES.SUPER_ADMIN,
      roles: ['user', ROLES.SUPER_ADMIN],  // 保留舊格式兼容性
      updatedAt: Date.now()
    });
    
    console.log('[UPGRADE] ✅ User upgraded to SUPER_ADMIN successfully!');
    console.log('[UPGRADE] New role:', ROLES.SUPER_ADMIN);
    
    // 驗證更新
    const updatedDoc = await userDoc.ref.get();
    const updatedUser = updatedDoc.data();
    console.log('[UPGRADE] Verification:', {
      role: updatedUser.role,
      roles: updatedUser.roles
    });
    
    console.log('\n[UPGRADE] ✅ Done! Please logout and login again to see the changes.');
    
    process.exit(0);
  } catch (error) {
    console.error('[UPGRADE] ❌ Error:', error);
    process.exit(1);
  }
}

// 從命令行參數獲取 username
const username = process.argv[2];

if (!username) {
  console.error('Usage: node scripts/upgrade-user-by-username.js <username>');
  console.error('Example: node scripts/upgrade-user-by-username.js 1111');
  process.exit(1);
}

upgradeByUsername(username);

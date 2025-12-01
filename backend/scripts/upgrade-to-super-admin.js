/**
 * 升級現有管理員為超級管理員
 * 
 * 使用方法：
 * node scripts/upgrade-to-super-admin.js <email>
 * 
 * 例如：
 * node scripts/upgrade-to-super-admin.js 123123@gmail.com
 */

require('dotenv').config();
const db = require('../db/firestore');
const { ROLES } = require('../utils/roles');

async function upgradeToSuperAdmin(email) {
  try {
    console.log('[UPGRADE] Starting upgrade process...');
    console.log('[UPGRADE] Target email:', email);
    
    // 查找用戶
    const usersSnapshot = await db.firestore
      .collection('USERS')
      .where('email', '==', email)
      .get();
    
    if (usersSnapshot.empty) {
      console.error('[UPGRADE] ❌ User not found:', email);
      process.exit(1);
    }
    
    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();
    
    console.log('[UPGRADE] Found user:', {
      id: user.id,
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
    
    process.exit(0);
  } catch (error) {
    console.error('[UPGRADE] ❌ Error:', error);
    process.exit(1);
  }
}

// 從命令行參數獲取 email
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/upgrade-to-super-admin.js <email>');
  console.error('Example: node scripts/upgrade-to-super-admin.js 123123@gmail.com');
  process.exit(1);
}

upgradeToSuperAdmin(email);

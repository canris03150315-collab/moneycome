/**
 * 直接升級指定用戶為超級管理員
 * 這個腳本會直接修改數據庫
 */

require('dotenv').config();
const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = require('../goodmoney666-jackpot-firebase-adminsdk-qr2gg-b6a6e5e1e8.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'goodmoney666-jackpot'
});

const db = admin.firestore();

async function upgradeUser(email) {
  try {
    console.log('[UPGRADE] 開始升級用戶...');
    console.log('[UPGRADE] 目標 Email:', email);
    
    // 查找用戶
    const usersRef = db.collection('USERS');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      console.log('[UPGRADE] ❌ 找不到用戶，嘗試列出所有用戶...');
      
      const allUsers = await usersRef.get();
      console.log(`[UPGRADE] 數據庫中共有 ${allUsers.size} 個用戶`);
      
      if (allUsers.size > 0) {
        console.log('[UPGRADE] 可用的用戶：');
        allUsers.forEach(doc => {
          const user = doc.data();
          console.log(`  - Email: ${user.email}, Username: ${user.username}, ID: ${user.id}`);
        });
      } else {
        console.log('[UPGRADE] ⚠️ Firestore 中沒有用戶數據');
        console.log('[UPGRADE] 用戶可能存儲在記憶體中，需要通過 API 升級');
      }
      
      process.exit(1);
    }
    
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    
    console.log('[UPGRADE] ✅ 找到用戶：');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Username:', user.username);
    console.log('  當前角色:', user.role || '未設置');
    console.log('  當前 Roles:', user.roles || '未設置');
    
    // 檢查是否已經是超級管理員
    if (user.role === 'SUPER_ADMIN') {
      console.log('[UPGRADE] ℹ️ 用戶已經是超級管理員');
      process.exit(0);
    }
    
    // 更新為超級管理員
    await userDoc.ref.update({
      role: 'SUPER_ADMIN',
      roles: ['user', 'SUPER_ADMIN'],
      updatedAt: Date.now()
    });
    
    console.log('[UPGRADE] ✅ 升級成功！');
    console.log('[UPGRADE] 新角色: SUPER_ADMIN');
    
    // 驗證更新
    const updatedDoc = await userDoc.ref.get();
    const updatedUser = updatedDoc.data();
    console.log('[UPGRADE] 驗證結果：');
    console.log('  role:', updatedUser.role);
    console.log('  roles:', updatedUser.roles);
    
    console.log('\n[UPGRADE] ✅ 完成！請重新登入以更新權限。');
    
    process.exit(0);
  } catch (error) {
    console.error('[UPGRADE] ❌ 錯誤:', error);
    process.exit(1);
  }
}

// 執行升級
upgradeUser('123123@gmail.com');

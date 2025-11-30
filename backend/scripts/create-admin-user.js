/**
 * 創建管理員測試帳號
 * Email: 123123@gmail.com
 * Password: 123123 (會自動加密)
 * Role: ADMIN
 */

const db = require('../db/firestore');
const { hashPassword } = require('../utils/password');
const crypto = require('crypto');

async function createAdminUser() {
  try {
    console.log('========================================');
    console.log('創建管理員測試帳號...');
    console.log('========================================\n');
    
    const email = '123123@gmail.com';
    const password = '123123';
    const username = '測試管理員';
    
    // 檢查用戶是否已存在
    console.log(`檢查用戶是否存在: ${email}`);
    const existingUser = await db.getUserByEmail(email);
    
    if (existingUser) {
      console.log(`\n⚠️  用戶已存在: ${email}`);
      console.log(`用戶 ID: ${existingUser.id}`);
      console.log(`角色: ${existingUser.roles?.join(', ') || 'N/A'}`);
      console.log(`點數: ${existingUser.points || 0}`);
      
      // 詢問是否更新
      console.log('\n是否要更新此用戶的密碼和角色？');
      console.log('更新中...\n');
      
      // 加密密碼
      const hashedPassword = await hashPassword(password);
      
      // 更新用戶
      await db.updateUser(existingUser.id, {
        password: hashedPassword,
        roles: ['user', 'ADMIN'],
        passwordUpdatedAt: new Date().toISOString()
      });
      
      console.log('✅ 用戶已更新！');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password} (已加密)`);
      console.log(`   角色: user, ADMIN`);
      console.log(`   點數: ${existingUser.points || 0}`);
      
    } else {
      console.log('✅ 用戶不存在，創建新用戶...\n');
      
      // 生成用戶 ID
      const userId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
      console.log(`生成用戶 ID: ${userId}`);
      
      // 加密密碼
      console.log('加密密碼...');
      const hashedPassword = await hashPassword(password);
      console.log('✅ 密碼已加密');
      
      // 創建用戶
      console.log('創建用戶到 Firestore...');
      const user = await db.createUser({
        id: userId,
        email: email,
        username: username,
        password: hashedPassword,
        roles: ['user', 'ADMIN'],
        points: 99999,  // 給予充足的測試點數
        lotteryStats: {},
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });
      
      console.log('\n✅ 管理員帳號創建成功！');
      console.log('========================================');
      console.log('帳號資訊：');
      console.log('========================================');
      console.log(`Email:    ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Username: ${username}`);
      console.log(`角色:     user, ADMIN`);
      console.log(`點數:     99999 P`);
      console.log(`用戶 ID:  ${userId}`);
      console.log('========================================');
    }
    
    console.log('\n✅ 操作完成！');
    console.log('\n您現在可以使用以下帳號登入：');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n此帳號具有管理員權限，可以訪問所有管理功能。');
    
  } catch (error) {
    console.error('\n❌ 創建失敗:', error);
    console.error('錯誤詳情:', error.stack);
    process.exit(1);
  }
}

// 執行創建
console.log('\n🔐 準備創建管理員測試帳號...\n');
createAdminUser().then(() => {
  console.log('\n✅ 所有操作完成！');
  process.exit(0);
});

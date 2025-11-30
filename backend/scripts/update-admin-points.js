/**
 * 更新管理員帳號點數
 */

const db = require('../db/firestore');

async function updateAdminPoints() {
  try {
    const email = '123123@gmail.com';
    const points = 99999;
    
    console.log(`更新 ${email} 的點數為 ${points} P...`);
    
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      console.error('❌ 用戶不存在');
      process.exit(1);
    }
    
    await db.updateUser(user.id, { points: points });
    
    console.log('✅ 點數更新成功！');
    console.log(`   Email: ${email}`);
    console.log(`   點數: ${points} P`);
    
  } catch (error) {
    console.error('❌ 更新失敗:', error);
    process.exit(1);
  }
}

updateAdminPoints().then(() => process.exit(0));

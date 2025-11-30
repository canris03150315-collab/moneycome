/**
 * 密碼遷移腳本
 * 將所有明文密碼轉換為 bcrypt hash
 */

const db = require('../db/firestore');
const { hashPassword, isHashed } = require('../utils/password');

async function migratePasswords() {
  try {
    console.log('========================================');
    console.log('開始遷移密碼...');
    console.log('========================================\n');
    
    // 獲取所有用戶
    const usersSnapshot = await db.firestore.collection('USERS').get();
    
    console.log(`找到 ${usersSnapshot.docs.length} 個用戶\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const userId = doc.id;
      
      try {
        // 檢查密碼是否已加密
        if (isHashed(user.password)) {
          console.log(`⏭️  跳過 ${user.email} - 密碼已加密`);
          skippedCount++;
          continue;
        }
        
        console.log(`🔄 遷移 ${user.email}...`);
        
        // 加密密碼
        const hashedPassword = await hashPassword(user.password);
        
        // 更新用戶
        await db.firestore.collection('USERS').doc(userId).update({
          password: hashedPassword,
          passwordMigratedAt: new Date().toISOString()
        });
        
        console.log(`✅ 完成 ${user.email}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ 錯誤 ${user.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n========================================');
    console.log('遷移完成！');
    console.log('========================================');
    console.log(`✅ 成功遷移: ${migratedCount} 個用戶`);
    console.log(`⏭️  已跳過: ${skippedCount} 個用戶`);
    console.log(`❌ 失敗: ${errorCount} 個用戶`);
    console.log('========================================\n');
    
    if (errorCount > 0) {
      console.warn('⚠️  警告：部分用戶遷移失敗，請檢查錯誤日誌');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 遷移失敗:', error);
    console.error('錯誤詳情:', error.stack);
    process.exit(1);
  }
}

// 執行遷移
console.log('\n⚠️  警告：此腳本將修改所有用戶的密碼');
console.log('請確保已備份數據庫！\n');

// 5 秒倒計時
let countdown = 5;
const countdownInterval = setInterval(() => {
  console.log(`開始遷移倒計時: ${countdown} 秒...`);
  countdown--;
  
  if (countdown < 0) {
    clearInterval(countdownInterval);
    console.log('\n開始遷移...\n');
    migratePasswords().then(() => {
      console.log('✅ 所有操作完成！');
      process.exit(0);
    });
  }
}, 1000);

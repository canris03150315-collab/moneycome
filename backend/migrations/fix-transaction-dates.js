/**
 * 數據遷移腳本：修復交易記錄的日期字段
 * 
 * 問題：舊的交易記錄只有 createdAt 字段，缺少 date 字段
 * 解決：將所有交易記錄的 createdAt 複製到 date 字段
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { firestore, COLLECTIONS } = require('../db/firestore');

async function fixTransactionDates() {
  console.log('🔧 開始修復交易記錄日期...\n');
  
  try {
    // 獲取所有交易記錄
    console.log('📊 正在獲取所有交易記錄...');
    const snapshot = await firestore.collection(COLLECTIONS.TRANSACTIONS).get();
    
    const totalTransactions = snapshot.size;
    console.log(`✅ 找到 ${totalTransactions} 筆交易記錄\n`);
    
    if (totalTransactions === 0) {
      console.log('ℹ️  沒有交易記錄需要修復');
      return;
    }
    
    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 批量處理
    const batch = firestore.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore 批量寫入限制
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // 檢查是否需要修復
      if (data.date) {
        // 已經有 date 字段，跳過
        skippedCount++;
        continue;
      }
      
      if (!data.createdAt) {
        // 沒有 createdAt 字段，無法修復
        console.warn(`⚠️  交易 ${doc.id} 缺少 createdAt 字段，無法修復`);
        errorCount++;
        continue;
      }
      
      // 添加 date 字段
      batch.update(doc.ref, {
        date: data.createdAt
      });
      
      fixedCount++;
      batchCount++;
      
      // 達到批量限制時提交
      if (batchCount >= BATCH_SIZE) {
        console.log(`📝 提交批量更新 (${fixedCount} 筆)...`);
        await batch.commit();
        batchCount = 0;
      }
    }
    
    // 提交剩餘的更新
    if (batchCount > 0) {
      console.log(`📝 提交最後批量更新 (${fixedCount} 筆)...`);
      await batch.commit();
    }
    
    // 顯示結果
    console.log('\n✅ 修復完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 總交易記錄數：${totalTransactions}`);
    console.log(`✅ 已修復：${fixedCount} 筆`);
    console.log(`⏭️  已跳過（已有日期）：${skippedCount} 筆`);
    console.log(`❌ 錯誤（無法修復）：${errorCount} 筆`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 驗證修復結果
    console.log('🔍 驗證修復結果...');
    const verifySnapshot = await firestore.collection(COLLECTIONS.TRANSACTIONS)
      .where('date', '==', null)
      .get();
    
    const missingDateCount = verifySnapshot.size;
    if (missingDateCount === 0) {
      console.log('✅ 驗證通過：所有交易記錄都有日期字段！\n');
    } else {
      console.log(`⚠️  仍有 ${missingDateCount} 筆交易記錄缺少日期字段\n`);
    }
    
  } catch (error) {
    console.error('❌ 修復過程中發生錯誤：', error);
    throw error;
  }
}

// 執行腳本
if (require.main === module) {
  fixTransactionDates()
    .then(() => {
      console.log('🎉 腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 腳本執行失敗：', error);
      process.exit(1);
    });
}

module.exports = { fixTransactionDates };

/**
 * 清除所有抽獎相關數據（商品、訂單、獎品實例、抽獎狀態）
 * 保留用戶數據和交易記錄
 */

const { firestore, COLLECTIONS } = require('./db/firestore');

async function clearCollection(collectionName) {
  console.log(`\n[清除] 開始清除 ${collectionName}...`);
  
  const snapshot = await firestore.collection(collectionName).get();
  const count = snapshot.size;
  
  if (count === 0) {
    console.log(`[清除] ${collectionName} 已經是空的`);
    return;
  }
  
  console.log(`[清除] 找到 ${count} 筆資料`);
  
  const batch = firestore.batch();
  let batchCount = 0;
  let totalDeleted = 0;
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount++;
    
    // Firestore batch 限制 500 個操作
    if (batchCount >= 500) {
      await batch.commit();
      totalDeleted += batchCount;
      console.log(`[清除] 已刪除 ${totalDeleted}/${count} 筆`);
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    totalDeleted += batchCount;
  }
  
  console.log(`[清除] ✅ ${collectionName} 清除完成！共刪除 ${totalDeleted} 筆`);
}

async function main() {
  console.log('========================================');
  console.log('清除抽獎相關數據');
  console.log('========================================');
  console.log('⚠️  這將刪除：');
  console.log('  - 所有抽獎商品 (lotterySets)');
  console.log('  - 所有訂單 (orders)');
  console.log('  - 所有獎品實例 (prizeInstances)');
  console.log('  - 所有隊列 (queues)');
  console.log('  - 所有票鎖 (ticketLocks)');
  console.log('');
  console.log('✅ 保留：');
  console.log('  - 用戶數據 (users)');
  console.log('  - 交易記錄 (transactions)');
  console.log('  - 商城商品 (shopProducts)');
  console.log('========================================\n');
  
  try {
    // 清除抽獎商品
    await clearCollection(COLLECTIONS.LOTTERY_SETS);
    
    // 清除訂單
    await clearCollection(COLLECTIONS.ORDERS);
    
    // 清除獎品實例
    await clearCollection(COLLECTIONS.PRIZES);
    
    // 清除隊列
    await clearCollection(COLLECTIONS.QUEUES);
    
    // 清除票鎖
    await clearCollection(COLLECTIONS.LOCKS);
    
    console.log('\n========================================');
    console.log('✅ 所有抽獎數據已清除完成！');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ 清除失敗:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

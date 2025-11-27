// 清空所有測試資料的腳本
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'goodmoney666-jackpot'
});

async function clearAllData() {
  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🧹 清空所有測試資料                  ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log('⚠️  警告：此操作將刪除以下資料：');
    console.log('   - 所有商城商品 (shopProducts)');
    console.log('   - 所有商城訂單 (shopOrders)');
    console.log('   - 所有抽獎賞品實例 (prizeInstances)');
    console.log('   - 所有抽獎集 (lotterySets)');
    console.log('   - 所有訂單 (orders)');
    console.log('   - 所有出貨記錄 (shipments)');
    console.log('   - 所有自取記錄 (pickupRequests)');
    console.log('   - 所有交易記錄 (transactions)');
    console.log('\n⚠️  用戶資料 (users) 和 Sessions 將保留\n');
    
    console.log('請在 10 秒內按 Ctrl+C 取消...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const collectionsToClean = [
      'shopProducts',
      'shopOrders',
      'prizeInstances',
      'lotterySets',
      'orders',
      'shipments',
      'pickupRequests',
      'transactions'
    ];
    
    for (const collectionName of collectionsToClean) {
      console.log(`\n🗑️  清空 ${collectionName}...`);
      
      const snapshot = await db.collection(collectionName).get();
      console.log(`   找到 ${snapshot.size} 筆資料`);
      
      if (snapshot.size === 0) {
        console.log('   ✓ 已經是空的');
        continue;
      }
      
      // 批次刪除
      const batchSize = 500;
      let deletedCount = 0;
      
      while (true) {
        const batch = db.batch();
        const docs = await db.collection(collectionName).limit(batchSize).get();
        
        if (docs.size === 0) break;
        
        docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deletedCount += docs.size;
        console.log(`   已刪除 ${deletedCount} 筆...`);
        
        if (docs.size < batchSize) break;
      }
      
      console.log(`   ✅ 完成！共刪除 ${deletedCount} 筆資料`);
    }
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ 所有測試資料已清空完成！          ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log('📋 保留的資料：');
    console.log('   ✓ 用戶帳號 (users)');
    console.log('   ✓ 登入 Sessions (sessions)');
    console.log('   ✓ 網站設定 (siteConfig)\n');
    
    console.log('🎉 網站已準備好交付給雇主！\n');
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

clearAllData();

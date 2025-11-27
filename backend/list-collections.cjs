// 列出所有 Firestore 集合
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'goodmoney666-jackpot'
});

async function listCollections() {
  try {
    console.log('=== 列出所有 Firestore 集合 ===\n');
    
    const collections = await db.listCollections();
    
    console.log(`找到 ${collections.length} 個集合：\n`);
    
    for (const collection of collections) {
      console.log(`📁 ${collection.id}`);
      
      // 獲取每個集合的文檔數量
      const snapshot = await collection.limit(1).get();
      const count = snapshot.size;
      
      if (count > 0) {
        const fullSnapshot = await collection.get();
        console.log(`   文檔數量: ${fullSnapshot.size}`);
        
        // 如果集合名稱包含 "order" 或 "shop"，顯示第一個文檔
        if (collection.id.toLowerCase().includes('order') || 
            collection.id.toLowerCase().includes('shop')) {
          const firstDoc = fullSnapshot.docs[0];
          console.log(`   第一個文檔 ID: ${firstDoc.id}`);
          console.log(`   第一個文檔數據:`, JSON.stringify(firstDoc.data(), null, 2));
        }
      } else {
        console.log(`   文檔數量: 0 (空集合)`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

listCollections();

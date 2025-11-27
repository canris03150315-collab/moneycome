// 調試腳本：檢查 Firestore 中的商城訂單數據
const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = require('./backend/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugShopOrders() {
  try {
    console.log('=== 檢查所有商城訂單 ===\n');
    
    const snapshot = await db.collection('shop_orders')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ 沒有找到任何商城訂單');
      return;
    }
    
    console.log(`✅ 找到 ${snapshot.size} 筆訂單\n`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`--- 訂單 ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`用戶ID: ${data.userId}`);
      console.log(`商品: ${data.productTitle}`);
      console.log(`類型: ${data.type}`);
      console.log(`狀態: ${data.status}`);
      console.log(`付款狀態: ${data.payment}`);
      console.log(`canFinalize: ${data.canFinalize}`);
      console.log(`總金額: ${data.totalPoints} P`);
      console.log(`已付金額: ${data.paidPoints} P`);
      console.log(`創建時間: ${data.createdAt}`);
      console.log(`更新時間: ${data.updatedAt}`);
      console.log('');
    });
    
    // 特別檢查訂金預購訂單
    console.log('\n=== 檢查訂金預購訂單 ===\n');
    const depositOrders = await db.collection('shop_orders')
      .where('type', '==', 'PREORDER_DEPOSIT')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (depositOrders.empty) {
      console.log('❌ 沒有找到訂金預購訂單');
    } else {
      console.log(`✅ 找到 ${depositOrders.size} 筆訂金預購訂單\n`);
      depositOrders.forEach((doc, index) => {
        const data = doc.data();
        console.log(`--- 訂金預購訂單 ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`狀態: ${data.status}`);
        console.log(`付款狀態: ${data.payment}`);
        console.log(`canFinalize: ${data.canFinalize}`);
        console.log(`已付/總額: ${data.paidPoints}/${data.totalPoints} P`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

debugShopOrders();

// 測試 /auth/session API 返回的數據
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'goodmoney666-jackpot'
});

async function testSessionAPI() {
  try {
    console.log('=== 模擬 /auth/session API 調用 ===\n');
    
    // 模擬獲取用戶的商城訂單（就像 server-firestore.js 中的邏輯）
    const userId = '590c391161242820'; // 測試達人的 ID
    
    console.log(`查詢用戶 ${userId} 的商城訂單...\n`);
    
    const snapshot = await db.collection('shopOrders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const shopOrders = snapshot.docs.map(doc => doc.data());
    
    console.log(`✅ 找到 ${shopOrders.length} 筆訂單\n`);
    
    if (shopOrders.length > 0) {
      console.log('前 3 筆訂單：\n');
      shopOrders.slice(0, 3).forEach((order, index) => {
        console.log(`訂單 ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  類型: ${order.type}`);
        console.log(`  狀態: ${order.status}`);
        console.log(`  付款: ${order.payment}`);
        console.log(`  canFinalize: ${order.canFinalize}`);
        console.log('');
      });
      
      // 檢查 JSON 序列化後的大小
      const jsonString = JSON.stringify(shopOrders);
      const sizeKB = (jsonString.length / 1024).toFixed(2);
      console.log(`JSON 大小: ${sizeKB} KB`);
      
      // 檢查是否有任何字段是 undefined
      console.log('\n檢查字段完整性：');
      const firstOrder = shopOrders[0];
      const requiredFields = ['id', 'userId', 'type', 'status', 'payment', 'totalPoints', 'paidPoints'];
      requiredFields.forEach(field => {
        const value = firstOrder[field];
        console.log(`  ${field}: ${value !== undefined ? '✅' : '❌ 缺失'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

testSessionAPI();

// 直接查詢 Firestore 中的商城訂單
const { Firestore } = require('@google-cloud/firestore');

// 使用 Google Cloud 默認認證（需要先執行 gcloud auth application-default login）
const db = new Firestore({
  projectId: 'goodmoney666-jackpot'
});

async function debugOrders() {
  try {
    console.log('=== 檢查 Firestore 商城訂單 ===\n');
    
    // 1. 查詢所有商城訂單
    const allOrders = await db.collection('shopOrders')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`找到 ${allOrders.size} 筆訂單\n`);
    
    if (allOrders.empty) {
      console.log('❌ 數據庫中沒有任何商城訂單！');
      process.exit(0);
      return;
    }
    
    // 2. 顯示每筆訂單的詳細資訊
    allOrders.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- 訂單 ${index + 1} ---`);
      console.log(`文檔 ID (Firestore): ${doc.id}`);
      console.log(`訂單 ID (data.id): ${data.id || '❌ 缺少 id 字段'}`);
      console.log(`用戶 ID: ${data.userId}`);
      console.log(`用戶名: ${data.username}`);
      console.log(`商品: ${data.productTitle}`);
      console.log(`類型: ${data.type}`);
      console.log(`狀態: ${data.status}`);
      console.log(`付款狀態: ${data.payment}`);
      console.log(`canFinalize: ${data.canFinalize !== undefined ? data.canFinalize : '❌ 未設置'}`);
      console.log(`總金額: ${data.totalPoints} P`);
      console.log(`已付: ${data.paidPoints} P`);
      console.log(`尾款: ${data.totalPoints - data.paidPoints} P`);
      console.log(`創建時間: ${data.createdAt}`);
      console.log(`更新時間: ${data.updatedAt || '未設置'}`);
      
      // 檢查關鍵字段
      const missingFields = [];
      if (!data.id) missingFields.push('id');
      if (!data.userId) missingFields.push('userId');
      if (!data.type) missingFields.push('type');
      if (!data.status) missingFields.push('status');
      if (!data.payment) missingFields.push('payment');
      
      if (missingFields.length > 0) {
        console.log(`⚠️ 缺少字段: ${missingFields.join(', ')}`);
      }
    });
    
    // 3. 特別檢查訂金預購訂單
    console.log('\n\n=== 訂金預購訂單分析 ===\n');
    const depositOrders = await db.collection('shopOrders')
      .where('type', '==', 'PREORDER_DEPOSIT')
      .get();
    
    console.log(`找到 ${depositOrders.size} 筆訂金預購訂單\n`);
    
    depositOrders.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n訂金預購 ${index + 1}:`);
      console.log(`  ID: ${data.id}`);
      console.log(`  狀態: ${data.status}`);
      console.log(`  付款: ${data.payment}`);
      console.log(`  canFinalize: ${data.canFinalize} ${data.canFinalize ? '✅' : '❌'}`);
      console.log(`  尾款: ${data.totalPoints - data.paidPoints} P`);
      
      // 判斷是否應該顯示補款按鈕
      const shouldShowButton = data.type === 'PREORDER_DEPOSIT' && 
                               data.canFinalize && 
                               data.payment !== 'PAID';
      console.log(`  應顯示補款按鈕: ${shouldShowButton ? '✅ 是' : '❌ 否'}`);
      
      if (!shouldShowButton) {
        console.log(`  原因: ${!data.canFinalize ? 'canFinalize 為 false' : data.payment === 'PAID' ? '已付款' : '未知'}`);
      }
    });
    
    // 4. 查詢特定用戶的訂單（測試達人）
    console.log('\n\n=== 查詢測試達人的訂單 ===\n');
    const userOrders = await db.collection('shopOrders')
      .where('username', '==', '測試達人')
      .get();
    
    console.log(`測試達人有 ${userOrders.size} 筆訂單\n`);
    
    if (userOrders.size === 0) {
      console.log('❌ 測試達人沒有任何商城訂單！');
    } else {
      userOrders.forEach((doc, index) => {
        const data = doc.data();
        console.log(`訂單 ${index + 1}: ${data.productTitle} - ${data.type} - ${data.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

debugOrders();

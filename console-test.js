// 在瀏覽器 Console 中執行此腳本來測試商城訂單 API
// 請先登入網站，然後在 Console 中貼上並執行

(async function testShopOrders() {
    console.log('=== 開始測試商城訂單 API ===\n');
    
    try {
        // 測試 /auth/session
        console.log('📡 正在調用 /auth/session...');
        const response = await fetch('/api/auth/session', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('❌ API 請求失敗:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        
        console.log('\n✅ API 請求成功！\n');
        console.log('用戶:', data.user?.username);
        console.log('點數:', data.user?.points);
        console.log('\n--- 商城訂單數據 ---');
        console.log('訂單數量:', data.shopOrders?.length || 0);
        
        if (data.shopOrders && data.shopOrders.length > 0) {
            console.log('\n📦 訂單詳情：\n');
            data.shopOrders.forEach((order, index) => {
                console.log(`\n訂單 ${index + 1}:`);
                console.log('  ID:', order.id);
                console.log('  商品:', order.productTitle);
                console.log('  類型:', order.type);
                console.log('  狀態:', order.status);
                console.log('  付款狀態:', order.payment);
                console.log('  canFinalize:', order.canFinalize);
                console.log('  總金額:', order.totalPoints, 'P');
                console.log('  已付金額:', order.paidPoints, 'P');
                console.log('  創建時間:', order.createdAt);
                console.log('  更新時間:', order.updatedAt);
            });
            
            // 特別檢查訂金預購訂單
            const depositOrders = data.shopOrders.filter(o => o.type === 'PREORDER_DEPOSIT');
            if (depositOrders.length > 0) {
                console.log('\n\n🎯 訂金預購訂單分析：');
                depositOrders.forEach((order, index) => {
                    console.log(`\n訂金預購 ${index + 1}:`);
                    console.log('  狀態:', order.status);
                    console.log('  付款狀態:', order.payment);
                    console.log('  canFinalize:', order.canFinalize, order.canFinalize ? '✅ 可補款' : '❌ 不可補款');
                    console.log('  尾款:', (order.totalPoints - order.paidPoints), 'P');
                });
            }
        } else {
            console.log('\n⚠️ 沒有找到任何商城訂單');
        }
        
        // 輸出完整 JSON 供複製
        console.log('\n\n--- 完整 shopOrders JSON ---');
        console.log(JSON.stringify(data.shopOrders, null, 2));
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
})();

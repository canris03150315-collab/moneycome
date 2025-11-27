// 在瀏覽器 Console 中執行此腳本來檢查前端狀態
// 請在會員中心的商城訂單頁面執行

console.log('=== 檢查前端 Zustand Store 狀態 ===\n');

// 嘗試訪問 Zustand store
try {
    // 方法 1: 直接從 window 訪問（如果有暴露）
    if (window.useAuthStore) {
        const state = window.useAuthStore.getState();
        console.log('✅ 找到 useAuthStore');
        console.log('shopOrders:', state.shopOrders);
        console.log('shopOrders 數量:', state.shopOrders?.length || 0);
        console.log('currentUser:', state.currentUser?.username);
        console.log('isAuthenticated:', state.isAuthenticated);
    } else {
        console.log('⚠️ window.useAuthStore 不存在');
    }
    
    // 方法 2: 檢查 React DevTools
    console.log('\n--- React 組件狀態 ---');
    console.log('請使用 React DevTools 檢查 ProfilePage 組件的 props:');
    console.log('1. 打開 React DevTools');
    console.log('2. 選擇 ProfilePage 組件');
    console.log('3. 查看 shopOrders prop');
    
    // 方法 3: 檢查 localStorage
    console.log('\n--- localStorage 檢查 ---');
    const sessionId = localStorage.getItem('sessionId');
    console.log('sessionId:', sessionId ? '存在' : '不存在');
    
    // 方法 4: 手動調用 API
    console.log('\n--- 手動調用 API ---');
    fetch('/api/auth/session', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            console.log('API 返回的 shopOrders 數量:', data.shopOrders?.length || 0);
            console.log('API 返回的 shopOrders:', data.shopOrders);
            
            // 比較前端狀態和 API 返回
            if (window.useAuthStore) {
                const frontendOrders = window.useAuthStore.getState().shopOrders;
                console.log('\n🔍 狀態比較：');
                console.log('前端 shopOrders 數量:', frontendOrders?.length || 0);
                console.log('API 返回數量:', data.shopOrders?.length || 0);
                
                if ((frontendOrders?.length || 0) !== (data.shopOrders?.length || 0)) {
                    console.log('❌ 前端和後端數據不一致！');
                } else {
                    console.log('✅ 前端和後端數據一致');
                }
            }
        })
        .catch(err => console.error('API 調用失敗:', err));
    
} catch (error) {
    console.error('❌ 檢查失敗:', error);
}

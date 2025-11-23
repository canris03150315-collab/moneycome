# 儲值功能診斷測試

## 🔍 請在瀏覽器 Console 執行以下測試

### 步驟 1：打開 Console
1. 訪問：https://ichiban-frontend-248630813908.us-central1.run.app
2. 按 F12 打開 DevTools
3. 切換到 Console 標籤

### 步驟 2：確認登入狀態
```javascript
// 檢查 sessionId
const sessionId = localStorage.getItem('sessionId');
console.log('SessionId:', sessionId);

// 如果 sessionId 存在，繼續
if (sessionId) {
    console.log('✅ SessionId exists');
} else {
    console.log('❌ No sessionId - Please login first');
}
```

### 步驟 3：手動測試儲值 API
```javascript
// 手動調用儲值 API
async function testRecharge() {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
        console.error('❌ No sessionId found');
        return;
    }
    
    console.log('[TEST] Starting recharge test...');
    console.log('[TEST] SessionId:', sessionId);
    
    try {
        const response = await fetch('https://ichiban-frontend-248630813908.us-central1.run.app/api/user/recharge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionId}`
            },
            credentials: 'include',
            body: JSON.stringify({
                packageId: 'TEST_1000',
                amount: 1000
            })
        });
        
        console.log('[TEST] Response status:', response.status);
        console.log('[TEST] Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[TEST] ❌ Response not OK');
            console.error('[TEST] Status:', response.status);
            console.error('[TEST] Error text:', errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                console.error('[TEST] Error JSON:', errorJson);
            } catch (e) {
                console.error('[TEST] Could not parse error as JSON');
            }
            
            return;
        }
        
        const data = await response.json();
        console.log('[TEST] ✅ Success!');
        console.log('[TEST] Response data:', data);
        console.log('[TEST] New points:', data.user?.points);
        
    } catch (error) {
        console.error('[TEST] ❌ Exception caught:', error);
        console.error('[TEST] Error message:', error.message);
        console.error('[TEST] Error stack:', error.stack);
    }
}

// 執行測試
testRecharge();
```

### 步驟 4：檢查 Network 請求
1. 切換到 DevTools 的 Network 標籤
2. 點擊「儲值點數」按鈕
3. 選擇方案並點擊「前往付款」
4. 在 Network 標籤中找到 `user/recharge` 請求
5. 檢查：
   - **Status Code**（應該是 200）
   - **Request Headers** → 確認 `Authorization: Bearer ...` 存在
   - **Request Payload** → 確認 `amount` 和 `packageId` 存在
   - **Response** → 查看錯誤訊息

## 🐛 可能的錯誤原因

### 錯誤 1：401 Unauthorized
```
原因：Session 無效或過期
解決：重新登入
```

### 錯誤 2：400 Bad Request
```
原因：請求參數錯誤
解決：檢查 amount 是否為有效數字
```

### 錯誤 3：500 Internal Server Error
```
原因：後端內部錯誤
解決：檢查後端 Cloud Run 日誌
```

### 錯誤 4：CORS 錯誤
```
原因：跨域請求被阻擋
解決：確認 proxy 配置正確
```

### 錯誤 5：Network Error
```
原因：網絡連接問題
解決：檢查網絡連接
```

## 📋 請報告以下信息

執行上述測試後，請提供：

1. **步驟 2 的結果**
   - sessionId 是否存在？

2. **步驟 3 的結果**
   - Response status: ???
   - 是否成功？
   - 錯誤訊息（如果有）

3. **步驟 4 的結果**
   - Status Code: ???
   - Authorization header: 存在/不存在
   - Request Payload: {...}
   - Response: {...}

4. **原始錯誤彈窗的完整文字**
   - 您看到的「儲值失敗」彈窗內容是什麼？

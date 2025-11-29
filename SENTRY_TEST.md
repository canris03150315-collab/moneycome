# 🐛 Sentry 測試指南

## ✅ Sentry 已成功配置！

**DSN**: `https://4477a3f39bb37ff12b08bde0d2cda43c@o4510446997536768.ingest.us.sentry.io/4510447006121984`  
**部署版本**: `ichiban-frontend-00254-87f`  
**狀態**: 🟢 已啟用

---

## 🧪 測試 Sentry 是否正常運作

### **方法 1: 在瀏覽器 Console 測試**

1. 打開你的網站: https://ichiban-frontend-72rputdqmq-uc.a.run.app
2. 打開瀏覽器開發者工具 (F12)
3. 在 Console 輸入以下代碼：

```javascript
// 測試錯誤捕獲
throw new Error('Sentry 測試錯誤 - 這是故意的！');
```

4. 前往 Sentry Dashboard 查看: https://sentry.io/
5. 應該會在幾秒內看到這個錯誤報告

---

### **方法 2: 創建測試按鈕（推薦）**

在任何頁面添加一個測試按鈕：

```typescript
import { logError } from '../utils/sentry';

// 在組件中添加
<button onClick={() => {
  try {
    throw new Error('Sentry 功能測試');
  } catch (error) {
    logError(error as Error, {
      testType: 'manual',
      timestamp: new Date().toISOString()
    });
    alert('錯誤已發送到 Sentry！請檢查 Dashboard');
  }
}}>
  測試 Sentry
</button>
```

---

### **方法 3: 觸發真實錯誤**

1. 在程式中故意製造一個錯誤
2. 例如：訪問不存在的 API 端點
3. 或者：在 React 組件中訪問 undefined 的屬性

```typescript
// 例如在某個組件中
const data = undefined;
console.log(data.someProperty); // 這會觸發錯誤
```

---

## 📊 Sentry Dashboard 使用

### **查看錯誤**
1. 前往: https://sentry.io/organizations/[your-org]/issues/
2. 你會看到所有捕獲的錯誤列表
3. 點擊任何錯誤查看詳細資訊

### **錯誤詳情包含**
- ✅ 錯誤訊息和堆疊追蹤
- ✅ 發生時間
- ✅ 瀏覽器和作業系統資訊
- ✅ 用戶資訊（如果有設置）
- ✅ 錯誤發生的 URL
- ✅ Session Replay（如果有錄製）

---

## 🎯 實際使用場景

### **1. 用戶登入時設置用戶資訊**

```typescript
// 在 AuthPage.tsx 或登入成功後
import { setUser } from '../utils/sentry';

// 登入成功後
setUser({
  id: user.id,
  email: user.email,
  username: user.username
});
```

### **2. 用戶登出時清除資訊**

```typescript
// 在登出時
import { clearUser } from '../utils/sentry';

clearUser();
```

### **3. 手動記錄錯誤**

```typescript
import { logError, logMessage } from '../utils/sentry';

// 記錄錯誤
try {
  await someRiskyOperation();
} catch (error) {
  logError(error as Error, {
    operation: 'someRiskyOperation',
    userId: user.id
  });
}

// 記錄訊息
logMessage('用戶完成了重要操作', 'info');
```

---

## 🔔 通知設置

### **設置 Email 通知**
1. 前往 Sentry > Settings > Notifications
2. 啟用 "Issue Alerts"
3. 選擇通知頻率（建議：立即通知新錯誤）

### **設置 Slack 通知（可選）**
1. 前往 Sentry > Settings > Integrations
2. 搜索 "Slack"
3. 連接你的 Slack workspace
4. 選擇要接收通知的頻道

---

## 📈 監控指標

### **重要指標**
- **錯誤數量**: 每天/每週的錯誤總數
- **影響用戶數**: 有多少用戶遇到錯誤
- **錯誤率**: 錯誤發生的百分比
- **解決時間**: 從發現到修復的時間

### **查看方式**
1. Sentry Dashboard > Stats
2. 可以看到趨勢圖和統計數據

---

## 🎨 最佳實踐

### **1. 添加上下文資訊**
```typescript
logError(error, {
  component: 'LotteryPage',
  action: 'draw',
  lotteryId: lottery.id,
  userPoints: user.points
});
```

### **2. 設置錯誤邊界**
```typescript
// 在 App.tsx 或主要組件
import * as Sentry from "@sentry/react";

const App = Sentry.withErrorBoundary(YourApp, {
  fallback: <ErrorFallbackComponent />,
  showDialog: true,
});
```

### **3. 過濾不重要的錯誤**
已在 `utils/sentry.ts` 配置：
- 瀏覽器擴展錯誤
- 第三方腳本錯誤
- 非錯誤的 Promise rejection

---

## ⚠️ 注意事項

### **隱私保護**
- ✅ 已配置自動移除敏感 URL 參數（token, password）
- ✅ Session Replay 已遮罩所有文字和媒體
- ✅ 只在生產環境啟用

### **配額管理**
- 免費版：每月 5,000 個錯誤
- 試用期：14 天完整功能
- 建議：設置錯誤過濾，避免重複錯誤消耗配額

### **性能影響**
- Sentry SDK 非常輕量
- 不會影響用戶體驗
- 錯誤上傳是異步的

---

## 🚀 快速檢查清單

- [x] Sentry DSN 已配置
- [x] 前端已重新部署
- [ ] 測試錯誤捕獲（執行上面的測試）
- [ ] 檢查 Sentry Dashboard 是否收到錯誤
- [ ] 設置 Email 通知
- [ ] 在登入/登出時設置用戶資訊

---

## 📞 相關連結

- **Sentry Dashboard**: https://sentry.io/
- **專案設置**: https://sentry.io/settings/
- **文檔**: https://docs.sentry.io/platforms/javascript/guides/react/

---

## 💡 小提示

如果測試時沒看到錯誤：
1. 確認瀏覽器 Console 沒有阻擋請求
2. 檢查網路連線
3. 等待 1-2 分鐘（有時會有延遲）
4. 刷新 Sentry Dashboard

---

**Sentry 現在已經在保護你的應用了！** 🛡️✨

每當有錯誤發生，你都會立即知道，並能快速修復！

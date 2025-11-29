# 🐛 觸發 Sentry 錯誤的方法

## 方法 1: 使用 Sentry 的測試功能

在 Console 輸入：

```javascript
Sentry.captureException(new Error("This is your first error!"));
```

這會直接發送錯誤到 Sentry。

---

## 方法 2: 創建一個會崩潰的操作

在 Console 輸入：

```javascript
// 訪問不存在的對象
const obj = null;
obj.someProperty;
```

---

## 方法 3: 強制觸發錯誤

在 Console 輸入：

```javascript
setTimeout(() => {
  throw new Error("Sentry Test Error - " + new Date().toISOString());
}, 100);
```

---

## 方法 4: 使用 Sentry 的手動捕獲

```javascript
try {
  throw new Error("Manual test error for Sentry");
} catch (error) {
  Sentry.captureException(error);
  console.log("Error sent to Sentry!");
}
```

---

## 🎯 推薦方法

**最簡單且保證有效的方式：**

```javascript
Sentry.captureMessage("Test message from console", "error");
```

這會立即發送一條測試訊息到 Sentry Dashboard。

---

## 📝 檢查步驟

1. 在 Console 輸入上述任一代碼
2. 等待 5-10 秒
3. 前往 Sentry Dashboard: https://sentry.io/
4. 點擊 "Issues"
5. 應該會看到新的錯誤

---

## ⚠️ 如果還是看不到

可能的原因：
1. Sentry 初始化失敗（檢查 Console 是否有 `[Sentry] 已初始化`）
2. DSN 配置錯誤
3. 網路問題

解決方法：
```javascript
// 檢查 Sentry 是否已載入
console.log("Sentry loaded:", typeof Sentry !== 'undefined');

// 檢查 DSN
console.log("Sentry DSN:", Sentry.getCurrentHub().getClient()?.getDsn());
```

# Google 登入設定指南

## 📋 前置準備

### 1. 在 Google Cloud Console 創建 OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇或創建一個專案
3. 啟用 **Google+ API**
4. 前往 **APIs & Services** > **Credentials**
5. 點擊 **Create Credentials** > **OAuth client ID**
6. 選擇 **Web application**
7. 設定名稱（例如：Ichiban Frontend）
8. 添加授權的 JavaScript 來源：
   - `http://localhost:5173` (開發環境)
   - `https://ichiban-frontend-248630813908.us-central1.run.app` (生產環境)
9. 添加授權的重定向 URI：
   - `http://localhost:5173` (開發環境)
   - `https://ichiban-frontend-248630813908.us-central1.run.app` (生產環境)
10. 點擊 **Create**
11. 複製 **Client ID**

---

## 🔧 後端設定

### 1. 安裝依賴

```bash
cd backend
npm install
```

### 2. 設定環境變數

在 `backend/.env` 文件中添加：

```env
GOOGLE_CLIENT_ID=你的-google-client-id.apps.googleusercontent.com
```

### 3. 部署後端

```bash
# 設定 Google Cloud 環境變數
gcloud run services update ichiban-backend \
  --update-env-vars GOOGLE_CLIENT_ID=你的-google-client-id.apps.googleusercontent.com \
  --region us-central1 \
  --project goodmoney666-jackpot

# 或者重新部署
cd backend
gcloud run deploy ichiban-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project goodmoney666-jackpot
```

---

## 🎨 前端設定

### 1. 設定環境變數

在根目錄創建 `.env` 文件：

```env
VITE_GOOGLE_CLIENT_ID=你的-google-client-id.apps.googleusercontent.com
```

### 2. 部署前端

```bash
gcloud run deploy ichiban-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project goodmoney666-jackpot \
  --update-env-vars VITE_GOOGLE_CLIENT_ID=你的-google-client-id.apps.googleusercontent.com
```

---

## ✅ 測試

1. 前往登入頁面
2. 點擊「使用 Google 帳號」按鈕
3. 選擇 Google 帳號
4. 授權應用程式
5. 自動登入並跳轉到首頁

---

## 🔍 功能說明

### 自動註冊

- 首次使用 Google 登入的用戶會自動創建帳號
- 使用 Google 的姓名作為用戶名
- 使用 Google 的頭像作為個人頭像
- 初始點數為 0

### 帳號綁定

- 如果 Email 已存在（之前用密碼註冊），會自動綁定 Google 帳號
- 綁定後可以用 Google 或密碼登入

### 安全性

- 使用 Google OAuth 2.0
- 後端驗證 Google ID Token
- Session 管理與密碼登入相同

---

## 🐛 故障排除

### 問題：點擊按鈕沒反應

**解決方案：**
- 檢查瀏覽器控制台是否有錯誤
- 確認 Google Client ID 已正確設定
- 確認 `https://accounts.google.com/gsi/client` 腳本已載入

### 問題：登入失敗

**解決方案：**
- 檢查後端環境變數 `GOOGLE_CLIENT_ID` 是否正確
- 確認 Google Cloud Console 中的授權來源包含當前網域
- 查看後端日誌：`gcloud run logs read ichiban-backend --limit 50`

### 問題：帳號已存在

**解決方案：**
- 這是正常的，系統會自動綁定 Google 帳號到現有帳號
- 之後可以用 Google 或密碼登入

---

## 📝 注意事項

1. **Client ID 不同**：前端和後端使用相同的 Client ID
2. **測試環境**：在 localhost 測試時，確保 Google Console 中已添加 `http://localhost:5173`
3. **HTTPS 要求**：生產環境必須使用 HTTPS
4. **隱私政策**：如果應用公開，需要在 Google Cloud Console 設定隱私政策連結

---

## 🎉 完成！

現在用戶可以使用 Google 帳號快速登入了！

# Cloudinary 圖片上傳設定指南

## 📋 步驟 1: 註冊 Cloudinary 帳號

1. 前往 https://cloudinary.com/users/register/free
2. 填寫資料註冊免費帳號
3. 驗證 Email

---

## 🔧 步驟 2: 獲取配置資訊

登入後，在 Dashboard 頁面可以看到：

- **Cloud Name**: 你的雲端名稱（例如：`dxxxxx`）
- **API Key**: API 金鑰
- **API Secret**: API 密鑰（不需要用於前端）

---

## ⚙️ 步驟 3: 創建 Upload Preset

1. 前往 **Settings** > **Upload**
2. 滾動到 **Upload presets** 區域
3. 點擊 **Add upload preset**
4. 設定：
   - **Preset name**: `ichiban_images`（或任何你喜歡的名稱）
   - **Signing Mode**: 選擇 **Unsigned**（重要！）
   - **Folder**: `ichiban` （可選，用於組織圖片）
5. 點擊 **Save**

---

## 📝 步驟 4: 更新代碼

將以下資訊提供給我，我會更新代碼：

```
Cloud Name: [你的 Cloud Name]
Upload Preset: [你創建的 Preset 名稱，例如 ichiban_images]
```

---

## ✅ 免費方案限制

Cloudinary 免費方案包含：
- ✅ 25 GB 儲存空間
- ✅ 25 GB 每月流量
- ✅ 圖片優化和轉換
- ✅ CDN 加速
- ✅ 無限上傳次數

---

## 🎯 優勢

相比 ImgBB：
- ✅ 更穩定可靠
- ✅ 免費額度更大
- ✅ 自動圖片優化
- ✅ 全球 CDN
- ✅ 支援圖片轉換（調整大小、裁剪等）

---

## 📞 完成後

請將你的 **Cloud Name** 和 **Upload Preset** 名稱告訴我，我會更新代碼！

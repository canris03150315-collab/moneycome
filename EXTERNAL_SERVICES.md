# 外部服務清單

本專案使用的所有外部服務及其配置資訊。

---

## 🔐 認證服務

### Google OAuth 2.0
**用途**: 使用者 Google 帳號登入

**配置位置**:
- 前端: `components/AuthPage.tsx`
- 後端: `backend/server-firestore.js`
- 環境變數: `backend/.env`

**設定資訊**:
```
專案: goodmoney666-jackpot
Client ID: 248630813908-jjcv5u6b94aevmn0v0tn932htmg7ekd1.apps.googleusercontent.com
OAuth Client Name: Ichiban Frontend
```

**Authorized JavaScript Origins**:
- `http://localhost:5173`
- `https://ichiban-frontend-248630813908.us-central1.run.app`

**Authorized Redirect URIs**:
- `http://localhost:5173`
- `https://ichiban-frontend-248630813908.us-central1.run.app`

**管理位置**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=goodmoney666-jackpot)

**相關文件**: `GOOGLE_LOGIN_SETUP.md`

---

## 🗄️ 資料庫服務

### Firebase Firestore
**用途**: NoSQL 資料庫，儲存用戶資料、抽獎記錄、隊列等

**配置位置**:
- 後端: `backend/db/firestore.js`
- 環境變數: `backend/.env`

**設定資訊**:
```
專案 ID: goodmoney666-jackpot
服務帳號: backend/serviceAccountKey.json
```

**Collections**:
- `users` - 用戶資料
- `drawnTicketIndices` - 已抽獎票券索引
- `queues` - 抽獎隊列
- `sessions` - 用戶會話

**管理位置**: [Firebase Console](https://console.firebase.google.com/project/goodmoney666-jackpot)

---

## 🖼️ 圖片儲存服務

### Cloudinary
**用途**: 圖片上傳、儲存、優化和 CDN 加速

**配置位置**:
- 前端: `utils/imageUpload.ts`

**設定資訊**:
```
Cloud Name: dh1ixurn2
Upload Preset: ichiban_unsigned
Folder: ichiban
Signing Mode: Unsigned
Preset ID: b3979904-0678-4274-a069-0b999192e3e3
```

**使用方式**:
```typescript
import { uploadImageToImgBB } from '../utils/imageUpload';
const imageUrl = await uploadImageToImgBB(file);
```

**圖片 URL 格式**:
```
https://res.cloudinary.com/dh1ixurn2/image/upload/ichiban/[圖片ID]
```

**免費額度**:
- 25 GB 儲存空間
- 25 GB/月 流量
- 無限次上傳

**管理位置**: [Cloudinary Console](https://console.cloudinary.com/)

**相關文件**: `CLOUDINARY_SETUP.md`

---

## ☁️ 部署服務

### Google Cloud Run
**用途**: 容器化應用部署（前端 + 後端）

**前端服務**:
```
服務名稱: ichiban-frontend
區域: us-central1
URL: https://ichiban-frontend-248630813908.us-central1.run.app
專案: goodmoney666-jackpot
```

**後端服務**:
```
服務名稱: ichiban-backend
區域: us-central1
URL: https://ichiban-backend-248630813908.us-central1.run.app
專案: goodmoney666-jackpot
```

**部署指令**:
```bash
# 前端
gcloud run deploy ichiban-frontend --source . --region us-central1 --allow-unauthenticated --project goodmoney666-jackpot

# 後端
cd backend
gcloud run deploy ichiban-backend --source . --region us-central1 --allow-unauthenticated --project goodmoney666-jackpot
```

**管理位置**: [Cloud Run Console](https://console.cloud.google.com/run?project=goodmoney666-jackpot)

---

## 📦 套件管理

### npm (Node Package Manager)
**用途**: JavaScript 套件管理

**主要依賴**:

**前端** (`package.json`):
- `react` - UI 框架
- `react-router-dom` - 路由管理
- `zustand` - 狀態管理
- `tailwindcss` - CSS 框架

**後端** (`backend/package.json`):
- `express` - Web 框架
- `@google-cloud/firestore` - Firestore SDK
- `google-auth-library` - Google OAuth 驗證
- `cookie-parser` - Cookie 解析
- `compression` - 回應壓縮

---

## 🔧 開發工具

### Vite
**用途**: 前端建置工具

**配置位置**: `vite.config.ts`

**環境變數**:
- `.env` - 前端環境變數
- `backend/.env` - 後端環境變數

---

## 📝 環境變數清單

### 前端 (`.env`)
```env
VITE_GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932htmg7ekd1.apps.googleusercontent.com
VITE_API_URL=https://ichiban-backend-248630813908.us-central1.run.app
```

### 後端 (`backend/.env`)
```env
# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Google OAuth
GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932htmg7ekd1.apps.googleusercontent.com

# Server
PORT=8080
NODE_ENV=production
```

---

## 🔒 安全注意事項

### 需要保密的檔案
- ❌ `backend/serviceAccountKey.json` - Firebase 服務帳號金鑰
- ❌ `backend/.env` - 後端環境變數
- ❌ `.env` - 前端環境變數（部署時）

### 已加入 .gitignore
```
backend/serviceAccountKey.json
backend/.env
.env
```

### 公開的資訊
- ✅ Google Client ID（前端使用，可公開）
- ✅ Cloudinary Cloud Name（可公開）
- ✅ Cloudinary Upload Preset（Unsigned 模式，可公開）

---

## 📊 服務狀態監控

### 檢查服務狀態
```bash
# 前端
curl https://ichiban-frontend-248630813908.us-central1.run.app

# 後端
curl https://ichiban-backend-248630813908.us-central1.run.app/api/health

# Cloudinary
curl https://res.cloudinary.com/dhflixurn2/image/list.json
```

---

## 🆘 故障排除

### Google OAuth 錯誤
- 檢查 Authorized JavaScript Origins 和 Redirect URIs
- 確認 Client ID 正確
- 查看 `GOOGLE_LOGIN_SETUP.md`

### Cloudinary 上傳失敗
- 檢查 Cloud Name 和 Upload Preset
- 確認圖片大小 < 10MB
- 查看 `CLOUDINARY_SETUP.md`

### Firestore 連線錯誤
- 檢查 `serviceAccountKey.json` 是否存在
- 確認環境變數 `GOOGLE_APPLICATION_CREDENTIALS` 正確
- 檢查 Firebase 專案權限

---

## 📞 聯絡資訊

**專案負責人**: canris03150315@gmail.com

**相關文件**:
- `README.md` - 專案說明
- `GOOGLE_LOGIN_SETUP.md` - Google 登入設定
- `CLOUDINARY_SETUP.md` - Cloudinary 設定

---

**最後更新**: 2025-11-26

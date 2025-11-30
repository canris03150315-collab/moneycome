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
Client ID: 248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com
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
VITE_GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com
VITE_API_URL=https://ichiban-backend-248630813908.us-central1.run.app
```

### 後端 (`backend/.env`)
```env
# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Google OAuth
GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com

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

## 🐛 錯誤監控服務

### Sentry
**用途**: 即時錯誤追蹤、性能監控、Session Replay

**配置位置**:
- 前端: `utils/sentry.ts`
- 初始化: `index.tsx`
- 環境變數: `.env.production`

**設定資訊**:
```
組織: 個人帳號
專案: React
DSN: https://4477a3f39bb37ff12b08bde0d2cda43c@o4510446997536768.ingest.us.sentry.io/4510447006121984
```

**功能**:
- ✅ 自動錯誤捕獲
- ✅ Session Replay（錯誤時錄製）
- ✅ 性能追蹤
- ✅ 用戶資訊追蹤
- ✅ 自動移除敏感資訊（token, password）

**使用方式**:
```typescript
import { logError, setUser, clearUser } from '../utils/sentry';

// 記錄錯誤
logError(error, { context: 'additional info' });

// 設置用戶（登入時）
setUser({ id: user.id, email: user.email });

// 清除用戶（登出時）
clearUser();
```

**免費額度**:
- 5,000 個錯誤/月
- 試用期 14 天（完整功能）
- Session Replay: 10% 正常 session + 100% 錯誤 session

**管理位置**: [Sentry Dashboard](https://sentry.io/)

**相關文件**: 
- `SENTRY_TEST.md` - Sentry 測試指南
- `SENTRY_QUICK_TEST.md` - 快速測試
- `SENTRY_TRIGGER_ERROR.md` - 觸發錯誤方法

---

## 📦 圖片處理服務

### browser-image-compression
**用途**: 客戶端圖片壓縮

**配置位置**:
- 前端: `utils/imageUpload.ts`

**壓縮設定**:
```typescript
{
  maxSizeMB: 1,              // 最大 1MB
  maxWidthOrHeight: 1920,    // 最大寬度/高度
  useWebWorker: true,        // 使用 Web Worker
  fileType: 'image/jpeg',    // 輸出格式
  initialQuality: 0.8        // 初始品質 80%
}
```

**效果**:
- 壓縮率: 70-85%
- 原始 5MB → 壓縮後 0.8MB

**npm 套件**: `browser-image-compression@^2.x`

---

## 🛡️ API 安全服務

### express-rate-limit
**用途**: API 請求頻率限制，防止濫用和 DDoS

**配置位置**:
- 後端: `backend/middleware/rateLimiter.js`
- 應用: `backend/server-firestore.js`

**限制等級**:

1. **一般限制** (`generalLimiter`)
   - 每 15 分鐘 100 個請求
   - 應用範圍: 所有 `/api/*` 端點

2. **嚴格限制** (`strictLimiter`)
   - 每 15 分鐘 5 個請求
   - 應用範圍: 登入、註冊、密碼重置

3. **抽獎限制** (`drawLimiter`)
   - 每分鐘 10 次抽獎
   - 管理員不受限制

4. **上傳限制** (`uploadLimiter`)
   - 每小時 20 次上傳

**回應格式**:
```json
{
  "success": false,
  "message": "請求過於頻繁，請稍後再試"
}
```

**HTTP Headers**:
```
RateLimit-Limit: 100
RateLimit-Remaining: 50
RateLimit-Reset: 1638360000
```

**npm 套件**: `express-rate-limit@^7.x`

---

## 🔧 開發工具服務

### Logger 工具
**用途**: 環境感知的日誌管理

**配置位置**:
- 工具: `utils/logger.ts`
- 類型定義: `vite-env.d.ts`

**功能**:
- 開發環境: 顯示所有日誌
- 生產環境: 只顯示 error 和 warn

**使用方式**:
```typescript
import { logger } from '../utils/logger';

logger.log('開發環境才顯示');
logger.info('資訊訊息');
logger.debug('除錯訊息');
logger.warn('警告訊息');  // 所有環境
logger.error('錯誤訊息'); // 所有環境
```

**效益**:
- 生產環境日誌量減少 80-90%
- 不洩漏敏感資訊
- 開發時保留完整除錯資訊

---

## 📞 聯絡資訊

**專案負責人**: canris03150315@gmail.com

**相關文件**:
- `README.md` - 專案說明
- `GOOGLE_LOGIN_SETUP.md` - Google 登入設定
- `CLOUDINARY_SETUP.md` - Cloudinary 設定
- `OPTIMIZATION_PHASE1_COMPLETE.md` - 優化報告
- `QUICK_REFERENCE.md` - 快速參考指南

---

## 🆕 新增服務清單 (2025-11-29)

### 優化第一階段新增服務
1. **Sentry** - 錯誤監控 ✅
2. **browser-image-compression** - 圖片壓縮 ✅
3. **express-rate-limit** - API 頻率限制 ✅
4. **Logger 工具** - 日誌管理 ✅

### 部署資訊
- 前端版本: `ichiban-frontend-00256-94m`
- 後端版本: `ichiban-backend-new-00156-dn8`
- Git Commit: `a578d9a`

---

**最後更新**: 2025-11-29

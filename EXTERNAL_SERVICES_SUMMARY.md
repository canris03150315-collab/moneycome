# 📋 外部服務快速摘要

快速查看所有外部服務的關鍵資訊。

---

## 🔐 認證與安全

| 服務 | 用途 | 關鍵資訊 |
|------|------|----------|
| **Google OAuth 2.0** | Google 登入 | Client ID: `248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1` |
| **express-rate-limit** | API 頻率限制 | 4 種等級：一般/嚴格/抽獎/上傳 |

---

## 🗄️ 資料儲存

| 服務 | 用途 | 關鍵資訊 |
|------|------|----------|
| **Firebase Firestore** | NoSQL 資料庫 | 專案: `goodmoney666-jackpot` |
| **Cloudinary** | 圖片儲存 CDN | Cloud Name: `dh1ixurn2` |

---

## 🐛 監控與除錯

| 服務 | 用途 | 關鍵資訊 |
|------|------|----------|
| **Sentry** | 錯誤監控 | 5,000 錯誤/月，Session Replay |
| **Logger 工具** | 日誌管理 | 生產環境只顯示 error/warn |

---

## 📦 圖片處理

| 服務 | 用途 | 效果 |
|------|------|------|
| **browser-image-compression** | 客戶端壓縮 | 壓縮率 70-85%，最大 1MB |

---

## ☁️ 部署服務

| 服務 | 區域 | URL |
|------|------|-----|
| **前端 Cloud Run** | us-central1 | `ichiban-frontend-72rputdqmq-uc.a.run.app` |
| **後端 Cloud Run** | us-central1 | `ichiban-backend-new-248630813908.us-central1.run.app` |

---

## 🔑 環境變數速查

### 前端 `.env.production`
```env
VITE_GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com
VITE_API_URL=https://ichiban-backend-new-248630813908.us-central1.run.app
VITE_SENTRY_DSN=https://4477a3f39bb37ff12b08bde0d2cda43c@o4510446997536768.ingest.us.sentry.io/4510447006121984
```

### 後端 `backend/.env`
```env
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com
PORT=8080
NODE_ENV=production
```

---

## 📊 服務狀態快速檢查

```bash
# 前端健康檢查
curl https://ichiban-frontend-72rputdqmq-uc.a.run.app

# 後端健康檢查
curl https://ichiban-backend-new-248630813908.us-central1.run.app/api/health

# Sentry 狀態
# 前往 https://sentry.io/ 查看 Dashboard
```

---

## 🔒 需要保密的資訊

❌ **絕對不能公開**:
- `backend/serviceAccountKey.json` - Firebase 金鑰
- `backend/.env` - 後端環境變數
- Sentry DSN（已在 `.env.production`）

✅ **可以公開**:
- Google Client ID（前端使用）
- Cloudinary Cloud Name 和 Upload Preset
- Cloud Run URL

---

## 🆘 常見問題快速解決

| 問題 | 解決方案 |
|------|----------|
| **CORS 錯誤** | 檢查 `backend/server-firestore.js` 的 `ALLOWED_ORIGINS` |
| **Google 登入失敗** | 檢查 Authorized Origins 和 Redirect URIs |
| **圖片上傳失敗** | 檢查 Cloudinary 設定和圖片大小 |
| **Sentry 沒收到錯誤** | 檢查 DSN 配置和初始化 |
| **API 請求被限制** | 等待限制時間過期或調整頻率 |

---

## 📞 快速連結

| 服務 | 管理介面 |
|------|----------|
| **Google Cloud** | https://console.cloud.google.com/run?project=goodmoney666-jackpot |
| **Firebase** | https://console.firebase.google.com/project/goodmoney666-jackpot |
| **Cloudinary** | https://console.cloudinary.com/ |
| **Sentry** | https://sentry.io/ |
| **GitHub** | https://github.com/canris03150315-collab/moneycome |

---

## 📈 服務使用統計

### 當前版本
- 前端: `ichiban-frontend-00256-94m`
- 後端: `ichiban-backend-new-00156-dn8`
- Git: `e0ff82b`

### 優化效果
- 圖片載入速度: ⬆️ **70-85%**
- 日誌量: ⬇️ **80-90%**
- 錯誤發現: ⚡ **即時**
- API 安全: 🛡️ **大幅提升**

---

**詳細資訊請查看**: `EXTERNAL_SERVICES.md`

**最後更新**: 2025-11-29

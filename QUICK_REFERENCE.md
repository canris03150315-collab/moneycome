# 🚀 快速參考指南

## 📋 常用命令

### **開發**
```bash
# 前端開發
npm run dev

# 後端開發
cd backend
npm run start:firestore
```

### **部署**
```bash
# 提交代碼
git add -A
git commit -m "描述"
git push origin feature/firestore-migration

# 部署前端和後端
gcloud builds submit --config=cloudbuild.yaml .

# 切換流量到最新版本
gcloud run services update-traffic ichiban-frontend --to-latest --region us-central1
gcloud run services update-traffic ichiban-backend-new --to-latest --region us-central1
```

---

## 🔧 新增工具使用

### **Logger**
```typescript
import { logger } from '../utils/logger';

logger.log('開發環境才顯示');
logger.error('所有環境都顯示');
logger.warn('警告訊息');
```

### **Sentry 錯誤監控**
```typescript
import { logError, setUser } from '../utils/sentry';

// 記錄錯誤
logError(error, { context: 'additional info' });

// 設置用戶（登入時）
setUser({ id: user.id, email: user.email });
```

### **圖片壓縮**
```typescript
import { uploadImageToImgBB } from '../utils/imageUpload';

// 自動壓縮並上傳
const imageUrl = await uploadImageToImgBB(file);
```

---

## 🛡️ API 頻率限制

| 端點 | 限制 | 時間窗口 |
|------|------|---------|
| 所有 API | 100 次 | 15 分鐘 |
| 登入/註冊 | 5 次 | 15 分鐘 |
| 抽獎 | 10 次 | 1 分鐘 |
| 上傳 | 20 次 | 1 小時 |

---

## 📊 監控 Dashboard

- **Sentry**: https://sentry.io/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Cloudinary**: https://cloudinary.com/console

---

## 🔑 環境變數

### **前端 (.env.production)**
```bash
VITE_API_BASE_URL=https://ichiban-backend-new-248630813908.us-central1.run.app
VITE_API_PREFIX=/api
VITE_SENTRY_DSN=your-sentry-dsn-here  # 需要配置
```

### **後端 (backend/.env)**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
PORT=8080
```

---

## 🐛 除錯技巧

### **前端除錯**
```typescript
// 開發環境查看詳細日誌
logger.log('Debug:', data);

// 檢查 Sentry 是否運作
throw new Error('Test error');
```

### **後端除錯**
```bash
# 查看 Cloud Run 日誌
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ichiban-backend-new" --limit 50 --format json
```

---

## 📦 已安裝套件

### **前端**
- `@sentry/react` - 錯誤監控
- `browser-image-compression` - 圖片壓縮
- `react-image-crop` - 圖片裁切

### **後端**
- `express-rate-limit` - API 頻率限制
- `@google-cloud/firestore` - 資料庫
- `compression` - 回應壓縮

---

## 🎯 下一步優化建議

### **高優先級**
1. 註冊並配置 Sentry DSN
2. 測試頻率限制
3. 監控圖片壓縮效果

### **中優先級**
1. 添加代碼分割
2. 實作 ESLint
3. 優化 Firestore 索引

### **低優先級**
1. 添加單元測試
2. 實作 PWA
3. 整合 Analytics

---

## 📞 緊急處理

### **網站掛了**
```bash
# 1. 檢查服務狀態
gcloud run services describe ichiban-frontend --region us-central1
gcloud run services describe ichiban-backend-new --region us-central1

# 2. 查看錯誤日誌
gcloud logging read --limit 50

# 3. 回滾到上一個版本
gcloud run services update-traffic ichiban-frontend --to-revisions=PREVIOUS_REVISION=100 --region us-central1
```

### **API 被攻擊**
```bash
# 檢查頻率限制是否生效
# 查看日誌中的 429 錯誤
gcloud logging read "httpRequest.status=429" --limit 50
```

---

## 💡 最佳實踐

### **提交代碼前**
1. ✅ 測試功能是否正常
2. ✅ 檢查是否有 console.log（應該用 logger）
3. ✅ 確認沒有敏感資訊

### **部署前**
1. ✅ 確認 Git 已提交
2. ✅ 檢查環境變數
3. ✅ 準備回滾計畫

### **部署後**
1. ✅ 測試主要功能
2. ✅ 檢查 Sentry Dashboard
3. ✅ 監控錯誤日誌

---

**最後更新**: 2025-11-29  
**當前版本**: 
- 前端: `ichiban-frontend-00253-rf2`
- 後端: `ichiban-backend-new-00155-hj8`

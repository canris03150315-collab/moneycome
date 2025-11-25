# 🚀 一番賞系統部署指南

本文件記錄前後端的部署位置、部署方式與相關配置，供後續維護人員參考。

---

## 📋 專案概覽

- **專案名稱**: 一番賞抽獎系統 (Ichiban Kuji System)
- **GCP 專案 ID**: `goodmoney666-jackpot` (Project Number: `248630813908`)
- **主要技術棧**:
  - 前端: React + Vite + TypeScript + TailwindCSS
  - 後端: Node.js + Express + Firestore
  - 部署平台: Google Cloud Run

---

## 🌐 線上服務 URL

### 後端 API
- **服務名稱**: `ichiban-backend-new`
- **URL**: `https://ichiban-backend-new-248630813908.us-central1.run.app`
- **區域**: `us-central1`
- **當前版本**: `ichiban-backend-new-00070-mfc` (2025-11-24)
- **平台**: Cloud Run (Managed)
- **資源配置**:
  - Memory: 512Mi
  - Timeout: 300s
  - 允許未驗證訪問

### 前端應用
- **服務名稱**: `ichiban-frontend`
- **URL**: `https://ichiban-frontend-248630813908.us-central1.run.app`
- **區域**: `us-central1`
- **平台**: Cloud Run (Managed)
- **容器映像**: `us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-frontend/ichiban-frontend:latest`
- **資源配置**:
  - Memory: 512Mi
  - CPU: 1
  - Port: 8080
  - Max Instances: 5

---

## 📁 專案目錄結構

```
copy-of-11-8號-還未開始做後端/
├── backend/                    # 後端程式碼
│   ├── server-firestore.js    # Firestore 版本主程式
│   ├── server.js              # 當前部署版本（由 server-firestore.js 複製）
│   ├── db/
│   │   └── firestore.js       # Firestore 資料庫操作
│   └── deploy-firestore.sh    # 後端部署腳本
├── components/                 # React 元件
├── store/                      # Zustand 狀態管理
├── api.ts                      # 前端 API 呼叫
├── firebase.ts                 # Firebase 配置
├── Dockerfile                  # 前端容器化配置
├── cloudbuild.yaml            # Cloud Build 配置（前端）
├── vite.config.ts             # Vite 打包配置
└── .env.production            # 生產環境變數
```

---

## 🔧 後端部署

### 部署方式 1: 使用部署腳本（推薦）

```bash
cd backend
./deploy-firestore.sh
```

### 部署方式 2: 手動部署

```bash
cd backend

# 1. 備份當前 server.js
cp server.js server.js.backup

# 2. 切換到 Firestore 版本
cp server-firestore.js server.js

# 3. 部署到 Cloud Run
gcloud run deploy ichiban-backend-new \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --platform managed \
  --memory 512Mi \
  --timeout 300 \
  --quiet
```

### 部署方式 3: 從專案根目錄部署（Windows PowerShell）

```powershell
cd "c:\Users\USER\Downloads\copy-of-11-8號-還未開始做後端\backend"

# 準備部署檔案
Copy-Item server.js server.js.backup -Force -ErrorAction SilentlyContinue
Copy-Item server-firestore.js server.js -Force

# 執行部署
gcloud run deploy ichiban-backend-new `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --platform managed `
  --memory 512Mi `
  --timeout 300 `
  --quiet
```

### 後端環境變數

後端使用 Firestore，主要配置在程式碼中：
- Firebase Admin SDK 使用 Application Default Credentials
- Session 存儲在 Firestore `SESSIONS` 集合
- 資料庫集合：`USERS`, `PRIZES`, `ORDERS`, `TRANSACTIONS`, `SHIPMENTS`, `PICKUP_REQUESTS`, `SESSIONS`

---

## 🎨 前端部署

### 部署方式 1: 使用 Cloud Build（推薦）

```bash
# 在專案根目錄執行
gcloud builds submit --config=cloudbuild.yaml
```

這會自動：
1. 使用 Dockerfile 建立容器映像
2. 推送到 Artifact Registry
3. 部署到 Cloud Run

### 部署方式 2: 本地建置後部署

```bash
# 1. 安裝依賴
npm install

# 2. 建置前端
npm run build

# 3. 建立 Docker 映像
docker build -t us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-frontend/ichiban-frontend:latest \
  --build-arg NODE_ENV=production \
  --build-arg VITE_API_BASE_URL=https://ichiban-backend-new-248630813908.us-central1.run.app \
  --build-arg VITE_API_PREFIX=/api \
  --build-arg VITE_USE_MOCK=false \
  .

# 4. 推送映像
docker push us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-frontend/ichiban-frontend:latest

# 5. 部署到 Cloud Run
gcloud run deploy ichiban-frontend \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-frontend/ichiban-frontend:latest \
  --allow-unauthenticated \
  --platform=managed \
  --port=8080 \
  --max-instances=5 \
  --cpu=1 \
  --memory=512Mi
```

### 前端環境變數

在 `.env.production` 中配置：

```env
VITE_API_BASE_URL=https://ichiban-backend-new-248630813908.us-central1.run.app
VITE_API_PREFIX=/api
VITE_USE_MOCK=false
VITE_DEBUG_MOCK=false
```

這些變數會在建置時被注入到前端程式碼中。

---

## 🔍 驗證部署

### 後端驗證

```bash
# 檢查服務狀態
gcloud run services describe ichiban-backend-new --region us-central1

# 測試 API
curl https://ichiban-backend-new-248630813908.us-central1.run.app/api/site/config
```

### 前端驗證

```bash
# 檢查服務狀態
gcloud run services describe ichiban-frontend --region us-central1

# 瀏覽器訪問
# https://ichiban-frontend-248630813908.us-central1.run.app
```

---

## 📝 重要注意事項

### 後端

1. **部署前必須先切換到 Firestore 版本**
   - 複製 `server-firestore.js` 為 `server.js`
   - 或使用 `deploy-firestore.sh` 腳本自動處理

2. **Firestore 索引**
   - 某些查詢需要複合索引
   - 如果遇到索引錯誤，程式會自動使用 fallback 查詢（無排序）
   - 建議在 Firebase Console 建立必要的索引以提升效能

3. **Session 管理**
   - Session 存儲在 Firestore，使用 cookie `sid`
   - Session 會在 `/auth/session` 時自動更新

### 前端

1. **建置時環境變數**
   - 前端使用 Vite，環境變數在建置時注入
   - 修改 `.env.production` 後需要重新建置

2. **CORS 配置**
   - 後端已配置允許前端 URL 的 CORS
   - 如果更換前端 URL，需要更新後端的 CORS 設定

3. **快取問題**
   - 部署後如果前端沒有更新，清除瀏覽器快取
   - 或使用無痕模式測試

---

## 🐛 常見問題排查

### 問題 1: 前端顯示 "Cannot read properties of undefined (reading 'map')"

**原因**: 前端程式碼未更新，仍使用舊版本

**解決方案**:
```bash
# 重新建置並部署前端
npm run build
gcloud builds submit --config=cloudbuild.yaml
```

### 問題 2: 後端 API 回傳 500 錯誤

**排查步驟**:
1. 查看 Cloud Run 日誌
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ichiban-backend-new" --limit 50
   ```

2. 檢查 Firestore 連線
3. 確認環境變數正確

### 問題 3: 部署後前端無法連接後端

**檢查清單**:
- [ ] `.env.production` 中的 `VITE_API_BASE_URL` 正確
- [ ] 後端服務正常運行
- [ ] 後端允許未驗證訪問（`--allow-unauthenticated`）
- [ ] CORS 設定正確

---

## 📞 聯絡資訊

- **GCP 專案**: goodmoney666-jackpot
- **專案編號**: 248630813908
- **區域**: us-central1

---

## 📅 更新記錄

| 日期 | 版本 | 更新內容 | 更新人 |
|------|------|----------|--------|
| 2025-11-24 | v1.0 | 初始版本，記錄當前部署配置 | Cascade AI |
| 2025-11-24 | Backend 00070 | 修正自取/運送/回收/出貨管理功能 | Cascade AI |
| 2025-11-25 | Frontend 00135 | 修復收藏庫顯示問題：添加 fetchInventory 調用、載入動畫、篩選排序功能 | Cascade AI |

### 2025-11-25 更新詳情

**前端版本**: `ichiban-frontend-00135-v6n`

**修復內容**:
1. ✅ 添加 `fetchInventory()` 自動調用 - 用戶進入個人資料頁面時自動載入收藏庫
2. ✅ 添加載入動畫 - 顯示旋轉圓圈和「載入收藏庫中...」提示
3. ✅ 添加篩選功能 - 按狀態、等級、活動篩選獎品
4. ✅ 添加排序功能 - 按最新獲得或等級排序
5. ✅ 添加搜尋功能 - 可搜尋獎品名稱或等級
6. ✅ 添加分頁載入 - 初始顯示12件，可載入更多
7. ✅ 修復 inventory 數據結構兼容性

**修改文件**:
- `components/ProfilePage.tsx` - 添加 fetchInventory、isLoadingInventory、篩選排序UI
- `store/authStore.ts` - 已包含 fetchInventory 函數（之前已實現）

**測試建議**:
- 清除瀏覽器緩存或使用無痕模式測試
- 確認載入動畫正常顯示
- 確認525件獎品正確顯示
- 測試篩選、排序、搜尋功能

---

**最後更新**: 2025-11-25 20:17 (UTC+8)

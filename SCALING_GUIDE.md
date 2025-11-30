# 系統擴展指南

## 當前配置

### 後端 (Cloud Run)
- **CPU**: 1 vCPU
- **記憶體**: 512 MB
- **並發數**: 80 請求/實例
- **最大實例數**: 20
- **理論並發**: 1,600 請求

### 支援用戶數
- **輕度使用**: 500-800 人
- **中度使用**: 160-320 人
- **重度使用**: 80-100 人

---

## 擴展方案

### 方案 1：增加最大實例數（推薦）

```bash
gcloud run services update ichiban-backend-new \
  --max-instances 50 \
  --region us-central1
```

**效果**:
- 並發請求: 80 × 50 = 4,000
- 支援用戶: 1,000-2,000 人（中度使用）

**成本**: 按實際使用付費，閒置時不收費

---

### 方案 2：增加資源配置

```bash
gcloud run services update ichiban-backend-new \
  --cpu 2 \
  --memory 1Gi \
  --region us-central1
```

**效果**:
- 更快的響應速度
- 更好的穩定性
- 支援更複雜的請求

**成本**: 約增加 2 倍

---

### 方案 3：增加並發數

```bash
gcloud run services update ichiban-backend-new \
  --concurrency 100 \
  --region us-central1
```

**效果**:
- 並發請求: 100 × 20 = 2,000
- 輕微提升容量

**注意**: 需確保單個實例能處理更多並發

---

### 方案 4：組合配置（高流量）

```bash
gcloud run services update ichiban-backend-new \
  --cpu 2 \
  --memory 1Gi \
  --concurrency 100 \
  --max-instances 100 \
  --region us-central1
```

**效果**:
- 並發請求: 100 × 100 = 10,000
- 支援用戶: 5,000-10,000 人（中度使用）

**成本**: 高流量時較高，但按需付費

---

## 監控指標

### 需要關注的指標

1. **請求延遲**
   ```bash
   gcloud monitoring time-series list \
     --filter='metric.type="run.googleapis.com/request_latencies"'
   ```

2. **實例數量**
   ```bash
   gcloud monitoring time-series list \
     --filter='metric.type="run.googleapis.com/container/instance_count"'
   ```

3. **CPU 使用率**
   ```bash
   gcloud monitoring time-series list \
     --filter='metric.type="run.googleapis.com/container/cpu/utilizations"'
   ```

---

## 成本估算

### 當前配置 (20 實例)
- **閒置**: $0/月
- **低流量** (100 人): ~$10-20/月
- **中流量** (500 人): ~$50-100/月
- **高流量** (1000 人): ~$100-200/月

### 擴展配置 (100 實例, 2 CPU)
- **閒置**: $0/月
- **低流量** (100 人): ~$20-40/月
- **中流量** (500 人): ~$100-200/月
- **高流量** (5000 人): ~$500-1000/月

---

## 優化建議

### 1. 前端優化
- ✅ 使用請求快取（已實現）
- ✅ 減少不必要的 API 調用
- ⏳ 實現請求隊列
- ⏳ 使用 WebSocket 減少輪詢

### 2. 後端優化
- ✅ API 頻率限制（已實現）
- ⏳ 實現 Redis 快取
- ⏳ 資料庫查詢優化
- ⏳ CDN 靜態資源

### 3. 資料庫優化
- ✅ Firestore 索引（部分完成）
- ⏳ 查詢結果快取
- ⏳ 批次操作優化

---

## 緊急擴展步驟

如果突然遇到高流量：

1. **立即增加實例數**
   ```bash
   gcloud run services update ichiban-backend-new \
     --max-instances 50 \
     --region us-central1
   ```

2. **監控系統狀態**
   - 查看 Cloud Run 控制台
   - 檢查錯誤日誌
   - 監控響應時間

3. **如果仍不足**
   ```bash
   gcloud run services update ichiban-backend-new \
     --cpu 2 \
     --memory 1Gi \
     --max-instances 100 \
     --region us-central1
   ```

---

## 聯絡資訊

如需協助擴展，請提供：
- 預期用戶數
- 使用模式（輕度/中度/重度）
- 預算範圍

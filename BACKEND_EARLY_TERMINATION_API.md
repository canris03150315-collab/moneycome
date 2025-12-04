# 後端「提前結束」API 實現指南

## API 端點

在 `backend/server-firestore.js` 中添加以下端點：

```javascript
// 提前結束商品（大獎已抽完）
app.post('/admin/lottery-sets/:id/early-terminate', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[early-terminate] Processing early termination for lottery set: ${id}`);
        
        const lotterySetRef = db.collection('lotterySets').doc(id);
        const doc = await lotterySetRef.get();
        
        if (!doc.exists) {
            console.log(`[early-terminate] Lottery set not found: ${id}`);
            return res.status(404).json({ error: '商品不存在' });
        }
        
        const lotterySet = doc.data();
        console.log(`[early-terminate] Lottery set data:`, {
            id,
            title: lotterySet.title,
            prizesCount: lotterySet.prizes?.length || 0
        });
        
        // 檢查大獎是否已抽完
        const topPrizes = lotterySet.prizes.filter(prize => 
            prize.type === 'NORMAL' && ['A賞', 'B賞', 'C賞'].includes(prize.grade)
        );
        
        console.log(`[early-terminate] Top prizes found: ${topPrizes.length}`);
        
        if (topPrizes.length === 0) {
            console.log(`[early-terminate] No top prizes (A/B/C) found`);
            return res.status(400).json({ error: '此商品沒有 A/B/C 賞' });
        }
        
        const allTopPrizesDrawn = topPrizes.every(prize => prize.remaining === 0);
        console.log(`[early-terminate] All top prizes drawn: ${allTopPrizesDrawn}`);
        
        if (!allTopPrizesDrawn) {
            const remainingTopPrizes = topPrizes.filter(p => p.remaining > 0);
            console.log(`[early-terminate] Top prizes still remaining:`, remainingTopPrizes.map(p => ({
                grade: p.grade,
                remaining: p.remaining
            })));
            return res.status(400).json({ error: '大獎尚未全部抽完' });
        }
        
        // 檢查是否已經提前結束
        if (lotterySet.earlyTerminated) {
            console.log(`[early-terminate] Already early terminated`);
            return res.status(400).json({ error: '此商品已經提前結束' });
        }
        
        const now = new Date().toISOString();
        
        // 更新商品狀態
        const updateData = {
            earlyTerminated: true,
            earlyTerminatedAt: now,
            status: 'SOLD_OUT'
        };
        
        // 確保種子碼已公布（如果有的話）
        if (lotterySet.poolSeed) {
            console.log(`[early-terminate] Pool seed already exists, keeping it`);
        } else {
            console.log(`[early-terminate] No pool seed found, this is expected if not yet generated`);
        }
        
        await lotterySetRef.update(updateData);
        
        console.log(`[early-terminate] Successfully terminated lottery set: ${id}`);
        console.log(`[early-terminate] Update data:`, updateData);
        
        res.json({ 
            success: true, 
            message: '商品已提前結束',
            earlyTerminatedAt: now,
            poolSeed: lotterySet.poolSeed || null
        });
    } catch (error) {
        console.error('[early-terminate] Error:', error);
        res.status(500).json({ error: '提前結束失敗：' + error.message });
    }
});
```

## 添加位置

在 `backend/server-firestore.js` 中，建議添加在其他管理員端點附近，例如：
- 在 `/admin/lottery-sets/:id/resubmit` 端點之後
- 或在 `/admin/lottery-sets` 相關端點的區域

## 測試步驟

### 1. 準備測試環境
```bash
# 確保後端正在運行
cd backend
npm start
```

### 2. 創建測試商品
- 登入管理員後台
- 創建一個包含 A、B、C 賞的商品
- 例如：A賞 x1, B賞 x2, C賞 x3, D賞 x10

### 3. 抽完大獎
- 使用測試帳號抽獎
- 抽完所有 A、B、C 賞
- 保留部分 D 賞未抽

### 4. 測試提前結束
- 進入管理員後台 > 商品管理
- 應該看到「🏆 提前結束」按鈕
- 點擊按鈕，確認提示
- 檢查：
  - 商品狀態變為「大獎已抽完·提前結束」
  - 商品自動下架
  - 種子碼已公布（如果有）

### 5. 驗證 API 響應
```bash
# 使用 curl 測試（需要管理員 token）
curl -X POST http://localhost:8080/admin/lottery-sets/YOUR_LOTTERY_ID/early-terminate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

預期響應：
```json
{
  "success": true,
  "message": "商品已提前結束",
  "earlyTerminatedAt": "2025-12-04T07:46:00.000Z",
  "poolSeed": "seed_value_or_null"
}
```

## 錯誤處理

### 1. 商品不存在
```json
{
  "error": "商品不存在"
}
```
HTTP Status: 404

### 2. 沒有 A/B/C 賞
```json
{
  "error": "此商品沒有 A/B/C 賞"
}
```
HTTP Status: 400

### 3. 大獎尚未抽完
```json
{
  "error": "大獎尚未全部抽完"
}
```
HTTP Status: 400

### 4. 已經提前結束
```json
{
  "error": "此商品已經提前結束"
}
```
HTTP Status: 400

## 部署到 Cloud Run

```bash
# 1. 構建 Docker 鏡像
cd backend
docker build -t us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-backend/ichiban-backend:latest .

# 2. 推送到 Artifact Registry
docker push us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-backend/ichiban-backend:latest

# 3. 部署到 Cloud Run
gcloud run deploy ichiban-backend-new \
  --image us-central1-docker.pkg.dev/goodmoney666-jackpot/ichiban-backend/ichiban-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# 4. 檢查部署狀態
gcloud run services describe ichiban-backend-new --region us-central1
```

## 日誌監控

部署後，檢查 Cloud Run 日誌：
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ichiban-backend-new" --limit 50 --format json
```

查找關鍵日誌：
- `[early-terminate] Processing early termination`
- `[early-terminate] Successfully terminated lottery set`
- `[early-terminate] Error:`

## 注意事項

1. **權限檢查**：確保只有管理員可以調用此 API（使用 `requireAdmin` 中間件）

2. **數據一致性**：提前結束後：
   - `earlyTerminated` 設為 `true`
   - `earlyTerminatedAt` 記錄時間戳
   - `status` 自動設為 `'SOLD_OUT'`

3. **種子碼**：
   - 如果商品已有 `poolSeed`，保持不變
   - 如果沒有，不強制生成（可能還未初始化）

4. **不可逆操作**：提前結束後無法撤銷，需要謹慎操作

5. **前端同步**：API 成功後，前端會自動刷新頁面以顯示最新狀態

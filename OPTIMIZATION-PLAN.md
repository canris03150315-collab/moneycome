# 🚀 專案優化計劃

## 優化目標
- 提升頁面載入速度 30%
- 減少 API 請求次數 50%
- 降低後端日誌量 80%
- 改善用戶體驗（減少延遲）

---

## 1️⃣ 前端性能優化

### A. React 組件優化（高優先級）

#### 問題分析
- **LotteryPage.tsx** 有 42 個 hooks（useState, useEffect, useMemo, useCallback）
- 過多的狀態更新導致頻繁重渲染
- 子組件沒有記憶化（memoization）

#### 優化方案

**1. 使用 React.memo 優化子組件**
```typescript
// components/TicketBoard.tsx
export const TicketBoard = React.memo(({ 
  lotteryId, 
  totalTickets, 
  drawnTickets, 
  ticketLocks,
  currentUser,
  onTicketSelect,
  isSoldOut,
  isLocked 
}) => {
  // ... 組件邏輯
}, (prevProps, nextProps) => {
  // 自定義比較函數，只在必要時重渲染
  return prevProps.drawnTickets === nextProps.drawnTickets &&
         prevProps.ticketLocks === nextProps.ticketLocks &&
         prevProps.isLocked === nextProps.isLocked;
});

// 同樣優化：QueueStatusPanel, DrawControlPanel, ProductCard
```

**2. 合併相關的 useEffect**
```typescript
// ❌ 當前：多個獨立的 useEffect
useEffect(() => { fetchQueueFromServer(); }, [lotteryId]);
useEffect(() => { fetchLocksFromServer(); }, [lotteryId]);
useEffect(() => { fetchRecentOrders(); }, [lotteryId]);

// ✅ 優化：合併為單一 useEffect
useEffect(() => {
  const fetchAllData = async () => {
    await Promise.all([
      fetchQueueFromServer(),
      fetchLocksFromServer(),
      fetchRecentOrders()
    ]);
  };
  fetchAllData();
}, [lotteryId]);
```

**3. 使用 useDeferredValue 延遲非關鍵更新**
```typescript
import { useDeferredValue } from 'react';

// 延遲更新非關鍵 UI（如最近中獎列表）
const deferredRecentOrders = useDeferredValue(recentOrders);
```

**預期效果**：減少 40% 的重渲染次數

---

### B. API 請求優化（高優先級）

#### 問題分析
- 隊列和鎖定狀態分開請求（2 個 API 調用）
- 沒有請求去重和緩存
- 使用輪詢而非 WebSocket

#### 優化方案

**1. 合併 API 端點**
```javascript
// backend/server-firestore.js
// 新增合併端點
app.get('/lottery-sets/:id/state', async (req, res) => {
  const { id } = req.params;
  
  // 並行獲取所有狀態
  const [queue, locks, lotteryState] = await Promise.all([
    db.getQueue(id),
    db.getTicketLocks(id),
    db.getLotteryState(id)
  ]);
  
  res.json({
    queue,
    locks,
    drawnTickets: lotteryState.drawnTicketIndices,
    poolCommitmentHash: lotteryState.poolCommitmentHash,
    poolSeed: lotteryState.poolSeed
  });
});
```

**2. 實施 SWR 緩存策略**
```typescript
// 安裝 SWR
// npm install swr

import useSWR from 'swr';

// 使用 SWR 替代手動 fetch
const { data, error, mutate } = useSWR(
  lotteryId ? `/lottery-sets/${lotteryId}/state` : null,
  fetcher,
  {
    refreshInterval: 3000, // 每 3 秒自動刷新
    dedupingInterval: 1000, // 1 秒內去重
    revalidateOnFocus: true // 焦點返回時重新驗證
  }
);
```

**3. WebSocket 即時更新（進階）**
```javascript
// backend: 添加 Socket.IO
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('join-lottery', (lotteryId) => {
    socket.join(`lottery-${lotteryId}`);
  });
});

// 當隊列或鎖定狀態變化時廣播
function broadcastQueueUpdate(lotteryId, queue) {
  io.to(`lottery-${lotteryId}`).emit('queue-updated', queue);
}
```

**預期效果**：減少 50% 的 API 請求次數

---

### C. 圖片優化（中優先級）

#### 優化方案

**1. 自動圖片壓縮**
```typescript
// utils/imageOptimizer.ts
import imageCompression from 'browser-image-compression';

export async function optimizeImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' // 使用 WebP 格式
  };
  
  return await imageCompression(file, options);
}
```

**2. 漸進式圖片加載**
```typescript
// components/ProgressiveImage.tsx
export const ProgressiveImage = ({ src, placeholder, alt }) => {
  const [imgSrc, setImgSrc] = useState(placeholder);
  
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setImgSrc(src);
  }, [src]);
  
  return <img src={imgSrc} alt={alt} className="transition-opacity" />;
};
```

**預期效果**：減少 60% 的圖片載入時間

---

## 2️⃣ 後端性能優化

### A. 日誌系統優化（高優先級）

#### 問題分析
- server-firestore.js 有 **312 個 console.log**
- 生產環境日誌過多影響性能
- 沒有日誌級別控制

#### 優化方案

**1. 實施結構化日誌**
```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      silent: process.env.NODE_ENV === 'production'
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    })
  ]
});

module.exports = logger;
```

**2. 替換所有 console.log**
```javascript
// ❌ 當前
console.log('[DRAW] Processing draw...');

// ✅ 優化
logger.debug('[DRAW] Processing draw...'); // 生產環境不輸出
logger.info('[DRAW] Draw completed'); // 僅重要事件
logger.error('[DRAW] Draw failed', { error }); // 錯誤必須記錄
```

**3. 環境變數控制**
```bash
# .env
NODE_ENV=production
LOG_LEVEL=warn  # 生產環境只記錄警告和錯誤
```

**預期效果**：減少 80% 的日誌輸出

---

### B. 資料庫查詢優化（中優先級）

#### 優化方案

**1. 添加 Firestore 索引**
```javascript
// 為常用查詢創建複合索引
// Firebase Console > Firestore > Indexes

// 訂單查詢索引
{
  collectionId: 'orders',
  fields: [
    { fieldPath: 'userId', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ]
}

// 交易記錄索引
{
  collectionId: 'transactions',
  fields: [
    { fieldPath: 'userId', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'DESCENDING' }
  ]
}
```

**2. 實施查詢緩存**
```javascript
// backend/utils/cache.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // 60 秒 TTL

async function getCachedLotterySet(id) {
  const cacheKey = `lottery-set-${id}`;
  let data = cache.get(cacheKey);
  
  if (!data) {
    data = await db.getLotterySet(id);
    cache.set(cacheKey, data);
  }
  
  return data;
}
```

**預期效果**：減少 30% 的資料庫讀取次數

---

### C. Rate Limiter 優化（低優先級）

#### 優化方案

**1. 使用 Redis 替代記憶體存儲**
```javascript
// 當前：express-rate-limit 使用記憶體
// 問題：多個 Cloud Run 實例無法共享限流狀態

// 優化：使用 Redis
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const limiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

**預期效果**：多實例環境下限流更準確

---

## 3️⃣ 代碼質量優化

### A. TypeScript 嚴格模式（中優先級）

#### 優化方案

**1. 啟用嚴格模式**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**2. 添加類型定義**
```typescript
// types/api.ts
export interface LotteryStateResponse {
  queue: QueueEntry[];
  locks: TicketLock[];
  drawnTickets: number[];
  poolCommitmentHash?: string;
  poolSeed?: string;
}

// 使用強類型 API 調用
const state = await apiCall<LotteryStateResponse>(`/lottery-sets/${id}/state`);
```

---

### B. 移除未使用的代碼（低優先級）

#### 發現的問題
```javascript
// backend/server.js - 舊版本，已被 server-firestore.js 替代
// backend/test-firestore.js - 測試文件
// backend/automation-patch.js - 一次性腳本

建議：移動到 archive/ 資料夾或刪除
```

---

### C. 添加單元測試（低優先級）

#### 優化方案

**1. 安裝測試框架**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**2. 添加關鍵功能測試**
```typescript
// __tests__/utils/crypto.test.ts
import { sha256 } from '../utils/crypto';

describe('sha256', () => {
  it('should generate correct hash', async () => {
    const hash = await sha256('test');
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });
});
```

---

## 4️⃣ 用戶體驗優化

### A. 加載狀態優化

**1. 骨架屏（Skeleton Loading）**
```typescript
// components/SkeletonLoader.tsx
export const TicketBoardSkeleton = () => (
  <div className="grid grid-cols-10 gap-2">
    {Array.from({ length: 100 }).map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
    ))}
  </div>
);
```

**2. 樂觀更新（Optimistic UI）**
```typescript
// 立即更新 UI，不等待 API 響應
const handleDraw = async () => {
  // 樂觀更新
  setSelectedTickets([]);
  setIsDrawing(true);
  
  try {
    const result = await draw(lotteryId, selectedTickets);
    setDrawResult(result);
  } catch (error) {
    // 回滾
    setIsDrawing(false);
    toast.show({ type: 'error', message: '抽獎失敗' });
  }
};
```

---

### B. 錯誤處理優化

**1. 全局錯誤邊界**
```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error('React Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## 5️⃣ 安全性優化

### A. 環境變數驗證

```javascript
// backend/config/validate.js
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').required(),
  PORT: Joi.number().default(8080),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  // ... 其他必要變數
}).unknown();

const { error } = envSchema.validate(process.env);
if (error) {
  throw new Error(`環境變數驗證失敗: ${error.message}`);
}
```

---

## 📊 優化優先級總結

| 優化項目 | 優先級 | 預期效果 | 實施難度 | 建議時程 |
|---------|--------|---------|---------|---------|
| React 組件優化 | 🔴 高 | 減少 40% 重渲染 | 中 | 1-2 天 |
| API 請求合併 | 🔴 高 | 減少 50% 請求 | 低 | 0.5 天 |
| 日誌系統優化 | 🔴 高 | 減少 80% 日誌 | 低 | 0.5 天 |
| SWR 緩存 | 🟡 中 | 改善響應速度 | 中 | 1 天 |
| 圖片優化 | 🟡 中 | 減少 60% 載入時間 | 低 | 0.5 天 |
| 資料庫索引 | 🟡 中 | 減少 30% 查詢時間 | 低 | 0.5 天 |
| WebSocket | 🟢 低 | 即時更新 | 高 | 2-3 天 |
| 單元測試 | 🟢 低 | 提升代碼質量 | 中 | 持續進行 |

---

## 🎯 快速實施方案（1 天內完成）

### 第一階段：立即優化（2-3 小時）
1. ✅ 後端日誌優化（添加環境變數控制）
2. ✅ 合併 API 端點（queue + locks）
3. ✅ 添加 React.memo 到主要組件

### 第二階段：短期優化（1 天）
4. ✅ 實施 SWR 緩存
5. ✅ 添加 Firestore 索引
6. ✅ 圖片自動壓縮

### 第三階段：中期優化（1 週）
7. ⏳ WebSocket 即時更新
8. ⏳ 完整的單元測試覆蓋
9. ⏳ 性能監控（Sentry Performance）

---

## 📝 實施檢查清單

- [ ] 創建 `backend/utils/logger.js`
- [ ] 替換所有 `console.log` 為結構化日誌
- [ ] 添加 `LOG_LEVEL` 環境變數
- [ ] 創建合併 API 端點 `/lottery-sets/:id/state`
- [ ] 安裝並配置 SWR
- [ ] 使用 React.memo 優化組件
- [ ] 添加 Firestore 複合索引
- [ ] 實施圖片自動壓縮
- [ ] 添加骨架屏加載
- [ ] 創建錯誤邊界組件

---

**建議開始順序**：
1. 日誌優化（最簡單，立即見效）
2. API 合併（減少請求次數）
3. React 組件優化（改善前端性能）

**預期總體效果**：
- 🚀 頁面載入速度提升 30-40%
- 📉 API 請求減少 50%
- 💾 後端資源使用減少 40%
- ✨ 用戶體驗顯著改善

---

*最後更新: 2025-12-04*  
*狀態: 待實施*

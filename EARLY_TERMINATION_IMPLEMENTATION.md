# 提前結束功能實現指南

## 功能需求
當 A、B、C 賞等大獎都被抽完後，即使還有小獎未抽完，管理員也可以提前結束抽獎並公布種子碼。

## 已完成
✅ 1. 在 `types.ts` 中添加新的狀態標記：
   - `earlyTerminated?: boolean` - 提前結束標記
   - `earlyTerminatedAt?: string` - 提前結束時間

✅ 2. 在 `AdminProductManagement.tsx` 中添加判斷函數：
   ```typescript
   const areTopPrizesCompleted = (lotterySet: LotterySet): boolean => {
       if (!lotterySet.prizes || lotterySet.prizes.length === 0) {
           return false;
       }
       
       // 找出所有 A/B/C 賞
       const topPrizes = lotterySet.prizes.filter(prize => 
           prize.type === 'NORMAL' && ['A賞', 'B賞', 'C賞'].includes(prize.grade)
       );
       
       // 如果沒有 A/B/C 賞，返回 false
       if (topPrizes.length === 0) {
           return false;
       }
       
       // 檢查所有 A/B/C 賞是否都已抽完
       return topPrizes.every(prize => prize.remaining === 0);
   };
   ```

## 待實現

### 3. 在 AdminProductManagement.tsx 商品列表中添加：

在第 657 行附近，`filteredLotterySets.map` 內部添加：

```typescript
const canEarlyTerminate = areTopPrizesCompleted(set) && !isCompleted && !set.earlyTerminated;
```

在第 680-682 行，修改狀態標籤顯示：

```typescript
{set.earlyTerminated && (
    <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white rounded">大獎已抽完·提前結束</span>
)}
{isCompleted && !isSoldOut && !set.earlyTerminated && (
    <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded">已抽完</span>
)}
```

在第 722 行之後，添加「提前結束」按鈕：

```typescript
{canEarlyTerminate && (
    <button
        onClick={async () => {
            if (window.confirm('大獎（A/B/C賞）已全部抽完！\n\n確定要提前結束此商品嗎？\n結束後將公布種子碼，並自動下架。')) {
                try {
                    await apiCall(`/admin/lottery-sets/${set.id}/early-terminate`, {
                        method: 'POST'
                    });
                    alert('✅ 商品已提前結束！種子碼已公布。');
                    window.location.reload();
                } catch (error: any) {
                    alert('❌ 提前結束失敗：' + (error.message || '未知錯誤'));
                }
            }
        }}
        className="text-purple-600 hover:text-purple-800 text-sm font-semibold"
        title="大獎已抽完，可以提前結束並公布種子碼"
    >
        🏆 提前結束
    </button>
)}
```

修改第 723 行的條件：

```typescript
{(isCompleted || set.earlyTerminated) && (
```

### 4. 後端 API 實現

在 `backend/server-firestore.js` 中添加新的 API 端點：

```javascript
app.post('/admin/lottery-sets/:id/early-terminate', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const lotterySetRef = db.collection('lotterySets').doc(id);
        const doc = await lotterySetRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: '商品不存在' });
        }
        
        const lotterySet = doc.data();
        
        // 檢查大獎是否已抽完
        const topPrizes = lotterySet.prizes.filter(prize => 
            prize.type === 'NORMAL' && ['A賞', 'B賞', 'C賞'].includes(prize.grade)
        );
        
        if (topPrizes.length === 0) {
            return res.status(400).json({ error: '此商品沒有 A/B/C 賞' });
        }
        
        const allTopPrizesDrawn = topPrizes.every(prize => prize.remaining === 0);
        
        if (!allTopPrizesDrawn) {
            return res.status(400).json({ error: '大獎尚未全部抽完' });
        }
        
        // 更新商品狀態
        await lotterySetRef.update({
            earlyTerminated: true,
            earlyTerminatedAt: new Date().toISOString(),
            status: 'SOLD_OUT',
            // 如果有 poolSeed，確保已公布
            ...(lotterySet.poolSeed ? {} : { poolSeed: lotterySet.poolSeed || 'SEED_TO_BE_REVEALED' })
        });
        
        res.json({ 
            success: true, 
            message: '商品已提前結束',
            earlyTerminatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[early-terminate] Error:', error);
        res.status(500).json({ error: '提前結束失敗' });
    }
});
```

### 5. 前台顯示修改

在 `LotteryPage.tsx` 中，修改種子碼顯示邏輯（第 640 行附近）：

```typescript
{lotterySet.poolSeed && (remainingTickets === 0 || lotterySet.earlyTerminated) && (
    <div>
        <label className="text-xs font-semibold text-green-700 block mb-1">
            籤池種子碼 (Pool Seed) - {lotterySet.earlyTerminated ? '大獎已抽完，提前公開' : '已售完公開'}
        </label>
        <div className="bg-white rounded border border-green-200 p-2">
            <p className="text-xs font-mono text-gray-700 break-all">{lotterySet.poolSeed}</p>
        </div>
        <p className="text-xs text-green-600 mt-1">
            ✓ {lotterySet.earlyTerminated ? '大獎已抽完，商品提前結束' : '商品已售完'}，種子碼已公開供驗證
        </p>
    </div>
)}
```

添加提前結束提示（在商品標題附近）：

```typescript
{lotterySet.earlyTerminated && (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
                <p className="font-semibold text-purple-800">大獎已抽完，商品提前結束</p>
                <p className="text-sm text-purple-600 mt-1">
                    A/B/C 賞已全部被抽走，商品已提前結束並公布種子碼。
                    剩餘小獎將不再開放抽取。
                </p>
            </div>
        </div>
    </div>
)}
```

## 測試步驟

1. 創建一個測試商品，包含 A、B、C 賞
2. 抽完所有 A、B、C 賞（但保留其他獎項）
3. 在管理員後台應該看到「🏆 提前結束」按鈕
4. 點擊按鈕，確認提示
5. 檢查：
   - 商品狀態變為「大獎已抽完·提前結束」
   - 商品自動下架
   - 種子碼已公布
   - 前台顯示提前結束提示
   - 無法繼續抽獎

## 注意事項

- 提前結束後，商品會自動下架（status: 'SOLD_OUT'）
- 種子碼會立即公布，用戶可以驗證公平性
- 剩餘的小獎將無法再被抽取
- 提前結束的商品會有特殊標記，與完全抽完的商品區分

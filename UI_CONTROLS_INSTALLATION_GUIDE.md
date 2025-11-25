# UI 控件安裝指南

## 📋 概述
由於自動編輯工具在處理複雜 JSX 時會出現錯誤，這份指南將幫助你手動添加 UI 控件。

---

## 🎯 目標
在 `ProfilePage.tsx` 的 `InventoryView` 組件中添加篩選、排序和搜尋的 UI 控件。

---

## 📍 插入位置

**文件**: `components/ProfilePage.tsx`  
**組件**: `InventoryView`  
**行號**: 約第 114 行

### 尋找這段代碼：
```tsx
) : processedPrizes.length === 0 ? (
    <p className="text-center text-gray-500 py-8">您的收藏庫是空的，快去抽獎吧！</p>
) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
```

### 修改為：
```tsx
) : processedPrizes.length === 0 ? (
    <p className="text-center text-gray-500 py-8">您的收藏庫是空的，快去抽獎吧！</p>
) : (
    <>
        {/* 在這裡插入 UI_CONTROLS_SNIPPET.tsx 的內容 */}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
```

---

## 🔧 詳細步驟

### 步驟 1：打開文件
打開 `components/ProfilePage.tsx`

### 步驟 2：找到插入位置
1. 搜尋 `processedPrizes.length === 0`
2. 找到這行之後的 `) : (`
3. 在 `) : (` 之後，你會看到 `<div className="grid...`

### 步驟 3：修改代碼
1. 將 `<div className="grid...` 這行**之前**的內容從：
   ```tsx
   ) : (
   ```
   
   改為：
   ```tsx
   ) : (
       <>
   ```

2. 在 `<>` 和 `<div className="grid...` 之間插入 `UI_CONTROLS_SNIPPET.tsx` 的內容（從第 8 行到第 86 行）

### 步驟 4：添加結束標籤
在 `InventoryView` 組件的 `return` 語句結束之前（約第 231 行），找到：
```tsx
                </div>
            )}
        </div>
    );
};
```

修改為：
```tsx
                </div>
                </>
            )}
        </div>
    );
};
```

---

## ✅ 驗證

完成後，你的代碼結構應該是：

```tsx
return (
    <div>
        {isLoading ? (
            // 載入動畫
        ) : processedPrizes.length === 0 ? (
            // 空狀態
        ) : (
            <>
                {/* 篩選和排序控件 */}
                {selectionMode === 'none' && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                        {/* 下拉選單 */}
                    </div>
                )}
                
                {selectionMode !== 'none' && (
                    <div className="mb-4 p-3 bg-yellow-50...">
                        {/* 警告訊息 */}
                    </div>
                )}
                
                <div className="grid grid-cols-2...">
                    {displayedPrizes.map(prize => {
                        // 獎品卡片
                    })}
                </div>
            </>
        )}
    </div>
);
```

---

## 🚨 常見錯誤

### 錯誤 1：忘記添加 `<>`
**症狀**: `JSX expressions must have one parent element`  
**解決**: 確保在 `) : (` 之後添加了 `<>`

### 錯誤 2：忘記添加 `</>`
**症狀**: `JSX element has no corresponding closing tag`  
**解決**: 在 `</div>` 之前添加 `</>`

### 錯誤 3：插入位置錯誤
**症狀**: UI 控件不顯示或顯示在錯誤位置  
**解決**: 確保插入在 `<div className="grid...` **之前**

---

## 📝 完整代碼參考

如果你不確定，可以參考 `UI_CONTROLS_SNIPPET.tsx` 文件中的完整代碼。

---

## 🎉 完成後

1. 保存文件
2. 檢查是否有 TypeScript 錯誤
3. 提交更改：
   ```bash
   git add components/ProfilePage.tsx
   git commit -m "feat: 添加篩選、排序和搜尋 UI 控件"
   ```
4. 推送並部署測試

---

## 💡 提示

- 使用 VS Code 的 "Format Document" (Shift + Alt + F) 來自動格式化代碼
- 如果遇到問題，可以隨時用 `git checkout HEAD -- components/ProfilePage.tsx` 恢復文件

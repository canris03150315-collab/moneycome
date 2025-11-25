# 📋 收藏庫分頁優化方案

**問題：** 獎品數量太多時難以閱讀

**建議方案：** 添加簡單的分頁功能

---

## 🎯 最簡單的實作方式

### 方案 1：添加「顯示更多」按鈕 ⭐⭐⭐⭐⭐（推薦）

**優點：**
- 實作最簡單
- 用戶體驗好
- 不需要複雜的分頁邏輯

**實作：**
```typescript
const [displayCount, setDisplayCount] = useState(24);

// 顯示前 N 個獎品
const displayedPrizes = sortedPrizes.slice(0, displayCount);

// 在網格下方添加按鈕
{displayCount < sortedPrizes.length && (
  <button onClick={() => setDisplayCount(prev => prev + 24)}>
    顯示更多 ({sortedPrizes.length - displayCount} 件)
  </button>
)}
```

---

### 方案 2：傳統分頁 ⭐⭐⭐⭐

**優點：**
- 可以跳到任意頁
- 顯示總頁數

**實作：**
```typescript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 24;

const paginatedPrizes = sortedPrizes.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

const totalPages = Math.ceil(sortedPrizes.length / itemsPerPage);
```

---

### 方案 3：添加篩選器 ⭐⭐⭐

**優點：**
- 快速找到特定獎品
- 減少顯示數量

**實作：**
```typescript
const [filterGrade, setFilterGrade] = useState('ALL');

const filteredPrizes = sortedPrizes.filter(p => 
  filterGrade === 'ALL' || p.grade === filterGrade
);
```

---

## 🚀 建議實作順序

1. **先實作方案 1**（顯示更多按鈕）- 5 分鐘
2. 如果需要，再添加方案 3（篩選器）- 10 分鐘
3. 最後考慮方案 2（傳統分頁）- 15 分鐘

---

**需要我實作哪個方案？**

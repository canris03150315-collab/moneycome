# 前端緩存策略說明

## 🎯 目標

確保用戶在不手動清除緩存的情況下，自動獲取最新版本的應用程式。

---

## 🔧 實現方案

### 1. **文件名 Hash（File Fingerprinting）**

#### Vite 配置
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash].[ext]'
    }
  }
}
```

**工作原理：**
- 每次 build 時，Vite 會根據文件內容生成唯一的 hash
- 文件內容變化 → hash 變化 → 文件名變化 → 瀏覽器自動下載新文件
- 例如：`index-abc123.js` → 修改代碼後 → `index-def456.js`

**效果：**
✅ JS/CSS 文件可以永久緩存，因為文件名變化時會自動失效舊緩存

---

### 2. **Nginx 緩存策略**

#### HTML 文件（index.html）
```nginx
location ~ \.html$ {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

**策略：** 完全不緩存
**原因：** HTML 文件包含對 JS/CSS 文件的引用，必須每次都重新下載才能獲取最新的文件名

#### JS/CSS 文件（帶 hash）
```nginx
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**策略：** 永久緩存（1 年）
**原因：** 文件名包含 hash，內容變化時文件名會變，舊緩存自動失效

#### 圖片和媒體文件
```nginx
location ~* \.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**策略：** 長期緩存（1 年）
**原因：** 靜態資源很少變化，長期緩存可提升性能

---

### 3. **自動版本號顯示**

#### version.ts
```typescript
export const VERSION = {
  buildTime: __BUILD_TIME__,  // Vite 注入的構建時間
  display: `v${formatted_date}`  // 自動格式化的版本號
};
```

**工作原理：**
- 每次 build 時注入當前時間戳
- 頁面載入時自動顯示在右下角
- 用戶和開發者都能立即看到當前版本

**效果：**
✅ 不需要手動更新版本號
✅ 可以快速確認用戶是否使用最新版本

---

## 📊 工作流程

### 更新部署流程

```
1. 開發者修改代碼
   ↓
2. 執行 npm run build
   ↓
3. Vite 生成帶新 hash 的文件
   例如：index-abc123.js → index-def456.js
   ↓
4. 部署到 Cloud Run
   ↓
5. 用戶訪問網站
   ↓
6. Nginx 返回 index.html（不緩存）
   ↓
7. index.html 引用新的 JS 文件（index-def456.js）
   ↓
8. 瀏覽器發現文件名不同，自動下載新文件
   ↓
9. ✅ 用戶自動獲取最新版本！
```

### 用戶體驗

**第一次訪問：**
- 下載 index.html（不緩存）
- 下載 index-abc123.js（緩存 1 年）
- 下載 index-abc123.css（緩存 1 年）

**再次訪問（代碼未更新）：**
- 下載 index.html（不緩存，但內容相同）
- 使用緩存的 index-abc123.js ✅
- 使用緩存的 index-abc123.css ✅

**再次訪問（代碼已更新）：**
- 下載 index.html（不緩存，引用新文件名）
- 下載 index-def456.js（新文件，自動下載）✅
- 下載 index-def456.css（新文件，自動下載）✅

---

## ✅ 優點

1. **用戶體驗佳**
   - 不需要手動清除緩存
   - 自動獲取最新版本
   - 保持良好的性能（靜態資源長期緩存）

2. **開發維護簡單**
   - 不需要手動管理版本號
   - 不需要擔心緩存問題
   - 自動化的版本控制

3. **性能優化**
   - JS/CSS 永久緩存，減少帶寬使用
   - 只有 HTML 文件不緩存（體積小）
   - 整體載入速度快

4. **可追蹤**
   - 版本號自動顯示
   - 可以快速確認部署版本
   - 方便問題排查

---

## 🚫 無需執行的操作

✅ **用戶不需要：**
- 清除瀏覽器緩存
- 強制刷新（Ctrl+F5）
- 關閉/重啟瀏覽器

✅ **開發者不需要：**
- 手動更新版本號
- 在文件名後加時間戳
- 使用 service worker
- 複雜的緩存策略

---

## 🧪 驗證方法

### 檢查緩存策略是否生效

1. **打開 DevTools（F12）**
2. **進入 Network 標籤**
3. **重新載入頁面**
4. **檢查響應頭：**

**index.html 應該顯示：**
```
Cache-Control: no-store, no-cache, must-revalidate
```

**index-[hash].js 應該顯示：**
```
Cache-Control: public, max-age=31536000, immutable
```

**index-[hash].css 應該顯示：**
```
Cache-Control: public, max-age=31536000, immutable
```

### 檢查文件名 Hash 是否生效

1. **檢查 dist 目錄** 或 **查看頁面源碼**
2. **JS 文件名應該類似：** `index-abc123xyz.js`
3. **CSS 文件名應該類似：** `index-def456uvw.css`
4. **每次 build 後 hash 應該不同**

---

## 📝 總結

**這個緩存策略確保：**
- ✅ 用戶自動獲取最新版本
- ✅ 無需手動清除緩存
- ✅ 保持最佳性能
- ✅ 易於維護和追蹤

**適用於所有現代 Web 應用的標準做法！** 🚀

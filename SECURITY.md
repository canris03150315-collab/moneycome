# 🔒 安全性文檔

## 已實施的安全措施

### ✅ 完成的安全改進

#### 1. Git 安全
- [x] 從 Git 歷史中移除所有 `.env` 文件
- [x] 更新 `.gitignore` 防止未來提交敏感文件
- [x] 創建 `.env.example` 模板文件
- [x] 所有敏感信息已從代碼庫中移除

#### 2. 密鑰管理
- [x] 生成新的安全令牌（64 字符十六進制）
- [x] 遷移到 Google Cloud Secret Manager
- [x] 設置適當的 IAM 權限
- [x] 所有密鑰已加密存儲

#### 3. 密碼安全
- [x] 使用 bcrypt 加密用戶密碼
- [x] 密碼哈希強度：10 輪
- [x] 支持舊密碼自動升級

#### 4. API 安全
- [x] 實施速率限制（防止暴力破解）
- [x] 輸入驗證和清理
- [x] CORS 配置
- [x] 會話管理

---

## 當前配置

### Secret Manager 密鑰

以下密鑰存儲在 Google Cloud Secret Manager 中：

| 密鑰名稱 | 用途 | 訪問權限 |
|---------|------|---------|
| `ADMIN_DELETE_TOKEN` | 管理員刪除操作令牌 | Cloud Run 服務帳號 |
| `ADMIN_RESET_TOKEN` | 管理員重置操作令牌 | Cloud Run 服務帳號 |
| `ADMIN_VERIFY_PASSWORD` | 管理員驗證密碼 | Cloud Run 服務帳號 |

### 環境變數

公開的環境變數（可以提交到 Git）：
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID（公開的）
- `VITE_API_BASE_URL`: 後端 API URL
- `VITE_API_PREFIX`: API 路徑前綴

---

## 安全最佳實踐

### 開發人員指南

#### ❌ 永遠不要做的事情

1. **不要提交敏感信息到 Git**
   ```bash
   # 錯誤示例
   git add .env
   git commit -m "Add config"
   ```

2. **不要在代碼中硬編碼密鑰**
   ```javascript
   // 錯誤示例
   const API_KEY = "my-secret-key-123";
   ```

3. **不要在日誌中記錄敏感信息**
   ```javascript
   // 錯誤示例
   console.log('User password:', password);
   ```

#### ✅ 應該做的事情

1. **使用環境變數或 Secret Manager**
   ```javascript
   // 正確示例
   const apiKey = process.env.API_KEY;
   ```

2. **使用 .env.example 作為模板**
   ```bash
   # 正確流程
   cp .env.example .env
   # 編輯 .env 填入實際值
   # .env 不會被提交（在 .gitignore 中）
   ```

3. **定期輪換密鑰**
   ```bash
   # 每 90 天更新一次密鑰
   node generate-secrets.js
   ```

---

## 密鑰輪換流程

### 定期更新密鑰（建議每 90 天）

1. **生成新密鑰**
   ```bash
   node generate-secrets.js
   ```

2. **更新 Secret Manager**
   ```bash
   # 為每個密鑰添加新版本
   echo -n "新密鑰值" | gcloud secrets versions add ADMIN_DELETE_TOKEN --data-file=-
   ```

3. **驗證應用程序**
   ```bash
   # 確保應用程序使用新密鑰正常運行
   curl https://your-api.com/health
   ```

4. **刪除舊版本**（可選）
   ```bash
   gcloud secrets versions destroy VERSION_NUMBER --secret=ADMIN_DELETE_TOKEN
   ```

---

## 安全檢查清單

### 部署前檢查

- [ ] 所有 `.env` 文件都在 `.gitignore` 中
- [ ] 沒有硬編碼的密鑰或密碼
- [ ] 所有敏感配置都使用 Secret Manager
- [ ] IAM 權限設置正確
- [ ] 速率限制已啟用
- [ ] 日誌不包含敏感信息

### 定期檢查（每月）

- [ ] 審查訪問日誌
- [ ] 檢查異常活動
- [ ] 更新依賴包
- [ ] 審查 IAM 權限
- [ ] 測試備份恢復

### 季度檢查

- [ ] 輪換所有密鑰
- [ ] 安全審計
- [ ] 滲透測試
- [ ] 更新安全文檔

---

## 事件響應

### 如果密鑰洩漏

1. **立即撤銷**
   ```bash
   # 禁用洩漏的密鑰版本
   gcloud secrets versions disable VERSION --secret=SECRET_NAME
   ```

2. **生成新密鑰**
   ```bash
   node generate-secrets.js
   ```

3. **更新所有服務**
   ```bash
   # 更新 Cloud Run
   gcloud run services update SERVICE_NAME --update-secrets=...
   ```

4. **審計訪問日誌**
   ```bash
   # 檢查是否有未授權訪問
   gcloud logging read "resource.type=cloud_run_revision"
   ```

5. **通知相關人員**

---

## 聯絡方式

如果發現安全問題，請立即聯繫：
- 技術負責人：[您的聯絡方式]
- 安全團隊：[安全團隊郵箱]

---

## 參考資源

- [Google Cloud Secret Manager 文檔](https://cloud.google.com/secret-manager/docs)
- [OWASP 安全指南](https://owasp.org/)
- [Node.js 安全最佳實踐](https://nodejs.org/en/docs/guides/security/)

---

**最後更新**: 2025-12-01  
**版本**: 1.0.0  
**狀態**: ✅ 已實施

/**
 * 批量替換 console.log 為 logger.log
 */
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'components');

// 需要替換的檔案列表（根據之前的 grep 結果）
const filesToUpdate = [
  'AuthPage.tsx',
  'LotteryPage.tsx',
  'RechargeModal.tsx',
  'GoogleCallback.tsx',
  'HomePage.tsx',
  'AdminProductManagement.tsx',
  'GlobalStateManager.tsx',
  'ProfilePage.tsx',
  'AdminPage.tsx',
  'AdminSiteSettings.tsx',
  'AdminUserManagement.tsx',
  'ErrorBoundary.tsx',
  'VerificationPage.tsx'
];

filesToUpdate.forEach(filename => {
  const filePath = path.join(componentsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  檔案不存在: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 檢查是否已經引入 logger
  const hasLoggerImport = content.includes("import { logger } from '../utils/logger'");
  
  // 替換 console.log -> logger.log
  if (content.includes('console.log')) {
    content = content.replace(/console\.log/g, 'logger.log');
    modified = true;
  }
  
  // 替換 console.info -> logger.info
  if (content.includes('console.info')) {
    content = content.replace(/console\.info/g, 'logger.info');
    modified = true;
  }
  
  // 替換 console.debug -> logger.debug
  if (content.includes('console.debug')) {
    content = content.replace(/console\.debug/g, 'logger.debug');
    modified = true;
  }
  
  // console.warn 和 console.error 保持不變（生產環境也需要）
  
  // 如果有修改且沒有引入 logger，添加 import
  if (modified && !hasLoggerImport) {
    // 找到第一個 import 語句的位置
    const importMatch = content.match(/^import .+;$/m);
    if (importMatch) {
      const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, importIndex) + 
                "\nimport { logger } from '../utils/logger';" +
                content.slice(importIndex);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已更新: ${filename}`);
  } else {
    console.log(`⏭️  無需更新: ${filename}`);
  }
});

console.log('\n✨ 完成！');

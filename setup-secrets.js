#!/usr/bin/env node
/**
 * 設置 Google Cloud Secret Manager
 * 將敏感配置遷移到 Secret Manager
 */

import { execSync } from 'child_process';

const projectId = 'goodmoney666-jackpot';
const region = 'us-central1';

console.log('='.repeat(60));
console.log('🔐 設置 Google Cloud Secret Manager');
console.log('='.repeat(60));
console.log('');

// 步驟 1: 啟用 Secret Manager API
console.log('📋 步驟 1: 啟用 Secret Manager API...');
try {
  execSync(`gcloud services enable secretmanager.googleapis.com --project=${projectId}`, { stdio: 'inherit' });
  console.log('✅ Secret Manager API 已啟用');
} catch (error) {
  console.log('⚠️  API 可能已經啟用');
}
console.log('');

// 步驟 2: 創建密鑰
console.log('📋 步驟 2: 創建密鑰...');
const secrets = [
  {
    name: 'ADMIN_DELETE_TOKEN',
    value: 'c4cd9f4939e7f520fda8bec9cc8dcbfa16821e297185dc214798a690c5eed233',
    description: '管理員刪除操作令牌'
  },
  {
    name: 'ADMIN_RESET_TOKEN',
    value: 'f7ba2b478253289c2701d33a77403b2b0d9a7dfa5b48b2610a694b027de83ce7',
    description: '管理員重置操作令牌'
  },
  {
    name: 'ADMIN_VERIFY_PASSWORD',
    value: 'OWFDYdyXdc8kDtlkx5t8vaodIHLaTU4',
    description: '管理員驗證密碼'
  }
];

for (const secret of secrets) {
  try {
    // 創建密鑰
    console.log(`  創建密鑰: ${secret.name}...`);
    execSync(
      `echo -n "${secret.value}" | gcloud secrets create ${secret.name} --data-file=- --replication-policy="automatic" --project=${projectId}`,
      { stdio: 'pipe' }
    );
    console.log(`  ✅ ${secret.name} 已創建`);
  } catch (error) {
    // 如果密鑰已存在，添加新版本
    try {
      console.log(`  密鑰已存在，添加新版本...`);
      execSync(
        `echo -n "${secret.value}" | gcloud secrets versions add ${secret.name} --data-file=- --project=${projectId}`,
        { stdio: 'pipe' }
      );
      console.log(`  ✅ ${secret.name} 已更新`);
    } catch (updateError) {
      console.log(`  ❌ ${secret.name} 更新失敗`);
    }
  }
}
console.log('');

// 步驟 3: 授予 Cloud Run 服務帳號訪問權限
console.log('📋 步驟 3: 設置權限...');
const serviceAccount = `${projectId}@appspot.gserviceaccount.com`;

for (const secret of secrets) {
  try {
    execSync(
      `gcloud secrets add-iam-policy-binding ${secret.name} --member="serviceAccount:${serviceAccount}" --role="roles/secretmanager.secretAccessor" --project=${projectId}`,
      { stdio: 'pipe' }
    );
    console.log(`  ✅ ${secret.name} 權限已設置`);
  } catch (error) {
    console.log(`  ⚠️  ${secret.name} 權限設置可能已存在`);
  }
}
console.log('');

// 步驟 4: 更新 Cloud Run 服務以使用 Secret Manager
console.log('📋 步驟 4: 配置 Cloud Run 使用 Secret Manager...');
console.log('');
console.log('請執行以下命令來更新 Cloud Run 服務：');
console.log('');
console.log(`gcloud run services update ichiban-backend-new \\
  --region=${region} \\
  --update-secrets=ADMIN_DELETE_TOKEN=ADMIN_DELETE_TOKEN:latest,ADMIN_RESET_TOKEN=ADMIN_RESET_TOKEN:latest,ADMIN_VERIFY_PASSWORD=ADMIN_VERIFY_PASSWORD:latest \\
  --project=${projectId}`);
console.log('');

console.log('='.repeat(60));
console.log('✅ Secret Manager 設置完成！');
console.log('='.repeat(60));
console.log('');
console.log('📝 後續步驟：');
console.log('1. 執行上面的 gcloud 命令更新 Cloud Run');
console.log('2. 從環境變數中移除敏感信息');
console.log('3. 驗證應用程序仍然正常運行');
console.log('4. 刪除本地的 .env 文件');
console.log('');
console.log('🔒 安全提示：');
console.log('- Secret Manager 中的密鑰已加密存儲');
console.log('- 只有授權的服務帳號可以訪問');
console.log('- 所有訪問都會被審計記錄');
console.log('');

#!/usr/bin/env node
/**
 * 生成安全的隨機令牌
 * 用於替換暴露的敏感信息
 */

import crypto from 'crypto';
import fs from 'fs';

console.log('='.repeat(60));
console.log('🔐 生成新的安全令牌');
console.log('='.repeat(60));
console.log('');

// 生成強隨機令牌
const deleteToken = crypto.randomBytes(32).toString('hex');
const resetToken = crypto.randomBytes(32).toString('hex');
const adminPassword = crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, '');

console.log('📝 請將以下值設置到 Google Cloud Run 環境變數中：');
console.log('');
console.log('ADMIN_DELETE_TOKEN=');
console.log(deleteToken);
console.log('');
console.log('ADMIN_RESET_TOKEN=');
console.log(resetToken);
console.log('');
console.log('ADMIN_VERIFY_PASSWORD=');
console.log(adminPassword);
console.log('');
console.log('='.repeat(60));
console.log('');

// 生成 .env.example 模板
const envExample = `# 管理員安全設定（請在 Cloud Run 中設置實際值）
ADMIN_DELETE_TOKEN=your-secure-delete-token-here
ADMIN_RESET_TOKEN=your-secure-reset-token-here
ADMIN_VERIFY_PASSWORD=your-secure-admin-password-here

# IP 白名單（用逗號分隔，留空表示不限制）
ADMIN_IP_WHITELIST=

# Firestore 備份設定
ENABLE_AUTO_BACKUP=true

# 審計日誌設定
ENABLE_AUDIT_LOG=true

# Google OAuth（公開的 Client ID，可以提交）
GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com
`;

fs.writeFileSync('backend/.env.example', envExample);
console.log('✅ 已創建 backend/.env.example 模板文件');
console.log('');

// 生成前端 .env.example
const frontendEnvExample = `# Google OAuth Client ID (前端使用，公開的)
VITE_GOOGLE_CLIENT_ID=248630813908-jjcv5u6b94aevmn0v0tn932ltmg7ekd1.apps.googleusercontent.com

# Backend API URL
VITE_API_BASE_URL=https://ichiban-backend-new-248630813908.us-central1.run.app
VITE_API_PREFIX=/api
`;

fs.writeFileSync('.env.example', frontendEnvExample);
console.log('✅ 已創建 .env.example 模板文件');
console.log('');

console.log('📋 下一步操作：');
console.log('1. 複製上面的令牌值');
console.log('2. 在 Google Cloud Console 設置環境變數');
console.log('3. 或使用以下命令：');
console.log('');
console.log(`gcloud run services update ichiban-backend-new \\
  --region=us-central1 \\
  --set-env-vars="ADMIN_DELETE_TOKEN=${deleteToken},ADMIN_RESET_TOKEN=${resetToken},ADMIN_VERIFY_PASSWORD=${adminPassword}"`);
console.log('');
console.log('⚠️  重要：請妥善保存這些令牌，它們不會再次顯示！');
console.log('');

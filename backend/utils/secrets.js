/**
 * Google Cloud Secret Manager 集成
 * 用於安全地管理敏感配置
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'goodmoney666-jackpot';

/**
 * 從 Secret Manager 獲取密鑰
 * @param {string} secretName - 密鑰名稱
 * @param {string} version - 版本（默認為 'latest'）
 * @returns {Promise<string>} 密鑰值
 */
export async function getSecret(secretName, version = 'latest') {
  try {
    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;
    const [response] = await client.accessSecretVersion({ name });
    const payload = response.payload.data.toString('utf8');
    return payload;
  } catch (error) {
    console.error(`[SECRET_MANAGER] Error accessing secret ${secretName}:`, error.message);
    // 如果 Secret Manager 失敗，回退到環境變數
    return process.env[secretName] || null;
  }
}

/**
 * 創建或更新密鑰
 * @param {string} secretName - 密鑰名稱
 * @param {string} secretValue - 密鑰值
 * @returns {Promise<void>}
 */
export async function setSecret(secretName, secretValue) {
  try {
    const parent = `projects/${projectId}`;
    
    // 檢查密鑰是否存在
    try {
      await client.getSecret({ name: `${parent}/secrets/${secretName}` });
      // 密鑰存在，添加新版本
      const [version] = await client.addSecretVersion({
        parent: `${parent}/secrets/${secretName}`,
        payload: {
          data: Buffer.from(secretValue, 'utf8'),
        },
      });
      console.log(`[SECRET_MANAGER] Added new version: ${version.name}`);
    } catch (error) {
      // 密鑰不存在，創建新密鑰
      const [secret] = await client.createSecret({
        parent,
        secretId: secretName,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });
      console.log(`[SECRET_MANAGER] Created secret: ${secret.name}`);
      
      // 添加第一個版本
      const [version] = await client.addSecretVersion({
        parent: secret.name,
        payload: {
          data: Buffer.from(secretValue, 'utf8'),
        },
      });
      console.log(`[SECRET_MANAGER] Added first version: ${version.name}`);
    }
  } catch (error) {
    console.error(`[SECRET_MANAGER] Error setting secret ${secretName}:`, error.message);
    throw error;
  }
}

/**
 * 初始化密鑰（從環境變數遷移到 Secret Manager）
 */
export async function initializeSecrets() {
  const secrets = {
    'ADMIN_DELETE_TOKEN': process.env.ADMIN_DELETE_TOKEN,
    'ADMIN_RESET_TOKEN': process.env.ADMIN_RESET_TOKEN,
    'ADMIN_VERIFY_PASSWORD': process.env.ADMIN_VERIFY_PASSWORD,
  };
  
  for (const [name, value] of Object.entries(secrets)) {
    if (value) {
      try {
        await setSecret(name, value);
        console.log(`[SECRET_MANAGER] ✅ Initialized ${name}`);
      } catch (error) {
        console.error(`[SECRET_MANAGER] ❌ Failed to initialize ${name}`);
      }
    }
  }
}

/**
 * 獲取所有應用密鑰
 * @returns {Promise<Object>} 密鑰對象
 */
export async function loadSecrets() {
  const secretNames = [
    'ADMIN_DELETE_TOKEN',
    'ADMIN_RESET_TOKEN',
    'ADMIN_VERIFY_PASSWORD',
  ];
  
  const secrets = {};
  
  for (const name of secretNames) {
    try {
      secrets[name] = await getSecret(name);
    } catch (error) {
      console.error(`[SECRET_MANAGER] Failed to load ${name}, using env var`);
      secrets[name] = process.env[name];
    }
  }
  
  return secrets;
}

export default {
  getSecret,
  setSecret,
  initializeSecrets,
  loadSecrets,
};

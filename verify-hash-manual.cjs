const crypto = require('crypto');

// 從截圖中的數據
const poolCommitmentHash = '76863af7dd37b70edcba517ee560e02183cec413cc8f6c0e52dfc713cb6315a0';

// 從 API 獲取的數據
const prizeOrder = [
  'prize-1764840309110',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831',
  'prize-1764840313831'
];

console.log('=== 驗證 Hash 計算 ===\n');
console.log('已知數據:');
console.log('- poolCommitmentHash:', poolCommitmentHash);
console.log('- prizeOrder length:', prizeOrder.length);
console.log('- prizeOrder (前3個):', prizeOrder.slice(0, 3));

console.log('\n問題分析:');
console.log('1. poolSeed 在 API 中是 undefined');
console.log('2. 這表示商品在修復前提前結束，_poolSeed 沒有被公開');
console.log('3. 需要手動將 _poolSeed 公開為 poolSeed');

console.log('\n解決方案:');
console.log('需要執行以下操作：');
console.log('1. 從 Firestore 讀取 _poolSeed');
console.log('2. 更新文檔，設置 poolSeed = _poolSeed');
console.log('3. 或者重新點擊「提前結束」按鈕（如果商品還沒有 poolSeed）');

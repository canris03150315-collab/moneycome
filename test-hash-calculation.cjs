const crypto = require('crypto');

// 從截圖中的數據（請手動填入）
const poolCommitmentHash = '61c8d3c813e931f55ecf39f6c0172dea403533af9a4e4d36692b2fd65d266232';

// 從驗證頁面的籤池順序（請從截圖複製完整的）
const prizeOrderText = `prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446
prize-1764843772446`;

// 從驗證頁面的種子碼
const poolSeed = 'abd19a71b2c407a83d4645a6f1d8e9b1c2e96b03755ffc1fd1a042aa4558386c';

console.log('=== 測試 Hash 計算 ===\n');

// 測試 1: 換行分隔 + 種子碼
const prizeArray1 = prizeOrderText.split('\n').map(s => s.trim()).filter(s => s);
const data1 = prizeArray1.join('\n') + poolSeed;
const hash1 = crypto.createHash('sha256').update(data1).digest('hex');
console.log('方法 1: 換行分隔 + 種子碼');
console.log('計算出的 Hash:', hash1);
console.log('匹配:', hash1 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 2: 逗號分隔 + 種子碼
const data2 = prizeArray1.join(',') + poolSeed;
const hash2 = crypto.createHash('sha256').update(data2).digest('hex');
console.log('方法 2: 逗號分隔 + 種子碼');
console.log('計算出的 Hash:', hash2);
console.log('匹配:', hash2 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 3: 種子碼 + 逗號分隔
const data3 = poolSeed + prizeArray1.join(',');
const hash3 = crypto.createHash('sha256').update(data3).digest('hex');
console.log('方法 3: 種子碼 + 逗號分隔');
console.log('計算出的 Hash:', hash3);
console.log('匹配:', hash3 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 4: 逗號分隔 | 種子碼
const data4 = prizeArray1.join(',') + '|' + poolSeed;
const hash4 = crypto.createHash('sha256').update(data4).digest('hex');
console.log('方法 4: 逗號分隔 | 種子碼');
console.log('計算出的 Hash:', hash4);
console.log('匹配:', hash4 === poolCommitmentHash ? '✅' : '❌');
console.log();

console.log('=== 數據檢查 ===');
console.log('獎品數量:', prizeArray1.length);
console.log('種子碼長度:', poolSeed.length);
console.log('目標 Hash:', poolCommitmentHash);

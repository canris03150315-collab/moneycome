const crypto = require('crypto');

// 從 API 獲取的正確數據
const poolCommitmentHash = '61c8d3c813e931f55acf39f6c0172dea403533af9a4e4d36692b2fd65d266232';
const poolSeed = 'bbd19a71b2c407a83d4645a6f1d0e9b1c2e96b037551fcf1d1a042aa455838cc';
const prizeOrder = [
  "prize-1764843767654",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446",
  "prize-1764843772446"
];

console.log('=== 使用 API 返回的正確數據 ===\n');

const poolData = prizeOrder.join(',') + poolSeed;
const calculatedHash = crypto.createHash('sha256').update(poolData).digest('hex');

console.log('計算出的 Hash:', calculatedHash);
console.log('目標 Hash:    ', poolCommitmentHash);
console.log('匹配:', calculatedHash === poolCommitmentHash ? '✅ 成功！' : '❌ 失敗');
console.log();
console.log('數據格式:', 'prizeOrder.join(",") + poolSeed');
console.log('獎品數量:', prizeOrder.length);
console.log('種子碼長度:', poolSeed.length);

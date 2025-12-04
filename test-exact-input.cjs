const crypto = require('crypto');

// 從 API 獲取的正確數據
const poolCommitmentHash = '61c8d3c813e931f55acf39f6c0172dea403533af9a4e4d36692b2fd65d266232';
const correctPoolSeed = 'bbd19a71b2c407a83d4645a6f1d0e9b1c2e96b037551fcf1d1a042aa455838cc';
const correctPrizeOrder = [
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

console.log('=== 測試各種可能的輸入格式 ===\n');

// 測試 1: 正確格式（逗號分隔）
const test1 = correctPrizeOrder.join(',') + correctPoolSeed;
const hash1 = crypto.createHash('sha256').update(test1).digest('hex');
console.log('測試 1: 逗號分隔（正確格式）');
console.log('Hash:', hash1);
console.log('匹配:', hash1 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 2: 換行分隔（用戶可能的輸入）
const test2 = correctPrizeOrder.join('\n') + correctPoolSeed;
const hash2 = crypto.createHash('sha256').update(test2).digest('hex');
console.log('測試 2: 換行分隔');
console.log('Hash:', hash2);
console.log('匹配:', hash2 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 3: 換行分隔 + 換行 + 種子碼（用戶可能的輸入）
const test3 = correctPrizeOrder.join('\n') + '\n' + correctPoolSeed;
const hash3 = crypto.createHash('sha256').update(test3).digest('hex');
console.log('測試 3: 換行分隔 + 換行 + 種子碼');
console.log('Hash:', hash3);
console.log('匹配:', hash3 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 4: 空格分隔
const test4 = correctPrizeOrder.join(' ') + correctPoolSeed;
const hash4 = crypto.createHash('sha256').update(test4).digest('hex');
console.log('測試 4: 空格分隔');
console.log('Hash:', hash4);
console.log('匹配:', hash4 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 5: 檢查種子碼是否有空格或換行
const poolSeedWithSpace = ' ' + correctPoolSeed;
const test5 = correctPrizeOrder.join(',') + poolSeedWithSpace;
const hash5 = crypto.createHash('sha256').update(test5).digest('hex');
console.log('測試 5: 種子碼前有空格');
console.log('Hash:', hash5);
console.log('匹配:', hash5 === poolCommitmentHash ? '✅' : '❌');
console.log();

// 測試 6: 種子碼後有換行
const poolSeedWithNewline = correctPoolSeed + '\n';
const test6 = correctPrizeOrder.join(',') + poolSeedWithNewline;
const hash6 = crypto.createHash('sha256').update(test6).digest('hex');
console.log('測試 6: 種子碼後有換行');
console.log('Hash:', hash6);
console.log('匹配:', hash6 === poolCommitmentHash ? '✅' : '❌');
console.log();

console.log('=== 結論 ===');
console.log('正確格式：prizeOrder.join(",") + poolSeed');
console.log('不能有任何額外的空格、換行符或分隔符');

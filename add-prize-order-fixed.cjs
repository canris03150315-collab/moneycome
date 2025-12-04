const fs = require('fs');

const file = 'components/LotteryPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldText = `                                        {lotterySet.poolSeed && (remainingTickets === 0 || lotterySet.earlyTerminated) && (\r
                                            <div>\r
                                                <label className="text-xs font-semibold text-green-700 block mb-1">\r
                                                    籤池種子碼 (Pool Seed) - {lotterySet.earlyTerminated ? '大獎已抽完，提前公開' : '已售完公開'}\r
                                                </label>\r
                                                <div className="bg-white rounded border border-green-200 p-2">\r
                                                    <p className="text-xs font-mono text-gray-700 break-all">{lotterySet.poolSeed}</p>\r
                                                </div>\r
                                                <p className="text-xs text-green-600 mt-1">\r
                                                    ✓ {lotterySet.earlyTerminated ? '大獎已抽完，商品提前結束' : '商品已售完'}，種子碼已公開供驗證\r
                                                </p>\r
                                            </div>\r
                                        )}`;

const newText = `                                        {lotterySet.poolSeed && (remainingTickets === 0 || lotterySet.earlyTerminated) && (\r
                                            <>\r
                                                <div className="mb-3">\r
                                                    <label className="text-xs font-semibold text-purple-700 block mb-1">\r
                                                        籤池順序 (Prize Order)\r
                                                    </label>\r
                                                    <div className="bg-white rounded border border-purple-200 p-2 max-h-40 overflow-y-auto">\r
                                                        <p className="text-xs font-mono text-gray-700 break-all whitespace-pre-wrap">\r
                                                            {(lotterySet.prizeOrder || []).join('\\n')}\r
                                                        </p>\r
                                                    </div>\r
                                                    <p className="text-xs text-purple-600 mt-1">\r
                                                        ✓ 每行一個獎品 ID，用於驗證籤池順序\r
                                                    </p>\r
                                                </div>\r
                                                <div>\r
                                                    <label className="text-xs font-semibold text-green-700 block mb-1">\r
                                                        籤池種子碼 (Pool Seed) - {lotterySet.earlyTerminated ? '大獎已抽完，提前公開' : '已售完公開'}\r
                                                    </label>\r
                                                    <div className="bg-white rounded border border-green-200 p-2">\r
                                                        <p className="text-xs font-mono text-gray-700 break-all">{lotterySet.poolSeed}</p>\r
                                                    </div>\r
                                                    <p className="text-xs text-green-600 mt-1">\r
                                                        ✓ {lotterySet.earlyTerminated ? '大獎已抽完，商品提前結束' : '商品已售完'}，種子碼已公開供驗證\r
                                                    </p>\r
                                                </div>\r
                                            </>\r
                                        )}`;

if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ 已成功添加籤池順序顯示');
} else {
    console.log('❌ 找不到要替換的文本');
}

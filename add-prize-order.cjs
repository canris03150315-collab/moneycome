const fs = require('fs');

const file = 'components/LotteryPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldText = `                                        {lotterySet.poolSeed && (remainingTickets === 0 || lotterySet.earlyTerminated) && (
                                            <div>
                                                <label className="text-xs font-semibold text-green-700 block mb-1">
                                                    籤池種子碼 (Pool Seed) - {lotterySet.earlyTerminated ? '大獎已抽完，提前公開' : '已售完公開'}
                                                </label>
                                                <div className="bg-white rounded border border-green-200 p-2">
                                                    <p className="text-xs font-mono text-gray-700 break-all">{lotterySet.poolSeed}</p>
                                                </div>
                                                <p className="text-xs text-green-600 mt-1">
                                                    ✓ {lotterySet.earlyTerminated ? '大獎已抽完，商品提前結束' : '商品已售完'}，種子碼已公開供驗證
                                                </p>
                                            </div>
                                        )}`;

const newText = `                                        {lotterySet.poolSeed && (remainingTickets === 0 || lotterySet.earlyTerminated) && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="text-xs font-semibold text-purple-700 block mb-1">
                                                        籤池順序 (Prize Order)
                                                    </label>
                                                    <div className="bg-white rounded border border-purple-200 p-2 max-h-40 overflow-y-auto">
                                                        <p className="text-xs font-mono text-gray-700 break-all whitespace-pre-wrap">
                                                            {(lotterySet.prizeOrder || []).join('\\n')}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-purple-600 mt-1">
                                                        ✓ 每行一個獎品 ID，用於驗證籤池順序
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-green-700 block mb-1">
                                                        籤池種子碼 (Pool Seed) - {lotterySet.earlyTerminated ? '大獎已抽完，提前公開' : '已售完公開'}
                                                    </label>
                                                    <div className="bg-white rounded border border-green-200 p-2">
                                                        <p className="text-xs font-mono text-gray-700 break-all">{lotterySet.poolSeed}</p>
                                                    </div>
                                                    <p className="text-xs text-green-600 mt-1">
                                                        ✓ {lotterySet.earlyTerminated ? '大獎已抽完，商品提前結束' : '商品已售完'}，種子碼已公開供驗證
                                                    </p>
                                                </div>
                                            </>
                                        )}`;

if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ 已成功添加籤池順序顯示');
} else {
    console.log('❌ 找不到要替換的文本');
    console.log('檔案可能已經修改過了');
}

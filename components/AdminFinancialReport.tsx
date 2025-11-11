import React, { useMemo, useState } from 'react';
import type { Transaction, User, Order, LotterySet } from '../types';
import { rechargeOptions } from '../data/mockData';
import { UsersIcon, TicketIcon, StackedCoinIcon } from './icons';

interface AdminFinancialReportProps {
    transactions: Transaction[];
    users: User[];
    orders: Order[];
    lotterySets: LotterySet[];
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
        <div className={`rounded-full p-3 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// Lightweight 14-day time series visualization using div bars (no external lib)
const TimeSeriesSection: React.FC<{
    title: string;
    orders: Order[];
    transactions: Transaction[];
    filterSetTitle?: string;
    perspective: 'platform' | 'user';
}> = ({ title, orders, transactions, filterSetTitle = '', perspective }) => {
    const pointsToPriceMap = React.useMemo(() => {
        const m = new Map<number, number>();
        rechargeOptions.forEach(opt => { m.set(opt.points + (opt.bonus || 0), opt.price); });
        return m;
    }, []);

    const days = React.useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const arr: string[] = [];
        for (let i=13;i>=0;i--) {
            const d = new Date(today);
            d.setDate(today.getDate()-i);
            arr.push(d.toISOString().slice(0,10));
        }
        return arr;
    }, []);

    const series = React.useMemo(() => {
        const m: Record<string, { cash: number; drawPts: number; shipPts: number; issuePts: number; recyclePts: number; }>
            = Object.fromEntries(days.map(d => [d, { cash:0, drawPts:0, shipPts:0, issuePts:0, recyclePts:0 }]));

        // Aggregate transactions by date
        for (const tx of transactions) {
            const d = (()=>{ try{ const t = new Date(tx.date); t.setHours(0,0,0,0); return t.toISOString().slice(0,10);} catch { return ''; } })();
            if (!m[d]) continue;
            if (tx.type === 'RECHARGE') {
                const price = pointsToPriceMap.get(tx.amount) || 0;
                m[d].cash += price;
                m[d].issuePts += tx.amount;
            } else if (tx.type === 'DRAW') {
                m[d].drawPts += Math.abs(tx.amount);
            } else if (tx.type === 'SHIPPING') {
                m[d].shipPts += Math.abs(tx.amount);
            } else if (tx.type === 'RECYCLE') {
                m[d].recyclePts += tx.amount;
            }
        }

        // Optional drilldown: filter orders by set title to mask unrelated draw points
        if (filterSetTitle) {
            // Build allowed draw dates from orders of that set
            const allowedDates = new Set<string>();
            for (const o of orders) {
                if (o.lotterySetTitle === filterSetTitle) {
                    const d = (()=>{ try{ const t=new Date(o.date); t.setHours(0,0,0,0); return t.toISOString().slice(0,10);} catch { return ''; } })();
                    if (d) allowedDates.add(d);
                }
            }
            for (const d of days) {
                if (!allowedDates.has(d)) {
                    // Zero out draw points on dates not matching drilldown set; keep recharge/ship as overall
                    m[d].drawPts = 0;
                }
            }
        }

        return m;
    }, [transactions, orders, filterSetTitle, days, pointsToPriceMap]);

    const maxVal = React.useMemo(() => {
        let max = 0;
        for (const d of days) {
            if (perspective === 'platform') {
                max = Math.max(max, series[d].cash, series[d].drawPts, series[d].shipPts);
            } else {
                max = Math.max(max, series[d].issuePts, series[d].drawPts);
            }
        }
        return Math.max(1, max);
    }, [series, days, perspective]);

    return (
        <div className="mt-6">
            <h4 className="font-semibold mb-2">{title}</h4>
            <div className="overflow-x-auto">
                <div className="min-w-[720px] grid grid-cols-14 gap-2">
                    {days.map(d => (
                        <div key={d} className="flex flex-col items-center">
                            <div className="h-32 w-10 flex items-end gap-0.5">
                                {perspective==='platform' ? (
                                    <>
                                        <div title={`現金 $${series[d].cash.toLocaleString()}`} className="bg-emerald-500 w-3 rounded-sm" style={{ height: `${(series[d].cash/maxVal)*100}%` }} />
                                        <div title={`抽獎 +${series[d].drawPts.toLocaleString()}P`} className="bg-sky-500 w-3 rounded-sm" style={{ height: `${(series[d].drawPts/maxVal)*100}%` }} />
                                        <div title={`運費 +${series[d].shipPts.toLocaleString()}P`} className="bg-indigo-500 w-3 rounded-sm" style={{ height: `${(series[d].shipPts/maxVal)*100}%` }} />
                                    </>
                                ) : (
                                    <>
                                        <div title={`發行 +${series[d].issuePts.toLocaleString()}P`} className="bg-emerald-500 w-3 rounded-sm" style={{ height: `${(series[d].issuePts/maxVal)*100}%` }} />
                                        <div title={`消耗 -${series[d].drawPts.toLocaleString()}P`} className="bg-rose-500 w-3 rounded-sm" style={{ height: `${(series[d].drawPts/maxVal)*100}%` }} />
                                    </>
                                )}
                            </div>
                            <div className="mt-1 text-[10px] text-gray-500">{d.slice(5)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
                {perspective==='platform' ? '綠=現金 儲值、藍=抽獎點數、靛=運費點數' : '綠=點數發行、紅=點數消耗'}
            </div>
        </div>
    );
};

export const AdminFinancialReport: React.FC<AdminFinancialReportProps> = ({ transactions, users, orders, lotterySets }) => {
    
    const reportData = useMemo(() => {
        const rechargeTxs: Transaction[] = transactions.filter((tx: Transaction) => tx.type === 'RECHARGE');
        const drawTxs: Transaction[] = transactions.filter((tx: Transaction) => tx.type === 'DRAW');
        const recycleTxs: Transaction[] = transactions.filter((tx: Transaction) => tx.type === 'RECYCLE');
        const adminAdjustmentTxs: Transaction[] = transactions.filter((tx: Transaction) => tx.type === 'ADMIN_ADJUSTMENT');
        const shippingTxs: Transaction[] = transactions.filter((tx: Transaction) => tx.type === 'SHIPPING');

        const pointsToPriceMap = new Map<number, number>();
        rechargeOptions.forEach(opt => {
            const totalPoints = opt.points + (opt.bonus || 0);
            pointsToPriceMap.set(totalPoints, opt.price);
        });

        const totalRevenue: number = rechargeTxs.reduce((sum: number, tx: Transaction) => {
            const price = pointsToPriceMap.get(tx.amount);
            return sum + (price || 0);
        }, 0);
        
        const totalPointsIssuedByRecharge: number = rechargeTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
        const totalPointsSpent: number = Math.abs(drawTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0));
        const totalPointsRecycled: number = recycleTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
        const totalAdminAdjustment: number = adminAdjustmentTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
        const totalShippingPoints: number = Math.abs(shippingTxs.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0));

        const netPointsDelta: number =
            totalPointsIssuedByRecharge
            - totalPointsSpent
            - totalShippingPoints
            + totalPointsRecycled
            + totalAdminAdjustment;

        const totalPointsInCirculation: number = users.reduce((sum: number, user: User) => sum + user.points, 0);
        const totalDraws: number = drawTxs.reduce((sum: number, tx: Transaction) => sum + (tx.prizeInstanceIds?.length || 0), 0);
        const totalUsers: number = users.length;
        
        const productPerformance: Record<string, { draws: number; points: number }> = orders.reduce((acc: Record<string, { draws: number; points: number }>, order: Order) => {
            if (!acc[order.lotterySetTitle]) {
                acc[order.lotterySetTitle] = { draws: 0, points: 0 };
            }
            acc[order.lotterySetTitle].draws += order.prizeInstanceIds.length;
            acc[order.lotterySetTitle].points += order.costInPoints;
            return acc;
        }, {} as Record<string, { draws: number; points: number }>);

        const sortedProducts = Object.entries(productPerformance)
            .map(([title, data]) => ({ title, ...data }))
            .sort((a, b) => b.points - a.points);
            
        const rechargeAnalysis: Record<number, { count: number; revenue: number }> = rechargeTxs.reduce((acc: Record<number, { count: number; revenue: number }>, tx: Transaction) => {
            const price = pointsToPriceMap.get(tx.amount);
            if (price) {
                if (!acc[price]) {
                    acc[price] = { count: 0, revenue: 0 };
                }
                acc[price].count += 1;
                acc[price].revenue += price;
            }
            return acc;
        }, {} as Record<number, { count: number; revenue: number }>);
        
        const sortedRechargeOptions = Object.entries(rechargeAnalysis)
            .map(([price, data]) => ({ price: Number(price), ...data }))
            .sort((a,b) => b.revenue - a.revenue);

        return {
            totalRevenue,
            totalPointsIssuedByRecharge,
            totalPointsSpent,
            totalPointsRecycled,
            totalAdminAdjustment,
            totalShippingPoints,
            netPointsDelta,
            totalPointsInCirculation,
            totalDraws,
            totalUsers,
            sortedProducts,
            sortedRechargeOptions
        };

    }, [transactions, users, orders, lotterySets]);

    const [view, setView] = useState<'platform' | 'user'>(() => {
        try {
            const url = new URL(window.location.href);
            const qp = url.searchParams.get('view');
            const ls = localStorage.getItem('__admin_fin_view__');
            if (qp === 'platform' || qp === 'user') return qp;
            if (ls === 'platform' || ls === 'user') return ls as any;
        } catch {}
        return 'platform';
    });
    React.useEffect(() => {
        try {
            localStorage.setItem('__admin_fin_view__', view);
            const url = new URL(window.location.href);
            url.searchParams.set('view', view);
            window.history.replaceState(null, '', url.toString());
        } catch {}
    }, [view]);

    // Drilldown by lottery set title (optional)
    const [drilldownSet, setDrilldownSet] = useState<string>('');
    const lotterySetTitles = useMemo(() => Array.from(new Set(orders.map(o => o.lotterySetTitle))).sort(), [orders]);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800">總帳報表</h2>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="總收入 (TWD)" value={`$ ${reportData.totalRevenue.toLocaleString()}`} icon={<StackedCoinIcon className="w-6 h-6 text-green-800"/>} color="bg-green-200" />
                <KpiCard title="總流通點數 (P)" value={reportData.totalPointsInCirculation.toLocaleString()} icon={<StackedCoinIcon className="w-6 h-6 text-yellow-800"/>} color="bg-yellow-200" />
                <KpiCard title="總抽獎次數" value={reportData.totalDraws.toLocaleString()} icon={<TicketIcon className="w-6 h-6 text-gray-800"/>} color="bg-gray-200" />
                <KpiCard title="總使用者數" value={reportData.totalUsers.toLocaleString()} icon={<UsersIcon className="w-6 h-6 text-sky-800"/>} color="bg-sky-200" />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setView('platform')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === 'platform' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    aria-pressed={view === 'platform'}
                >
                    平台收入視角
                </button>
                <button
                    onClick={() => setView('user')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    aria-pressed={view === 'user'}
                >
                    用戶點數視角
                </button>
            </div>

            {/* Platform Income View */}
            {view === 'platform' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">平台收入</h3>
                    <div className="mb-3 flex items-center gap-2">
                        <label className="text-sm text-gray-600">彩池篩選</label>
                        <select className="border rounded px-2 py-1 text-sm" value={drilldownSet} onChange={e=>setDrilldownSet(e.target.value)}>
                            <option value="">全部</option>
                            {lotterySetTitles.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-green-700">現金收入 (儲值)</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">$ {reportData.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-green-700">點數收入 (抽獎)</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">+{reportData.totalPointsSpent.toLocaleString()} P</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-green-700">運費收入 (點數)</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">+{reportData.totalShippingPoints.toLocaleString()} P</p>
                        </div>
                    </div>
                    {/* 14-day time series (platform perspective) */}
                    <TimeSeriesSection 
                        title="近 14 天趨勢（現金與點數收入）"
                        orders={orders}
                        transactions={transactions}
                        filterSetTitle={drilldownSet}
                        perspective="platform"
                    />
                </div>
            )}

            {/* User Points Economy View */}
            {view === 'user' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">用戶點數經濟</h3>
                    <div className="mb-3 flex items-center gap-2">
                        <label className="text-sm text-gray-600">彩池篩選</label>
                        <select className="border rounded px-2 py-1 text-sm" value={drilldownSet} onChange={e=>setDrilldownSet(e.target.value)}>
                            <option value="">全部</option>
                            {lotterySetTitles.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-green-700">點數發行 (儲值)</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">+{reportData.totalPointsIssuedByRecharge.toLocaleString()} P</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-red-700">點數消耗 (抽獎)</p>
                            <p className="text-3xl font-bold text-red-600 mt-1">-{reportData.totalPointsSpent.toLocaleString()} P</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-yellow-700">點數回收 (回收)</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-1">+{reportData.totalPointsRecycled.toLocaleString()} P</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-blue-700">管理員調整</p>
                            <p className={`text-3xl font-bold mt-1 ${reportData.totalAdminAdjustment >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {reportData.totalAdminAdjustment >= 0 ? '+' : ''}{reportData.totalAdminAdjustment.toLocaleString()} P
                            </p>
                        </div>
                    </div>
                    <TimeSeriesSection 
                        title="近 14 天趨勢（用戶點數發行/消耗）"
                        orders={orders}
                        transactions={transactions}
                        filterSetTitle={drilldownSet}
                        perspective="user"
                    />
                </div>
            )}

            {/* Points Flow Summary: show only in user perspective to避免觀念混淆 */}
            {view === 'user' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">點數流向總覽</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 font-semibold">運費點數</p>
                            <p className="text-2xl font-bold text-gray-800">-{reportData.totalShippingPoints.toLocaleString()} P</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 font-semibold">淨點數變動</p>
                            <p className={`text-2xl font-bold ${reportData.netPointsDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>{reportData.netPointsDelta >= 0 ? '+' : ''}{reportData.netPointsDelta.toLocaleString()} P</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 font-semibold">目前流通點數</p>
                            <p className="text-2xl font-bold text-gray-800">{reportData.totalPointsInCirculation.toLocaleString()} P</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Performance */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">熱門商品排行</h3>
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名稱</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">總花費點數</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">總抽獎次數</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.sortedProducts.map(product => (
                                    <tr key={product.title}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{product.title}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 text-right font-semibold">{product.points.toLocaleString()} P</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 text-right">{product.draws.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                 {/* Recharge Analysis */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">儲值方案分析</h3>
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">方案價格 (TWD)</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">銷售次數</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">貢獻收入</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.sortedRechargeOptions.map(option => (
                                    <tr key={option.price}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">$ {option.price.toLocaleString()}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 text-right">{option.count.toLocaleString()}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 text-right font-semibold">$ {option.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
};
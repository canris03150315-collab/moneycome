import React, { useState, useEffect } from 'react';
import type { Transaction, PrizeInstance } from '../types';

// 交易類型中文映射
const getTransactionTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
        'RECHARGE': '充值',
        'DRAW': '抽獎',
        'RECYCLE': '回收',
        'ADMIN_ADJUSTMENT': '管理員調整',
        'SHIPPING': '運送',
        'PICKUP_REQUEST': '自取'
    };
    return typeMap[type] || type;
};

interface AdminTransactionHistoryProps {
    transactions: Transaction[];
    inventory: { [key: string]: PrizeInstance };
    initialFilter?: string;
}

export const AdminTransactionHistory: React.FC<AdminTransactionHistoryProps> = ({ transactions, inventory, initialFilter = '' }) => {
    const [filterTerm, setFilterTerm] = useState(initialFilter);
    const [typeFilter, setTypeFilter] = useState<''|'RECHARGE'|'DRAW'|'RECYCLE'|'ADMIN_ADJUSTMENT'|'SHIPPING'|'PICKUP_REQUEST'>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [perspective, setPerspective] = useState<'user'|'platform'>(() => {
        try { const url = new URL(window.location.href); const v=url.searchParams.get('txView'); return (v==='platform'?'platform':'user'); } catch { return 'user'; }
    });

    // URL -> State on mount
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            setFilterTerm(url.searchParams.get('q') || initialFilter || '');
            setTypeFilter((url.searchParams.get('type') as any) || '');
            setStartDate(url.searchParams.get('start') || '');
            setEndDate(url.searchParams.get('end') || '');
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync to URL
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            const sp = url.searchParams;
            const setOrDel = (k:string,v:string) => { if(!v) sp.delete(k); else sp.set(k,v); };
            setOrDel('q', filterTerm);
            setOrDel('type', typeFilter);
            setOrDel('start', startDate);
            setOrDel('end', endDate);
            setOrDel('txView', perspective);
            url.search = sp.toString();
            window.history.replaceState(null, '', url.toString());
        } catch {}
    }, [filterTerm, typeFilter, startDate, endDate, perspective]);

    // Popstate support
    useEffect(() => {
        const handler = () => {
            try {
                const url = new URL(window.location.href);
                setFilterTerm(url.searchParams.get('q') || '');
                setTypeFilter((url.searchParams.get('type') as any) || '');
                setStartDate(url.searchParams.get('start') || '');
                setEndDate(url.searchParams.get('end') || '');
                setPerspective((url.searchParams.get('txView') as any) || 'user');
            } catch {}
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);

    useEffect(() => { setFilterTerm(initialFilter); }, [initialFilter]);

    const withinRange = (dstr: string) => {
        try {
            const t = new Date(dstr).getTime();
            if (startDate) { const s = new Date(startDate).setHours(0,0,0,0); if (t < s) return false; }
            if (endDate) { const e = new Date(endDate).setHours(23,59,59,999); if (t > e) return false; }
            return true;
        } catch { return true; }
    };

    const filtered = transactions
        .filter(tx => filterTerm === '' || tx.username.toLowerCase().includes(filterTerm.toLowerCase()) || tx.userId.toLowerCase().includes(filterTerm.toLowerCase()))
        .filter(tx => !typeFilter || tx.type === typeFilter)
        .filter(tx => withinRange(tx.date))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const exportCsv = (rows: Transaction[]) => {
        const headers = ['日期','使用者','ID','類型','金額(P)','描述'];
        const toRow = (tx: Transaction) => [
            (()=>{ try { return new Date(tx.date).toLocaleString('zh-TW',{hour12:false}); } catch { return tx.date; } })(),
            tx.username,
            tx.userId,
            tx.type,
            String(tx.amount),
            tx.description
        ];
        const data = [headers, ...rows.map(toRow)]
            .map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g,'""') + '"' : String(v)).join(','))
            .join('\n');
        const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='transactions.csv'; a.click(); URL.revokeObjectURL(url);
    };

    const getAmountDisplay = (tx: Transaction) => {
        if (perspective === 'platform' && (tx.type === 'DRAW' || tx.type === 'SHIPPING')) {
            const amt = Math.abs(tx.amount);
            return { text: `+${amt.toLocaleString()}`, cls: 'text-green-600' };
        }
        const pos = tx.amount > 0;
        return { text: pos ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString(), cls: pos ? 'text-green-600' : 'text-red-600' };
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-bold">交易紀錄</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <input type="text" placeholder="搜尋使用者名稱或 ID..." value={filterTerm} onChange={(e)=>setFilterTerm(e.target.value)} className="w-full md:w-56 p-2 border border-gray-300 rounded-md" />
                    <select className="p-2 border rounded" value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)}>
                        <option value="">類型：全部</option>
                        {['RECHARGE','DRAW','RECYCLE','ADMIN_ADJUSTMENT','SHIPPING','PICKUP_REQUEST'].map(t=> <option key={t} value={t}>{getTransactionTypeLabel(t)}</option>)}
                    </select>
                    <input type="date" className="p-2 border rounded" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                    <span className="text-gray-500">—</span>
                    <input type="date" className="p-2 border rounded" value={endDate} onChange={e=>setEndDate(e.target.value)} />
                    <button onClick={()=>exportCsv(filtered)} className="px-3 py-2 rounded border">匯出 CSV（目前篩選）</button>
                    <div className="ml-2 flex items-center gap-1 text-sm">
                        <span className="text-gray-600">視角</span>
                        <button onClick={()=>setPerspective('user')} className={`px-2 py-1 rounded ${perspective==='user'?'bg-black text-white':'bg-gray-100'}`}>用戶</button>
                        <button onClick={()=>setPerspective('platform')} className={`px-2 py-1 rounded ${perspective==='platform'?'bg-black text-white':'bg-gray-100'}`}>平台</button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用者</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額 (P)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.map(tx => {
                            const amt = getAmountDisplay(tx);
                            return (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">{new Date(tx.date).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top" title={tx.userId}>{tx.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            tx.type === 'RECHARGE' ? 'bg-green-100 text-green-800' :
                                            tx.type === 'DRAW' ? (perspective==='platform' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') :
                                            tx.type === 'ADMIN_ADJUSTMENT' ? 'bg-blue-100 text-blue-800' :
                                            tx.type === 'SHIPPING' ? (perspective==='platform' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {getTransactionTypeLabel(tx.type)}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold align-top ${amt.cls}`}>
                                        {amt.text}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                        <div>{tx.description}</div>
                                        {tx.type === 'DRAW' && tx.prizeInstanceIds && tx.prizeInstanceIds.length > 0 && (
                                            <ul className="mt-2 pl-4 list-disc space-y-1 text-xs text-gray-700">
                                                {tx.prizeInstanceIds.map((instanceId, index) => {
                                                    const prize = inventory[instanceId];
                                                    if (!prize) return (
                                                        <li key={`${tx.id}-prize-${index}`}>
                                                            <span className="text-red-500">無法找到獎品資料 (ID: {instanceId})</span>
                                                        </li>
                                                    );
                                                    return (
                                                        <li key={`${tx.id}-prize-${index}`}>
                                                            <span className="font-semibold">{prize.grade}</span>: {prize.name}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {filtered.length === 0 && <p className="text-center py-4 text-gray-500">沒有符合條件的交易紀錄。</p>}
            </div>
        </div>
    );
};
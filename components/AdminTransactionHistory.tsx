import React, { useState, useEffect, useMemo } from 'react';
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

// 智能時間顯示函數 - 支援缺失日期
const formatSmartTime = (dateString: string | undefined): { relative: string; full: string; hasDate: boolean } => {
    if (!dateString) {
        return {
            relative: '日期缺失',
            full: '此交易記錄缺少日期信息',
            hasDate: false
        };
    }
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relative = '';
    if (diffMins < 1) {
        relative = '剛剛';
    } else if (diffMins < 60) {
        relative = `${diffMins}分鐘前`;
    } else if (diffHours < 24) {
        relative = `${diffHours}小時前`;
    } else if (diffDays < 7) {
        relative = `${diffDays}天前`;
    } else {
        relative = date.toLocaleDateString('zh-TW');
    }

    return {
        relative,
        full: date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        hasDate: true
    };
};

interface AdminTransactionHistoryProps {
    transactions: Transaction[];
    inventory: { [key: string]: PrizeInstance };
    initialFilter?: string;
}

export const AdminTransactionHistory: React.FC<AdminTransactionHistoryProps> = ({ transactions, inventory, initialFilter = '' }) => {
    // 基本篩選狀態
    const [filterTerm, setFilterTerm] = useState(initialFilter);
    const [typeFilter, setTypeFilter] = useState<''|'RECHARGE'|'DRAW'|'RECYCLE'|'ADMIN_ADJUSTMENT'|'SHIPPING'|'PICKUP_REQUEST'>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [perspective, setPerspective] = useState<'user'|'platform'>(() => {
        try { const url = new URL(window.location.href); const v=url.searchParams.get('txView'); return (v==='platform'?'platform':'user'); } catch { return 'user'; }
    });

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    
    // 排序狀態
    const [sortField, setSortField] = useState<'date'|'amount'|'username'|'type'>('date');
    const [sortDirection, setSortDirection] = useState<'asc'|'desc'>('desc');

    // 高級搜尋狀態
    const [advancedSearch, setAdvancedSearch] = useState({
        amountMin: '',
        amountMax: '',
        description: ''
    });

    // URL -> State on mount
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            setFilterTerm(url.searchParams.get('q') || initialFilter || '');
            setTypeFilter((url.searchParams.get('type') as any) || '');
            setStartDate(url.searchParams.get('start') || '');
            setEndDate(url.searchParams.get('end') || '');
            setCurrentPage(parseInt(url.searchParams.get('page') || '1'));
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
            setOrDel('page', currentPage.toString());
            setOrDel('txView', perspective);
            url.search = sp.toString();
            window.history.replaceState(null, '', url.toString());
        } catch {}
    }, [filterTerm, typeFilter, startDate, endDate, currentPage, perspective]);

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

    // 高級篩選和排序邏輯
    const filteredAndSorted = useMemo(() => {
        let filtered = transactions.filter(tx => {
            // 防禦性編程：檢查交易是否有必要的欄位
            if (!tx || !tx.date) {
                // 缺失日期的交易仍可通過其他條件篩選
                const textMatch = !filterTerm || 
                    (tx.username && tx.username.toLowerCase().includes(filterTerm.toLowerCase())) ||
                    (tx.userId && tx.userId.toLowerCase().includes(filterTerm.toLowerCase())) ||
                    (tx.description && tx.description.toLowerCase().includes(filterTerm.toLowerCase())) ||
                    getTransactionTypeLabel(tx.type).toLowerCase().includes(filterTerm.toLowerCase());
                
                const typeMatch = !typeFilter || tx.type === typeFilter;
                const amountMatch = (!advancedSearch.amountMin || Math.abs(tx.amount) >= parseInt(advancedSearch.amountMin)) &&
                                   (!advancedSearch.amountMax || Math.abs(tx.amount) <= parseInt(advancedSearch.amountMax));
                const descMatch = !advancedSearch.description || 
                    (tx.description && tx.description.toLowerCase().includes(advancedSearch.description.toLowerCase()));
                
                return textMatch && typeMatch && amountMatch && descMatch;
            }
            
            // 基本文字搜尋 (用戶名、ID、描述)
            const textMatch = !filterTerm || 
                tx.username.toLowerCase().includes(filterTerm.toLowerCase()) ||
                tx.userId.toLowerCase().includes(filterTerm.toLowerCase()) ||
                tx.description.toLowerCase().includes(filterTerm.toLowerCase()) ||
                getTransactionTypeLabel(tx.type).toLowerCase().includes(filterTerm.toLowerCase());
            
            // 類型篩選
            const typeMatch = !typeFilter || tx.type === typeFilter;
            
            // 日期範圍篩選 - 安全版本
            let startMatch = true;
            let endMatch = true;
            
            if (startDate && tx.date) {
                // 安全處理日期：確保轉換為字符串
                const dateStr = typeof tx.date === 'string' ? tx.date : String(tx.date);
                const txDateStr = dateStr.split('T')[0];
                startMatch = txDateStr >= startDate;
            }
            
            if (endDate && tx.date) {
                // 安全處理日期：確保轉換為字符串
                const dateStr = typeof tx.date === 'string' ? tx.date : String(tx.date);
                const txDateStr = dateStr.split('T')[0];
                endMatch = txDateStr <= endDate;
            }
            
            // 金額範圍篩選
            const amountMatch = (!advancedSearch.amountMin || Math.abs(tx.amount) >= parseInt(advancedSearch.amountMin)) &&
                               (!advancedSearch.amountMax || Math.abs(tx.amount) <= parseInt(advancedSearch.amountMax));
            
            // 描述篩選
            const descMatch = !advancedSearch.description || 
                tx.description.toLowerCase().includes(advancedSearch.description.toLowerCase());
            
            return textMatch && typeMatch && startMatch && endMatch && amountMatch && descMatch;
        });

        // 排序 - 安全版本
        filtered.sort((a, b) => {
            let aVal: any, bVal: any;
            
            switch (sortField) {
                case 'date':
                    // 安全處理缺失日期
                    if (!a.date) return 1; // 缺失日期的排到後面
                    if (!b.date) return -1;
                    aVal = new Date(a.date);
                    bVal = new Date(b.date);
                    break;
                case 'amount':
                    aVal = Math.abs(a.amount);
                    bVal = Math.abs(b.amount);
                    break;
                case 'username':
                    aVal = a.username.toLowerCase();
                    bVal = b.username.toLowerCase();
                    break;
                case 'type':
                    aVal = getTransactionTypeLabel(a.type);
                    bVal = getTransactionTypeLabel(b.type);
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [transactions, filterTerm, typeFilter, startDate, endDate, advancedSearch, sortField, sortDirection]);

    // 分頁邏輯
    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSorted, currentPage, itemsPerPage]);

    // 排序處理函數
    const handleSort = (field: 'date'|'amount'|'username'|'type') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
        setCurrentPage(1); // 重置到第一頁
    };

    // 重置篩選
    const resetFilters = () => {
        setFilterTerm('');
        setTypeFilter('');
        setStartDate('');
        setEndDate('');
        setAdvancedSearch({ amountMin: '', amountMax: '', description: '' });
        setCurrentPage(1);
        setSortField('date');
        setSortDirection('desc');
    };

    const withinRange = (dstr: string) => {
        try {
            const t = new Date(dstr).getTime();
            if (startDate) { const s = new Date(startDate).setHours(0,0,0,0); if (t < s) return false; }
            if (endDate) { const e = new Date(endDate).setHours(23,59,59,999); if (t > e) return false; }
            return true;
        } catch { return true; }
    };

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
            {/* 標題和統計 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">交易紀錄</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        共 {filteredAndSorted.length} 筆交易
                        {filteredAndSorted.length !== transactions.length && 
                            ` (從 ${transactions.length} 筆中篩選)`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        重置篩選
                    </button>
                    <button 
                        onClick={() => exportCsv(filteredAndSorted)}
                        className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
                    >
                        匯出 CSV
                    </button>
                </div>
            </div>

            {/* 搜尋和篩選區域 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                {/* 基本搜尋 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            搜尋 (用戶名、ID、描述、類型)
                        </label>
                        <input
                            type="text"
                            placeholder="輸入關鍵字搜尋..."
                            value={filterTerm}
                            onChange={(e) => {
                                setFilterTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">交易類型</label>
                        <select 
                            value={typeFilter} 
                            onChange={e => {
                                setTypeFilter(e.target.value as any);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">全部類型</option>
                            {['RECHARGE','DRAW','RECYCLE','ADMIN_ADJUSTMENT','SHIPPING','PICKUP_REQUEST'].map(t => 
                                <option key={t} value={t}>{getTransactionTypeLabel(t)}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">視角</label>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setPerspective('user')}
                                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                                    perspective === 'user' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                用戶
                            </button>
                            <button 
                                onClick={() => setPerspective('platform')}
                                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                                    perspective === 'platform' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                平台
                            </button>
                        </div>
                    </div>
                </div>

                {/* 日期範圍和高級篩選 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">最小金額</label>
                        <input 
                            type="number" 
                            placeholder="0"
                            value={advancedSearch.amountMin}
                            onChange={e => {
                                setAdvancedSearch({...advancedSearch, amountMin: e.target.value});
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">最大金額</label>
                        <input 
                            type="number" 
                            placeholder="無限制"
                            value={advancedSearch.amountMax}
                            onChange={e => {
                                setAdvancedSearch({...advancedSearch, amountMax: e.target.value});
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述搜尋</label>
                        <input 
                            type="text" 
                            placeholder="關鍵字"
                            value={advancedSearch.description}
                            onChange={e => {
                                setAdvancedSearch({...advancedSearch, description: e.target.value});
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
            {/* 改進的表格 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center gap-1">
                                        日期
                                        {sortField === 'date' && (
                                            <span className="text-blue-600">
                                                {sortDirection === 'desc' ? '↓' : '↑'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('username')}
                                >
                                    <div className="flex items-center gap-1">
                                        使用者
                                        {sortField === 'username' && (
                                            <span className="text-blue-600">
                                                {sortDirection === 'desc' ? '↓' : '↑'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center gap-1">
                                        類型
                                        {sortField === 'type' && (
                                            <span className="text-blue-600">
                                                {sortDirection === 'desc' ? '↓' : '↑'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        金額 (P)
                                        {sortField === 'amount' && (
                                            <span className="text-blue-600">
                                                {sortDirection === 'desc' ? '↓' : '↑'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    描述
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-lg font-medium">沒有找到符合條件的交易紀錄</p>
                                            <p className="text-sm mt-1">請調整篩選條件或重置搜尋</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map(tx => {
                                    const amt = getAmountDisplay(tx);
                                    const timeDisplay = formatSmartTime(tx.date);
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    {!timeDisplay.hasDate && (
                                                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" title="日期缺失">
                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className={`${timeDisplay.hasDate ? 'text-gray-900 font-medium' : 'text-yellow-600 font-medium'}`}>
                                                            {timeDisplay.relative}
                                                        </span>
                                                        <span className="text-gray-500 text-xs" title={timeDisplay.full}>
                                                            {timeDisplay.hasDate ? new Date(tx.date).toLocaleDateString('zh-TW') : '需要修復'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 font-medium">{tx.username}</span>
                                                    <span className="text-gray-500 text-xs" title={tx.userId}>
                                                        {tx.userId.slice(0, 8)}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    tx.type === 'RECHARGE' ? 'bg-green-100 text-green-800' :
                                                    tx.type === 'DRAW' ? (perspective==='platform' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') :
                                                    tx.type === 'ADMIN_ADJUSTMENT' ? 'bg-blue-100 text-blue-800' :
                                                    tx.type === 'SHIPPING' ? (perspective==='platform' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {getTransactionTypeLabel(tx.type)}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${amt.cls}`}>
                                                {amt.text}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 分頁控制 */}
                {totalPages > 1 && (
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                顯示第 {((currentPage - 1) * itemsPerPage) + 1} 到 {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} 筆，
                                共 {filteredAndSorted.length} 筆交易
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                                >
                                    首頁
                                </button>
                                <button
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                                >
                                    上一頁
                                </button>
                                
                                {/* 頁碼按鈕 */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 hover:bg-gray-100'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                                >
                                    下一頁
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                                >
                                    末頁
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
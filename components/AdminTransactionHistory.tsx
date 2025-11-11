import React, { useState, useEffect } from 'react';
import type { Transaction, PrizeInstance } from '../types';

interface AdminTransactionHistoryProps {
    transactions: Transaction[];
    inventory: { [key: string]: PrizeInstance };
    initialFilter?: string;
}

export const AdminTransactionHistory: React.FC<AdminTransactionHistoryProps> = ({ transactions, inventory, initialFilter = '' }) => {
    const [filterTerm, setFilterTerm] = useState(initialFilter);

    useEffect(() => {
        setFilterTerm(initialFilter);
    }, [initialFilter]);

    const sortedAndFilteredTransactions = [...transactions]
        .filter(tx =>
            filterTerm === '' ||
            tx.username.toLowerCase().includes(filterTerm.toLowerCase()) ||
            tx.userId.toLowerCase().includes(filterTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">交易紀錄</h2>
                <input
                    type="text"
                    placeholder="搜尋使用者名稱或 ID..."
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="w-full max-w-sm p-2 border border-gray-300 rounded-md"
                />
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
                        {sortedAndFilteredTransactions.map(tx => (
                            <tr key={tx.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">{new Date(tx.date).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top" title={tx.userId}>{tx.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        tx.type === 'RECHARGE' ? 'bg-green-100 text-green-800' :
                                        tx.type === 'DRAW' ? 'bg-red-100 text-red-800' :
                                        tx.type === 'ADMIN_ADJUSTMENT' ? 'bg-blue-100 text-blue-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold align-top ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
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
                        ))}
                    </tbody>
                </table>
                 {sortedAndFilteredTransactions.length === 0 && <p className="text-center py-4 text-gray-500">沒有符合條件的交易紀錄。</p>}
            </div>
        </div>
    );
};
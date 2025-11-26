import React, { useMemo } from 'react';
import type { Order } from '../types';
import { TrophyIcon } from './icons';

interface WinnersListProps {
    orders: Order[];
}

const WinnersListComponent: React.FC<WinnersListProps> = ({ orders }) => {
    const winnerData = useMemo(() => {
        if (!orders || !Array.isArray(orders)) return [];
        return [...orders]
            .filter(order => order && (order.date || order.createdAt))
            .sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.createdAt || 0).getTime();
                return dateB - dateA;
            })
            .map(order => {
                // 後端已經返回格式化的資訊
                const maskedUsername = (order as any).usernameMasked || '匿名';
                const prizeSummaryString = (order as any).prizeSummaryString || '中獎了！';

                const orderDate = order.date || order.createdAt || new Date().toISOString();
                const dateObj = new Date(orderDate);
                const dateString = isNaN(dateObj.getTime()) 
                    ? '日期無效'
                    : dateObj.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

                return {
                    id: order.id,
                    maskedUsername,
                    prizeSummaryString,
                    date: dateString,
                };
            });
    }, [orders]);

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <TrophyIcon className="w-7 h-7 text-amber-500" />
                最近得獎紀錄
            </h2>
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                {winnerData.length === 0 ? (
                     <div className="text-center text-gray-500 py-8">
                        還沒有人中獎，快來搶頭香！
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {winnerData.map(winner => (
                                <li key={winner.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 text-lg">
                                            恭喜 <span className="text-black">{winner.maskedUsername}</span>
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            抽中：<span className="font-semibold">{winner.prizeSummaryString}</span>
                                        </p>
                                    </div>
                                    <div className="text-right text-sm text-gray-400">
                                        {winner.date}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export const WinnersList = React.memo(WinnersListComponent, (prev, next) => {
    // 簡單比較 orders 陣列
    if (prev.orders.length !== next.orders.length) return false;
    if (prev.orders !== next.orders) return false;
    return true;
});
import React, { useMemo } from 'react';
import type { Order, User, PrizeInstance } from '../types';
import { TrophyIcon } from './icons';

// Utility function for masking username
const maskUsername = (name: string): string => {
    if (!name) return '匿名';
    
    // 如果是 email 格式，分別遮罩本地部分和域名部分
    if (name.includes('@')) {
        const [local, domain] = name.split('@');
        const localLen = local.length;
        let maskedLocal = local;
        
        if (localLen > 2) {
            maskedLocal = `${local[0]}${'*'.repeat(localLen - 2)}${local[localLen - 1]}`;
        } else if (localLen === 2) {
            maskedLocal = `${local[0]}*`;
        }
        
        return `${maskedLocal}@${domain}`;
    }
    
    // 一般用戶名遮罩
    const len = name.length;
    if (len <= 1) return name;
    if (len === 2) return `${name[0]}*`;
    return `${name[0]}${'*'.repeat(len - 2)}${name[len - 1]}`;
};
 

function sameOrderArrays(a: Order[], b: Order[]) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < Math.min(a.length, 50); i++) {
        if (a[i].id !== b[i].id || a[i].date !== b[i].date) return false;
    }
    return true;
}

function sameUsers(a: User[], b: User[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < Math.min(a.length, 50); i++) {
        if (a[i].id !== b[i].id || a[i].username !== b[i].username) return false;
    }
    return true;
}

// Memoized export moved to after component declaration to avoid TDZ issues

interface WinnersListProps {
    orders: Order[];
    users: User[];
    inventory: { [key: string]: PrizeInstance };
}

const WinnersListComponent: React.FC<WinnersListProps> = ({ orders, users, inventory }) => {
    const userMap = useMemo(() => new Map((users || []).map(u => [u.id, u.username])), [users]);

    const winnerData = useMemo(() => {
        if (!orders || !Array.isArray(orders)) return [];
        return [...orders]
            .filter(order => order && (order.date || order.createdAt)) // 過濾掉沒有任何日期的訂單
            .sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || 0).getTime();
                const dateB = new Date(b.date || b.createdAt || 0).getTime();
                return dateB - dateA;
            })
            .map(order => {
                const maskedUsername = (order as any).usernameMasked
                    ? (order as any).usernameMasked
                    : maskUsername(((order as any).username || userMap.get(order.userId) || '').trim());
                
                console.log('[WinnersList] Processing order:', {
                    orderId: order.id,
                    prizeSummary: order.prizeSummary,
                    prizeInstanceIds: order.prizeInstanceIds,
                    inventoryKeys: Object.keys(inventory),
                });
                
                const prizeSummary = order.prizeSummary && Object.keys(order.prizeSummary).length
                    ? order.prizeSummary
                    : (order.prizeInstanceIds || [])
                        .map(id => {
                            const prize = inventory[id];
                            console.log('[WinnersList] Looking up prize:', { id, prize });
                            return prize;
                        })
                        .filter(Boolean)
                        .reduce((acc, prize) => {
                            acc[prize.grade] = (acc[prize.grade] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>);

                console.log('[WinnersList] Final prizeSummary:', prizeSummary);
                console.log('[WinnersList] prizeSummary entries:', Object.entries(prizeSummary));

                const prizeSummaryString = Object.entries(prizeSummary)
                    .map(([grade, count]) => `${grade} x${count}`)
                    .join(', ');
                
                console.log('[WinnersList] prizeSummaryString:', prizeSummaryString);
                
                const finalString = prizeSummaryString || '無獎品資訊';

                const orderDate = order.date || order.createdAt || new Date().toISOString();
                const dateObj = new Date(orderDate);
                const dateString = isNaN(dateObj.getTime()) 
                    ? '日期無效'
                    : dateObj.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

                return {
                    id: order.id,
                    maskedUsername,
                    prizeSummaryString: finalString,
                    date: dateString,
                };
            });
    }, [orders, userMap, inventory]);

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
    if (!sameOrderArrays(prev.orders, next.orders)) return false;
    if (!sameUsers(prev.users, next.users)) return false;
    if (prev.inventory !== next.inventory) return false;
    return true;
});
import React, { useState, useMemo, useEffect } from 'react';
import type { PrizeInstance, LotterySet } from '../types';
import { RECYCLABLE_GRADES, RECYCLE_VALUE } from '../data/mockData';
import { CheckCircleIcon } from './icons';

// 這個檔案的目的，是提供一個完整可用的 InventoryView 供你複製貼回 ProfilePage.tsx
// 如需使用，請將整個 InventoryView 函式複製，取代 ProfilePage.tsx 內原本的 InventoryView

type SelectionMode = 'none' | 'recycle' | 'shipping' | 'pickup';

interface InventoryViewProps {
    allPrizes: PrizeInstance[];
    lotterySets: LotterySet[];
    onRecycle: (prize: PrizeInstance) => void;
    selectionMode: SelectionMode;
    selectedPrizeIds: Set<string>;
    onPrizeSelect: (prizeId: string) => void;
    isLoading?: boolean;
}

const gradeOrder: Record<string, number> = {
    'A賞': 1, 'B賞': 2, 'C賞': 3, 'D賞': 4, 'E賞': 5, 'F賞': 6, 'G賞': 7, '最後賞': 0, '一般賞': 8
};

export const InventoryView: React.FC<InventoryViewProps> = ({ allPrizes, lotterySets, onRecycle, selectionMode, selectedPrizeIds, onPrizeSelect, isLoading = false }) => {
    // 篩選和排序狀態
    const [filterStatus, setFilterStatus] = useState<string>('AVAILABLE');
    const [filterGrade, setFilterGrade] = useState<string>('ALL');
    const [filterLottery, setFilterLottery] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'grade' | 'date'>('date');
    const [displayCount, setDisplayCount] = useState(12);

    // 當篩選條件改變時，重置顯示數量
    useEffect(() => {
        setDisplayCount(12);
    }, [filterGrade, filterStatus, filterLottery, searchQuery, sortBy]);

    const lotterySetMap = useMemo(() => new Map(lotterySets.map(set => [set.id, set])), [lotterySets]);

    // 處理篩選和排序
    const processedPrizes = useMemo(() => {
        let filtered = [...allPrizes];

        // 狀態篩選
        if (filterStatus === 'AVAILABLE') {
            filtered = filtered.filter((p: PrizeInstance) => !p.isRecycled && p.status === 'IN_INVENTORY');
        } else if (filterStatus === 'RECYCLED') {
            filtered = filtered.filter((p: PrizeInstance) => p.isRecycled);
        } else if (filterStatus === 'SHIPPED') {
            filtered = filtered.filter((p: PrizeInstance) => p.status === 'IN_SHIPMENT' || p.status === 'SHIPPED');
        } else if (filterStatus === 'PICKUP') {
            filtered = filtered.filter((p: PrizeInstance) => p.status === 'PENDING_PICKUP' || p.status === 'PICKED_UP');
        }

        // 等級篩選
        if (filterGrade !== 'ALL') {
            filtered = filtered.filter((p: PrizeInstance) => p.grade === filterGrade);
        }

        // 抽獎活動篩選
        if (filterLottery !== 'ALL') {
            filtered = filtered.filter((p: PrizeInstance) => p.lotterySetId === filterLottery);
        }

        // 搜尋
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((p: PrizeInstance) =>
                p.name.toLowerCase().includes(query) ||
                p.grade.toLowerCase().includes(query)
            );
        }

        // 排序
        if (sortBy === 'grade') {
            filtered.sort((a: PrizeInstance, b: PrizeInstance) => {
                const orderA = gradeOrder[a.grade] ?? 99;
                const orderB = gradeOrder[b.grade] ?? 99;
                return orderA - orderB;
            });
        } else {
            filtered.sort((a: PrizeInstance, b: PrizeInstance) => {
                const dateA = new Date((a as any).wonAt || (a as any).drawnAt || 0).getTime();
                const dateB = new Date((b as any).wonAt || (b as any).drawnAt || 0).getTime();
                return dateB - dateA;
            });
        }

        return filtered;
    }, [allPrizes, filterGrade, filterStatus, filterLottery, searchQuery, sortBy]);

    const displayedPrizes = processedPrizes.slice(0, displayCount);

    const availableGrades = useMemo(() => {
        const grades = new Set(allPrizes.map((p: PrizeInstance) => p.grade));
        return Array.from(grades).sort((a: string, b: string) => (gradeOrder[a] ?? 99) - (gradeOrder[b] ?? 99));
    }, [allPrizes]);

    return (
        <div>
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">載入收藏庫中...</p>
                </div>
            ) : processedPrizes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">您的收藏庫是空的，快去抽獎吧！</p>
            ) : (
                <div className="space-y-4">
                    {/* 篩選與排序 UI（只在非選擇模式下顯示） */}
                    {selectionMode === 'none' && (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {/* 狀態篩選 */}
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="ALL">全部狀態</option>
                                    <option value="AVAILABLE">可用</option>
                                    <option value="RECYCLED">已回收</option>
                                    <option value="SHIPPED">運送中/已送達</option>
                                    <option value="PICKUP">待自取/已取貨</option>
                                </select>

                                {/* 等級篩選 */}
                                <select
                                    value={filterGrade}
                                    onChange={(e) => setFilterGrade(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="ALL">全部等級</option>
                                    {availableGrades.map(grade => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>

                                {/* 活動篩選 */}
                                <select
                                    value={filterLottery}
                                    onChange={(e) => setFilterLottery(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="ALL">全部活動</option>
                                    {lotterySets.map(set => (
                                        <option key={set.id} value={set.id}>{set.title}</option>
                                    ))}
                                </select>

                                {/* 排序 */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'grade' | 'date')}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="date">最新獲得</option>
                                    <option value="grade">等級排序</option>
                                </select>
                            </div>

                            {/* 搜尋框 */}
                            <input
                                type="text"
                                placeholder="搜尋獎品名稱或等級..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                            />

                            {/* 統計資訊 */}
                            <div className="text-sm text-gray-600">
                                顯示 <span className="font-semibold">{displayedPrizes.length}</span> / <span className="font-semibold">{processedPrizes.length}</span> 件獎品
                                {(filterStatus !== 'AVAILABLE' || filterGrade !== 'ALL' || filterLottery !== 'ALL' || searchQuery) && (
                                    <span className="ml-2 text-blue-600">(已篩選，共 {allPrizes.length} 件)</span>
                                )}
                            </div>
                        </div>
                    )}

                    {selectionMode !== 'none' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            ⚠️ 選擇模式中，篩選功能已停用
                        </div>
                    )}

                    {/* 獎品格子 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {displayedPrizes.map(prize => {
                            const parentSet = lotterySetMap.get(prize.lotterySetId);
                            const isRecyclable = RECYCLABLE_GRADES.includes(prize.grade) && prize.status === 'IN_INVENTORY' && !prize.isRecycled;
                            const isRecycled = !!prize.isRecycled;
                            const isShippable = prize.status === 'IN_INVENTORY' && !prize.isRecycled;
                            const perPrizePickup = (prize as any).allowSelfPickup === true;
                            const fallbackSetPickup = !!parentSet?.allowSelfPickup;
                            const isPickable = (perPrizePickup || fallbackSetPickup) && prize.status === 'IN_INVENTORY' && !prize.isRecycled;
                            const recycleValue = prize.recycleValue || RECYCLE_VALUE;
                            const isSelected = selectedPrizeIds.has(prize.instanceId);

                            let canBeSelected = false;
                            let isDisabled = false;
                            if (selectionMode === 'recycle') {
                                canBeSelected = isRecyclable;
                                isDisabled = !isRecyclable;
                            } else if (selectionMode === 'shipping') {
                                canBeSelected = isShippable;
                                isDisabled = !isShippable;
                            } else if (selectionMode === 'pickup') {
                                canBeSelected = isPickable;
                                isDisabled = !isPickable;
                            }

                            return (
                                <div
                                    key={prize.instanceId}
                                    className={`border rounded-lg text-center transition-all duration-300 shadow-sm flex flex-col relative
                                        ${(prize.status !== 'IN_INVENTORY' || isRecycled) ? 'bg-gray-100' : 'bg-white'}
                                        ${canBeSelected ? 'cursor-pointer' : ''}
                                        ${isDisabled || isRecycled ? 'opacity-70' : ''}
                                        ${isRecycled ? 'border-2 border-red-300 border-dashed' : ''}
                                        ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                                    onClick={() => canBeSelected && onPrizeSelect(prize.instanceId)}
                                >
                                    {isSelected && (
                                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1 z-10">
                                            <CheckCircleIcon className="w-4 h-4" />
                                        </div>
                                    )}

                                    <div className="relative p-2">
                                        <img
                                            src={prize.imageUrl}
                                            alt={prize.name}
                                            className={`w-full h-32 object-cover rounded-md ${(prize.status !== 'IN_INVENTORY' || isRecycled) ? 'grayscale blur-[1px]' : ''}`}
                                            loading="lazy"
                                        />

                                        {prize.status === 'IN_SHIPMENT' && (
                                            <div className="absolute inset-2 bg-black/60 flex items-center justify-center rounded-md">
                                                <span className="text-white text-base font-bold transform -rotate-12 border-2 border-white px-2 py-1 rounded">運送中</span>
                                            </div>
                                        )}

                                        {prize.status === 'PENDING_PICKUP' && (
                                            <div className="absolute inset-2 bg-black/60 flex items-center justify-center rounded-md">
                                                <span className="text-white text-base font-bold transform -rotate-12 border-2 border-white px-2 py-1 rounded">待自取</span>
                                            </div>
                                        )}

                                        {prize.status === 'SHIPPED' && (
                                            <div className="absolute inset-2 bg-black/60 flex items-center justify-center rounded-md">
                                                <span className="text-white text-base font-bold transform -rotate-12 border-2 border-white px-2 py-1 rounded">已送達</span>
                                            </div>
                                        )}

                                        {prize.status === 'PICKED_UP' && (
                                            <div className="absolute inset-2 bg-black/60 flex items-center justify-center rounded-md">
                                                <span className="text-white text-base font-bold transform -rotate-12 border-2 border-white px-2 py-1 rounded">已取貨</span>
                                            </div>
                                        )}

                                        {selectionMode === 'recycle' && (
                                            <div className={`absolute bottom-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full shadow ${isRecyclable ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                {isRecyclable ? `回收 ${recycleValue} P` : '不可回收'}
                                            </div>
                                        )}

                                        {selectionMode === 'shipping' && (
                                            <div className="absolute bottom-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full shadow bg-white/90 text-gray-800 border">
                                                重量 {prize.weight}g
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-2 flex flex-col flex-grow">
                                        <p className="text-sm font-semibold text-gray-800 leading-tight flex-grow">{prize.grade} - {prize.name}</p>

                                        {selectionMode === 'none' && isRecyclable && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRecycle(prize); }}
                                                className="mt-2 w-full text-xs bg-green-500 text-white font-bold py-2 px-2 rounded-lg shadow-sm hover:bg-green-600 transition-colors"
                                            >
                                                回收換 {recycleValue} P
                                            </button>
                                        )}

                                        {selectionMode === 'none' && isRecycled && (
                                            <div className="mt-2 w-full text-xs bg-red-100 text-red-700 font-extrabold py-2 px-2 rounded-lg cursor-not-allowed border border-red-200">
                                                已兌換（不可運送／自取）
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

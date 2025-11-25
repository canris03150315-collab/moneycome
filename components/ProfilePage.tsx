import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Order, PrizeInstance, Shipment, ShippingAddress, LotterySet, PickupRequest } from '../types';
import { useAuthStore } from '../store/authStore';
import { useSiteStore } from '../store/siteDataStore';
import { ChevronLeftIcon, PlusCircleIcon, GiftIcon, ListBulletIcon, CheckCircleIcon, PackageIcon, MapPinIcon, PencilIcon, TrashIcon, BuildingStorefrontIcon } from './icons';
import { RechargeModal } from './RechargeModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ShippingRequestModal } from './ShippingRequestModal';
import { AddressFormModal } from './AddressFormModal';
import { PickupRequestModal } from './PickupRequestModal';
import { RECYCLABLE_GRADES, RECYCLE_VALUE, SHIPPING_BASE_FEE_POINTS, SHIPPING_BASE_WEIGHT_G, SHIPPING_EXTRA_FEE_PER_KG } from '../data/mockData';

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

type SelectionMode = 'none' | 'recycle' | 'shipping' | 'pickup';

const InventoryView: React.FC<InventoryViewProps> = ({ allPrizes, lotterySets, onRecycle, selectionMode, selectedPrizeIds, onPrizeSelect, isLoading = false }) => {
    // 篩選和排序狀態
    const [filterStatus, setFilterStatus] = useState<string>('AVAILABLE');
    const [filterGrade, setFilterGrade] = useState<string>('ALL');
    const [filterLottery, setFilterLottery] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'grade' | 'date'>('date');
    const [displayCount, setDisplayCount] = useState(12);
    const [recyclingPrizeId, setRecyclingPrizeId] = useState<string | null>(null);

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
                                                onClick={async (e) => { 
                                                    e.stopPropagation(); 
                                                    setRecyclingPrizeId(prize.instanceId);
                                                    try {
                                                        await onRecycle(prize);
                                                    } finally {
                                                        setRecyclingPrizeId(null);
                                                    }
                                                }}
                                                disabled={recyclingPrizeId === prize.instanceId}
                                                className="mt-2 w-full text-xs bg-green-500 text-white font-bold py-2 px-2 rounded-lg shadow-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                            >
                                                {recyclingPrizeId === prize.instanceId ? (
                                                    <>
                                                        <div className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        <span>回收中...</span>
                                                    </>
                                                ) : (
                                                    `回收換 ${recycleValue} P`
                                                )}
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

                    {/* 載入更多按鈕 */}
                    {displayedPrizes.length < processedPrizes.length && (
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => setDisplayCount(prev => prev + 12)}
                                className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                            >
                                載入更多 ({processedPrizes.length - displayedPrizes.length} 件剩餘)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const HistoryView: React.FC<{ 
    userOrders: Order[]; 
    inventory: { [key: string]: PrizeInstance };
}> = ({ userOrders, inventory }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("已複製到剪貼簿！");
    };

    return (
        <div className="space-y-4">
            {userOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">沒有任何抽獎紀錄。</p>
            ) : (
                userOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                    <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{order.lotterySetTitle}</h3>
                                <p className="text-sm text-gray-500">{new Date(order.date).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-red-500">-{order.costInPoints} P</p>
                                <p className="text-sm text-gray-500">{order.prizeInstanceIds.length} 個獎品</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                            {order.drawHash && (
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <label className="text-xs font-semibold text-gray-500">抽獎 Hash (SHA-256)</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input type="text" readOnly value={order.drawHash} className="w-full text-xs text-gray-700 bg-gray-200 rounded px-2 py-1 font-mono"/>
                                        <button onClick={() => copyToClipboard(order.drawHash)} className="text-gray-500 hover:text-yellow-500 p-1" title="複製 Hash">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {order.secretKey && (
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <label className="text-xs font-semibold text-gray-500">秘密金鑰 (Secret Key)</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input type="text" readOnly value={order.secretKey} className="w-full text-xs text-gray-700 bg-gray-200 rounded px-2 py-1 font-mono"/>
                                        <button onClick={() => copyToClipboard(order.secretKey)} className="text-gray-500 hover:text-yellow-500 p-1" title="複製金鑰">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <details>
                            <summary className="text-sm font-semibold text-gray-600 cursor-pointer">顯示獎品詳情</summary>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                                {order.prizeInstanceIds.map((instanceId) => {
                                    const prize = inventory[instanceId];
                                    if (!prize) return null;
                                    return (
                                        <div key={prize.instanceId} className={`p-2 rounded-lg text-center transition-colors ${prize.isRecycled ? 'bg-gray-200' : 'bg-gray-50'}`}>
                                            <img src={prize.imageUrl} alt={prize.name} className={`w-full h-24 object-cover rounded-md mb-2 ${prize.isRecycled ? 'grayscale' : ''}`} loading="lazy"/>
                                            <p className="text-xs font-semibold text-gray-700 leading-tight">{prize.grade} - {prize.name}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    </div>
                ))
            )}
        </div>
    );
};

const ShipmentsView: React.FC<{ 
    shipments: Shipment[];
    inventory: { [key: string]: PrizeInstance };
}> = ({ shipments, inventory }) => {

    const statusMap = {
        PENDING: { text: '待處理', color: 'bg-yellow-500' },
        PROCESSING: { text: '處理中', color: 'bg-blue-500' },
        SHIPPED: { text: '已發貨', color: 'bg-green-500' },
    };

    return (
        <div className="space-y-4">
            {shipments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">沒有任何運送紀錄。</p>
            ) : (
                 shipments.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()).map(shipment => {
                    const prizes = shipment.prizeInstanceIds.map(id => inventory[id]).filter(Boolean);
                    return (
                        <div key={shipment.id} className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-lg text-gray-800">包裹 #{shipment.id.slice(-6)}</h3>
                                        <span className={`text-xs font-semibold text-white px-2.5 py-1 rounded-full ${statusMap[shipment.status].color}`}>
                                            {statusMap[shipment.status].text}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">申請時間: {new Date(shipment.requestedAt).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">{shipment.prizeInstanceIds.length} 件商品</p>
                                    <p className="text-sm text-red-500">運費: {shipment.shippingCostInPoints} P</p>
                                </div>
                            </div>

                            {shipment.status === 'SHIPPED' && shipment.carrier && shipment.trackingNumber && (
                                <div className="p-3 bg-green-50 rounded-lg mb-4">
                                    <p className="font-semibold text-green-800">物流資訊</p>
                                    <p className="text-sm text-gray-700"><strong>物流公司:</strong> {shipment.carrier}</p>
                                    <p className="text-sm text-gray-700"><strong>追蹤單號:</strong> {shipment.trackingNumber}</p>
                                </div>
                            )}

                             <details>
                                <summary className="text-sm font-semibold text-gray-600 cursor-pointer">顯示包裹內容</summary>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
                                    {prizes.map(prize => (
                                        <div key={prize.instanceId} className="p-2 rounded-lg text-center bg-gray-50">
                                            <img src={prize.imageUrl} alt={prize.name} className="w-full h-24 object-cover rounded-md mb-2" loading="lazy"/>
                                            <p className="text-xs font-semibold text-gray-700 leading-tight">{prize.grade} - {prize.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    );
                 })
            )}
        </div>
    );
};

const PickupRequestsView: React.FC<{
    pickupRequests: PickupRequest[];
    inventory: { [key: string]: PrizeInstance };
}> = ({ pickupRequests, inventory }) => {

    const statusMap = {
        PENDING: { text: '待處理', color: 'bg-yellow-500' },
        READY_FOR_PICKUP: { text: '可取貨', color: 'bg-blue-500' },
        COMPLETED: { text: '已完成', color: 'bg-green-500' },
    };

    return (
        <div className="space-y-4">
            {pickupRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">沒有任何自取申請紀錄。</p>
            ) : (
                 pickupRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()).map(request => {
                    const prizes = request.prizeInstanceIds.map(id => inventory[id]).filter(Boolean);
                    return (
                        <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-lg text-gray-800">自取單 #{request.id.slice(-6)}</h3>
                                        <span className={`text-xs font-semibold text-white px-2.5 py-1 rounded-full ${statusMap[request.status].color}`}>
                                            {statusMap[request.status].text}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">申請時間: {new Date(request.requestedAt).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">{request.prizeInstanceIds.length} 件商品</p>
                                </div>
                            </div>
                            
                            {request.status === 'READY_FOR_PICKUP' && (
                                <div className="p-3 bg-blue-50 rounded-lg mb-4">
                                    <p className="font-semibold text-blue-800">您的獎品已準備好！</p>
                                    <p className="text-sm text-gray-700">請於營業時間內至指定店面，出示此頁面給店員即可領取。</p>
                                </div>
                            )}

                             <details>
                                <summary className="text-sm font-semibold text-gray-600 cursor-pointer">顯示申請內容</summary>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
                                    {prizes.map(prize => (
                                        <div key={prize.instanceId} className="p-2 rounded-lg text-center bg-gray-50">
                                            <img src={prize.imageUrl} alt={prize.name} className="w-full h-24 object-cover rounded-md mb-2" loading="lazy"/>
                                            <p className="text-xs font-semibold text-gray-700 leading-tight">{prize.grade} - {prize.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    );
                 })
            )}
        </div>
    );
};


const AddressManagementView: React.FC<{
    addresses: ShippingAddress[];
    actions: {
        saveShippingAddress: (address: Omit<ShippingAddress, 'id' | 'isDefault'>) => Promise<void>;
        updateShippingAddress: (addressId: string, addressData: Omit<ShippingAddress, 'id' | 'isDefault'>) => Promise<void>;
        deleteShippingAddress: (addressId: string) => Promise<void>;
        setDefaultShippingAddress: (addressId: string) => Promise<void>;
    };
}> = ({ addresses, actions }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [addressToEdit, setAddressToEdit] = useState<ShippingAddress | null>(null);
    const [addressToDelete, setAddressToDelete] = useState<ShippingAddress | null>(null);

    const handleSaveAddress = (addressData: Omit<ShippingAddress, 'id' | 'isDefault'>, id?: string) => {
        if (id) {
            actions.updateShippingAddress(id, addressData);
        } else {
            actions.saveShippingAddress(addressData);
        }
    };
    
    const openEditForm = (address: ShippingAddress) => {
        setAddressToEdit(address);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setAddressToEdit(null);
        setIsFormOpen(true);
    };

    const confirmDelete = (address: ShippingAddress) => {
        setAddressToDelete(address);
    };

    const handleDelete = () => {
        if (addressToDelete) {
            actions.deleteShippingAddress(addressToDelete.id);
            setAddressToDelete(null);
        }
    };


    return (
        <div>
            <AddressFormModal 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSaveAddress}
                addressToEdit={addressToEdit}
            />
             <ConfirmationModal
                isOpen={!!addressToDelete}
                title="確認刪除地址"
                message={`您確定要刪除地址 "${addressToDelete?.address}" 嗎？此操作無法復原。`}
                confirmText="確定刪除"
                onConfirm={handleDelete}
                onCancel={() => setAddressToDelete(null)}
            />
            <div className="space-y-4">
                <div className="flex justify-end">
                     <button onClick={openAddForm} className="bg-black text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-800 flex items-center gap-2">
                        <PlusCircleIcon className="w-5 h-5" />
                        新增地址
                    </button>
                </div>
                {addresses.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">您尚未儲存任何地址。</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map(addr => (
                            <div key={addr.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between">
                                <div>
                                    {addr.isDefault && <div className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block mb-2">預設地址</div>}
                                    <p className="font-bold text-gray-800">{addr.name}</p>
                                    <p className="text-sm text-gray-600">{addr.phone}</p>
                                    <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                                </div>
                                <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
                                    {!addr.isDefault && (
                                        <button onClick={() => actions.setDefaultShippingAddress(addr.id)} className="text-xs font-semibold text-gray-600 hover:text-black">設為預設</button>
                                    )}
                                    <button onClick={() => openEditForm(addr)} className="p-2 text-gray-500 hover:text-blue-600" title="編輯">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => confirmDelete(addr)} className="p-2 text-gray-500 hover:text-red-600" title="刪除">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { 
        currentUser, orders, inventory, shipments, pickupRequests, isLoading, isLoadingInventory,
        rechargePoints, recyclePrize, batchRecyclePrizes, requestShipment, requestPickup,
        fetchInventory, fetchUserShipments, fetchUserPickupRequests,
        ...addressActions
    } = useAuthStore();
    const shopOrders = useAuthStore(s => s.shopOrders);
    const finalizeShopOrder = useAuthStore(s => s.finalizeShopOrder);
    const requestShipShopOrder = useAuthStore(s => s.requestShipShopOrder);
    const { lotterySets } = useSiteStore();

    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'inventory' | 'shopOrders' | 'shipments' | 'pickups' | 'addresses' | 'history'>('inventory');
    const [recyclingCandidate, setRecyclingCandidate] = useState<PrizeInstance | null>(null);
    
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
    const [selectedPrizeIds, setSelectedPrizeIds] = useState<Set<string>>(new Set());
    const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
    const [addrByOrder, setAddrByOrder] = useState<Record<string, string | undefined>>({});
    const [lastAddrId, setLastAddrId] = useState<string | undefined>(undefined);
    useEffect(() => {
        try { const v = localStorage.getItem('last_shipping_address_id'); if (v) setLastAddrId(v); } catch {}
    }, []);
    
    // 載入 inventory 和其他數據
    useEffect(() => {
        if (currentUser) {
            fetchInventory();
            fetchUserShipments();
            fetchUserPickupRequests();
        }
    }, [currentUser?.id, fetchInventory, fetchUserShipments, fetchUserPickupRequests]);
    
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [toast, setToast] = useState<{type:'success'|'error'; message:string} | null>(null);

    if (!currentUser) {
        return <div className="text-center p-16">載入使用者資料...</div>;
    }
    const allPrizes = Array.isArray(inventory) ? inventory : Object.values(inventory);

    const toggleSelectionMode = (mode: SelectionMode) => {
        setSelectionMode(prev => prev === mode ? 'none' : mode);
        setSelectedPrizeIds(new Set()); 
    };
    
    const handlePrizeSelect = (prizeId: string) => {
        setSelectedPrizeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(prizeId)) {
                newSet.delete(prizeId);
            } else {
                newSet.add(prizeId);
            }
            return newSet;
        });
    };

    const { selectedRecyclePrizes, totalRecycleValue } = useMemo(() => {
        const prizes: PrizeInstance[] = Array.from(selectedPrizeIds)
            .map((id: string) => inventory[id])
            .filter((p): p is PrizeInstance => !!p);
        const totalValue: number = prizes.reduce((sum: number, prize: PrizeInstance) => sum + (prize.recycleValue || RECYCLE_VALUE), 0);
        return {
            selectedRecyclePrizes: prizes,
            totalRecycleValue: totalValue,
        };
    }, [selectedPrizeIds, inventory]);

     const { selectedShippingPrizes, totalWeightInGrams, shippingCostInPoints } = useMemo(() => {
        const prizes = Array.from(selectedPrizeIds)
            .map((id: string) => inventory[id])
            .filter((p): p is PrizeInstance => !!p);

        const weight = prizes.reduce((sum, p) => sum + p.weight, 0);
        
        let cost = SHIPPING_BASE_FEE_POINTS;
        if (weight > SHIPPING_BASE_WEIGHT_G) {
            const extraWeightInKg = Math.ceil((weight - SHIPPING_BASE_WEIGHT_G) / 1000);
            cost += extraWeightInKg * SHIPPING_EXTRA_FEE_PER_KG;
        }
        
        return {
            selectedShippingPrizes: prizes,
            totalWeightInGrams: weight,
            shippingCostInPoints: cost,
        };
    }, [selectedPrizeIds, inventory]);
     
     const selectedPickupPrizes: PrizeInstance[] = useMemo(() => {
        return Array.from(selectedPrizeIds)
            .map((id: string) => inventory[id])
            .filter((p): p is PrizeInstance => !!p);
    }, [selectedPrizeIds, inventory]);
    
    const handleConfirmBatchRecycle = () => {
        if (selectedPrizeIds.size > 0) {
            batchRecyclePrizes(Array.from(selectedPrizeIds));
        }
        setIsBatchConfirmOpen(false);
        setSelectionMode('none');
        setSelectedPrizeIds(new Set());
    };

    const openRecycleConfirm = (prize: PrizeInstance) => {
        setRecyclingCandidate(prize);
    };

    const handleConfirmRecycle = () => {
        if (recyclingCandidate) {
            recyclePrize(recyclingCandidate.instanceId);
            setRecyclingCandidate(null);
        }
    };

    const handleConfirmShipment = async (prizeIds: string[], address: ShippingAddress) => {
        const result = await requestShipment(prizeIds, address);
        if (result.success) {
            setSelectionMode('none');
            setSelectedPrizeIds(new Set());
        }
        return result;
    };
    
    const handleConfirmPickup = async () => {
        const result = await requestPickup(Array.from(selectedPrizeIds));
        if (result.success) {
            setSelectionMode('none');
            setSelectedPrizeIds(new Set());
        }
        return result;
    };
    
    const TabButton: React.FC<{
        tabName: 'inventory' | 'shopOrders' | 'shipments' | 'pickups' | 'addresses' | 'history';
        label: string;
        icon: React.ReactNode;
    }> = ({ tabName, label, icon }) => (
         <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tabName 
                ? 'bg-white text-black border-b-2 border-black' 
                : 'bg-transparent text-gray-500 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div>
            <RechargeModal 
                isOpen={isRechargeModalOpen}
                onClose={() => setIsRechargeModalOpen(false)}
                onConfirmPurchase={rechargePoints}
                currentUserPoints={currentUser.points}
            />
             <ShippingRequestModal
                isOpen={isShippingModalOpen}
                onClose={() => setIsShippingModalOpen(false)}
                selectedPrizes={selectedShippingPrizes}
                user={currentUser}
                onConfirmShipment={handleConfirmShipment}
                onSaveAddress={addressActions.saveShippingAddress}
            />
             <PickupRequestModal
                isOpen={isPickupModalOpen}
                onClose={() => setIsPickupModalOpen(false)}
                selectedPrizes={selectedPickupPrizes}
                onConfirmPickup={handleConfirmPickup}
            />
            <ConfirmationModal
                isOpen={!!recyclingCandidate}
                title="確認回收"
                message={
                    recyclingCandidate && (
                        <p>
                            您確定要將「<strong>{recyclingCandidate.grade} - {recyclingCandidate.name}</strong>」回收以換取{' '}
                            <strong>{recyclingCandidate.recycleValue || RECYCLE_VALUE} P</strong> 嗎？
                            <br />
                            <span className="font-semibold text-red-600">此操作無法復原。</span>
                        </p>
                    )
                }
                confirmText="確定回收"
                onConfirm={handleConfirmRecycle}
                onCancel={() => setRecyclingCandidate(null)}
            />
             <ConfirmationModal
                isOpen={isBatchConfirmOpen}
                title="確認批量回收"
                message={
                    <p>
                        您確定要回收這 <strong>{selectedRecyclePrizes.length}</strong> 件獎品以換取{' '}
                        <strong>{totalRecycleValue.toLocaleString()} P</strong> 嗎？
                        <br />
                        <span className="font-semibold text-red-600">此操作無法復原。</span>
                    </p>
                }
                confirmText={`回收 ${selectedRecyclePrizes.length} 件`}
                onConfirm={handleConfirmBatchRecycle}
                onCancel={() => setIsBatchConfirmOpen(false)}
            />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                <div className="relative mb-6">
                    <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center text-gray-700 hover:text-black font-semibold transition-colors">
                    <ChevronLeftIcon className="h-6 w-6" />
                    <span>返回</span>
                    </button>
                    <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800">個人資料</h1>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">你好，{currentUser.username}！</h2>
                            <div className="text-4xl font-extrabold text-black">
                                {currentUser.points.toLocaleString()} <span className="text-2xl text-gray-500 font-medium">P</span>
                            </div>
                            <p className="text-gray-500">剩餘點數</p>
                        </div>
                        <button 
                            onClick={() => setIsRechargeModalOpen(true)}
                            className="flex items-center gap-2 bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-600 transition-all transform hover:scale-105"
                        >
                            <PlusCircleIcon className="w-6 h-6" />
                            <span>儲值點數</span>
                        </button>
                    </div>
                </div>

                <div>
                    <div className="border-b border-gray-200 mb-6 flex justify-between items-center flex-wrap">
                        <div className="flex gap-2 border-b mb-4">
                <TabButton tabName="inventory" label="收藏庫" icon={<GiftIcon className="w-4 h-4" />} />
                <TabButton tabName="shopOrders" label="商城訂單" icon={<BuildingStorefrontIcon className="w-4 h-4" />} />
                <TabButton tabName="shipments" label="出貨紀錄" icon={<PackageIcon className="w-4 h-4" />} />
                <TabButton tabName="pickups" label="自取紀錄" icon={<MapPinIcon className="w-4 h-4" />} />
                <TabButton tabName="addresses" label="地址管理" icon={<PencilIcon className="w-4 h-4" />} />
                <TabButton tabName="history" label="抽獎紀錄" icon={<ListBulletIcon className="w-4 h-4" />} />
            </div>
            </div>
                        {activeTab === 'inventory' && (
                             <div className="flex gap-2 mt-2 sm:mt-0">
                                <button
                                    onClick={() => toggleSelectionMode('pickup')}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                                        selectionMode === 'pickup'
                                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    }`}
                                >
                                    {selectionMode === 'pickup' ? '取消' : '自取申請'}
                                </button>
                                <button
                                    onClick={() => toggleSelectionMode('shipping')}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                                        selectionMode === 'shipping'
                                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                                    }`}
                                >
                                    {selectionMode === 'shipping' ? '取消' : '運送申請'}
                                </button>
                                <button
                                    onClick={() => toggleSelectionMode('recycle')}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                                        selectionMode === 'recycle'
                                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    {selectionMode === 'recycle' ? '取消' : '批量回收'}
                                </button>
                            </div>
                        )}
                    </div>

                    {activeTab === 'inventory' && (
                        <InventoryView 
                            allPrizes={allPrizes}
                            lotterySets={lotterySets}
                            onRecycle={openRecycleConfirm}
                            selectionMode={selectionMode}
                            selectedPrizeIds={selectedPrizeIds}
                            onPrizeSelect={handlePrizeSelect}
                            isLoading={isLoadingInventory}
                        />
                    )}
                    {activeTab === 'shopOrders' && (
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[0,1,2].map(i => (
                                        <div key={i} className="bg-white rounded-lg shadow-md p-4 border animate-pulse">
                                            <div className="flex items-start gap-4 border-b pb-3 mb-3">
                                                <div className="w-24 h-24 bg-gray-200 rounded-md" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                                                </div>
                                                <div className="w-28 space-y-2">
                                                    <div className="h-5 bg-gray-200 rounded" />
                                                    <div className="h-5 bg-gray-100 rounded" />
                                                    <div className="h-5 bg-gray-100 rounded" />
                                                </div>
                                            </div>
                                            <div className="h-9 bg-gray-100 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : shopOrders.length === 0 ? (
                                <div className="text-center py-16">
                                    <p className="text-gray-600 mb-4">目前沒有商城訂單。</p>
                                    <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-black text-white text-sm">回到首頁逛逛</button>
                                </div>
                            ) : (
                                shopOrders.slice().reverse().map((o:any) => {
                                    const TYPE_LABEL: Record<string,string> = { DIRECT:'直購', PREORDER_FULL:'全額預購', PREORDER_DEPOSIT:'訂金預購' };
                                    const PAY_LABEL: Record<string,string> = { UNPAID:'未付款', PARTIALLY_PAID:'部分付款', PAID:'已付款' };
                                    const STATUS_LABEL: Record<string,string> = { PENDING:'待確認', CONFIRMED:'已確認', FULFILLING:'備貨中', SHIPPED:'已出貨', OUT_OF_STOCK:'缺貨', COMPLETED:'已完成', CANCELLED:'已取消' };
                                    const timeText = (() => { try { return new Date(o.createdAt).toLocaleString('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }); } catch { return ''; } })();
                                    const canRequestShip = o.payment === 'PAID' && !o.shippingAddress;
                                    const canFinalize = o.type === 'PREORDER_DEPOSIT' && o.canFinalize && o.payment !== 'PAID';
                                    const tailPoints = Math.max(0, (o.totalPoints || 0) - (o.paidPoints || 0));
                                    const selectedAddr = addrByOrder[o.id] ?? lastAddrId ?? currentUser.shippingAddresses?.find(a=>a.isDefault)?.id;
                                    return (
                                        <div key={o.id} className="bg-white rounded-lg shadow-md p-4 border">
                                            <div className="flex items-start gap-4 border-b pb-3 mb-3">
                                                <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                                                    {o.productImageUrl ? (
                                                        <img src={o.productImageUrl} alt={o.productTitle} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">無圖片</div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{o.productTitle}</h3>
                                                    <div className="text-xs text-gray-500">建立時間：{timeText}</div>
                                                    <div className="text-sm text-gray-600">訂單編號：{o.id}</div>
                                                </div>
                                                <div className="text-right text-sm space-y-1">
                                                    <div>
                                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border text-gray-700">{TYPE_LABEL[o.type] || o.type}</span>
                                                    </div>
                                                    <div>
                                                        <span className={`px-2 py-0.5 rounded-full border ${o.payment==='PAID' ? 'bg-green-50 border-green-200 text-green-700' : o.payment==='PARTIALLY_PAID' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>付款：{PAY_LABEL[o.payment] || o.payment}</span>
                                                    </div>
                                                    <div>
                                                        <span className={`px-2 py-0.5 rounded-full border ${o.status==='COMPLETED' || o.status==='CONFIRMED' || o.status==='SHIPPED' ? 'bg-green-50 border-green-200 text-green-700' : o.status==='PENDING' || o.status==='FULFILLING' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : o.status==='OUT_OF_STOCK' || o.status==='CANCELLED' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>狀態：{STATUS_LABEL[o.status] || o.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {canFinalize && (
                                                <div className="p-3 rounded bg-yellow-50 border border-yellow-200 flex items-center justify-between">
                                                    <div className="text-sm text-yellow-800">已通知可補繳尾款，尾款金額：<span className="font-semibold">{tailPoints.toLocaleString()} P</span>。請完成付款以進入出貨流程。</div>
                                                    <button
                                                        className="px-3 py-1.5 rounded bg-black text-white text-sm disabled:opacity-50"
                                                        disabled={loadingAction === o.id + ':finalize'}
                                                        onClick={async()=>{ try { setLoadingAction(o.id + ':finalize'); const r = await finalizeShopOrder(o.id); setToast({type:'success', message: r?.message || '補繳成功'});} catch(e:any){ setToast({type:'error', message: e?.message||'補繳失敗'});} finally { setLoadingAction(null); }}}
                                                    >{loadingAction === o.id + ':finalize' ? '處理中…' : `補繳尾款 ${tailPoints.toLocaleString()}P`}</button>
                                                </div>
                                            )}
                                            {canRequestShip && (
                                                <div className="p-3 rounded bg-gray-50 border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                                    <div className="text-sm text-gray-700">選擇收件地址後即可申請出貨。</div>
                                                    <div className="flex gap-2 items-center">
                                                        <select className="border rounded px-2 py-1 text-sm" value={selectedAddr} onChange={e=>{ const val = e.target.value; setAddrByOrder(prev=>({ ...prev, [o.id]: val })); try { localStorage.setItem('last_shipping_address_id', val); setLastAddrId(val); } catch {} }}>
                                                            {currentUser.shippingAddresses?.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name} {a.phone}｜{a.address}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            className="px-3 py-1.5 rounded bg-black text-white text-sm disabled:opacity-50"
                                                            disabled={loadingAction === o.id + ':ship' || !selectedAddr}
                                                            onClick={async()=>{ try { setLoadingAction(o.id + ':ship'); const r = await requestShipShopOrder(o.id, selectedAddr!); setToast({type:'success', message: '已送出申請'});} catch(e:any){ setToast({type:'error', message: e?.message||'申請失敗'});} finally { setLoadingAction(null); }}}
                                                        >{loadingAction === o.id + ':ship' ? '處理中…' : '申請出貨'}</button>
                                                    </div>
                                                </div>
                                            )}
                                            {o.shippingAddress && (
                                                <div className="p-3 rounded bg-green-50 border border-green-200 text-sm text-green-800">
                                                    已選擇出貨地址：{o.shippingAddress.name}／{o.shippingAddress.phone}／{o.shippingAddress.address}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                    {activeTab === 'shipments' && <ShipmentsView shipments={shipments} inventory={inventory} />}
                    {activeTab === 'pickups' && <PickupRequestsView pickupRequests={pickupRequests} inventory={inventory} />}
                    {activeTab === 'addresses' && <AddressManagementView addresses={currentUser.shippingAddresses || []} actions={addressActions} />}
                    {activeTab === 'history' && <HistoryView userOrders={orders} inventory={inventory} />}
                </div>
            
            {selectionMode === 'recycle' && selectedPrizeIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] animate-fade-in-up z-30">
                    <div className="container mx-auto flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">
                                已選擇 <span className="text-blue-600">{selectedRecyclePrizes.length}</span> 件商品
                            </p>
                            <p className="text-sm text-gray-600">
                                總計可獲得 <span className="font-semibold text-green-600">{totalRecycleValue.toLocaleString()} P</span>
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setSelectionMode('none')} className="px-5 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold transition-colors">取消</button>
                            <button onClick={() => setIsBatchConfirmOpen(true)} className="px-5 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 font-semibold shadow-md transition-colors">確認回收</button>
                        </div>
                    </div>
                </div>
            )}

            {selectionMode === 'shipping' && selectedPrizeIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] animate-fade-in-up z-30">
                    <div className="container mx-auto flex justify-between items-center">
                        <div className="text-sm sm:text-base text-gray-800 font-semibold">
                            選擇件數: <span className="text-cyan-600">{selectedShippingPrizes.length}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            總重量: <span>{(totalWeightInGrams / 1000).toFixed(2)} kg</span>
                            <span className="mx-2 text-gray-400">|</span>
                            預估運費: <span className="text-red-600">{shippingCostInPoints.toLocaleString()} P</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setSelectionMode('none')} className="px-5 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold transition-colors">取消</button>
                            <button onClick={() => setIsShippingModalOpen(true)} className="px-5 py-2 rounded-lg text-white bg-cyan-500 hover:bg-cyan-600 font-semibold shadow-md transition-colors">下一步</button>
                        </div>
                    </div>
                </div>
            )}
            
            {selectionMode === 'pickup' && selectedPrizeIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] animate-fade-in-up z-30">
                    <div className="container mx-auto flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">
                                已選擇 <span className="text-emerald-600">{selectedPickupPrizes.length}</span> 件商品準備自取
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setSelectionMode('none')} className="px-5 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold transition-colors">取消</button>
                            <button onClick={() => setIsPickupModalOpen(true)} className="px-5 py-2 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 font-semibold shadow-md transition-colors">下一步</button>
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border ${toast.type==='success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`} role="status" onClick={() => setToast(null)}>
                    <span className="font-semibold mr-2">{toast.type==='success' ? '成功' : '錯誤'}</span>{toast.message}
                </div>
            )}
        </div>
    );
};
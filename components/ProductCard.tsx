import React from 'react';
import type { LotterySet } from '../types';
import { SparklesIcon, StackedCoinIcon, TicketIcon, FireIcon, GiftIcon, WandIcon } from './icons';
import { ProductImageCarousel } from './ProductImageCarousel';

export const ProductCard: React.FC<{ lottery: LotterySet; onSelect: () => void; }> = ({ lottery, onSelect }) => {
    // Compute a key from live prize values so updates propagate even if the array reference is stable
    const prizesKey = lottery.prizes.map(p => `${p.id}:${p.remaining}:${p.total}:${p.type}:${p.grade}`).join('|');
    const cleanedTitle = React.useMemo(() => lottery.title.replace(/\s*[（(]剩\d+抽[)）]\s*/g, ''), [lottery.title]);

    const {
        totalTickets,
        remainingTickets,
        remainingAPrizes,
        remainingBPrizes,
        remainingCPrizes,
        hasAPrizes,
        hasBPrizes,
        hasCPrizes,
        grandPrizeStatus
    } = React.useMemo(() => {
        const normalPrizes = lottery.prizes.filter(p => p.type === 'NORMAL');
        const grandPrizeGrades = ['A賞', 'B賞', 'C賞'];
        const grandPrizes = normalPrizes.filter(p => grandPrizeGrades.includes(p.grade));

        let status: 'all-available' | 'some-available' | 'none-left' | 'not-applicable' = 'not-applicable';
        
        if (grandPrizes.length > 0) {
            const totalGrandPrizes = grandPrizes.reduce((sum, p) => sum + p.total, 0);
            const remainingGrandPrizes = grandPrizes.reduce((sum, p) => sum + p.remaining, 0);
            
            if (totalGrandPrizes > 0 && remainingGrandPrizes === totalGrandPrizes) {
                status = 'all-available';
            } else if (remainingGrandPrizes > 0) {
                status = 'some-available';
            } else {
                status = 'none-left';
            }
        }

        const getRemainingCount = (grade: string) => normalPrizes
            .filter(p => p.grade === grade)
            .reduce((sum, p) => sum + p.remaining, 0);

        const getTotalCount = (grade: string) => normalPrizes
            .filter(p => p.grade === grade)
            .reduce((sum, p) => sum + p.total, 0);

        const total = normalPrizes.reduce((sum, p) => sum + p.total, 0);
        const drawnCount = Array.isArray(lottery.drawnTicketIndices) ? lottery.drawnTicketIndices.length : undefined;
        const remainingCalc = (typeof drawnCount === 'number')
            ? Math.max(0, total - drawnCount)
            : normalPrizes.reduce((sum, p) => sum + p.remaining, 0);

        return {
            totalTickets: total,
            remainingTickets: remainingCalc,
            remainingAPrizes: getRemainingCount('A賞'),
            remainingBPrizes: getRemainingCount('B賞'),
            remainingCPrizes: getRemainingCount('C賞'),
            hasAPrizes: getTotalCount('A賞') > 0,
            hasBPrizes: getTotalCount('B賞') > 0,
            hasCPrizes: getTotalCount('C賞') > 0,
            grandPrizeStatus: status,
        };
    }, [prizesKey]);

    const isSoldOut = lottery.status === 'SOLD_OUT' || remainingTickets === 0;
    const hasDiscount = lottery.discountPrice && lottery.discountPrice > 0;
    const STATUS_TEXT: Record<string, string> = { AVAILABLE: '可抽', UPCOMING: '即將開賣', SOLD_OUT: '已售完' };

    const calculateProbability = (remainingPrizes: number) => {
        if (remainingTickets > 0 && remainingPrizes > 0) {
            return (remainingPrizes / remainingTickets) * 100;
        }
        return 0;
    };

    const probA = calculateProbability(remainingAPrizes);
    const probB = calculateProbability(remainingBPrizes);
    const probC = calculateProbability(remainingCPrizes);
    
    const isHighlyRecommended = (probA + probB + probC) > 20 && !isSoldOut;

    // 🆕 多圖支持：優先使用 images 數組，否則使用 imageUrl
    const displayImages = React.useMemo(() => {
        const images = (lottery as any).images;
        if (Array.isArray(images) && images.length > 0) {
            return images;
        }
        return lottery.imageUrl ? [lottery.imageUrl] : [];
    }, [lottery]);

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-all duration-300 group flex flex-col">
            <div className="relative h-56">
                <ProductImageCarousel 
                    images={displayImages} 
                    alt={lottery.title}
                    className="h-full"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>

                {isHighlyRecommended && (
                    <div className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center animate-pulse">
                        <FireIcon className="w-4 h-4 mr-1 text-white" />
                        強力推薦
                    </div>
                )}

                <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
                  {!isSoldOut && grandPrizeStatus === 'all-available' && (
                      <div className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center">
                          <GiftIcon className="w-4 h-4 mr-1.5" />
                          大賞全未出
                      </div>
                  )}
                  {!isSoldOut && grandPrizeStatus === 'some-available' && (
                      <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center">
                          <WandIcon className="w-4 h-4 mr-1.5" />
                          仍有大賞
                      </div>
                  )}
                </div>
                
                {isSoldOut && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-3xl font-bold transform -rotate-12 border-4 border-white px-4 py-2 rounded-lg">已售完</span>
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-yellow-500 transition-colors">{cleanedTitle}</h3>
                
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                    <div className="flex items-center">
                        <TicketIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>剩餘 <span className="font-bold text-gray-800">{remainingTickets}</span> / 共 {totalTickets} 籤</span>
                    </div>
                    {!isSoldOut && (
                         <>
                            {hasAPrizes && (
                                <div className="flex items-center">
                                    <SparklesIcon className="w-4 h-4 mr-2 text-amber-400" />
                                    <span>A賞機率: <span className="font-bold text-gray-800">{probA.toFixed(2)}%</span> ({remainingAPrizes}個)</span>
                                </div>
                            )}
                            {hasBPrizes && (
                                <div className="flex items-center">
                                    <SparklesIcon className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>B賞機率: <span className="font-bold text-gray-800">{probB.toFixed(2)}%</span> ({remainingBPrizes}個)</span>
                                </div>
                            )}
                            {hasCPrizes && (
                                <div className="flex items-center">
                                    <SparklesIcon className="w-4 h-4 mr-2 text-orange-400" />
                                    <span>C賞機率: <span className="font-bold text-gray-800">{probC.toFixed(2)}%</span> ({remainingCPrizes}個)</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-between items-center mt-auto pt-3">
                    <div className="flex items-center gap-2">
                        <StackedCoinIcon className="w-6 h-6 text-yellow-400" />
                        {hasDiscount ? (
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-black text-rose-500">{lottery.discountPrice}</p>
                            <p className="text-sm font-medium text-gray-400 line-through">{lottery.price}</p>
                          </div>
                        ) : (
                          <p className="text-xl font-black text-gray-800">{lottery.price}</p>
                        )}
                    </div>
                    <button
                        onClick={onSelect}
                        className={`font-semibold px-4 py-2 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${
                            isSoldOut
                                ? 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-400'
                                : 'bg-[#ffc400] text-black border-2 border-black hover:bg-yellow-400 focus:ring-yellow-400'
                        }`}
                    >
                        {isSoldOut ? '查看結果' : '查看獎品'}
                    </button>
                </div>
            </div>
        </div>
    );
};
import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../types';
import { BoxIcon, StackedCoinIcon, PlusCircleIcon } from './icons';
import { useToast } from './ToastProvider';

interface DrawControlPanelProps {
    lotteryId: string;
    price: number;
    discountPrice?: number;
    remainingTickets: number;
    selectedTickets: number[];
    onTicketSelect: (selected: number[]) => void;
    currentUser: User | null;
    isDrawing: boolean;
    drawHash: string | null;
    onDraw: () => void;
    isSoldOut: boolean;
    totalTickets: number;
    drawnTickets: number[];
    isLocked: boolean;
    amIActive: boolean;
    onRechargeClick: () => void;
    onRechargeQuick?: (suggestedAddPoints: number) => void;
}

export const DrawControlPanel: React.FC<DrawControlPanelProps> = ({
    lotteryId,
    price,
    discountPrice,
    remainingTickets,
    selectedTickets,
    onTicketSelect,
    currentUser,
    isDrawing,
    drawHash,
    onDraw,
    isSoldOut,
    totalTickets,
    drawnTickets,
    isLocked,
    amIActive,
    onRechargeClick,
    onRechargeQuick,
}) => {
    const [computerPickCount, setComputerPickCount] = useState<string>('1');
    const toast = useToast();

    const effectivePrice = discountPrice && discountPrice > 0 ? discountPrice : price;
    const hasDiscount = !!(discountPrice && discountPrice > 0);
    
    useEffect(() => {
        const currentCount = parseInt(computerPickCount, 10);
        if (!isNaN(currentCount) && currentCount > remainingTickets && remainingTickets > 0) {
            setComputerPickCount(String(remainingTickets));
        }
    }, [remainingTickets, computerPickCount]);

    const handleComputerPickCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (value === '') {
            setComputerPickCount('');
            return;
        }

        const num = parseInt(value.replace(/[^0-9]/g, ''), 10);

        if (isNaN(num)) {
            return;
        }

        if (num > remainingTickets) {
            setComputerPickCount(String(remainingTickets));
        } else {
            setComputerPickCount(String(num));
        }
    };

    const handleComputerPickCountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const num = parseInt(computerPickCount, 10);
        if (isNaN(num) || num < 1) {
            setComputerPickCount('1');
        }
    };

    const performComputerPick = (count: number) => {
        if (isDrawing || remainingTickets === 0 || isLocked) return;
        
        const pickCount = Math.min(count, remainingTickets);
        if (pickCount <= 0) return;

        const availableTickets = Array.from({ length: totalTickets }, (_, i) => i)
                                    .filter(t => !drawnTickets.includes(t));

        if (availableTickets.length === 0) return;

        const shuffled = [...availableTickets].sort(() => 0.5 - Math.random());
        const newSelection = shuffled.slice(0, pickCount);
        
        onTicketSelect(newSelection);
    };

    const handleComputerPick = () => {
        const count = parseInt(computerPickCount, 10);
        if (isNaN(count)) return;
        performComputerPick(count);
    };

    const handleSelectAll = () => {
        if (isLocked) return;
        const availableTickets = Array.from({ length: totalTickets }, (_, i) => i)
                                    .filter(t => !drawnTickets.includes(t));
        onTicketSelect(availableTickets);
    };

    const copyToClipboard = () => {
        if (drawHash) {
            navigator.clipboard.writeText(drawHash);
            toast.show({ type: 'success', message: 'Hash 已複製到剪貼簿' });
        }
    };
    
    if (isSoldOut) {
        return null;
    }
    
    const totalCost = selectedTickets.length * effectivePrice;
    const currentPoints = currentUser?.points || 0;
    const canAfford = currentPoints >= totalCost;
    const lacking = Math.max(0, totalCost - currentPoints);
    
    const isDisabled = isDrawing || isLocked;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center md:justify-start gap-4 p-4 rounded-lg bg-gray-100 text-gray-800 shadow-inner">
                    <div className="text-center">
                        <span className="text-lg font-semibold block">一抽</span>
                    </div>
                    <div className="flex items-center">
                        <StackedCoinIcon className="w-10 h-10 text-yellow-500 mr-2" />
                        <div className="flex items-baseline gap-2">
                        {hasDiscount ? (
                            <>
                                <span className="text-4xl font-bold text-rose-500">{discountPrice}</span>
                                <span className="text-2xl text-gray-500 line-through">{price}</span>
                            </>
                        ) : (
                            <span className="text-4xl font-bold text-gray-900">{price}</span>
                        )}
                        </div>
                    </div>
                    <div className="ml-auto text-sm text-gray-700 font-semibold">
                        剩餘 {remainingTickets} / {totalTickets} 張
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t">
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="font-semibold text-gray-700 shrink-0">電腦選籤:</span>
                        <input
                            type="number"
                            value={computerPickCount}
                            onChange={handleComputerPickCountChange}
                            onBlur={handleComputerPickCountBlur}
                            min="1"
                            max={remainingTickets > 0 ? remainingTickets : 1}
                            className="w-24 appearance-none border border-gray-300 rounded-md py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-yellow-400 disabled:bg-gray-100"
                            placeholder="數量"
                            disabled={isDisabled || remainingTickets === 0}
                        />
                        <button
                            type="button"
                            onClick={handleComputerPick}
                            disabled={isDisabled || remainingTickets === 0}
                            className="bg-slate-500 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-slate-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            選取
                        </button>
                    </div>
                    <div className="w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            disabled={isDisabled || remainingTickets === 0}
                            title={isDisabled ? (isLocked ? '尚未輪到您，無法包套' : '抽獎進行中') : '將可抽的籤全部選取'}
                            className="w-full flex items-center justify-center bg-amber-500 text-white font-bold px-5 py-2 rounded-lg shadow-md hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <BoxIcon className="w-5 h-5 mr-2" />
                            我要包套 ({remainingTickets}抽)
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2 border-t pt-3">
                    <span className="font-semibold text-gray-700 shrink-0 self-center mr-2">快速選取:</span>
                    <button
                        type="button"
                        onClick={() => performComputerPick(10)}
                        disabled={isDisabled || remainingTickets < 10}
                        title="電腦隨機選取 10 抽"
                        className="bg-sky-500 text-white font-semibold px-4 py-1.5 rounded-lg shadow-sm hover:bg-sky-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                        10抽
                    </button>
                    <button
                        type="button"
                        onClick={() => performComputerPick(30)}
                        disabled={isDisabled || remainingTickets < 30}
                        title="電腦隨機選取 30 抽"
                        className="bg-sky-500 text-white font-semibold px-4 py-1.5 rounded-lg shadow-sm hover:bg-sky-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                        30抽
                    </button>
                    <button
                        type="button"
                        onClick={() => performComputerPick(50)}
                        disabled={isDisabled || remainingTickets < 50}
                        title="電腦隨機選取 50 抽"
                        className="bg-sky-500 text-white font-semibold px-4 py-1.5 rounded-lg shadow-sm hover:bg-sky-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                        50抽
                    </button>
                </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <p className="text-lg font-semibold text-gray-800">
                            已選擇 <span className="text-black font-bold text-2xl">{selectedTickets.length}</span> 張籤
                        </p>
                        <p className="text-sm text-gray-600">
                            總計: <span className="font-bold text-xl">{totalCost.toLocaleString()}</span> P
                            {currentUser && (
                              <>
                                <span className="mx-2 text-gray-400">|</span>
                                當前: <span className="font-semibold">{currentPoints.toLocaleString()} P</span>
                                <span className="mx-2 text-gray-400">|</span>
                                尚差: <span className={`font-semibold ${lacking>0?'text-red-600':'text-gray-700'}`}>{lacking.toLocaleString()} P</span>
                              </>
                            )}
                        </p>
                        {!canAfford && selectedTickets.length > 0 && currentUser && (
                            <div className="mt-2 flex items-center gap-2">
                                <p className="text-red-500 text-sm font-semibold">您的點數不足！</p>
                                <button
                                    onClick={onRechargeQuick ? () => onRechargeQuick(lacking) : onRechargeClick}
                                    title={onRechargeQuick ? `補足差額 ${lacking} P` : '前往儲值'}
                                    className="flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm hover:bg-green-600 transition-colors"
                                >
                                    <PlusCircleIcon className="w-4 h-4" />
                                    <span>{onRechargeQuick ? '一鍵補足差額' : '儲值'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => onTicketSelect([])}
                            disabled={selectedTickets.length === 0 || isDisabled}
                            title={selectedTickets.length === 0 ? '尚未選擇任何籤' : (isDisabled ? (isLocked ? '尚未輪到您' : '抽獎進行中') : '清除已選的籤')}
                            className="w-full sm:w-auto bg-gray-200 text-gray-700 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            清除選擇
                        </button>
                        <button
                            onClick={onDraw}
                            disabled={selectedTickets.length === 0 || isDrawing || !canAfford || !drawHash || !amIActive}
                            title={selectedTickets.length === 0 ? '請先選擇籤' : !amIActive ? '尚未輪到您' : !canAfford ? '點數不足，請先儲值' : isDrawing ? '抽獎進行中' : '確認抽獎'}
                            className="w-full sm:w-auto bg-[#ffc400] text-black font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 disabled:bg-yellow-200 disabled:cursor-not-allowed transition-colors border-2 border-black"
                        >
                            {isDrawing ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                                    抽獎中...
                                </div>
                            ) : `確認抽獎`}
                        </button>
                    </div>
                </div>
                
                {!currentUser && (
                    <div className="text-center mt-4 p-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                        請先登入以進行抽獎。
                    </div>
                )}
                {remainingTickets === 0 && <p className="text-center text-red-500 font-semibold mt-4">此一番賞已售完！</p>}
                {drawHash && (
                    <div className="mt-4 pt-4 border-t">
                        <label className="text-xs font-semibold text-gray-500">本次抽獎 Hash (SHA-256)</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <input 
                                type="text" 
                                readOnly 
                                value={drawHash}
                                className="w-full text-xs text-gray-700 bg-gray-200 rounded px-2 py-1 font-mono"
                            />
                            <button onClick={copyToClipboard} className="text-gray-500 hover:text-yellow-500 p-1" title="複製 Hash">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
import React, { useState, useEffect, memo } from 'react';
import type { User, QueueEntry } from '../types';

interface QueueStatusPanelProps {
    lotteryId: string;
    queue: QueueEntry[];
    currentUser: User | null;
    onJoinQueue: () => void;
    onLeaveQueue: () => void;
    onExtendTurn: () => void;
    onTimerEnd?: () => void;
}

interface TimerProps {
    expiry: number;
    onEnd: () => void;
}

const CountdownTimer = memo<TimerProps>(({ expiry, onEnd }) => {
    const calculateTimeLeft = () => {
        const diff = Math.round((expiry - Date.now()) / 1000);
        return diff > 0 ? diff : 0; // 確保不會是負數
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            
            if (newTimeLeft <= 0) {
                clearInterval(timer);
                onEnd();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiry, onEnd]);

    const minutes = Math.floor(Math.max(0, timeLeft) / 60);
    const seconds = Math.max(0, timeLeft) % 60;

    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return (
        <>
          <span className="font-mono text-3xl font-bold tabular-nums text-gray-800">
            {timeText}
          </span>
          {/* When <=10s, announce assertively for screen readers */}
          <span className="sr-only" aria-live={timeLeft <= 10 ? 'assertive' : 'off'}>
            {timeLeft <= 10 ? `倒數 ${seconds} 秒` : ''}
          </span>
        </>
    );
});

export const QueueStatusPanel: React.FC<QueueStatusPanelProps> = ({ lotteryId, queue, currentUser, onJoinQueue, onLeaveQueue, onExtendTurn, onTimerEnd }) => {
    if (!currentUser) {
        return (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
                <p className="font-bold">請先登入</p>
                <p>登入後即可加入排隊進行抽獎。</p>
            </div>
        );
    }
    
    const myQueueIndex = queue.findIndex(entry => entry.userId === currentUser.id);
    const amIInQueue = myQueueIndex !== -1;
    const amIActive = myQueueIndex === 0;

    if (amIActive) {
        const lotteryStats = currentUser.lotteryStats?.[lotteryId] || { cumulativeDraws: 0, availableExtensions: 1 };
        const drawsToNext = 10 - (lotteryStats.cumulativeDraws % 10);
        const drawsNeeded = drawsToNext === 0 ? 10 : drawsToNext;
        const canExtend = lotteryStats.availableExtensions > 0;

        return (
            <div className="p-4 bg-green-100 border-l-4 border-green-500 rounded-lg animate-fade-in shadow-inner" style={{ backgroundColor: '#e6f7f2' }}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                        <p className="font-extrabold text-2xl text-gray-800">輪到您了！</p>
                        <p className="text-sm text-gray-600">請在倒數結束前完成您的操作。</p>
                        <p className="text-xs text-green-700 mt-1 font-semibold">
                            再抽 {drawsNeeded} 抽即可獲得一次延長機會。
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/70 p-3 rounded-2xl shadow-md">
                         <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-gray-500">剩餘時間</span>
                            <CountdownTimer expiry={queue[0].expiresAt} onEnd={() => onTimerEnd && onTimerEnd()} />
                        </div>
                        <div className="flex flex-col items-center">
                        <button 
                            onClick={onExtendTurn}
                            disabled={!canExtend}
                            title={canExtend ? '延長 60 秒' : `需再抽 ${drawsNeeded} 抽可獲得一次延長`}
                            className="bg-green-500 text-white font-bold px-5 py-3 rounded-lg shadow-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            延長操作時間 ({lotteryStats.availableExtensions})
                        </button>
                        {!canExtend && (
                            <span className="mt-1 text-[11px] text-gray-500">需再抽 {drawsNeeded} 抽可獲得一次延長</span>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (amIInQueue) {
        const aheadCount = myQueueIndex >= 0 ? myQueueIndex : 0;
        return (
             <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-lg animate-fade-in">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                     <div className="text-center sm:text-left">
                        <p className="font-bold text-lg">您正在排隊中</p>
                        <p>目前前面還有 <span className="font-extrabold text-2xl">{aheadCount}</span> 位使用者。輪到您時介面將會自動解鎖。</p>
                    </div>
                    <button 
                        onClick={onLeaveQueue}
                        className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-300 transition-colors"
                    >
                        離開隊列
                    </button>
                </div>
            </div>
        );
    }

    // Not in queue
    return (
        <div className="p-4 bg-gray-100 border-l-4 border-gray-400 text-gray-800 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                    <p className="font-bold text-lg">準備好要抽獎了嗎？</p>
                    <p>目前有 <span className="font-bold">{queue.length}</span> 位使用者正在排隊。</p>
                    <p className="text-xs text-gray-500 mt-1">為確保公平，每位使用者操作時間為3分鐘，請點擊按鈕加入隊列等候。</p>
                </div>
                <button
                    onClick={onJoinQueue}
                    className="bg-[#ffc400] text-black font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 transition-colors border-2 border-black"
                >
                    排隊抽獎
                </button>
            </div>
        </div>
    );
};
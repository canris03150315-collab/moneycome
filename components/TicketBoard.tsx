import React, { useMemo } from 'react';
import type { TicketLock, User, Prize } from '../types';

interface TicketBoardProps {
  lotteryId: string;
  totalTickets: number;
  drawnTickets: number[];
  ticketLocks: TicketLock[];
  currentUser: User | null;
  onTicketSelect: (selected: number[]) => void;
  isSoldOut: boolean;
  isLocked: boolean;
  prizes: Prize[];
  prizeOrder?: string[];
  selectedTickets?: number[]; // New prop for optimistic UI
}

type TicketStatus = 'available' | 'held-by-me' | 'held-by-other' | 'drawn';

const Ticket: React.FC<{
    number: number;
    status: TicketStatus;
    onClick: () => void;
    prize: Prize | null;
}> = ({ number, status, prize, onClick }) => {
    const baseClasses = "w-full h-12 rounded-md flex items-center justify-center font-bold text-lg border-2 transition-all duration-200";
    
    if (status === 'drawn' && prize) {
        return (
            <div 
                className="relative w-full h-12 rounded-md overflow-hidden border-2 border-gray-400 shadow-inner" 
                title={`已抽出: ${prize.grade} - ${prize.name}`}
            >
                <img src={prize.imageUrl} alt={prize.name} className="absolute inset-0 w-full h-full object-cover opacity-40" loading="lazy" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="font-black text-white text-base md:text-lg drop-shadow-md">{prize.grade}</span>
                </div>
            </div>
        );
    }
    
    const statusClasses: Record<TicketStatus, string> = {
        available: "bg-slate-100 border-slate-300 text-gray-700 cursor-pointer hover:bg-yellow-100 hover:border-yellow-400 hover:scale-105 hover:shadow-md active:scale-95 active:bg-yellow-200 transition-transform",
        'held-by-me': "bg-[#ffc400] border-black text-black scale-105 shadow-lg ring-2 ring-yellow-300 cursor-pointer active:scale-95 transition-transform",
        'held-by-other': "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed",
        drawn: "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed line-through", // Fallback for when prize is not found
    };

    const titleText: Record<TicketStatus, string> = {
        available: `選擇籤號 #${number}`,
        'held-by-me': `您已選擇 #${number}`,
        'held-by-other': `已被他人鎖定`,
        drawn: `已被抽出`
    };

    return (
        <div 
            className="relative group" 
            title={titleText[status]}
        >
            <button 
                onClick={onClick} 
                disabled={status !== 'available' && status !== 'held-by-me'}
                className={`${baseClasses} ${statusClasses[status]}`}
            >
                {status === 'drawn' ? '' : number}
            </button>
            {status === 'held-by-other' && (
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <span className="bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-md">鎖定中</span>
                </div>
            )}
        </div>
    );
};


export const TicketBoard: React.FC<TicketBoardProps> = ({ 
  lotteryId, 
  totalTickets, 
  drawnTickets, 
  ticketLocks, 
  currentUser,
  onTicketSelect, 
  isSoldOut,
  isLocked,
  prizes,
  prizeOrder,
  selectedTickets = [], // Default to empty
}) => {
    const ticketStates = useMemo(() => {
        const states = new Map<number, TicketStatus>();
        const now = Date.now();
        const activeLocks = ticketLocks.filter(l => l.lotteryId === lotteryId && l.expiresAt > now);

        for (let i = 0; i < totalTickets; i++) {
            if (drawnTickets.includes(i)) {
                states.set(i, 'drawn');
                continue;
            }
            
            // Check local selection first (optimistic UI)
            if (selectedTickets.includes(i)) {
                states.set(i, 'held-by-me');
                continue;
            }

            const lock = activeLocks.find(l => l.ticketIndex === i);
            if (lock) {
                states.set(i, lock.userId === currentUser?.id ? 'held-by-me' : 'held-by-other');
            } else {
                states.set(i, 'available');
            }
        }
        return states;
    }, [totalTickets, drawnTickets, ticketLocks, lotteryId, currentUser, selectedTickets]);
    
    const myLockedTickets = useMemo(() => {
        if (!currentUser) return [];
        // Combine locks from server and local selection
        const serverLocked = ticketLocks
            .filter(l => l.lotteryId === lotteryId && l.userId === currentUser.id)
            .map(l => l.ticketIndex);
        return Array.from(new Set([...serverLocked, ...selectedTickets]));
    }, [ticketLocks, lotteryId, currentUser, selectedTickets]);

    const prizeMap = useMemo(() => {
        const map = new Map<string, Prize>();
        prizes.forEach(p => map.set(p.id, p));
        return map;
    }, [prizes]);

    const handleTicketClick = (index: number) => {
        if (isLocked) return;
        const status = ticketStates.get(index);
        if (status !== 'available' && status !== 'held-by-me') return;

        const newSelection = myLockedTickets.includes(index)
            ? myLockedTickets.filter(t => t !== index)
            : [...myLockedTickets, index];
            
        onTicketSelect(newSelection);
    };

    return (
        <div className="relative">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
                {isSoldOut ? '最終結果' : '請選擇您要的籤'}
            </h2>
            
            <div className="relative">
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {Array.from({ length: totalTickets }, (_, i) => i).map(index => {
                        const number = index + 1;
                        const status = ticketStates.get(index) || 'available';
                        
                        let prizeForTicket: Prize | null = null;
                        if (status === 'drawn' && prizeOrder) {
                            const prizeId = prizeOrder[index];
                            prizeForTicket = prizeMap.get(prizeId) || null;
                        }

                        return (
                            <Ticket 
                                key={index}
                                number={number}
                                status={status}
                                prize={prizeForTicket}
                                onClick={() => handleTicketClick(index)}
                            />
                        );
                    })}
                </div>
            </div>
             {isSoldOut && (
                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                    <p className="text-xl font-bold text-gray-700 bg-gray-100 p-4 rounded-lg">
                        此一番賞已售完！感謝您的參與。
                    </p>
                </div>
            )}
        </div>
    );
};
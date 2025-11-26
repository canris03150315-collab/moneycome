import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LotterySet, PrizeInstance, Prize, QueueEntry } from '../types';
import { useSiteStore } from '../store/siteDataStore';
import { useAuthStore } from '../store/authStore';
import { ChevronLeftIcon, ChevronRightIcon, TreasureChestIcon, StackedCoinIcon } from './icons';
import { sha256 } from '../utils/crypto';
import { TicketBoard } from './TicketBoard';
import { DrawControlPanel } from './DrawControlPanel';
import { ProductCard } from './ProductCard';
import { QueueStatusPanel } from './QueueStatusPanel';
import { RechargeModal } from './RechargeModal';
import { WinnersList } from './WinnersList';
import { useToast } from './ToastProvider';
import { apiCall } from '../api';

interface VerificationData {
    secretKey: string;
    drawHash: string;
}

const DrawResultModal: React.FC<{ prizes: PrizeInstance[]; verificationData: VerificationData | null; onClose: () => void; onGoProfile: () => void; onCopyVerification?: (text: string) => void; }> = ({ prizes, verificationData, onClose, onGoProfile, onCopyVerification }) => {
    const [localHash, setLocalHash] = useState('');
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        if (verificationData) {
            sha256(verificationData.secretKey).then(hash => {
                setLocalHash(hash);
                setIsVerified(hash === verificationData.drawHash);
            });
        }
    }, [verificationData]);

    const groupedPrizes = useMemo(() => {
        if (!prizes) return [];

        const prizeMap = new Map<string, { prize: PrizeInstance; count: number }>();
        prizes.forEach(prize => {
            const existing = prizeMap.get(prize.id);
            if (existing) {
                existing.count++;
            } else {
                prizeMap.set(prize.id, { prize: prize, count: 1 });
            }
        });
        return Array.from(prizeMap.values());
    }, [prizes]);


    if (!prizes || prizes.length === 0) return null;

    const handleCopyVerification = async () => {
        if (!verificationData) return;
        const text = `${verificationData.secretKey}`;
        try {
            await navigator.clipboard.writeText(text);
        } catch {}
        if (onCopyVerification) onCopyVerification(text);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="drawresult-title" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 m-4 max-w-lg w-full max-h-[90vh] transform transition-all duration-300 scale-95 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                    <h2 id="drawresult-title" className="text-3xl font-extrabold text-black">恭喜您抽中！</h2>
                    <p className="text-gray-500">{prizes.length} 個獎品</p>
                </div>
                <div className="overflow-y-auto max-h-[60vh] pr-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {groupedPrizes.map(({ prize, count }) => (
                            <div key={prize.id} className="relative flex flex-col items-center text-center p-2 rounded-lg bg-gray-50">
                                {count > 1 && (
                                    <div className="absolute top-0 right-0 bg-[#ffc400] text-black text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-md z-10">
                                        x{count}
                                    </div>
                                )}
                                <img src={prize.imageUrl} alt={prize.name} className="w-24 h-24 object-cover rounded-md mb-2 shadow" loading="lazy"/>
                                <p className="text-sm font-semibold text-gray-800 leading-tight">{prize.grade} - {prize.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
                {verificationData && (
                    <div className="mt-4 pt-4 border-t text-xs text-gray-500 font-mono space-y-2">
                        <p className="font-semibold text-gray-600 text-sm mb-2">公平性驗證資料</p>
                        <div>
                            <p><strong>Draw Hash (事前承諾):</strong></p>
                            <p className="break-all text-gray-700">{verificationData.drawHash}</p>
                        </div>
                        <div>
                            <p><strong>Secret Key (您的金鑰):</strong></p>
                            <p className="break-all text-gray-700">{verificationData.secretKey}</p>
                        </div>
                        <div>
                            <p><strong>本地驗證 Hash (由金鑰計算):</strong></p>
                            <p className={`break-all ${isVerified ? 'text-green-600' : 'text-red-600'}`}>{localHash}</p>
                        </div>
                        {isVerified ? <p className="text-green-600 font-bold text-center">✓ 驗證成功</p> : <p className="text-red-600 font-bold text-center">✗ 驗證失敗</p>}
                    </div>
                )}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button onClick={onClose} className="bg-[#ffc400] text-black font-bold py-2 px-6 rounded-lg shadow-md hover:bg-yellow-400 transition-colors border-2 border-black">關閉</button>
                    <button onClick={handleCopyVerification} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">複製 Secret Key</button>
                    <button onClick={onGoProfile} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">前往個人紀錄</button>
                </div>
            </div>
        </div>
    );
};

const ImageGallery: React.FC<{ mainImage: string; prizes: Prize[] }> = ({ mainImage, prizes }) => {
    const galleryImages = useMemo(() => {
        console.log('[ImageGallery] Computing galleryImages, mainImage:', mainImage, 'prizes:', prizes);
        if (!mainImage) {
            console.log('[ImageGallery] No mainImage, returning []');
            return [];
        }
        const filtered = (prizes || []).filter(p => p && p.id && p.imageUrl);
        console.log('[ImageGallery] Filtered prizes:', filtered);
        return [
            { id: 'main', url: mainImage, name: '主圖' },
            ...filtered.map(p => ({ id: p.id, url: p.imageUrl, name: `${p.grade} - ${p.name}` }))
        ];
    }, [mainImage, prizes]);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedImage = galleryImages[selectedIndex] || { id: 'placeholder', url: '', name: '' };

    const handleNext = useCallback(() => setSelectedIndex((prev) => (prev + 1) % galleryImages.length), [galleryImages.length]);
    const handlePrev = useCallback(() => setSelectedIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length), [galleryImages.length]);
    const handleThumbnailClick = (index: number) => setSelectedIndex(index);

    useEffect(() => setSelectedIndex(0), [galleryImages.length]);

    return (
        <div>
            <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg group">
                <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-2 text-gray-800 hover:bg-white transition-opacity duration-300 opacity-0 group-hover:opacity-100 z-10">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-2 text-gray-800 hover:bg-white transition-opacity duration-300 opacity-0 group-hover:opacity-100 z-10">
                    <ChevronRightIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="mt-4">
                <div className="grid grid-cols-5 gap-2">
                    {(galleryImages || []).map((image, index) => (
                        <button key={image.id} onClick={() => handleThumbnailClick(index)} className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${selectedIndex === index ? 'border-yellow-500 ring-2 ring-2 ring-yellow-300' : 'border-transparent hover:border-yellow-400'}`}>
                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const LotteryPage: React.FC = () => {
    const { lotteryId } = useParams<{ lotteryId: string }>();
    const navigate = useNavigate();
    const { lotterySets } = useSiteStore();
    const { currentUser, inventory, draw, rechargePoints, useExtension } = useAuthStore();
    const toast = useToast();
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);

    const lotterySet = useMemo(() => {
        console.log('[LotteryPage] Computing lotterySet, lotterySets:', lotterySets, 'lotteryId:', lotteryId);
        if (!lotterySets || !Array.isArray(lotterySets)) {
            console.log('[LotteryPage] lotterySets is invalid, returning undefined');
            return undefined;
        }
        const found = lotterySets.find(set => set && set.id === lotteryId);
        console.log('[LotteryPage] Found lotterySet:', found);
        return found;
    }, [lotterySets, lotteryId]);
    const cleanedTitle = useMemo(() => (lotterySet?.title || '').replace(/\s*[（(]剩\d+抽[)）]\s*/g, ''), [lotterySet?.title]);
    
    const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawResult, setDrawResult] = useState<PrizeInstance[] | null>([]);
    const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
    const [drawHash, setDrawHash] = useState<string>('');
    const [secretKey, setSecretKey] = useState('');
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [suggestedRecharge, setSuggestedRecharge] = useState<number | undefined>(undefined);
    const [showOnboard, setShowOnboard] = useState<boolean>(() => {
        try { return localStorage.getItem('onboard_lottery_v1') !== 'done'; } catch { return true; }
    });
    
    // Server-driven queue state
    const [queue, setQueue] = useState<QueueEntry[]>([]);
    const [ticketLocks, setTicketLocks] = useState<{ lotteryId: string; ticketIndex: number; userId: string; expiresAt: number }[]>([]);
    // ✅ 排隊系統已啟用（後端 API 已實現）
    const QUEUE_SYSTEM_ENABLED = true;

    const fetchQueueFromServer = useCallback(async () => {
        if (!lotteryId || !QUEUE_SYSTEM_ENABLED) {
            setQueue([]);
            return;
        }
        try {
            const data = await apiCall(`/lottery-sets/${lotteryId}/queue`);
            setQueue(Array.isArray(data) ? data : []);
        } catch {
            setQueue([]);
        }
    }, [lotteryId]);

    const fetchLocksFromServer = useCallback(async () => {
        if (!lotteryId || !QUEUE_SYSTEM_ENABLED) {
            setTicketLocks([]);
            return;
        }
        try {
            const data = await apiCall(`/lottery-sets/${lotteryId}/tickets/locks`);
            const arr = Array.isArray(data) ? data : [];
            // normalize shape into component state
            setTicketLocks(arr
                .filter((l: any) => l && typeof l === 'object')
                .map((l: any) => ({
                    lotteryId: lotteryId,
                    ticketIndex: Number(l.ticketIndex),
                    userId: String(l.userId),
                    expiresAt: Number(l.expiresAt || 0)
                })));
        } catch {
            // keep previous locks on transient errors
        }
    }, [lotteryId]);

    const joinQueue = async () => {
        if (!currentUser) { toast.show({ type: 'info', message: '請先登入後再操作' }); return; }
        if (!lotteryId) return;
        try {
            await apiCall(`/lottery-sets/${lotteryId}/queue/join`, { method: 'POST' });
            await fetchQueueFromServer();
        } catch (e:any) {
            toast.show({ type: 'error', message: e?.message || '加入隊列失敗' });
        }
    };
    const leaveQueue = async () => {
        if (!currentUser || !lotteryId) return;
        try {
            const res = await apiCall(`/lottery-sets/${lotteryId}/queue/leave`, { method: 'POST' });
            await fetchQueueFromServer();
            
            // 更新用戶數據（後端返回更新後的 user，延長次數已重置為 1）
            if (res && res.user) {
                try {
                    const { useAuthStore: authStore } = await import('../store/authStore');
                    authStore.setState(state => ({ currentUser: res.user }));
                } catch {}
            }
        } catch (e:any) {
            // swallow but reset local selection
        }
        setSelectedTickets([]);
        setTicketLocks([]);
        try { await apiCall(`/lottery-sets/${lotteryId}/tickets/lock`, { method: 'POST', body: JSON.stringify({ ticketIndices: [] }), headers: { 'Content-Type': 'application/json' } }); } catch {}
    };
    const extendTurn = async () => {
        if (!lotteryId) return;
        try {
            const res = await apiCall(`/lottery-sets/${lotteryId}/queue/extend`, { method: 'POST' });
            await fetchQueueFromServer();
            // 更新用戶數據（後端返回更新後的 user）
            if (res && res.user) {
                console.log('[DEBUG] Extended user stats:', res.user.lotteryStats?.[lotteryId]);
                try {
                    const { useAuthStore: authStore } = await import('../store/authStore');
                    // 強制更新狀態
                    authStore.setState(state => ({ 
                        currentUser: { 
                            ...res.user,
                            // 確保 lotteryStats 是新的引用
                            lotteryStats: { ...res.user.lotteryStats }
                        } 
                    }));
                } catch {}
            }
            toast.show({ type: 'success', message: '時間已延長 60 秒！' });
        } catch (e:any) {
            toast.show({ type: 'error', message: e?.message || '延長失敗' });
        }
    };
    const lockOrUnlockTickets = () => { /* integrate with TicketBoard via selected state */ };

    const myQueueIndex = currentUser ? queue.findIndex(e => e.userId === currentUser.id) : -1;
    const amIActive = myQueueIndex === 0 && myQueueIndex !== -1;
    
    // 🔍 調試日誌
    useEffect(() => {
        if (currentUser && queue.length > 0) {
            console.log('[Queue Debug] Current User ID:', currentUser.id);
            console.log('[Queue Debug] Queue:', queue.map(e => ({ userId: e.userId, username: e.username })));
            console.log('[Queue Debug] My Queue Index:', myQueueIndex);
            console.log('[Queue Debug] Am I Active?', amIActive);
        }
    }, [currentUser, queue, myQueueIndex, amIActive]);

    // Track whether currently在隊列中，供離開頁面時使用
    const inQueueRef = useRef(false);
    useEffect(() => {
        inQueueRef.current = myQueueIndex !== -1;
    }, [myQueueIndex]);

    // 離開此商品頁（元件 unmount 或切換到其他 lotteryId）時，自動離開對列
    useEffect(() => {
        if (!currentUser || !lotteryId) return;
        const userId = currentUser.id;

        return () => {
            if (!inQueueRef.current) return;
            // fire-and-forget，不阻塞卸載
            (async () => {
                try {
                    await apiCall(`/lottery-sets/${lotteryId}/queue/leave`, { method: 'POST' });
                } catch {}
                try {
                    await apiCall(`/lottery-sets/${lotteryId}/tickets/lock`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ticketIndices: [] }),
                    });
                } catch {}
            })();
        };
        // 只在使用者ID或商品變更時重新註冊，避免 currentUser 物件更新（如 points）就觸發 cleanup
    }, [currentUser?.id, lotteryId]);

    // Poll queue/locks from server
    useEffect(() => {
        fetchQueueFromServer();
        fetchLocksFromServer();
        const id1 = window.setInterval(fetchQueueFromServer, 3000);
        const id2 = window.setInterval(fetchLocksFromServer, 3000);
        return () => { window.clearInterval(id1); window.clearInterval(id2); };
    }, [fetchQueueFromServer, fetchLocksFromServer]);

    const totalTickets = useMemo(() => {
        if (!lotterySet || !lotterySet.prizes) return 0;
        return lotterySet.prizes.filter(p => p.type === 'NORMAL').reduce((sum, p) => sum + p.total, 0);
    }, [lotterySet]);

    const remainingTickets = useMemo(() => {
        if (!lotterySet) return 0;
        const drawn = Array.isArray(lotterySet.drawnTicketIndices) ? lotterySet.drawnTicketIndices.length : 0;
        return Math.max(0, totalTickets - drawn);
    }, [lotterySet, totalTickets]);

    useEffect(() => {
        if (amIActive || !currentUser) {
            const key = `secret-${lotteryId}-${currentUser?.id || 'guest'}-${Date.now()}`;
            setSecretKey(key);
            sha256(key).then(setDrawHash);
        }
    }, [amIActive, lotteryId, currentUser]);

    const handleDraw = useCallback(async () => {
        if (!lotterySet || selectedTickets.length === 0 || !currentUser || !amIActive || !drawHash || !secretKey) return;
        
        setIsDrawing(true);
        const effectivePrice = lotterySet.discountPrice || lotterySet.price;
        const totalCost = selectedTickets.length * effectivePrice;
        if(currentUser.points < totalCost) {
            toast.show({ type: 'error', message: '點數不足，請先儲值後再試。' });
            setIsDrawing(false);
            return;
        }

        const result = await draw(lotterySet.id, selectedTickets, drawHash, secretKey);
        
        if (result.success && result.drawnPrizes) {
            setVerificationData({ secretKey, drawHash });
            setDrawResult(result.drawnPrizes);
            setSelectedTickets([]);
            
            // 顯示中獎提示
            if (result.drawnPrizes.length > 0) {
                const prizeNames = result.drawnPrizes.map(p => `${p.grade} - ${p.name}`).join('、');
                toast.show({ type: 'success', message: `🎉 恭喜中獎！${prizeNames}` });
            }
            
            // Refresh recent winners immediately
            fetchRecentOrders();
        } else {
            toast.show({ type: 'error', message: result.message || '抽獎失敗，請稍後再試。' });
        }
        
        setIsDrawing(false);
        // Regenerate key for next draw
        const key = `secret-${lotteryId}-${currentUser?.id}-${Date.now()}`;
        setSecretKey(key);
        sha256(key).then(setDrawHash);

    }, [lotterySet, selectedTickets, currentUser, amIActive, drawHash, secretKey, draw]);
    

    const handleLockTickets = useCallback(async (selected: number[]) => {
       setSelectedTickets(selected);
       if (!currentUser || !lotteryId) return;
       try {
           const resp = await apiCall(`/lottery-sets/${lotteryId}/tickets/lock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketIndices: selected }) });
           if (resp && Array.isArray(resp.locks)) {
               const arr = resp.locks
                   .filter((l: any) => l && typeof l === 'object')
                   .map((l: any) => ({ lotteryId, ticketIndex: Number(l.ticketIndex), userId: String(l.userId), expiresAt: Number(l.expiresAt || 0) }));
               setTicketLocks(arr);
           } else {
               // fallback refetch
               fetchLocksFromServer();
           }
       } catch {
           // ignore, keep local selection only
       }
    }, [lotteryId, currentUser, fetchLocksFromServer]);


    const recommendedSets = useMemo(() => {
        console.log('[LotteryPage] Computing recommendedSets, lotterySets:', lotterySets);
        if (!lotterySets || !Array.isArray(lotterySets)) return [];
        const result = lotterySets
            .filter(set => set && set.id !== lotteryId && set.status === 'AVAILABLE')
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        console.log('[LotteryPage] recommendedSets result:', result);
        return result;
    }, [lotterySets, lotteryId]);
    
    const fetchRecentOrders = useCallback(async () => {
        try {
            setRecentError(null);
            setLoadingRecent(true);
            const data = await (await import('../api')).apiCall('/orders/recent?limit=50');
            setRecentOrders(Array.isArray(data) ? data : []);
        } catch (e:any) {
            setRecentOrders([]);
            setRecentError(e?.message || '讀取失敗');
        } finally {
            setLoadingRecent(false);
        }
    }, []);

    useEffect(() => {
        fetchRecentOrders();
        const id = window.setInterval(fetchRecentOrders, 30000);
        return () => { window.clearInterval(id); };
    }, [fetchRecentOrders]);

    const winnersOrders = useMemo(() => {
        console.log('[LotteryPage] Computing winnersOrders, recentOrders:', recentOrders, 'lotterySet:', lotterySet);
        const list = Array.isArray(recentOrders) ? recentOrders : [];
        const result = lotterySet ? list.filter(o => o && o.lotterySetTitle === lotterySet.title) : list;
        console.log('[LotteryPage] winnersOrders result:', result);
        return result;
    }, [recentOrders, lotterySet]);

    // 將 inventory 數組轉換為對象，供 WinnersList 使用
    const inventoryMap = useMemo(() => {
        console.log('[LotteryPage] Computing inventoryMap, inventory:', inventory);
        if (!inventory || !Array.isArray(inventory)) return {};
        const result = Object.fromEntries(
            inventory
                .filter(p => p && p.instanceId)
                .map(p => [p.instanceId, p])
        );
        console.log('[LotteryPage] inventoryMap result:', result);
        return result;
    }, [inventory]);

    if (!lotterySet) {
        return (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="aspect-video bg-gray-200 rounded-lg" />
                <div className="space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-3/4" />
                  <div className="h-6 bg-gray-100 rounded w-1/2" />
                  <div className="h-16 bg-gray-100 rounded" />
                  <div className="h-10 bg-gray-200 rounded w-40" />
                </div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="space-y-2">
                {[0,1,2,3,4].map(i => (<div key={i} className="h-10 bg-gray-100 rounded" />))}
              </div>
            </div>
          </div>
        );
    }
    
    const isSoldOut = lotterySet.status === 'SOLD_OUT' || remainingTickets === 0;

    return (
        <>
            <RechargeModal 
                isOpen={isRechargeModalOpen}
                onClose={() => setIsRechargeModalOpen(false)}
                onConfirmPurchase={rechargePoints}
                currentUserPoints={currentUser?.points || 0}
                suggestedAddPoints={suggestedRecharge}
            />
            {drawResult && (
                <DrawResultModal
                  prizes={drawResult}
                  verificationData={verificationData}
                  onClose={() => setDrawResult(null)}
                  onGoProfile={() => navigate('/profile')}
                  onCopyVerification={(text) => toast.show({ type:'success', message:'驗證資料已複製' })}
                />
            )}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                {showOnboard && (
                  <div className="mb-4 p-3 rounded-md border shadow-sm bg-amber-50 text-amber-900 text-sm flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">如何開始抽獎</div>
                      <ol className="list-decimal ml-5 mt-1 space-y-1">
                        <li>按「排隊抽獎」加入隊列，輪到您時介面會解鎖。</li>
                        <li>使用「電腦選籤」快速挑選，或點「我要包套」一次全選。</li>
                        <li>點數不足可用「一鍵補足差額」快速儲值。</li>
                        <li>抽後可於彈窗一鍵複製「驗證資料」前往驗證。</li>
                      </ol>
                    </div>
                    <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50 text-gray-700" onClick={()=>{ setShowOnboard(false); try{ localStorage.setItem('onboard_lottery_v1','done'); }catch{} }}>知道了</button>
                  </div>
                )}
                <div className="relative mb-6">
                    <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center text-gray-700 hover:text-black font-semibold transition-colors z-10">
                        <ChevronLeftIcon className="h-6 w-6" />
                        <span>返回</span>
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800 truncate px-20">{cleanedTitle}</h1>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <ImageGallery mainImage={lotterySet.imageUrl} prizes={lotterySet.prizes || []} />
                        
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900">{cleanedTitle}</h2>
                            <p className="text-sm text-gray-500 mt-1">編號: {lotterySet.id}</p>
                            
                            <div className="mt-4 flex items-center gap-4 p-4 rounded-lg bg-slate-100">
                                <StackedCoinIcon className="w-8 h-8 text-yellow-500" />
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm">單抽:</span>
                                    {!!lotterySet.discountPrice ? (
                                        <>
                                            <span className="text-3xl font-bold text-rose-500">{lotterySet.discountPrice} P</span>
                                            <span className="text-xl text-slate-400 line-through">{lotterySet.price} P</span>
                                        </>
                                    ) : (
                                        <span className="text-3xl font-bold text-black">{lotterySet.price} P</span>
                                    )}
                                </div>
                                <div className="ml-auto text-sm text-gray-700 font-semibold">
                                    剩餘 {remainingTickets} / {totalTickets} 張
                                </div>
                            </div>

                            <div className="mt-2 text-xs text-gray-500">
                                最後賞將在最後一張籤抽出後自動頒發。
                            </div>

                            <div className="mt-6 pt-6 border-t">
                                <div className="flex justify-between items-center text-sm font-semibold text-gray-700 bg-gray-200 px-4 py-2 rounded-t-lg">
                                    <div className="flex items-center gap-2">
                                        <TreasureChestIcon className="w-5 h-5"/>
                                        <span>獎項</span>
                                    </div>
                                    <span>剩餘 / 總量</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-t-0 rounded-b-lg">
                                    {(lotterySet.prizes || []).map((prize) => (
                                        <div key={prize.id} className={`flex justify-between items-center px-4 py-2 text-sm ${prize.type === 'LAST_ONE' ? 'bg-amber-50' : (prize.remaining === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white')} border-b last:border-b-0`}>
                                            <div className="font-medium text-gray-800">
                                                <span className="font-bold mr-2">{prize.grade}</span>
                                                {prize.name}
                                            </div>
                                            <div className="font-mono font-semibold">
                                                {prize.remaining} / {prize.total}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <div className="mb-8">
                        <QueueStatusPanel 
                            lotteryId={lotterySet.id} 
                            queue={queue} 
                            currentUser={currentUser} 
                            onJoinQueue={joinQueue} 
                            onLeaveQueue={leaveQueue}
                            onExtendTurn={extendTurn}
                            onTimerEnd={() => {
                                // When time is up, backend will expire head; just refetch
                                fetchQueueFromServer();
                                fetchLocksFromServer();
                                setSelectedTickets([]);
                                setTicketLocks([]);
                            }}
                        />
                      </div>
                      <TicketBoard
                          lotteryId={lotterySet.id}
                          totalTickets={totalTickets}
                          drawnTickets={lotterySet.drawnTicketIndices || []}
                          ticketLocks={ticketLocks}
                          currentUser={currentUser}
                          onTicketSelect={handleLockTickets}
                          isSoldOut={isSoldOut}
                          isLocked={!amIActive}
                          prizes={lotterySet.prizes || []}
                          prizeOrder={lotterySet.prizeOrder || []}
                          selectedTickets={selectedTickets}
                      />
                      <DrawControlPanel
                          lotteryId={lotterySet.id}
                          price={lotterySet.price}
                          discountPrice={lotterySet.discountPrice}
                          remainingTickets={remainingTickets}
                          selectedTickets={selectedTickets}
                          onTicketSelect={handleLockTickets}
                          currentUser={currentUser}
                          isDrawing={isDrawing}
                          drawHash={drawHash}
                          onDraw={handleDraw}
                          isSoldOut={isSoldOut}
                          totalTickets={totalTickets}
                          drawnTickets={lotterySet.drawnTicketIndices || []}
                          isLocked={!amIActive}
                          amIActive={amIActive}
                          onRechargeClick={() => { setSuggestedRecharge(undefined); setIsRechargeModalOpen(true); }}
                          onRechargeQuick={(missing) => { setSuggestedRecharge(missing); setIsRechargeModalOpen(true); }}
                      />
                    </div>
                </div>

                {recommendedSets.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-center mb-6">您可能也喜歡</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendedSets.map(lottery => (
                                <ProductCard key={lottery.id} lottery={lottery} onSelect={() => navigate(`/lottery/${lottery.id}`)} />
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="mt-8">
                  {loadingRecent ? (
                    <div className="text-gray-600">近期訂單載入中…</div>
                  ) : recentError ? (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 flex items-center justify-between">
                      <span>近期訂單載入失敗</span>
                      <button className="px-3 py-1 rounded border bg-white hover:bg-gray-50" onClick={fetchRecentOrders}>重試</button>
                    </div>
                  ) : (
                    <WinnersList orders={winnersOrders} users={[]} inventory={inventoryMap} />
                  )}
                </div>
            </div>
        </>
    );
};
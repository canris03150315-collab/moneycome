import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from './icons';
import { sha256 } from '../utils/crypto';
import type { Order, LotterySet, Prize, PrizeInstance } from '../types';
import { useSiteStore } from '../store/siteDataStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from './ToastProvider';

interface FoundOrderCardProps {
    order: Order;
    calculatedHash: string;
    inventory: PrizeInstance[];
}

const FoundOrderCard: React.FC<FoundOrderCardProps> = ({ order, calculatedHash, inventory }) => {
    // 從數組中查找對應的獎品實例
    console.log('[FoundOrderCard] Order prize IDs:', order.prizeInstanceIds);
    console.log('[FoundOrderCard] Inventory length:', inventory?.length || 0);
    console.log('[FoundOrderCard] Inventory sample:', inventory?.slice(0, 3));
    
    const prizesDrawn: PrizeInstance[] = order.prizeInstanceIds
        .map(id => {
            const prize = inventory.find(item => item.instanceId === id);
            if (!prize) {
                console.log('[FoundOrderCard] Prize not found for ID:', id);
            }
            return prize;
        })
        .filter((p): p is PrizeInstance => !!p);
    
    console.log('[FoundOrderCard] Prizes drawn:', prizesDrawn.length);

    return (
        <div className="mt-6 border-t-4 border-green-500 pt-4 bg-green-50 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center text-green-800 font-bold text-lg mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                驗證成功！找到對應訂單。
            </div>

            <div className="space-y-2 text-sm font-mono mb-4">
                <div className="bg-white p-2 rounded border">
                    <p className="text-xs text-gray-500">訂單中的 Hash (事前承諾)</p>
                    <p className="text-gray-600 break-all">{order.drawHash}</p>
                </div>
                <div className="bg-white p-2 rounded border">
                    <p className="text-xs text-gray-500">由您的金鑰計算出的 Hash (事後驗證)</p>
                    <p className="text-blue-600 break-all">{calculatedHash}</p>
                </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4 border">
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
                <h4 className="font-semibold text-gray-700 mb-2">抽中獎品：</h4>
                {prizesDrawn.length === 0 && order.prizeInstanceIds.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <p className="text-yellow-800 font-semibold mb-2">⚠️ 獎品數據載入中...</p>
                        <p className="text-yellow-700 text-sm">訂單包含 {order.prizeInstanceIds.length} 個獎品，但獎品詳細資料尚未載入。</p>
                        <p className="text-yellow-700 text-sm mt-2">請稍候片刻或重新整理頁面。</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                            重新整理頁面
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {prizesDrawn.map((prize: PrizeInstance) => (
                            <div key={prize.instanceId} className="flex flex-col items-center text-center">
                                <img src={prize.imageUrl} alt={prize.name} className="w-20 h-20 object-cover rounded-md mb-1" loading="lazy"/>
                                <p className="text-xs font-semibold text-gray-700 leading-tight">{prize.grade} - {prize.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const VerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const { lotterySets } = useSiteStore();
    const { orders, inventory, currentUser, fetchOrders, fetchInventory } = useAuthStore();
    const toast = useToast();
    
    // 確保訂單和獎品數據已加載
    useEffect(() => {
        if (currentUser) {
            console.log('[VerificationPage] Loading orders and inventory...');
            fetchOrders();
            fetchInventory();
        }
    }, [currentUser?.id, fetchOrders, fetchInventory]);
    
    const [secretKey, setSecretKey] = useState('');
    const [isOrderLoading, setIsOrderLoading] = useState(false);
    const [orderVerificationStatus, setOrderVerificationStatus] = useState<'idle' | 'success' | 'not_found'>('idle');
    const [foundOrder, setFoundOrder] = useState<Order | null>(null);
    const [orderCalculatedHash, setOrderCalculatedHash] = useState('');

    const [selectedSetId, setSelectedSetId] = useState('');
    const [poolSeedInput, setPoolSeedInput] = useState('');
    const [prizeOrderInput, setPrizeOrderInput] = useState('');
    const [isPoolLoading, setIsPoolLoading] = useState(false);
    const [poolVerificationResult, setPoolVerificationResult] = useState<{status: 'idle' | 'success' | 'fail', message: string}>({status: 'idle', message: ''});

    const selectedSet = useMemo(() => lotterySets.find(s => s.id === selectedSetId), [selectedSetId, lotterySets]);
    const prizeMap = useMemo(() => {
        const map = new Map<string, Prize>();
        if (!selectedSet) return map;
        for (const prize of selectedSet.prizes) {
          map.set(prize.id, prize);
        }
        return map;
    }, [selectedSet]);


    const handleOrderVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!secretKey) return;

        setIsOrderLoading(true);
        setOrderVerificationStatus('idle');
        setFoundOrder(null);
        
        // 清理秘密金鑰（移除空白和換行）
        const cleanedSecretKey = secretKey.trim().replace(/\s+/g, '');
        
        const hash = await sha256(cleanedSecretKey);
        setOrderCalculatedHash(hash);
        
        console.log('[VerificationPage] Searching for order...');
        console.log('[VerificationPage] Cleaned Secret Key:', cleanedSecretKey);
        console.log('[VerificationPage] Calculated Hash:', hash);
        console.log('[VerificationPage] Total orders:', orders?.length || 0);
        
        const order = orders.find(o => o.drawHash === hash);
        
        if (order) {
            console.log('[VerificationPage] Order found:', order.id);
        } else {
            console.log('[VerificationPage] Order not found');
            console.log('[VerificationPage] Available hashes:', orders.map(o => o.drawHash));
        }

        setTimeout(() => {
            if (order) {
                setFoundOrder(order);
                setOrderVerificationStatus('success');
            } else {
                setOrderVerificationStatus('not_found');
            }
            setIsOrderLoading(false);
        }, 500);
    };

    const handlePoolVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSet || !selectedSet.poolCommitmentHash) {
            setPoolVerificationResult({ status: 'fail', message: '請選擇一個已售完的有效商品。'});
            return;
        }

        setIsPoolLoading(true);
        const dataToHash = prizeOrderInput + poolSeedInput;
        const calculatedHash = await sha256(dataToHash);
        
        setTimeout(() => {
            setIsPoolLoading(false);

            if (calculatedHash === selectedSet.poolCommitmentHash) {
                setPoolVerificationResult({ status: 'success', message: `驗證成功！計算出的 Hash 與公開的承諾 Hash 完全相符。` });
            } else {
                setPoolVerificationResult({ status: 'fail', message: `驗證失敗。計算出的 Hash 與公開的承諾 Hash 不符。請檢查您的種子碼與籤序。` });
            }
        }, 500);
    };
    
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast.show({ type: 'success', message: `${label} 已複製到剪貼簿` });
        }, (err) => {
          console.error('無法複製文字: ', err);
          toast.show({ type: 'error', message: '複製失敗' });
        });
    };
    
    const copyAndFillPrizeOrder = () => {
        if (selectedSet && selectedSet.prizeOrder) {
            const orderString = selectedSet.prizeOrder.join(',');
            setPrizeOrderInput(orderString);
            copyToClipboard(orderString, '完整籤序');
        }
    };

    const myLatestOrder = useMemo(() => {
        try {
            if (!currentUser || !Array.isArray(orders)) return null;
            const mine = orders.filter(o => o.userId === currentUser.id && o.secretKey);
            if (mine.length === 0) return null;
            return [...mine].sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        } catch { return null; }
    }, [orders, currentUser]);

    const handleQuickFillSecret = () => {
        if (!myLatestOrder?.secretKey) return;
        setSecretKey(myLatestOrder.secretKey);
        toast.show({ type:'success', message:'已帶入最近一次訂單的 Secret Key' });
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <div className="relative mb-6">
                <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center text-black hover:text-gray-700 font-semibold transition-colors">
                    <ChevronLeftIcon className="h-6 w-6" />
                    <span>返回</span>
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800">抽獎公平性驗證</h1>
            </div>

            <div className="max-w-4xl mx-auto space-y-12">
                 <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">什麼是可驗證公平性 (Provably Fair)？</h2>
                    <p className="text-gray-600 mb-6">
                        與其單純請您「相信我們」，我們選擇提供一套<strong className="text-black">兩層級的數學證明</strong>，讓您親自驗證每一次的抽獎都是完全公平、無法被操縱的。這套系統能證明<strong className="text-black">整套獎品的抽出順序</strong>在開賣前就已固定，並且您<strong className="text-black">個人的抽獎結果</strong>在下訂的瞬間就已完全確定，後續絕無可能被任何人（包括我們）更改。
                    </p>
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">運作原理：</h3>
                    <ol className="space-y-6">
                        <li className="flex items-start">
                            <div className="flex-shrink-0 bg-gray-800 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-4">1</div>
                            <div>
                                <h4 className="font-bold">第一層承諾 (整套)：鎖定籤池</h4>
                                <p className="text-gray-600 text-sm">
                                    在<strong className="text-gray-900">第一位客人抽獎前</strong>，系統會為整套一番賞預先排定所有獎品的抽出順序，並將此順序加上一個秘密的「籤池種子碼」後加密成「<strong>籤池承諾 Hash</strong>」，並立即公開。這確保了總獎池的順序從一開始就無法被竄改。
                                </p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <div className="flex-shrink-0 bg-gray-800 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-4">2</div>
                            <div>
                                <h4 className="font-bold">第二層承諾 (單筆)：鎖定您的抽獎</h4>
                                <p className="text-gray-600 text-sm">
                                    在您<strong className="text-black">按下抽獎按鈕的瞬間</strong>，系統會為您這「一筆」訂單生成一把獨一無二的「秘密金鑰」，並立即算出它的加密指紋，也就是「抽獎 Hash」。這個 Hash 會在獎品揭曉前就記錄在您的訂單中，確保您的抽獎結果被即時鎖定。
                                </p>
                            </div>
                        </li>
                         <li className="flex items-start">
                             <div className="flex-shrink-0 bg-green-500 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-4">3</div>
                            <div>
                                <h4 className="font-bold">驗證：自己的公平自己驗證</h4>
                                <p className="text-gray-600 text-sm">
                                   您可以使用下方的兩種工具，分別對「您的單筆抽獎」和「已售完的整套商品」進行驗證，確保每一層級的絕對公平。
                                </p>
                            </div>
                        </li>
                    </ol>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">1. 驗證您的抽獎紀錄 (即時驗證)</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        想確認您剛剛的抽獎是否公平？或驗證任何<strong className="text-black">「未完售」</strong>商品的抽獎紀錄？請使用這個工具。從「個人資料」的「歷史紀錄」中複製任何一筆訂單的「秘密金鑰」貼到下方即可。
                    </p>
                    <form onSubmit={handleOrderVerify} className="space-y-4">
                        <div>
                            <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">秘密金鑰 (Secret Key)</label>
                            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                              <textarea id="secretKey" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-yellow-400 focus:border-yellow-400" placeholder="貼上您的 Secret Key"/>
                              {myLatestOrder?.secretKey && (
                                <button type="button" onClick={handleQuickFillSecret} className="whitespace-nowrap mt-1 sm:mt-0 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm">
                                  從個人紀錄帶入
                                </button>
                              )}
                            </div>
                        </div>
                        <div>
                            <button type="submit" disabled={isOrderLoading} className="w-full flex justify-center py-3 px-4 border-2 border-black rounded-md shadow-sm text-sm font-bold text-black bg-[#ffc400] hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:bg-yellow-200">
                                {isOrderLoading ? '驗證中...' : '查找並驗證訂單'}
                            </button>
                        </div>
                    </form>
                    
                    {orderVerificationStatus === 'success' && foundOrder && <FoundOrderCard order={foundOrder} calculatedHash={orderCalculatedHash} inventory={inventory} />}
                    {orderVerificationStatus === 'not_found' && (
                        <div className="mt-6 border-t-4 border-red-500 pt-4 bg-red-50 p-4 rounded-lg animate-fade-in">
                           <div className="flex items-center text-red-800 font-bold text-lg">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                               驗證失敗
                           </div>
                           <p className="text-red-700 mt-2">找不到與此「秘密金鑰」對應的訂單。</p>
                           <div className="mt-4 space-y-3">
                               <div className="bg-white p-2 rounded border font-mono text-sm">
                                   <p className="text-xs text-gray-500">由您的金鑰計算出的 Hash:</p>
                                   <p className="text-blue-600 break-all">{orderCalculatedHash}</p>
                               </div>
                               <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                   <p className="text-sm font-semibold text-yellow-800 mb-2">可能的原因：</p>
                                   <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                                       <li>秘密金鑰複製時包含了多餘的空白或換行</li>
                                       <li>訂單數據尚未完全加載（請重新整理頁面）</li>
                                       <li>此訂單不屬於當前登入的帳號</li>
                                       <li>秘密金鑰不完整或有誤</li>
                                   </ul>
                                   <p className="text-xs text-yellow-700 mt-2">💡 建議：請檢查控制台（F12）查看詳細的調試信息</p>
                               </div>
                           </div>
                        </div>
                    )}
                </div>

                 <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">2. 驗證已售完的整套一番賞 (最終驗證)</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        當一套一番賞<strong className="text-gray-900">「完全售完」</strong>後，我們將公開所有必要資訊。您可以在此輸入該商品的「籤池種子碼」及由所有玩家訂單還原出的「完整籤序」，來驗證我們開賣前的「籤池承諾 Hash」是否一致。這是對整個籤池從頭到尾未被竄改的最終證明。
                    </p>
                    <form onSubmit={handlePoolVerify} className="space-y-4">
                        <div>
                            <label htmlFor="lotterySetSelect" className="block text-sm font-medium text-gray-700">選擇已售完的商品</label>
                            <select id="lotterySetSelect" value={selectedSetId} onChange={e => setSelectedSetId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400">
                                <option value="">-- 請選擇 --</option>
                                {lotterySets.filter(s => s.remainingTickets === 0 || s.earlyTerminated).map(s => ( <option key={s.id} value={s.id}>{s.title}</option>))}
                            </select>
                            {selectedSet && selectedSet.poolCommitmentHash && (
                                <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
                                    <p className="text-gray-500">公開承諾 Hash:</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input
                                            type="text"
                                            readOnly
                                            value={selectedSet.poolCommitmentHash}
                                            className="w-full text-xs text-indigo-600 bg-gray-200 rounded px-2 py-1 font-mono border-none"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => copyToClipboard(selectedSet.poolCommitmentHash!, 'Hash')} 
                                            className="text-gray-500 hover:text-yellow-500 p-1 flex-shrink-0" 
                                            title="複製 Hash"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedSet && selectedSet.prizeOrder && (
                            <div className="space-y-2 animate-fade-in">
                                <h3 className="text-base font-semibold text-gray-700">公開的完整籤序 (全 {selectedSet.prizeOrder.length} 抽)</h3>
                                <p className="text-xs text-gray-500">
                                    此為官方公布的、在開賣前就已決定的獎品抽出順序。
                                    {selectedSet.status !== 'SOLD_OUT' && (
                                        <span className="text-amber-600 font-semibold ml-1">
                                            (商品尚未售完，籤序可能尚未完全公開)
                                        </span>
                                    )}
                                </p>
                                <div className="max-h-64 overflow-y-auto border rounded-md bg-gray-50 p-2 space-y-1">
                                    {selectedSet.prizeOrder.map((prizeId, index) => {
                                        const prize = prizeMap.get(prizeId);
                                        return (
                                            <div key={index} className="flex items-center text-sm p-1 bg-white rounded-sm">
                                                <span className="font-bold text-gray-500 w-12 shrink-0">#{index + 1}</span>
                                                {prize ? (
                                                    <span className="text-gray-800">
                                                        <span className="font-semibold text-black">{prize.grade}</span> - {prize.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-red-500">無效的獎品ID: {prizeId}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    onClick={copyAndFillPrizeOrder}
                                    className="w-full text-center text-sm font-medium text-black bg-yellow-50 hover:bg-yellow-100 p-2 rounded-md transition-colors"
                                >
                                    複製並填入下方籤序框
                                </button>
                            </div>
                        )}

                        <div>
                            <label htmlFor="poolSeed" className="block text-sm font-medium text-gray-700">籤池種子碼 (Pool Seed)</label>
                            <textarea id="poolSeed" value={poolSeedInput} onChange={(e) => setPoolSeedInput(e.target.value)} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={selectedSetId ? "貼上商品頁面公開的 Pool Seed" : "請先在上方選擇商品"} disabled={!selectedSetId}/>
                        </div>
                        <div>
                            <label htmlFor="prizeOrder" className="block text-sm font-medium text-gray-700">完整籤序 (Prize IDs)</label>
                            <textarea id="prizeOrder" value={prizeOrderInput} onChange={(e) => setPrizeOrderInput(e.target.value)} rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 font-mono text-sm focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder={selectedSetId ? "點擊上方按鈕自動填入，或手動貼上以逗號分隔的完整獎品ID列表..." : "請先在上方選擇商品"} disabled={!selectedSetId}/>
                            <p className="text-xs text-gray-500 mt-1">下方已為您顯示官方的完整籤序。您可以點擊上方按鈕自動填入，或自行比對歷史訂單來驗證其準確性，然後進行最終 Hash 驗證。</p>
                        </div>
                        <div>
                            <button type="submit" disabled={isPoolLoading || !selectedSetId} className="w-full flex justify-center py-3 px-4 border-2 border-black rounded-md shadow-sm text-sm font-bold text-black bg-[#ffc400] hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:bg-yellow-200">
                                {isPoolLoading ? '驗證中...' : '驗證整套公平性'}
                            </button>
                        </div>
                    </form>
                    {poolVerificationResult.status !== 'idle' && (
                        <div className={`mt-4 p-4 rounded-lg text-sm ${poolVerificationResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <p className="font-bold">{poolVerificationResult.status === 'success' ? '驗證成功' : '驗證失敗'}</p>
                            <p className="break-all">{poolVerificationResult.message}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
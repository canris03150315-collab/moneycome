import React, { useState } from 'react';
import type { PrizeInstance } from '../types';
import { XCircleIcon } from './icons';
import { useToast } from './ToastProvider';

interface PickupRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPrizes: PrizeInstance[];
    onConfirmPickup: () => Promise<{success: boolean; message?: string}>;
}

export const PickupRequestModal: React.FC<PickupRequestModalProps> = ({ isOpen, onClose, selectedPrizes, onConfirmPickup }) => {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);
        const result = await onConfirmPickup();
        setIsLoading(false);
        
        if (result.success) {
            toast.success(`成功申請自取 ${selectedPrizes.length} 件獎品！`);
            onClose();
        } else {
            const errorMsg = result.message || '發生未知錯誤，請稍後再試。';
            setError(errorMsg);
            toast.error('自取申請失敗：' + errorMsg);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-50 rounded-2xl shadow-2xl p-6 sm:p-8 m-4 max-w-2xl w-full max-h-[90vh] transform transition-all duration-300 scale-95 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-6">確認自取申請</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Items list */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg">申請品項 ({selectedPrizes.length} 件)</h3>
                        <div className="overflow-y-auto max-h-64 bg-white p-3 rounded-lg border">
                            {selectedPrizes.map(prize => (
                                <div key={prize.instanceId} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                                    <img src={prize.imageUrl} alt={prize.name} className="w-12 h-12 object-cover rounded" loading="lazy" />
                                    <div>
                                        <p className="text-sm font-semibold">{prize.grade} - {prize.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Right: Store info */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">店面資訊</h3>
                        <div className="space-y-2 bg-white p-4 rounded-lg border text-gray-700">
                            <p><strong>店名：</strong>一番賞官方合作店</p>
                            <p><strong>地址：</strong>110台北市信義區信義路五段7號 (台北101)</p>
                            <p><strong>營業時間：</strong>週一至週日 11:00 - 21:00</p>
                            <p className="text-sm text-gray-800 font-semibold pt-2 border-t mt-2">請於收到「可取貨」通知後，於營業時間內前往領取。</p>
                        </div>
                    </div>
                </div>

                {/* Summary and Confirm Button */}
                <div className="mt-6 pt-6 border-t">
                    <div className="p-4 bg-gray-100 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                           <p>確認申請後，獎品狀態將更新為「待自取」。</p>
                           <p className="text-xs text-gray-500">店員備貨完成後，狀態將更新為「可取貨」。</p>
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="w-full sm:w-auto bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? '處理中...' : '確認申請'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>

            </div>
        </div>
    );
};
import React, { useState, useEffect } from 'react';
import { XCircleIcon, CheckCircleIcon, StackedCoinIcon } from './icons';
import type { RechargeOption } from '../types';
import { rechargeOptions } from '../data/mockData';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmPurchase: (amount: number) => Promise<void>;  // 修正為 Promise<void>
    currentUserPoints: number;
    suggestedAddPoints?: number;
}

type PaymentStep = 'select' | 'processing' | 'success';

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, onConfirmPurchase, currentUserPoints, suggestedAddPoints }) => {
    const [selectedOption, setSelectedOption] = useState<RechargeOption | null>(rechargeOptions.find(o => o.isPopular) || null);
    const [paymentStep, setPaymentStep] = useState<PaymentStep>('select');
    const [newPointTotal, setNewPointTotal] = useState(0);

    useEffect(() => {
        // Reset state when modal is opened from a closed state
        if (isOpen) {
            setPaymentStep('select');
            // Preselect by suggestedAddPoints if provided
            if (suggestedAddPoints && suggestedAddPoints > 0) {
                const pick = rechargeOptions.find(o => (o.points + (o.bonus || 0)) >= suggestedAddPoints) || rechargeOptions[rechargeOptions.length - 1] || null;
                setSelectedOption(pick);
            } else {
                setSelectedOption(rechargeOptions.find(o => o.isPopular) || null);
            }
        }
    }, [isOpen, suggestedAddPoints]);

    const handlePurchase = async () => {
        console.log('[RechargeModal] handlePurchase called');
        console.log('[RechargeModal] selectedOption:', selectedOption);
        
        if (!selectedOption) {
            console.log('[RechargeModal] ❌ No option selected, aborting');
            return;
        }

        console.log('[RechargeModal] Setting payment step to processing');
        setPaymentStep('processing');
        
        const totalPointsToAdd = selectedOption.points + (selectedOption.bonus || 0);
        console.log('[RechargeModal] Total points to add:', totalPointsToAdd);
        
        try {
            // 模擬付款處理延遲，然後調用實際的 API
            console.log('[RechargeModal] Waiting 1.5s for payment processing...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 調用實際的儲值 API
            console.log('[RechargeModal] Calling onConfirmPurchase API...');
            await onConfirmPurchase(totalPointsToAdd);
            
            // API 成功後才更新狀態
            console.log('[RechargeModal] API success, updating state');
            setNewPointTotal(currentUserPoints + totalPointsToAdd);
            setPaymentStep('success');
            
            console.log('[RechargeModal] ✅ Recharge completed successfully');
        } catch (error: any) {
            console.error('[RechargeModal] ❌ Recharge failed:', error);
            console.error('[RechargeModal] Error type:', typeof error);
            console.error('[RechargeModal] Error message:', error.message);
            console.error('[RechargeModal] Error stack:', error.stack);
            console.error('[RechargeModal] Full error object:', JSON.stringify(error, null, 2));
            
            // 顯示詳細錯誤訊息
            const errorDetails = [
                '儲值失敗！',
                '',
                '錯誤訊息：',
                error.message || '未知錯誤',
                '',
                '請檢查：',
                '1. 網絡連接是否正常',
                '2. Session 是否有效',
                '3. 打開 Console (F12) 查看詳細日誌'
            ].join('\n');
            
            alert(errorDetails);
            setPaymentStep('select');
        }
    };
    
    const handleClose = () => {
        // Reset state for next time
        setTimeout(() => {
            setPaymentStep('select');
            setSelectedOption(rechargeOptions.find(o => o.isPopular) || null);
        }, 300); // delay to allow for closing animation
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    const renderSelectionScreen = () => (
        <>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold text-gray-900">點數儲值</h2>
                <p className="text-gray-500 mt-2">
                    目前點數: <span className="font-bold text-black">{currentUserPoints.toLocaleString()} P</span>
                </p>
            </div>
            <div className="space-y-3">
                {rechargeOptions.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedOption(option)}
                        className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 relative ${selectedOption?.points === option.points ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200' : 'border-gray-300 bg-white hover:border-yellow-400'}`}
                    >
                        {option.isPopular && (
                            <div className="absolute -top-3 right-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                熱門
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xl font-bold text-gray-800">
                                    {option.points.toLocaleString()} <span className="text-base font-medium text-gray-500">P</span>
                                </p>
                                {option.bonus && (
                                    <p className="text-sm text-green-600 font-semibold">
                                        + 贈送 {option.bonus.toLocaleString()} P
                                    </p>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-gray-800">
                                NT$ {option.price}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
            <div className="mt-8">
                <button
                    onClick={() => {
                        console.log('[RechargeModal] Button clicked!');
                        handlePurchase();
                    }}
                    disabled={!selectedOption}
                    className="w-full bg-[#ffc400] text-black font-bold py-3 rounded-lg shadow-md hover:bg-yellow-400 disabled:bg-yellow-200 disabled:cursor-not-allowed transition-colors border-2 border-black"
                >
                    {selectedOption ? `前往付款 (NT$ ${selectedOption.price})` : '請選擇一個方案'}
                </button>
            </div>
        </>
    );

    const renderProcessingScreen = () => (
        <div className="flex flex-col items-center justify-center h-64">
             <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
             <p className="text-xl font-semibold text-gray-700 mt-6">付款處理中...</p>
             <p className="text-gray-500">請稍候，請勿關閉視窗</p>
        </div>
    );

    const renderSuccessScreen = () => (
         <div className="flex flex-col items-center justify-center text-center h-64">
            <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4" />
            <h2 className="text-3xl font-extrabold text-gray-900">儲值成功！</h2>
            <p className="text-gray-600 mt-2 text-lg">
                您的新餘額為: <span className="font-bold text-black">{newPointTotal.toLocaleString()} P</span>
            </p>
            <button
                onClick={handleClose}
                className="mt-8 w-full bg-[#ffc400] text-black font-bold py-3 rounded-lg shadow-md hover:bg-yellow-400 border-2 border-black"
            >
                完成
            </button>
        </div>
    );


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="recharge-title" onClick={handleClose}>
            <div 
                className="bg-slate-50 rounded-2xl shadow-2xl p-6 sm:p-8 m-4 max-w-md w-full transform transition-all duration-300 scale-95 animate-modal-pop"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={handleClose} aria-label="關閉儲值視窗" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                {paymentStep === 'select' && (
                  <div>
                    <div className="text-center mb-6">
                      <h2 id="recharge-title" className="text-3xl font-extrabold text-gray-900">點數儲值</h2>
                      <p className="text-gray-500 mt-2">
                        目前點數: <span className="font-bold text-black">{currentUserPoints.toLocaleString()} P</span>
                      </p>
                    </div>
                    {renderSelectionScreen()}
                  </div>
                )}
                {paymentStep === 'processing' && renderProcessingScreen()}
                {paymentStep === 'success' && renderSuccessScreen()}

            </div>
        </div>
    );
};
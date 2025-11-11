import React, { useState, useMemo } from 'react';
import type { PrizeInstance, User, ShippingAddress } from '../types';
import { XCircleIcon } from './icons';
import { SHIPPING_BASE_FEE_POINTS, SHIPPING_BASE_WEIGHT_G, SHIPPING_EXTRA_FEE_PER_KG } from '../data/mockData';

interface ShippingRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPrizes: PrizeInstance[];
    user: User;
    onConfirmShipment: (prizeInstanceIds: string[], shippingAddress: ShippingAddress) => Promise<{success: boolean; message?: string}>;
    onSaveAddress: (address: Omit<ShippingAddress, 'id' | 'isDefault'>) => void;
}

export const ShippingRequestModal: React.FC<ShippingRequestModalProps> = ({ isOpen, onClose, selectedPrizes, user, onConfirmShipment, onSaveAddress }) => {
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({ name: '', phone: '', address: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            const defaultAddress = user.shippingAddresses?.find(a => a.isDefault);
            setSelectedAddressId(defaultAddress?.id || user.shippingAddresses?.[0]?.id || null);
            setIsAddingNewAddress(!user.shippingAddresses || user.shippingAddresses.length === 0);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen, user.shippingAddresses]);

    const { totalWeightInGrams, shippingCostInPoints } = useMemo(() => {
        const totalWeightInGrams = selectedPrizes.reduce((sum, p) => sum + p.weight, 0);
        let shippingCostInPoints = SHIPPING_BASE_FEE_POINTS;
        if (totalWeightInGrams > SHIPPING_BASE_WEIGHT_G) {
            const extraWeightInKg = Math.ceil((totalWeightInGrams - SHIPPING_BASE_WEIGHT_G) / 1000);
            shippingCostInPoints += extraWeightInKg * SHIPPING_EXTRA_FEE_PER_KG;
        }
        return { totalWeightInGrams, shippingCostInPoints };
    }, [selectedPrizes]);
    
    const handleAddNewAddress = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveAddress(newAddress);
        setNewAddress({ name: '', phone: '', address: '' });
        setIsAddingNewAddress(false);
    };

    const handleConfirm = async () => {
        if (!selectedAddressId) {
            setError('請選擇一個收件地址。');
            return;
        }
        const address = user.shippingAddresses?.find(a => a.id === selectedAddressId);
        if (!address) {
             setError('無效的收件地址。');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        const prizeIds = selectedPrizes.map(p => p.instanceId);
        const result = await onConfirmShipment(prizeIds, address);
        setIsLoading(false);
        
        if (result.success) {
            onClose();
        } else {
            setError(result.message || '發生未知錯誤，請稍後再試。');
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-50 rounded-2xl shadow-2xl p-6 sm:p-8 m-4 max-w-2xl w-full max-h-[90vh] transform transition-all duration-300 scale-95 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">申請包裹運送</h2>
                <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm" role="note">
                  <div className="font-semibold">運費說明</div>
                  <div className="mt-1 leading-5">
                    基礎運費 {SHIPPING_BASE_FEE_POINTS} P（3kg 內）。超過 3kg 每增加 1kg 加收 {SHIPPING_EXTRA_FEE_PER_KG} P。
                    請確認收件地址正確，申請後將扣除運費點數。
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Items list */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg">包裹內容 ({selectedPrizes.length} 件)</h3>
                        <div className="overflow-y-auto max-h-64 bg-white p-3 rounded-lg border">
                            {selectedPrizes.map(prize => (
                                <div key={prize.instanceId} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                                    <img src={prize.imageUrl} alt={prize.name} className="w-12 h-12 object-cover rounded" loading="lazy" />
                                    <div>
                                        <p className="text-sm font-semibold">{prize.grade} - {prize.name}</p>
                                        <p className="text-xs text-gray-500">{prize.weight}g</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Right: Address and cost */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">收件資訊</h3>
                        <div className="space-y-2">
                           {user.shippingAddresses && user.shippingAddresses.length > 0 && user.shippingAddresses.map(addr => (
                                <div key={addr.id} onClick={() => { setSelectedAddressId(addr.id); setIsAddingNewAddress(false); }}
                                    className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${selectedAddressId === addr.id && !isAddingNewAddress ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 bg-white hover:border-yellow-400'}`}
                                >
                                    <p className="font-semibold">{addr.name} - {addr.phone}</p>
                                    <p className="text-sm text-gray-600">{addr.address}</p>
                                </div>
                           ))}
                        </div>
                        
                        {!isAddingNewAddress && (
                             <button onClick={() => setIsAddingNewAddress(true)} className="text-sm font-semibold text-black hover:text-gray-700">+ 新增地址</button>
                        )}
                       
                        {isAddingNewAddress && (
                            <form onSubmit={handleAddNewAddress} className="space-y-3 p-4 bg-white rounded-lg border border-yellow-300">
                                <h4 className="font-semibold">新增收件地址</h4>
                                <input type="text" placeholder="收件人姓名" value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} required className="w-full border p-2 rounded-md border-gray-300"/>
                                <input type="tel" placeholder="聯絡電話" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} required className="w-full border p-2 rounded-md border-gray-300"/>
                                <input type="text" placeholder="完整收件地址" value={newAddress.address} onChange={e => setNewAddress({...newAddress, address: e.target.value})} required className="w-full border p-2 rounded-md border-gray-300"/>
                                <div className="flex justify-end gap-2">
                                     {user.shippingAddresses && user.shippingAddresses.length > 0 && <button type="button" onClick={() => setIsAddingNewAddress(false)} className="px-4 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300">取消</button>}
                                     <button type="submit" className="px-4 py-1 rounded text-sm bg-black text-white hover:bg-gray-800">儲存地址</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Summary and Confirm Button */}
                <div className="mt-6 pt-6 border-t">
                    <div className="p-4 bg-gray-100 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                           <p>總重量: <span className="font-bold">{(totalWeightInGrams / 1000).toFixed(2)} kg</span></p>
                           <p>運費: <span className="font-bold text-red-600 text-xl">{shippingCostInPoints.toLocaleString()} P</span></p>
                           <p className="text-xs text-gray-500">基礎運費 {SHIPPING_BASE_FEE_POINTS} P (3kg內), 超過後每公斤加收 {SHIPPING_EXTRA_FEE_PER_KG} P</p>
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading || (!selectedAddressId && !isAddingNewAddress) || (isAddingNewAddress)}
                            className="w-full sm:w-auto bg-[#ffc400] text-black font-bold py-3 px-6 rounded-lg shadow-md hover:bg-yellow-400 disabled:bg-yellow-200 disabled:cursor-not-allowed transition-colors border-2 border-black"
                        >
                            {isLoading ? '處理中...' : '確認申請並支付運費'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>

            </div>
        </div>
    );
};
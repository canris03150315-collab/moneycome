import React, { useState, useMemo, useEffect } from 'react';
import type { LotterySet, Category, Prize } from '../types';

interface ProductFormProps {
    lotterySet: LotterySet | Partial<LotterySet>;
    categories: Category[];
    onSave: (set: LotterySet) => Promise<void>;
    onCancel: () => void;
}

const flattenCategories = (categories: Category[]): { id: string, name: string, level: number }[] => {
    const result: { id: string, name: string, level: number }[] = [];
    const recurse = (cats: Category[], level: number, prefix: string) => {
        cats.forEach(cat => {
            const name = prefix ? `${prefix} > ${cat.name}` : cat.name;
            result.push({ id: cat.id, name, level });
            if (cat.children.length > 0) {
                recurse(cat.children, level + 1, name);
            }
        });
    };
    recurse(categories, 0, '');
    return result;
};


const ProductForm: React.FC<ProductFormProps> = ({ lotterySet, categories, onSave, onCancel }) => {
    const [formState, setFormState] = useState<Omit<LotterySet, 'prizes' | 'allowSelfPickup'>>(
        () => {
            const { prizes, ...rest } = lotterySet;
            return {
                id: '',
                title: '',
                categoryId: '',
                price: 0,
                discountPrice: 0,
                imageUrl: '',
                status: 'UPCOMING',
                tags: [],
                description: '',
                rules: '',
                ...rest,
                drawnTicketIndices: lotterySet.drawnTicketIndices ?? [],
            };
        }
    );

    const [normalPrizes, setNormalPrizes] = useState<Prize[]>([]);
    const [lastOnePrize, setLastOnePrize] = useState<Prize | null>(null);

    useEffect(() => {
        setNormalPrizes(lotterySet.prizes?.filter(p => p.type === 'NORMAL') || []);
        setLastOnePrize(lotterySet.prizes?.find(p => p.type === 'LAST_ONE') || null);
    }, [lotterySet.prizes]);

    const flatCategories = flattenCategories(categories);

    const totalTickets = useMemo(() => {
        return normalPrizes.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    }, [normalPrizes]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormState(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormState(prev => ({ ...prev, [name]: (name === 'price' || name === 'discountPrice') ? parseInt(value, 10) || 0 : value }));
        }
    };

    const handleImageUpload = (files: FileList | null, setter: (url: string) => void) => {
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if(e.target?.result) {
                    setter(e.target.result as string);
                }
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const handlePrizeChange = (index: number, field: keyof Prize, value: any) => {
        const newPrizes = [...normalPrizes];
        const targetPrize = { ...newPrizes[index] };

        if (field === 'total' || field === 'remaining' || field === 'recycleValue' || field === 'weight') {
             // @ts-ignore
            targetPrize[field] = parseInt(value as string, 10) || 0;
        } else if (field === 'allowSelfPickup') {
            // @ts-ignore
            targetPrize[field] = Boolean(value);
        } else {
             // @ts-ignore
            targetPrize[field] = value;
        }
        
        newPrizes[index] = targetPrize;
        setNormalPrizes(newPrizes);
    };
    
    const addPrize = () => {
        const newPrize: Prize = {
            id: `prize-${Date.now()}`,
            grade: '一般賞',
            name: '獎品名稱',
            imageUrl: 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 100),
            total: 1,
            remaining: 1,
            type: 'NORMAL',
            weight: 100,
            allowSelfPickup: false,
        };
        setNormalPrizes(prev => [...prev, newPrize]);
    };

    const removePrize = (index: number) => {
        setNormalPrizes(prev => prev.filter((_, i) => i !== index));
    };
    
    const addLastOnePrize = () => {
        const newPrize: Prize = {
            id: `prize-last-${Date.now()}`,
            grade: '最後賞',
            name: '最後賞獎品名稱',
            imageUrl: 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 100),
            total: 1,
            remaining: 1,
            type: 'LAST_ONE',
            weight: 500,
            allowSelfPickup: false,
        };
        setLastOnePrize(newPrize);
    };

    const removeLastOnePrize = () => {
        setLastOnePrize(null);
    };

    const handleLastOnePrizeChange = (field: 'name' | 'imageUrl' | 'recycleValue' | 'weight', value: string | number) => {
        if (lastOnePrize) {
            setLastOnePrize(prev => {
                if (!prev) return null;
                const updated = { ...prev };
                if (field === 'recycleValue' || field === 'weight') {
                    // @ts-ignore
                    updated[field] = parseInt(value as string, 10) || 0;
                } else {
                    // @ts-ignore
                    updated[field] = value;
                }
                return updated;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allPrizes = [...normalPrizes];
        if (lastOnePrize) {
            allPrizes.push(lastOnePrize);
        }
        await onSave({ ...formState, prizes: allPrizes } as LotterySet);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-6">{lotterySet.id ? '編輯商品' : '新增商品'}</h3>
                
                <div className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">商品標題</label>
                        <input id="title" name="title" value={formState.title} onChange={handleChange} placeholder="輸入商品完整名稱" className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm" required/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">商品分類</label>
                            <select id="categoryId" name="categoryId" value={formState.categoryId} onChange={handleChange} className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm" required>
                                <option value="">選擇分類</option>
                                {flatCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700">原價 (點數/抽)</label>
                                <input id="price" name="price" type="number" value={formState.price} onChange={handleChange} placeholder="例如: 350" className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm" required/>
                            </div>
                            <div>
                                <label htmlFor="discountPrice" className="block text-sm font-medium text-gray-700">促銷特價 (可選)</label>
                                <input id="discountPrice" name="discountPrice" type="number" value={formState.discountPrice} onChange={handleChange} placeholder="例如: 300" className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm" />
                                <p className="text-xs text-gray-500 mt-1">輸入 0 或留空則表示無特價。</p>
                            </div>
                         </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">商品主圖</label>
                        {formState.imageUrl && <img src={formState.imageUrl} alt="Product Preview" className="w-full max-w-xs h-auto object-cover rounded my-2 border" loading="lazy" />}
                        <input
                            name="imageUrl"
                            value={formState.imageUrl}
                            onChange={handleChange}
                            placeholder="貼上圖片 URL"
                            className="w-full border p-2 rounded-md text-sm border-gray-300"
                            required
                        />
                        <label className="block text-xs font-medium text-gray-500 mt-2">或上傳新圖片</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files, (url) => setFormState(prev => ({ ...prev, imageUrl: url })))}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">販售狀態</label>
                            <select id="status" name="status" value={formState.status} onChange={handleChange} className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm">
                                <option value="AVAILABLE">販售中</option>
                                <option value="UPCOMING">即將推出</option>
                                <option value="SOLD_OUT">已售完</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">總籤數 (自動計算)</label>
                            <div className="mt-1 p-2 bg-gray-100 rounded-md text-gray-800 font-bold text-lg">
                                {totalTickets} 抽
                            </div>
                            <p className="text-xs text-gray-500 mt-1">由下方「一般賞」的總數量加總而成。</p>
                        </div>
                    </div>

                    


                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">商品描述</label>
                        <textarea id="description" name="description" value={formState.description} onChange={handleChange} rows={4} placeholder="支援 HTML 標籤" className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm" />
                    </div>
                    
                    <div className="pt-4 border-t">
                        <h4 className="font-bold text-lg">獎品列表</h4>
                        <div className="space-y-4 mt-2">
                            {normalPrizes.map((prize, index) => (
                                <div key={index} className="border p-4 rounded-lg bg-gray-50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-800">獎品 #{index + 1}</p>
                                        <button type="button" onClick={() => removePrize(index)} className="text-red-500 hover:text-red-700 text-sm font-medium">移除</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">獎賞等級</label>
                                            <select
                                                value={prize.grade}
                                                onChange={e => handlePrizeChange(index, 'grade', e.target.value)}
                                                className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm bg-white"
                                            >
                                                <option value="A賞">A賞</option>
                                                <option value="B賞">B賞</option>
                                                <option value="C賞">C賞</option>
                                                <option value="D賞">D賞</option>
                                                <option value="E賞">E賞</option>
                                                <option value="F賞">F賞</option>
                                                <option value="G賞">G賞</option>
                                                <option value="一般賞">一般賞</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">獎品名稱</label>
                                            <input value={prize.name} onChange={e => handlePrizeChange(index, 'name', e.target.value)} className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">獎品圖片</label>
                                        {prize.imageUrl && <img src={prize.imageUrl} alt="Prize Preview" className="w-24 h-24 object-cover rounded mb-2 border" loading="lazy" />}
                                        <input value={prize.imageUrl} onChange={e => handlePrizeChange(index, 'imageUrl', e.target.value)} placeholder="貼上圖片 URL" className="w-full border p-2 rounded-md text-xs border-gray-300"/>
                                        <label className="block text-xs font-medium text-gray-500 mt-2">或上傳</label>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files, (url) => handlePrizeChange(index, 'imageUrl', url))} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"/>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">總數量</label>
                                            <input type="number" value={prize.total} onChange={e => handlePrizeChange(index, 'total', e.target.value)} className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">剩餘數量</label>
                                            <input type="number" value={prize.remaining} onChange={e => handlePrizeChange(index, 'remaining', e.target.value)} className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">重量 (g)</label>
                                            <input 
                                                type="number" 
                                                value={prize.weight || ''} 
                                                onChange={e => handlePrizeChange(index, 'weight', e.target.value)} 
                                                placeholder="重量 (克)"
                                                className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">自訂回收價 (P)</label>
                                            <input 
                                                type="number" 
                                                value={prize.recycleValue || ''} 
                                                onChange={e => handlePrizeChange(index, 'recycleValue', e.target.value)} 
                                                placeholder="預設回收價"
                                                className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="inline-flex items-center mt-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!prize.allowSelfPickup}
                                                    onChange={e => handlePrizeChange(index, 'allowSelfPickup', e.target.checked)}
                                                    className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                                                />
                                                <span className="ml-2 text-xs font-medium text-gray-700">允許此獎品店面自取</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addPrize} className="mt-3 text-sm font-semibold text-black hover:text-gray-700">+ 新增獎品</button>
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="font-bold text-lg">最後賞 (可選)</h4>
                        {!lastOnePrize ? (
                             <button type="button" onClick={addLastOnePrize} className="mt-2 text-sm font-semibold text-black hover:text-gray-700">+ 新增最後賞</button>
                        ) : (
                            <div className="border p-4 rounded-lg bg-gray-100 space-y-3 mt-2">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-gray-800">最後賞設定</p>
                                    <button type="button" onClick={removeLastOnePrize} className="text-red-500 hover:text-red-700 text-sm font-medium">移除</button>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">獎品名稱</label>
                                    <input value={lastOnePrize.name} onChange={e => handleLastOnePrizeChange('name', e.target.value)} className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">獎品圖片</label>
                                    {lastOnePrize.imageUrl && <img src={lastOnePrize.imageUrl} alt="Last Prize Preview" className="w-24 h-24 object-cover rounded mb-2 border" loading="lazy" />}
                                    <input value={lastOnePrize.imageUrl} onChange={e => handleLastOnePrizeChange('imageUrl', e.target.value)} placeholder="貼上圖片 URL" className="w-full border p-2 rounded-md text-xs border-gray-300"/>
                                    <label className="block text-xs font-medium text-gray-500 mt-2">或上傳</label>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files, (url) => handleLastOnePrizeChange('imageUrl', url))} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">重量 (g)</label>
                                        <input 
                                            type="number" 
                                            value={lastOnePrize.weight || ''} 
                                            onChange={e => handleLastOnePrizeChange('weight', e.target.value)} 
                                            placeholder="重量 (克)"
                                            className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">自訂回收價 (P)</label>
                                        <input 
                                            type="number" 
                                            value={lastOnePrize.recycleValue || ''} 
                                            onChange={e => handleLastOnePrizeChange('recycleValue', e.target.value)} 
                                            placeholder="預設回收價"
                                            className="mt-1 w-full border p-2 rounded-md border-gray-300 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="inline-flex items-center mt-2">
                                            <input
                                                type="checkbox"
                                                checked={!!lastOnePrize.allowSelfPickup}
                                                onChange={e => setLastOnePrize(prev => prev ? { ...prev, allowSelfPickup: e.target.checked } : prev)}
                                                className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                                            />
                                            <span className="ml-2 text-xs font-medium text-gray-700">允許最後賞店面自取</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t">
                    <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
                    <button type="submit" className="bg-black text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-800">儲存商品</button>
                </div>
            </form>
        </div>
    );
};

const isLotterySetLocked = (lotterySet: LotterySet): boolean => {
    if (!lotterySet.prizes || lotterySet.prizes.length === 0) {
        return false;
    }
    // A set is locked if any prize has been drawn (remaining < total)
    return lotterySet.prizes.some(prize => prize.remaining < prize.total);
};

export const AdminProductManagement: React.FC<{
    lotterySets: LotterySet[];
    categories: Category[];
    onSaveLotterySet: (set: LotterySet) => Promise<void>;
    onDeleteLotterySet: (setId: string) => void;
}> = ({ lotterySets, categories, onSaveLotterySet, onDeleteLotterySet }) => {
    const [editingSet, setEditingSet] = useState<LotterySet | Partial<LotterySet> | null>(null);

    const handleSave = async (set: LotterySet) => {
        await onSaveLotterySet(set);
        setEditingSet(null);
    };
    
    const handleAddNew = () => {
        setEditingSet({
            id: '', 
            title: '',
            categoryId: '',
            price: 0,
            discountPrice: undefined,
            imageUrl: '',
            status: 'UPCOMING',
            tags: [],
            releaseDate: undefined,
            description: '',
            rules: '',
            prizes: [],
            drawnTicketIndices: [],
            prizeOrder: undefined,
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">商品管理</h2>
                <button onClick={handleAddNew} className="bg-black text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-800">
                    新增商品
                </button>
            </div>
            
            <div className="space-y-2">
                {lotterySets.map(set => {
                    const isLocked = isLotterySetLocked(set);
                    return (
                        <div key={set.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center space-x-3">
                                <div>
                                    <p className="font-semibold">{set.title}</p>
                                    <p className="text-sm text-gray-500">{set.id}</p>
                                </div>
                                {isLocked && (
                                    <div className="flex items-center" title="此商品已有抽獎紀錄，為確保公平性，已鎖定編輯與刪除功能。">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs text-amber-600 font-semibold ml-1">已鎖定</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-x-2">
                                <button
                                    onClick={() => setEditingSet(set)}
                                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                                >
                                    編輯
                                </button>
                                <button
                                    onClick={() => window.confirm('確定要刪除此商品嗎？') && onDeleteLotterySet(set.id)}
                                    disabled={isLocked}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                                    title={isLocked ? "此商品已有抽獎紀錄，禁止刪除" : "刪除"}
                                >
                                    刪除
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {editingSet && (
                <ProductForm
                    lotterySet={editingSet}
                    categories={categories}
                    onSave={handleSave}
                    onCancel={() => setEditingSet(null)}
                />
            )}
        </div>
    );
};
import React, { useState, useEffect, useMemo } from 'react';
import type { SiteConfig, Banner, LotterySet, Category, ShopProduct } from '../types';
import { apiCall } from '../api';

interface AdminSiteSettingsProps {
    siteConfig: SiteConfig;
    onSaveSiteConfig: (config: SiteConfig) => void;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<{success: boolean, message: string}>;
    lotterySets: LotterySet[];
    categories: Category[];
    onUpdateAdminVerifyPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean }>;
}

export const AdminSiteSettings: React.FC<AdminSiteSettingsProps> = ({ siteConfig, onSaveSiteConfig, onChangePassword, lotterySets, categories, onUpdateAdminVerifyPassword }) => {
    const [config, setConfig] = useState<SiteConfig>(siteConfig);
    const [isDirty, setIsDirty] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [draggedShopId, setDraggedShopId] = useState<string | null>(null);
    const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
    const [loadingShop, setLoadingShop] = useState(false);

    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeMessage, setPasswordChangeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Admin verify password states
    const [currentVerifyPassword, setCurrentVerifyPassword] = useState('');
    const [newVerifyPassword, setNewVerifyPassword] = useState('');
    const [verifyMessage, setVerifyMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        // Ensure categoryDisplayOrder exists and syncs with available categories + synthetic 'cat-shop'
        const currentTopLevelIds = categories.map(c => c.id);
        const existingOrder = siteConfig.categoryDisplayOrder || [];
        const newOrder = existingOrder.filter(id => id === 'cat-shop' || currentTopLevelIds.includes(id));
        currentTopLevelIds.forEach(id => { if (!newOrder.includes(id)) newOrder.push(id); });
        if (!newOrder.includes('cat-shop')) newOrder.push('cat-shop');
        setConfig({ ...siteConfig, categoryDisplayOrder: newOrder });
        setIsDirty(false);
    }, [siteConfig, categories]);

    // Load admin shop products for ordering
    useEffect(() => {
        const load = async () => {
            try {
                setLoadingShop(true);
                const list = await apiCall('/admin/shop/products');
                setShopProducts(Array.isArray(list) ? list : []);
            } catch {
                setShopProducts([]);
            } finally { setLoadingShop(false); }
        };
        load();
    }, []);
    
    useEffect(() => {
        if (JSON.stringify(config) !== JSON.stringify(siteConfig)) {
            setIsDirty(true);
        } else {
            setIsDirty(false);
        }
    }, [config, siteConfig]);

    const handleSave = () => {
        onSaveSiteConfig(config);
        setIsDirty(false);
    };
    
    const handleBannerChange = (index: number, field: keyof Banner, value: string) => {
        const newBanners = [...config.banners];
        const bannerToUpdate = { ...newBanners[index] };

        // @ts-ignore
        bannerToUpdate[field] = value;
        
        if (field === 'linkToLotterySetId' && value === '') {
            delete bannerToUpdate.linkToLotterySetId;
        }

        newBanners[index] = bannerToUpdate;
        setConfig({ ...config, banners: newBanners });
    };

    const handleLinkTypeChange = (index: number, type: 'none' | 'product' | 'url') => {
        const newBanners = [...config.banners];
        const bannerToUpdate = { ...newBanners[index] };

        delete bannerToUpdate.linkToLotterySetId;
        delete bannerToUpdate.externalLink;

        if (type === 'product') {
            bannerToUpdate.linkToLotterySetId = '';
        } else if (type === 'url') {
            bannerToUpdate.externalLink = '';
        }

        newBanners[index] = bannerToUpdate;
        setConfig({ ...config, banners: newBanners });
    };

    const handleBannerImageChange = async (index: number, file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const newBanners = [...config.banners];
            newBanners[index].imageUrl = reader.result as string;
            setConfig({ ...config, banners: newBanners });
        };
        reader.readAsDataURL(file);
    };

    const addBanner = () => {
        const newBanner: Banner = {
            id: `banner-${Date.now()}`,
            imageUrl: 'https://picsum.photos/1600/600?random=' + Math.floor(Math.random() * 100),
            title: 'New Banner Title',
            subtitle: 'New Banner Subtitle'
        };
        setConfig({ ...config, banners: [...config.banners, newBanner] });
    };

    const removeBanner = (index: number) => {
        const newBanners = config.banners.filter((_, i) => i !== index);
        setConfig({ ...config, banners: newBanners });
    };
    
    const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordChangeMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordChangeMessage({ type: 'error', text: '新密碼與確認密碼不相符。' });
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setPasswordChangeMessage({ type: 'error', text: '新密碼長度至少需要6個字元。' });
            return;
        }

        const result = await onChangePassword(currentPassword, newPassword);

        if (result.success) {
            setPasswordChangeMessage({ type: 'success', text: result.message });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setPasswordChangeMessage({ type: 'error', text: result.message });
        }
    };

    const orderedTopLevel = useMemo(() => {
        const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c] as [string, Category]));
        // Map to display items (id + label). Include synthetic 'cat-shop'.
        const items = (config.categoryDisplayOrder || []).map((id: string) => {
            if (id === 'cat-shop') return { id, label: '商城商品' };
            const c = categoryMap.get(id) as Category | undefined;
            return c ? { id: c.id, label: c.name } : null;
        }).filter((x): x is { id: string; label: string } => !!x);
        return items;
    }, [config.categoryDisplayOrder, categories]);

    const orderedShopProducts = useMemo(() => {
        const map = new Map(shopProducts.map(p => [p.id, p] as const));
        const fromOrder = (config.shopProductsDisplayOrder || []).map(id => map.get(id)).filter((x): x is ShopProduct => !!x);
        const remaining = shopProducts.filter(p => !(config.shopProductsDisplayOrder || []).includes(p.id));
        return [...fromOrder, ...remaining];
    }, [shopProducts, config.shopProductsDisplayOrder]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!draggedItemId || draggedItemId === targetId) {
            setDraggedItemId(null);
            return;
        }

        const currentOrder = config.categoryDisplayOrder || [];
        const draggedIndex = currentOrder.indexOf(draggedItemId);
        const targetIndex = currentOrder.indexOf(targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;

        const newOrder = [...currentOrder];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, removed);
        
        setConfig(prev => ({ ...prev, categoryDisplayOrder: newOrder }));
        setDraggedItemId(null);
    };

    const handleShopDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedShopId(id);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleShopDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); };
    const handleShopDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!draggedShopId || draggedShopId === targetId) {
            setDraggedShopId(null);
            return;
        }
        const currentOrder = config.shopProductsDisplayOrder || [];
        const exists = (ids: string[], pool: ShopProduct[]) => ids.filter(id => pool.some(p => p.id === id));
        const base = currentOrder.length ? exists(currentOrder, shopProducts) : shopProducts.map(p => p.id);
        const draggedIndex = base.indexOf(draggedShopId);
        const targetIndex = base.indexOf(targetId);
        if (draggedIndex === -1 || targetIndex === -1) return;
        const newOrder = [...base];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, removed);
        setConfig(prev => ({ ...prev, shopProductsDisplayOrder: newOrder }));
        setDraggedShopId(null);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div>
                <h2 className="text-2xl font-bold mb-6">網站設定</h2>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">商店名稱</label>
                        <input
                            type="text"
                            id="storeName"
                            value={config.storeName}
                            onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="bannerInterval" className="block text-sm font-medium text-gray-700">橫幅輪播間隔 (秒)</label>
                        <input
                            type="number"
                            id="bannerInterval"
                            step="0.1"
                            value={config.bannerInterval / 1000}
                            onChange={(e) => setConfig({ ...config, bannerInterval: (parseFloat(e.target.value) || 0) * 1000 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                        />
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">首頁分類排序</h3>
                        <p className="text-sm text-gray-500 mb-3">拖曳下方的分類項目以調整它們在首頁的顯示順序。</p>
                        <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                            {orderedTopLevel.map(item => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                    className={`flex items-center p-3 bg-white rounded-md shadow-sm cursor-move border-2 ${draggedItemId === item.id ? 'border-blue-500 opacity-50' : 'border-transparent'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    <span className="font-medium text-gray-800">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">首頁商城商品排序</h3>
                            {loadingShop && <span className="text-xs text-gray-500">讀取中…</span>}
                        </div>
                        <p className="text-sm text-gray-500 mb-3">拖曳下方的商城商品以調整它們在首頁的顯示順序。</p>
                        <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                            {orderedShopProducts.map(prod => (
                                <div
                                    key={prod.id}
                                    draggable
                                    onDragStart={(e) => handleShopDragStart(e, prod.id)}
                                    onDragOver={handleShopDragOver}
                                    onDrop={(e) => handleShopDrop(e, prod.id)}
                                    className={`flex items-center p-3 bg-white rounded-md shadow-sm cursor-move border-2 ${draggedShopId === prod.id ? 'border-blue-500 opacity-50' : 'border-transparent'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    <img src={prod.imageUrl} alt="" className="w-8 h-8 rounded object-cover mr-3" />
                                    <span className="font-medium text-gray-800 truncate">{prod.title}</span>
                                </div>
                            ))}
                            {!loadingShop && orderedShopProducts.length === 0 && (
                                <div className="text-sm text-gray-500 p-3">尚無商城商品</div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">橫幅管理</h3>
                        <div className="space-y-4">
                            {config.banners.map((banner, index) => {
                                const linkType = banner.linkToLotterySetId != null ? 'product' : banner.externalLink != null ? 'url' : 'none';
                                return (
                                <div key={banner.id} className="border p-4 rounded-md space-y-3 bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">橫幅 #{index + 1}</p>
                                        <button onClick={() => removeBanner(index)} className="text-red-500 hover:text-red-700 text-sm font-medium">移除</button>
                                    </div>
                                     <input
                                        type="text"
                                        placeholder="標題"
                                        value={banner.title}
                                        onChange={(e) => handleBannerChange(index, 'title', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="副標題"
                                        value={banner.subtitle}
                                        onChange={(e) => handleBannerChange(index, 'subtitle', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                    />
                                    <div>
                                        {banner.imageUrl && <img src={banner.imageUrl} alt="Banner Preview" className="w-full h-32 object-cover rounded-md mb-2" loading="lazy" />}
                                        <label className="block text-xs font-medium text-gray-500">圖片 URL</label>
                                        <input
                                            type="text"
                                            placeholder="圖片 URL"
                                            value={banner.imageUrl}
                                            onChange={(e) => handleBannerChange(index, 'imageUrl', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                        />
                                        <label className="block text-xs font-medium text-gray-500 mt-2">或上傳新圖片</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleBannerImageChange(index, e.target.files ? e.target.files[0] : null)}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">連結類型</label>
                                        <div className="flex items-center space-x-4">
                                            <label className="text-sm"><input type="radio" name={`linkType-${index}`} checked={linkType === 'none'} onChange={() => handleLinkTypeChange(index, 'none')} className="mr-1"/>不連結</label>
                                            <label className="text-sm"><input type="radio" name={`linkType-${index}`} checked={linkType === 'product'} onChange={() => handleLinkTypeChange(index, 'product')} className="mr-1"/>連結至商品</label>
                                            <label className="text-sm"><input type="radio" name={`linkType-${index}`} checked={linkType === 'url'} onChange={() => handleLinkTypeChange(index, 'url')} className="mr-1"/>連結至網址</label>
                                        </div>
                                    </div>
                                    {linkType === 'product' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500">商品</label>
                                            <select
                                                value={banner.linkToLotterySetId || ''}
                                                onChange={(e) => handleBannerChange(index, 'linkToLotterySetId', e.target.value)}
                                                className="mt-1 w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                            >
                                                <option value="">-- 請選擇商品 --</option>
                                                {lotterySets.map(set => (
                                                    <option key={set.id} value={set.id}>{set.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {linkType === 'url' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500">網址</label>
                                            <input
                                                type="url"
                                                placeholder="https://example.com/your-page"
                                                value={banner.externalLink || ''}
                                                onChange={(e) => handleBannerChange(index, 'externalLink', e.target.value)}
                                                className="mt-1 w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                        <button onClick={addBanner} className="mt-4 text-black hover:text-gray-700 text-sm font-semibold">
                            + 新增橫幅
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="bg-black text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        儲存設定
                    </button>
                </div>
            </div>

            {/* 修改管理員密碼 */}
            <div className="border-t mt-8 pt-6">
                <h2 className="text-2xl font-bold mb-6">修改管理員密碼</h2>
                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 max-w-md">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">目前密碼</label>
                        <input
                            type="password"
                            id="currentPassword"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">新密碼</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">確認新密碼</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                            required
                        />
                    </div>
                    {passwordChangeMessage && (
                        <p className={`text-sm ${passwordChangeMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {passwordChangeMessage.text}
                        </p>
                    )}
                    <div className="flex justify-end">
                        <button type="submit" className="bg-black text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-800">修改密碼</button>
                    </div>
                </form>
            </div>

            {/* 管理員驗證密碼設定 */}
            <div className="border-t mt-8 pt-6">
                <h2 className="text-2xl font-bold mb-6">管理員驗證密碼設定</h2>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setVerifyMessage(null);
                        if (!newVerifyPassword || newVerifyPassword.length < 6) {
                            setVerifyMessage({ type: 'error', text: '新驗證密碼長度至少需要6個字元。' });
                            return;
                        }
                        try {
                            await onUpdateAdminVerifyPassword(currentVerifyPassword, newVerifyPassword);
                            setVerifyMessage({ type: 'success', text: '已更新管理員驗證密碼。' });
                            setCurrentVerifyPassword('');
                            setNewVerifyPassword('');
                        } catch (e:any) {
                            setVerifyMessage({ type: 'error', text: e?.message || '更新失敗。' });
                        }
                    }}
                    className="space-y-4 max-w-md"
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700">目前驗證密碼</label>
                        <input type="password" value={currentVerifyPassword} onChange={(e) => setCurrentVerifyPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">新驗證密碼</label>
                        <input type="password" value={newVerifyPassword} onChange={(e) => setNewVerifyPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm" required />
                    </div>
                    {verifyMessage && (
                        <p className={`text-sm ${verifyMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{verifyMessage.text}</p>
                    )}
                    <div className="flex justify-end">
                        <button type="submit" className="bg-black text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-800">更新驗證密碼</button>
                    </div>
                </form>
            </div>

        </div>
    );
};
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useNavigate } from 'react-router-dom';
import type { LotterySet, Banner, Category, ShopProduct } from '../types';
import { apiCall } from '../api';
import { useSiteStore } from '../store/siteDataStore';
import { ProductCard } from './ProductCard';
import { ShopProductCard } from './ShopProductCard';
import { SearchIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, ArrowUpRightIcon } from './icons';

// A simple banner component
const BannerCarousel: React.FC<{ banners: Banner[], interval: number, onSelectLotteryById: (id: string) => void }> = ({ banners, interval, onSelectLotteryById }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (banners.length > 1) {
            const timer = setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
            }, interval);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, banners.length, interval]);

    if (!banners || banners.length === 0) {
        return null;
    }
    
    const handleBannerClick = (banner: Banner) => {
        if (banner.linkToLotterySetId) {
            onSelectLotteryById(banner.linkToLotterySetId);
        } else if (banner.externalLink) {
            window.open(banner.externalLink, '_blank');
        }
    }

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? banners.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === banners.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    return (
        <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-xl mb-8 group">
            <div className="w-full h-full" onClick={() => handleBannerClick(banners[currentIndex])} style={{cursor: 'pointer'}}>
                <img
                    src={banners[currentIndex].imageUrl}
                    alt={banners[currentIndex].title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/1600x600?text=Banner'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 md:p-8">
                    <h2 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">{banners[currentIndex].title}</h2>
                    <p className="text-md md:text-lg text-white/90 mt-2 drop-shadow-md">{banners[currentIndex].subtitle}</p>
                    {(banners[currentIndex].linkToLotterySetId || banners[currentIndex].externalLink) && (
                        <div className="flex items-center text-yellow-300 font-semibold mt-3 text-sm">
                            點擊查看詳情 <ArrowUpRightIcon className="w-4 h-4 ml-1" />
                        </div>
                    )}
                </div>
            </div>
             {banners.length > 1 && (
                <>
                    <button onClick={goToPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full text-gray-800 hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 z-10">
                        <ChevronLeftIcon className="w-6 h-6"/>
                    </button>
                    <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full text-gray-800 hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 z-10">
                        <ChevronRightIcon className="w-6 h-6"/>
                    </button>
                </>
             )}
        </div>
    );
};

const CategoryProductRow: React.FC<{
    category: Category;
    lotteries: LotterySet[];
    onSelectLottery: (lottery: LotterySet) => void;
    onSelectCategory: () => void;
}> = ({ category, lotteries, onSelectLottery, onSelectCategory }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollability = useCallback(() => {
        const el = scrollContainerRef.current;
        if (el) {
            setCanScrollLeft(el.scrollLeft > 0);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1); // -1 for precision issues
        }
    }, []);

    useEffect(() => {
        checkScrollability();
        window.addEventListener('resize', checkScrollability);
        return () => window.removeEventListener('resize', checkScrollability);
    }, [lotteries, checkScrollability]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    if (lotteries.length === 0) return null;

    return (
        <section>
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                <button onClick={onSelectCategory} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-yellow-500 transition-colors">
                    更多{category.name}一番賞
                    <ArrowUpRightIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="relative group">
                <div ref={scrollContainerRef} onScroll={checkScrollability} className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                    {lotteries.slice(0, 10).map(lottery => (
                        <div key={lottery.id} className="flex-shrink-0 w-64 sm:w-72" style={{ scrollSnapAlign: 'start' }}>
                            <ProductCard lottery={lottery} onSelect={() => onSelectLottery(lottery)} />
                        </div>
                    ))}
                </div>
                {canScrollLeft && (
                    <button onClick={() => handleScroll('left')} className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full text-gray-800 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                )}
                {canScrollRight && (
                    <button onClick={() => handleScroll('right')} className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full text-gray-800 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10">
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </section>
    );
};


const CategorySidebar: React.FC<{
    categories: Category[];
    selectedCategoryId: string | null;
    onSelectCategory: (id: string | null) => void;
}> = ({ categories, selectedCategoryId, onSelectCategory }) => {
    
    const renderCategory = (category: Category, level: number) => (
        <React.Fragment key={category.id}>
            <button
                onClick={() => onSelectCategory(category.id)}
                style={{ paddingLeft: `${1 + level * 1.5}rem` }}
                className={`w-full text-left py-2.5 text-sm font-medium rounded-md transition-colors ${
                    selectedCategoryId === category.id
                        ? 'bg-yellow-400 text-black'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
                {category.name}
            </button>
            {category.children && category.children.map(child => renderCategory(child, level + 1))}
        </React.Fragment>
    );

    return (
         <div className="bg-white p-4 rounded-lg shadow-md sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-4 px-4">商品分類</h3>
            <nav className="space-y-1">
                <button
                    onClick={() => onSelectCategory(null)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        selectedCategoryId === null
                            ? 'bg-yellow-400 text-black'
                            : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    所有商品
                </button>
                <button
                    onClick={() => onSelectCategory('cat-shop')}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        selectedCategoryId === 'cat-shop'
                            ? 'bg-yellow-400 text-black'
                            : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    商城商品
                </button>
                {(categories || []).map(category => renderCategory(category, 0))}
            </nav>
        </div>
    );
};


export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { lotterySets, siteConfig, categories, isLoading, fetchLotterySets } = useSiteStore();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    
    // Debug: Log state
    logger.log('[HomePage] State:', {
        isLoading,
        lotterySetsCount: lotterySets?.length || 0,
        categoriesCount: categories?.length || 0
    });
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'remaining-asc'>('default');
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [globalSearchInput, setGlobalSearchInput] = useState('');
    const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
    const [shopLoading, setShopLoading] = useState<boolean>(false);
    const [shopError, setShopError] = useState<string | null>(null);
    const [shopFilterBusy, setShopFilterBusy] = useState<boolean>(false);
    const [spSort, setSpSort] = useState<'default'|'price-asc'|'price-desc'>('default');
    const [spStock, setSpStock] = useState<''|'IN_STOCK'|'PREORDER_ONLY'|'OUT_OF_STOCK'>('');
    const [spMode, setSpMode] = useState<''|'DIRECT'|'PREORDER_FULL'|'PREORDER_DEPOSIT'>('');

    const onSelectLottery = (lottery: LotterySet) => navigate(`/lottery/${lottery.id}`);
    const onSelectLotteryById = (id: string) => navigate(`/lottery/${id}`);

    const getSubCategoryIds = useCallback((categoryId: string) => {
        const ids: string[] = [categoryId];
        const categoryMap = new Map<string, Category>();
        
        const buildMap = (cats: Category[]) => {
            for (const cat of cats) {
                categoryMap.set(cat.id, cat);
                if (cat.children) {
                    buildMap(cat.children);
                }
            }
        };
        buildMap(categories || []);

        const findChildren = (catId: string) => {
            const category = categoryMap.get(catId);
            if (category && category.children) {
                for (const child of category.children) {
                    ids.push(child.id);
                    findChildren(child.id);
                }
            }
        };

        findChildren(categoryId);
        return ids;
    }, [categories]);
    
    const sortedCategories = useMemo(() => {
        const cats = categories || [];
        const order = siteConfig?.categoryDisplayOrder || [];
        if (order.length === 0) return cats;

        return [...cats].sort((a, b) => {
            const indexA = order.indexOf(a.id);
            const indexB = order.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [categories, siteConfig.categoryDisplayOrder]);

    const productsByCategory = useMemo(() => {
        const grouped: Record<string, LotterySet[]> = {};
        const sets = lotterySets || [];
        sortedCategories.forEach(category => {
            const subCategoryIds = getSubCategoryIds(category.id);
            grouped[category.id] = sets.filter(lottery => subCategoryIds.includes(lottery.categoryId) && lottery.status === 'AVAILABLE');
        });
        return grouped;
    }, [lotterySets, sortedCategories, getSubCategoryIds]);
    
    const filteredAndSortedLotterySets = useMemo(() => {
        if (!selectedCategoryId) return [];
        
        const relevantCategoryIds = getSubCategoryIds(selectedCategoryId);
        const allSets = lotterySets || [];
        // 過濾：只顯示屬於相關分類且狀態為 AVAILABLE 的商品
        let sets = allSets.filter(lottery => 
            relevantCategoryIds.includes(lottery.categoryId) && 
            lottery.status === 'AVAILABLE'
        );

        if (categorySearchTerm) {
            sets = sets.filter(lottery => lottery.title.toLowerCase().includes(categorySearchTerm.toLowerCase()));
        }

        return [...sets].sort((a, b) => {
            switch (sortBy) {
                case 'price-asc':
                    return (a.discountPrice || a.price) - (b.discountPrice || b.price);
                case 'price-desc':
                    return (b.discountPrice || b.price) - (a.discountPrice || a.price);
                case 'remaining-asc':
                    const remainingA = a.prizes.filter(p => p.type === 'NORMAL').reduce((sum, p) => sum + p.remaining, 0);
                    const remainingB = b.prizes.filter(p => p.type === 'NORMAL').reduce((sum, p) => sum + p.remaining, 0);
                    return remainingA - remainingB;
                default:
                    return 0;
            }
        });
    }, [lotterySets, selectedCategoryId, categorySearchTerm, sortBy, getSubCategoryIds]);

    const globalSearchResults = useMemo(() => {
        if (!globalSearchTerm) return [];
        const sets = lotterySets || [];
        // 全域搜尋也要過濾掉已下架的商品，只顯示 AVAILABLE 狀態
        return sets.filter(lottery => 
            lottery.title.toLowerCase().includes(globalSearchTerm.toLowerCase()) &&
            lottery.status === 'AVAILABLE'
        );
    }, [lotterySets, globalSearchTerm]);

    const handleSelectCategory = (categoryId: string | null) => {
        setSelectedCategoryId(categoryId);
        setCategorySearchTerm('');
        setGlobalSearchTerm('');
        setGlobalSearchInput('');
        setSortBy('default');
        window.scrollTo(0, 0);
    };
    
    const SortButton: React.FC<{ value: typeof sortBy; current: typeof sortBy; onClick: (value: typeof sortBy) => void; children: React.ReactNode; }> = ({ value, current, onClick, children }) => (
        <button onClick={() => onClick(value)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${ current === value ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-100 border' }`}>
            {children}
        </button>
    );

    const isSearching = globalSearchTerm.length > 0;

    // Restore state from URL on mount
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            const sp = url.searchParams;
            const cat = sp.get('cat');
            const cs = sp.get('cs') || '';
            const gs = sp.get('gs') || '';
            const sb = (sp.get('sort') as any) || 'default';
            const sps = (sp.get('sp_sort') as any) || 'default';
            const spsk = (sp.get('sp_stock') as any) || '';
            const spmd = (sp.get('sp_mode') as any) || '';
            setSelectedCategoryId(cat ? (cat === 'null' ? null : cat) : null);
            setCategorySearchTerm(cs);
            setGlobalSearchTerm(gs);
            setGlobalSearchInput(gs);
            setSortBy(['default','price-asc','price-desc','remaining-asc'].includes(sb) ? sb : 'default');
            setSpSort(['default','price-asc','price-desc'].includes(sps) ? sps : 'default');
            setSpStock(['','IN_STOCK','PREORDER_ONLY','OUT_OF_STOCK'].includes(spsk) ? spsk : '');
            setSpMode(['','DIRECT','PREORDER_FULL','PREORDER_DEPOSIT'].includes(spmd) ? spmd : '');
        } catch {}
    }, []);

    // Debounce global search input
    useEffect(() => {
        const t = window.setTimeout(() => setGlobalSearchTerm(globalSearchInput), 300);
        return () => window.clearTimeout(t);
    }, [globalSearchInput]);

    // Write state to URL when key states change
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            const sp = url.searchParams;
            const setOrDel = (k: string, v?: string | null) => {
                const sv = (v ?? '').toString();
                if (!sv) sp.delete(k); else sp.set(k, sv);
            };
            setOrDel('cat', selectedCategoryId ?? '');
            setOrDel('cs', categorySearchTerm);
            setOrDel('gs', globalSearchTerm);
            setOrDel('sort', sortBy);
            setOrDel('sp_sort', spSort);
            setOrDel('sp_stock', spStock);
            setOrDel('sp_mode', spMode);
            url.search = sp.toString();
            window.history.replaceState(null, '', url.toString());
        } catch {}
    }, [selectedCategoryId, categorySearchTerm, globalSearchTerm, sortBy, spSort, spStock, spMode]);

    // Popstate: restore from URL when user navigates back/forward
    useEffect(() => {
        const handler = () => {
            try {
                const url = new URL(window.location.href);
                const p = url.searchParams;
                const cat = p.get('cat');
                const cs = p.get('cs') || '';
                const gs = p.get('gs') || '';
                const sb = (p.get('sort') as any) || 'default';
                const sps = (p.get('sp_sort') as any) || 'default';
                const spsk = (p.get('sp_stock') as any) || '';
                const spmd = (p.get('sp_mode') as any) || '';
                setSelectedCategoryId(cat ? (cat === 'null' ? null : cat) : null);
                setCategorySearchTerm(cs);
                setGlobalSearchTerm(gs);
                setGlobalSearchInput(gs);
                setSortBy(['default','price-asc','price-desc','remaining-asc'].includes(sb) ? sb : 'default');
                setSpSort(['default','price-asc','price-desc'].includes(sps) ? sps : 'default');
                setSpStock(['','IN_STOCK','PREORDER_ONLY','OUT_OF_STOCK'].includes(spsk) ? spsk : '');
                setSpMode(['','DIRECT','PREORDER_FULL','PREORDER_DEPOSIT'].includes(spmd) ? spmd : '');
            } catch {}
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);

    // Ensure latest snapshot when landing on HomePage (e.g., after draws on detail page)
    useEffect(() => {
        fetchLotterySets();
        const loadShop = async () => {
            try {
                setShopError(null);
                setShopLoading(true);
                const list = await apiCall('/shop/products');
                setShopProducts(Array.isArray(list) ? list : []);
            } catch (e:any) {
                setShopProducts([]);
                setShopError(e?.message || '載入失敗');
            } finally { setShopLoading(false); }
        };
        loadShop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mark shop filter as busy briefly to show lightweight skeleton
    useEffect(() => {
        setShopFilterBusy(true);
        const id = window.setTimeout(() => setShopFilterBusy(false), 150);
        return () => window.clearTimeout(id);
    }, [spSort, spStock, spMode]);

    const filteredSortedShop = useMemo(() => {
        let arr = [...shopProducts];
        if (spStock) arr = arr.filter(p => p.stockStatus === spStock);
        if (spMode) {
            if (spMode === 'DIRECT') arr = arr.filter(p => p.allowDirectBuy);
            if (spMode === 'PREORDER_FULL') arr = arr.filter(p => p.allowPreorderFull);
            if (spMode === 'PREORDER_DEPOSIT') arr = arr.filter(p => p.allowPreorderDeposit);
        }
        if (spSort === 'price-asc') arr.sort((a,b)=> (a.price||0) - (b.price||0));
        else if (spSort === 'price-desc') arr.sort((a,b)=> (b.price||0) - (a.price||0));
        return arr;
    }, [shopProducts, spSort, spStock, spMode]);

    if (isLoading) {
        return <div className="text-center p-16">載入中...</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen animate-fade-in">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <BannerCarousel banners={siteConfig?.banners || []} interval={siteConfig?.bannerInterval || 5000} onSelectLotteryById={onSelectLotteryById} />
                
                 <div className="mb-8">
                    <div className="relative w-full max-w-2xl mx-auto">
                        <input
                            type="text"
                            placeholder="搜尋一番賞..."
                            value={globalSearchInput}
                            onChange={(e) => {
                                setGlobalSearchInput(e.target.value);
                                if (e.target.value) setSelectedCategoryId(null);
                            }}
                            className="w-full pl-12 pr-12 py-3 text-lg border-2 border-gray-300 bg-white text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 shadow-sm"
                        />
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                        {globalSearchInput && (
                            <button onClick={() => { setGlobalSearchInput(''); setGlobalSearchTerm(''); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                                <XCircleIcon className="w-6 h-6 text-gray-400 hover:text-gray-600"/>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="w-full lg:w-1/4 xl:w-1/5">
                        <CategorySidebar categories={sortedCategories} selectedCategoryId={selectedCategoryId} onSelectCategory={handleSelectCategory} />
                    </aside>

                    <main className="w-full lg:w-3/4 xl:w-4/5">
                        {/* Shop (non-lottery) products section */}
                        

                        {isSearching ? (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">搜尋結果</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {globalSearchResults.map(lottery => (
                                        <ProductCard key={lottery.id} lottery={lottery} onSelect={() => onSelectLottery(lottery)} />
                                    ))}
                                </div>
                                {globalSearchResults.length === 0 && (
                                    <div className="text-center py-16">
                                        <p className="text-xl font-semibold text-gray-700">找不到符合「{globalSearchTerm}」的一番賞</p>
                                        <p className="text-gray-500 mt-2">請試試看其他的關鍵字。</p>
                                    </div>
                                )}
                            </div>
                        ) : selectedCategoryId === null ? (
                            <div className="space-y-12">
                                {(() => {
                                    const base = siteConfig?.categoryDisplayOrder || [];
                                    logger.log('[HomePage] categoryDisplayOrder:', base);
                                    logger.log('[HomePage] sortedCategories:', sortedCategories.map(c => c.id));
                                    // If no display order, show all categories
                                    const topOrder = base.length > 0 
                                        ? (base.includes('cat-shop') ? base : [...base, 'cat-shop'])
                                        : [...sortedCategories.map(c => c.id), 'cat-shop'];
                                    logger.log('[HomePage] topOrder:', topOrder);
                                    return topOrder;
                                })().map((topId) => {
                                    if (topId === 'cat-shop') {
                                        return (
                                            <section key={topId} className="">
                                                <div className="flex items-center justify-between mb-4 px-1">
                                                    <h2 className="text-2xl font-bold text-gray-900">商城商品</h2>
                                                    <button onClick={() => handleSelectCategory('cat-shop')} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-yellow-500 transition-colors">
                                                        更多商城商品
                                                        <ArrowUpRightIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {shopLoading ? (
                                                    <div className="text-gray-600">載入中…</div>
                                                ) : shopError ? (
                                                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 flex items-center justify-between">
                                                      <span>商城商品載入失敗</span>
                                                      <button className="px-3 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>{
                                                        (async()=>{
                                                          try{
                                                            setShopError(null); setShopLoading(true);
                                                            const list = await apiCall('/shop/products');
                                                            setShopProducts(Array.isArray(list) ? list : []);
                                                          }catch(e:any){ setShopError(e?.message || '載入失敗'); }
                                                          finally{ setShopLoading(false); }
                                                        })();
                                                      }}>重試</button>
                                                    </div>
                                                ) : (
                                                    <div id="home-shop-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" aria-busy={shopLoading || shopFilterBusy}>
                                                        {(shopFilterBusy ? Array.from({length:6}) : filteredSortedShop).map((p:any, idx:number) => (
                                                            shopFilterBusy ? (
                                                                <div key={idx} className="h-64 bg-white rounded-lg shadow border animate-pulse" />
                                                            ) : (
                                                                <ShopProductCard key={p.id} product={p} onSelect={() => navigate(`/shop/products/${p.id}`)} />
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                            </section>
                                        );
                                    } else {
                                        const category = sortedCategories.find(c => c.id === topId);
                                        if (!category) return null;
                                        return (
                                            <CategoryProductRow
                                                key={category.id}
                                                category={category}
                                                lotteries={productsByCategory[category.id] || []}
                                                onSelectLottery={onSelectLottery}
                                                onSelectCategory={() => handleSelectCategory(category.id)}
                                            />
                                        );
                                    }
                                })}
                            </div>
                        ) : (
                            <div>
                                <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between" role="group" aria-label="一番賞排序" aria-controls="lottery-list">
                                    <div className="relative w-full md:max-w-md">
                                        <input
                                            type="text"
                                            placeholder="在分類中搜尋..."
                                            value={categorySearchTerm}
                                            onChange={(e) => setCategorySearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2 border border-gray-300 bg-white text-gray-900 rounded-full focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
                                        />
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        {categorySearchTerm && (
                                            <button onClick={() => setCategorySearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <XCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600"/>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                                        <SortButton value="default" current={sortBy} onClick={setSortBy}>預設</SortButton>
                                        <SortButton value="price-asc" current={sortBy} onClick={setSortBy}>價格低到高</SortButton>
                                        <SortButton value="price-desc" current={sortBy} onClick={setSortBy}>價格高到低</SortButton>
                                        <SortButton value="remaining-asc" current={sortBy} onClick={setSortBy}>剩餘籤數少</SortButton>
                                    </div>
                                </div>

                                {selectedCategoryId === 'cat-shop' ? (
                                    <>
                                      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="商城排序與過濾" aria-controls="cat-shop-list">
                                        <div className="text-sm text-gray-600 mr-2">商城排序/過濾：</div>
                                        <select className="px-2 py-1 border rounded" value={spSort} onChange={e=>setSpSort(e.target.value as any)} aria-label="商城排序">
                                          <option value="default">預設</option>
                                          <option value="price-asc">價格低到高</option>
                                          <option value="price-desc">價格高到低</option>
                                        </select>
                                        <select className="px-2 py-1 border rounded" value={spStock} onChange={e=>setSpStock(e.target.value as any)} aria-label="庫存狀態">
                                          <option value="">全部庫存</option>
                                          <option value="IN_STOCK">有現貨</option>
                                          <option value="PREORDER_ONLY">只限預購</option>
                                          <option value="OUT_OF_STOCK">缺貨</option>
                                        </select>
                                        <select className="px-2 py-1 border rounded" value={spMode} onChange={e=>setSpMode(e.target.value as any)} aria-label="下單模式">
                                          <option value="">全部模式</option>
                                          <option value="DIRECT">直購</option>
                                          <option value="PREORDER_FULL">全額預購</option>
                                          <option value="PREORDER_DEPOSIT">訂金預購</option>
                                        </select>
                                        {(spSort!=='default' || spStock || spMode) && (
                                          <button className="px-2 py-1 border rounded" onClick={()=>{ setSpSort('default'); setSpStock(''); setSpMode(''); }}>清除</button>
                                        )}
                                      </div>
                                      {shopError ? (
                                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 flex items-center justify-between">
                                          <span>商城商品載入失敗</span>
                                          <button className="px-3 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>{
                                            (async()=>{
                                              try{
                                                setShopError(null); setShopLoading(true);
                                                const list = await apiCall('/shop/products');
                                                setShopProducts(Array.isArray(list) ? list : []);
                                              }catch(e:any){ setShopError(e?.message || '載入失敗'); }
                                              finally{ setShopLoading(false); }
                                            })();
                                          }}>重試</button>
                                        </div>
                                      ) : (
                                        <div id="cat-shop-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy={shopLoading || shopFilterBusy}>
                                        {(shopFilterBusy ? Array.from({length:9}) : filteredSortedShop).map((p:any, idx:number) => (
                                          shopFilterBusy ? (
                                            <div key={idx} className="h-64 bg-white rounded-lg shadow border animate-pulse" />
                                          ) : (
                                            <ShopProductCard key={p.id} product={p} onSelect={() => navigate(`/shop/products/${p.id}`)} />
                                          )
                                        ))}
                                        </div>
                                      )}
                                    </>
                                ) : (
                                    <div id="lottery-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy={isLoading}>
                                        {filteredAndSortedLotterySets.map(lottery => (
                                            <ProductCard key={lottery.id} lottery={lottery} onSelect={() => onSelectLottery(lottery)} />
                                        ))}
                                    </div>
                                )}
                                
                                {selectedCategoryId !== 'cat-shop' && filteredAndSortedLotterySets.length === 0 && (
                                    <div className="text-center py-16">
                                        <p className="text-xl font-semibold text-gray-700">找不到符合條件的一番賞</p>
                                        <p className="text-gray-500 mt-2">請試試看其他的篩選條件或搜尋關鍵字。</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
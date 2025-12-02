import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSiteStore } from '../store/siteDataStore';
import { ShopProductCard } from './ShopProductCard';
import { apiCall } from '../api';
import type { ShopProduct, Category } from '../types';

// 扁平化分類樹
const flattenCategories = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
  let result: { id: string; name: string }[] = [];
  for (const cat of cats) {
    const displayName = prefix ? `${prefix} > ${cat.name}` : cat.name;
    result.push({ id: cat.id, name: displayName });
    if (cat.children && cat.children.length > 0) {
      result = result.concat(flattenCategories(cat.children, displayName));
    }
  }
  return result;
};

export const ShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { categories } = useSiteStore();
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBusy, setFilterBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'preorder'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const list = await apiCall('/shop/products');
        setShopProducts(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('[ShopPage] Failed to load products:', error);
        setShopProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // 篩選和排序商品
  const filteredAndSortedProducts = React.useMemo(() => {
    setFilterBusy(true);
    
    let filtered = [...shopProducts];

    // 搜尋過濾
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // 分類過濾
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.categoryId === categoryFilter);
    }

    // 庫存狀態過濾
    if (stockFilter === 'in-stock') {
      filtered = filtered.filter(p => p.stockStatus === 'IN_STOCK');
    } else if (stockFilter === 'preorder') {
      filtered = filtered.filter(p => p.stockStatus === 'PREORDER_ONLY');
    }

    // 排序
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    }

    setTimeout(() => setFilterBusy(false), 100);
    return filtered;
  }, [shopProducts, searchQuery, sortBy, stockFilter, categoryFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🛍️ 商城商品</h1>
          <p className="text-gray-600">使用點數兌換精美商品</p>
        </div>

        {/* 搜尋和篩選區 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 搜尋框 */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜尋商品
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="輸入商品名稱..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            {/* 分類篩選 */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品分類
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">全部分類</option>
                {flattenCategories(categories).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 排序 */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序方式
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="default">預設排序</option>
                <option value="price-asc">價格：低到高</option>
                <option value="price-desc">價格：高到低</option>
              </select>
            </div>

            {/* 庫存狀態 */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                庫存狀態
              </label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">全部</option>
                <option value="in-stock">有現貨</option>
                <option value="preorder">只限預購</option>
              </select>
            </div>
          </div>

          {/* 統計資訊 */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>共 {filteredAndSortedProducts.length} 件商品</span>
            {currentUser && (
              <span className="font-semibold">
                你的點數：<span className="text-yellow-500">{currentUser.points.toLocaleString()} P</span>
              </span>
            )}
          </div>
        </div>

        {/* 商品列表 */}
        {filteredAndSortedProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">找不到符合條件的商品</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-yellow-500 hover:text-yellow-600 font-medium"
              >
                清除搜尋條件
              </button>
            )}
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            aria-busy={filterBusy}
          >
            {filterBusy ? (
              // 載入骨架
              Array.from({ length: 8 }).map((_, idx) => (
                <div 
                  key={idx} 
                  className="h-96 bg-white rounded-xl shadow-md animate-pulse"
                />
              ))
            ) : (
              // 商品卡片
              filteredAndSortedProducts.map((product) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => navigate(`/shop/products/${product.id}`)}
                />
              ))
            )}
          </div>
        )}

        {/* 提示訊息 */}
        {!currentUser && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-gray-700 mb-4">
              請先登入以購買商品
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="bg-yellow-400 text-black font-semibold px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors shadow-md border-2 border-black"
            >
              立即登入
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

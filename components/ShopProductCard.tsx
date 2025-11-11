import React from 'react';
import type { ShopProduct } from '../types';
import { StackedCoinIcon, GiftIcon } from './icons';

export const ShopProductCard: React.FC<{ product: ShopProduct; onSelect: () => void; }> = ({ product, onSelect }) => {
  const stockBadge = () => {
    const base = 'text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm';
    if (product.stockStatus === 'IN_STOCK') return <span className={`${base} bg-green-100 text-green-800`}>有現貨</span>;
    if (product.stockStatus === 'PREORDER_ONLY') return <span className={`${base} bg-yellow-100 text-yellow-800`}>只限預購</span>;
    return <span className={`${base} bg-gray-200 text-gray-700`}>缺貨</span>;
  };

  const allowChips: string[] = [];
  if (product.allowDirectBuy) allowChips.push('直購');
  if (product.allowPreorderFull) allowChips.push('全額預購');
  if (product.allowPreorderDeposit) allowChips.push(`訂金預購${typeof product.depositPrice==='number' ? `（${product.depositPrice} P）` : ''}`);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-all duration-300 group flex flex-col">
      <div className="relative h-56">
        <img className="w-full h-full object-cover" src={product.imageUrl} alt={product.title} loading="lazy" />
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="absolute top-2 right-2">
          {stockBadge()}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-yellow-500 transition-colors">{product.title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.25rem]">{product.description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {allowChips.map((c, idx) => (
            <span key={idx} className="text-xs bg-gray-100 text-gray-700 border rounded-full px-2 py-0.5">{c}</span>
          ))}
        </div>
        <div className="flex justify-between items-center mt-auto pt-3">
          <div className="flex items-center">
            <StackedCoinIcon className="w-6 h-6 text-yellow-400 mr-1.5" />
            <p className="text-xl font-black text-gray-800">{product.price}</p>
            <span className="ml-1 text-sm font-medium text-gray-600">P</span>
          </div>
          <button
            onClick={onSelect}
            className="font-semibold px-4 py-2 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 bg-[#ffc400] text-black border-2 border-black hover:bg-yellow-400 focus:ring-yellow-400"
          >
            查看詳情
          </button>
        </div>
      </div>
    </div>
  );
};

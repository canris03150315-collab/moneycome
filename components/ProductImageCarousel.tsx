import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface ProductImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

/**
 * 商品圖片輪播組件
 * 支持多張圖片展示、點擊切換、左右箭頭導航
 * 向後兼容：如果只有一張圖片，顯示為單圖
 */
export const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ 
  images, 
  alt, 
  className = '' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 如果沒有圖片或只有一張圖片，顯示單圖
  const isSingleImage = !images || images.length <= 1;
  const displayImages = images && images.length > 0 ? images : ['https://placehold.co/800x600?text=No+Image'];
  
  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };
  
  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };
  
  const goToIndex = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };
  
  return (
    <div className={`relative group ${className}`}>
      {/* 主圖片 */}
      <img
        className="w-full h-full object-cover"
        src={displayImages[currentIndex]}
        alt={`${alt} - ${currentIndex + 1}`}
        loading="lazy"
        onError={(e) => { 
          (e.currentTarget as HTMLImageElement).onerror = null; 
          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/800x600?text=Image+Error'; 
        }}
      />
      
      {/* 如果有多張圖片，顯示導航控制 */}
      {!isSingleImage && (
        <>
          {/* 左箭頭 */}
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="上一張圖片"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          {/* 右箭頭 */}
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="下一張圖片"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
          
          {/* 圖片指示器 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => goToIndex(index, e)}
                className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`切換到第 ${index + 1} 張圖片`}
              />
            ))}
          </div>
          
          {/* 圖片計數器 */}
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {currentIndex + 1} / {displayImages.length}
          </div>
        </>
      )}
    </div>
  );
};

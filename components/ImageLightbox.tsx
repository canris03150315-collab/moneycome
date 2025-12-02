import React, { useEffect } from 'react';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * 圖片放大查看組件（Lightbox）
 * 支持鍵盤導航、滑鼠滾輪縮放、點擊關閉
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}) => {
  // 鍵盤導航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext]);

  // 防止背景滾動
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 關閉按鈕 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        aria-label="關閉"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 圖片計數器 */}
      <div className="absolute top-4 left-4 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>

      {/* 主圖片 */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`圖片 ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 左箭頭 */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 hover:bg-black/70 p-3 rounded-full"
          aria-label="上一張"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 右箭頭 */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 hover:bg-black/70 p-3 rounded-full"
          aria-label="下一張"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 縮圖導航 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 py-2 bg-black/50 rounded-full">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                const diff = idx - currentIndex;
                if (diff < 0) {
                  for (let i = 0; i < Math.abs(diff); i++) onPrevious();
                } else if (diff > 0) {
                  for (let i = 0; i < diff; i++) onNext();
                }
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-white scale-110'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`縮圖 ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 提示文字 */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-xs opacity-50">
        按 ESC 關閉 | ← → 切換圖片 | 點擊背景關閉
      </div>
    </div>
  );
};

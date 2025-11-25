import React from 'react';

interface OptimizedImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    quality?: number;
}

/**
 * 優化的圖片組件
 * - 支持 CDN 參數（寬度、質量）
 * - 懶加載
 * - 異步解碼
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
    src, 
    alt, 
    className = '', 
    width = 200, 
    quality = 80 
}) => {
    // 如果圖片 URL 支持查詢參數，添加優化參數
    const optimizedSrc = src.includes('?') 
        ? `${src}&w=${width}&q=${quality}` 
        : `${src}?w=${width}&q=${quality}`;

    return (
        <img
            src={optimizedSrc}
            alt={alt}
            className={className}
            loading="lazy"
            decoding="async"
            onError={(e) => {
                // 如果優化 URL 失敗，回退到原始 URL
                const target = e.target as HTMLImageElement;
                if (target.src !== src) {
                    target.src = src;
                }
            }}
        />
    );
};

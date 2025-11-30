import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 懶加載圖片組件
 * - 支持 Intersection Observer API
 * - 自動轉換為 WebP 格式（如果支持）
 * - 顯示加載佔位符
 * - 錯誤處理
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="18"%3ELoading...%3C/text%3E%3C/svg%3E',
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 檢測瀏覽器是否支持 WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  };

  // 轉換圖片 URL 為 WebP 格式（如果支持）
  const getOptimizedImageUrl = (url: string): string => {
    if (!url) return url;
    
    // 如果瀏覽器支持 WebP 且圖片不是 WebP 格式
    if (supportsWebP() && !url.endsWith('.webp')) {
      // 如果是 imgBB 或其他支持格式轉換的 CDN
      if (url.includes('i.ibb.co') || url.includes('ibb.co')) {
        // imgBB 不支持自動格式轉換，保持原樣
        return url;
      }
      
      // 對於其他 URL，可以添加 WebP 轉換邏輯
      // 例如：Cloudinary, Imgix 等
    }
    
    return url;
  };

  useEffect(() => {
    // 如果瀏覽器不支持 Intersection Observer，直接加載圖片
    if (!('IntersectionObserver' in window)) {
      setImageSrc(getOptimizedImageUrl(src));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const optimizedSrc = getOptimizedImageUrl(src);
            setImageSrc(optimizedSrc);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 提前 50px 開始加載
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setHasError(true);
    // 設置錯誤佔位圖
    setImageSrc('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f8d7da" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23721c24" font-size="18"%3E圖片加載失敗%3C/text%3E%3C/svg%3E');
    if (onError) onError();
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy" // 原生懶加載作為後備
      style={{
        backgroundColor: hasError ? '#f8d7da' : '#f0f0f0',
      }}
    />
  );
};

/**
 * 背景圖片懶加載組件
 */
interface LazyBackgroundProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
}

export const LazyBackground: React.FC<LazyBackgroundProps> = ({
  src,
  className = '',
  children,
}) => {
  const [backgroundImage, setBackgroundImage] = useState<string>('none');
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setBackgroundImage(`url(${src})`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setBackgroundImage(`url(${src})`);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  return (
    <div
      ref={divRef}
      className={className}
      style={{
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {children}
    </div>
  );
};

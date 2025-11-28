import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
    imageFile: File;
    onCropComplete: (croppedImageBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number; // 例如 16/9 for 橫幅
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
    imageFile,
    onCropComplete,
    onCancel,
    aspectRatio = 16 / 6 // 橫幅預設比例
}) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 100,
        height: 50,
        x: 0,
        y: 25
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // 讀取圖片
    React.useEffect(() => {
        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(imageFile);
    }, [imageFile]);

    // 當圖片載入完成時，設定初始裁切區域
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const cropWidth = 100;
        const cropHeight = (cropWidth / aspectRatio) * (width / height) * 100;
        
        setCrop({
            unit: '%',
            width: cropWidth,
            height: Math.min(cropHeight, 100),
            x: 0,
            y: Math.max(0, (100 - cropHeight) / 2)
        });
    }, [aspectRatio]);

    // 生成裁切後的圖片
    const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
        if (!completedCrop || !imgRef.current) {
            return null;
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.95);
        });
    }, [completedCrop]);

    const handleConfirm = async () => {
        const croppedBlob = await getCroppedImg();
        if (croppedBlob) {
            onCropComplete(croppedBlob);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">裁切橫幅圖片</h2>
                    
                    <div className="mb-4 text-sm text-gray-600">
                        <p>💡 拖拉調整顯示區域，確保重要內容在框內</p>
                        <p>💡 可以拖動邊角調整大小，或拖動中間移動位置</p>
                    </div>

                    <div className="mb-6 flex justify-center bg-gray-100 p-4 rounded">
                        {imageSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspectRatio}
                            >
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="待裁切圖片"
                                    onLoad={onImageLoad}
                                    style={{ maxHeight: '60vh', maxWidth: '100%' }}
                                />
                            </ReactCrop>
                        )}
                    </div>

                    <div className="mb-4 p-4 bg-blue-50 rounded">
                        <h3 className="font-semibold mb-2">預覽效果（橫幅顯示）</h3>
                        <div className="relative w-full bg-gray-200 rounded overflow-hidden" style={{ paddingBottom: `${(100 / aspectRatio)}%` }}>
                            {completedCrop && imgRef.current && (() => {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (!ctx) return null;

                                const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
                                const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

                                canvas.width = completedCrop.width;
                                canvas.height = completedCrop.height;

                                ctx.drawImage(
                                    imgRef.current,
                                    completedCrop.x * scaleX,
                                    completedCrop.y * scaleY,
                                    completedCrop.width * scaleX,
                                    completedCrop.height * scaleY,
                                    0,
                                    0,
                                    completedCrop.width,
                                    completedCrop.height
                                );

                                return (
                                    <img
                                        src={canvas.toDataURL()}
                                        alt="預覽"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                );
                            })()}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
                        >
                            確認裁切
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

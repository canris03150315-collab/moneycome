/**
 * 圖片上傳工具
 * 使用 Cloudinary 免費圖片託管服務
 */

import imageCompression from 'browser-image-compression';
import { logger } from './logger';

// Cloudinary 配置（使用 unsigned upload preset）
const CLOUDINARY_CLOUD_NAME = 'dh1ixurn2';
const CLOUDINARY_UPLOAD_PRESET = 'ichiban_unsigned';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    url: string;
    thumbnail_url?: string;
}

/**
 * 壓縮圖片
 * @param file 原始圖片文件
 * @returns Promise<File> 壓縮後的圖片
 */
async function compressImage(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1, // 最大 1MB
        maxWidthOrHeight: 1920, // 最大寬度或高度
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
        initialQuality: 0.8 // 初始品質 80%
    };

    try {
        logger.log('[ImageUpload] 原始圖片大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        const compressedFile = await imageCompression(file, options);
        logger.log('[ImageUpload] 壓縮後大小:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
        logger.log('[ImageUpload] 壓縮率:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');
        return compressedFile;
    } catch (error) {
        logger.warn('[ImageUpload] 壓縮失敗，使用原圖:', error);
        return file;
    }
}

/**
 * 上傳圖片到 Cloudinary（自動壓縮）
 * @param file 圖片文件
 * @returns Promise<string> 圖片 URL
 */
export async function uploadImageToImgBB(file: File): Promise<string> {
    try {
        // 驗證文件類型
        if (!file.type.startsWith('image/')) {
            throw new Error('只能上傳圖片文件');
        }

        // 壓縮圖片
        const compressedFile = await compressImage(file);

        // 驗證文件大小（Cloudinary 免費版限制 10MB）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (compressedFile.size > maxSize) {
            throw new Error('圖片大小不能超過 10MB');
        }

        // 創建 FormData
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        logger.log('[ImageUpload] Uploading to:', CLOUDINARY_UPLOAD_URL);
        logger.log('[ImageUpload] Upload preset:', CLOUDINARY_UPLOAD_PRESET);
        logger.log('[ImageUpload] File size:', compressedFile.size, 'bytes');
        logger.log('[ImageUpload] File type:', compressedFile.type);

        // 上傳到 Cloudinary
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        logger.log('[ImageUpload] Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[ImageUpload] Error response:', errorData);
            throw new Error(`上傳失敗: ${errorData.error?.message || response.statusText}`);
        }

        const result: CloudinaryResponse = await response.json();

        // 返回安全的 HTTPS URL
        return result.secure_url;
    } catch (error) {
        console.error('[ImageUpload] Error:', error);
        throw error;
    }
}

/**
 * 將文件轉換為 Base64
 * @param file 文件
 * @returns Promise<string> Base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                resolve(reader.result as string);
            } else {
                reject(new Error('讀取文件失敗'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * 上傳多個圖片
 * @param files 圖片文件列表
 * @returns Promise<string[]> 圖片 URL 列表
 */
export async function uploadMultipleImages(files: FileList | File[]): Promise<string[]> {
    const fileArray = Array.from(files);
    const uploadPromises = fileArray.map(file => uploadImageToImgBB(file));
    return Promise.all(uploadPromises);
}

/**
 * 帶進度的圖片上傳
 * @param file 圖片文件
 * @param onProgress 進度回調
 * @returns Promise<string> 圖片 URL
 */
export async function uploadImageWithProgress(
    file: File,
    onProgress?: (progress: number) => void
): Promise<string> {
    try {
        // 開始上傳
        if (onProgress) onProgress(0);

        // 驗證文件
        if (!file.type.startsWith('image/')) {
            throw new Error('只能上傳圖片文件');
        }
        if (onProgress) onProgress(25);

        // 準備數據
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        if (onProgress) onProgress(50);

        // 上傳
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });
        if (onProgress) onProgress(75);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`上傳失敗: ${errorData.error?.message || response.statusText}`);
        }

        const result: CloudinaryResponse = await response.json();

        // 完成
        if (onProgress) onProgress(100);

        return result.secure_url;
    } catch (error) {
        console.error('[ImageUpload] Error:', error);
        throw error;
    }
}

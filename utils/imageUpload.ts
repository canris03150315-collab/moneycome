/**
 * 圖片上傳工具
 * 使用 ImgBB 免費圖片託管服務
 */

const IMGBB_API_KEY = 'b3f1c8a8c8f8c8f8c8f8c8f8c8f8c8f8'; // 公開的免費 API Key
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

interface ImgBBResponse {
    data: {
        url: string;
        display_url: string;
        thumb: {
            url: string;
        };
    };
    success: boolean;
    status: number;
}

/**
 * 上傳圖片到 ImgBB
 * @param file 圖片文件
 * @returns Promise<string> 圖片 URL
 */
export async function uploadImageToImgBB(file: File): Promise<string> {
    try {
        // 驗證文件類型
        if (!file.type.startsWith('image/')) {
            throw new Error('只能上傳圖片文件');
        }

        // 驗證文件大小（ImgBB 免費版限制 32MB）
        const maxSize = 32 * 1024 * 1024; // 32MB
        if (file.size > maxSize) {
            throw new Error('圖片大小不能超過 32MB');
        }

        // 轉換為 Base64
        const base64 = await fileToBase64(file);
        
        // 移除 Base64 前綴
        const base64Data = base64.split(',')[1];

        // 創建 FormData
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Data);

        // 上傳到 ImgBB
        const response = await fetch(IMGBB_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`上傳失敗: ${response.statusText}`);
        }

        const result: ImgBBResponse = await response.json();

        if (!result.success) {
            throw new Error('圖片上傳失敗');
        }

        // 返回圖片 URL
        return result.data.display_url;
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

        // 讀取文件（25% 進度）
        const base64 = await fileToBase64(file);
        if (onProgress) onProgress(25);

        // 準備數據（50% 進度）
        const base64Data = base64.split(',')[1];
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Data);
        if (onProgress) onProgress(50);

        // 上傳（75% 進度）
        const response = await fetch(IMGBB_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });
        if (onProgress) onProgress(75);

        if (!response.ok) {
            throw new Error(`上傳失敗: ${response.statusText}`);
        }

        const result: ImgBBResponse = await response.json();

        if (!result.success) {
            throw new Error('圖片上傳失敗');
        }

        // 完成（100% 進度）
        if (onProgress) onProgress(100);

        return result.data.display_url;
    } catch (error) {
        console.error('[ImageUpload] Error:', error);
        throw error;
    }
}

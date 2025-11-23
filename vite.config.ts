import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          ignored: [
            '**/*.png',
            '**/*.jpg',
            '**/*.jpeg',
            '**/*.gif',
            '**/*.webp',
            '**/*.avif',
            '**/*.bmp',
            '**/*.svg',
          ]
        }
      },
      build: {
        // 確保每次 build 都生成唯一的文件名
        rollupOptions: {
          output: {
            // JS 文件使用 hash 命名，確保更新時自動失效舊緩存
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          }
        },
        // 生成 sourcemap 方便除錯（生產環境可設為 false）
        sourcemap: false,
        // 禁用 CSS 代碼分割，避免閃爍
        cssCodeSplit: true,
        // 設置 chunk 大小警告閾值
        chunkSizeWarningLimit: 1000,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // 注入構建時間戳，用於版本檢測
        '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

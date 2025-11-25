import React from 'react';

export interface LoadingBarProps {
    isLoading: boolean;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-loading-bar"></div>
        </div>
    );
};

// 添加對應的 CSS 動畫到 index.css
// @keyframes loading-bar {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-loading-bar {
//   animation: loading-bar 1.5s ease-in-out infinite;
// }

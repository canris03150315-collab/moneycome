// 自動生成的版本信息
// 使用 git commit hash 的前 7 位作為版本號

declare const __BUILD_TIME__: string;

export const VERSION = {
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
  // 格式化為易讀的版本號
  display: typeof __BUILD_TIME__ !== 'undefined' 
    ? `v${new Date(__BUILD_TIME__).toISOString().slice(2, 10).replace(/-/g, '')}`
    : 'dev'
};

// 在頁面載入時自動顯示版本號
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const versionElement = document.getElementById('version-indicator');
    if (versionElement) {
      versionElement.textContent = `Frontend ${VERSION.display}`;
    }
  });
}

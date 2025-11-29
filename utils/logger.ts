/**
 * Logger 工具
 * 在開發環境顯示日誌，生產環境自動隱藏
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * 一般日誌（僅開發環境）
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * 資訊日誌（僅開發環境）
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * 警告日誌（所有環境）
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * 錯誤日誌（所有環境）
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * 除錯日誌（僅開發環境）
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * 表格日誌（僅開發環境）
   */
  table: (data: any) => {
    if (isDev) {
      console.table(data);
    }
  },

  /**
   * 群組日誌（僅開發環境）
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  }
};

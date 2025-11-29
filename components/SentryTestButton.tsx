/**
 * Sentry 測試按鈕組件
 * 用於驗證 Sentry 錯誤監控是否正常運作
 */

import React from 'react';

export const SentryTestButton: React.FC = () => {
  return (
    <button
      onClick={() => {
        throw new Error('This is your first error!');
      }}
      style={{
        padding: '10px 20px',
        backgroundColor: '#7c3aed',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
      }}
    >
      Break the world
    </button>
  );
};

import React, { createContext, useContext, useCallback, useState, PropsWithChildren } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from './icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastItem { id: string; type: ToastType; message: string; }

interface ToastContextValue {
  show: (t: { type: ToastType; message: string }) => void;
  dismiss: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<PropsWithChildren<{ liveMode?: 'polite'|'assertive' }>> = ({ children, liveMode = 'polite' }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show: ToastContextValue['show'] = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);
  
  // 便捷方法
  const success = useCallback((message: string) => show({ type: 'success', message }), [show]);
  const error = useCallback((message: string) => show({ type: 'error', message }), [show]);
  const info = useCallback((message: string) => show({ type: 'info', message }), [show]);
  const warning = useCallback((message: string) => show({ type: 'warning', message }), [show]);

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-500',
          text: 'text-green-800',
          icon: <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-500',
          text: 'text-red-800',
          icon: <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-500',
          text: 'text-yellow-800',
          icon: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-500',
          text: 'text-blue-800',
          icon: <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
        };
    }
  };

  return (
    <ToastContext.Provider value={{ show, dismiss, success, error, info, warning }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2" aria-live={liveMode} aria-atomic="true">
        {toasts.map(t => {
          const style = getToastStyle(t.type);
          return (
            <div 
              key={t.id} 
              role="status" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 cursor-pointer min-w-[300px] max-w-[500px] animate-slide-in-right ${style.bg} ${style.text}`}
              onClick={() => dismiss(t.id)}
            >
              {style.icon}
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="關閉"
              >
                <XCircleIcon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

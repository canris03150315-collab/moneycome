import React, { createContext, useContext, useCallback, useState, PropsWithChildren } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem { id: string; type: ToastType; message: string; }

interface ToastContextValue {
  show: (t: { type: ToastType; message: string }) => void;
  dismiss: (id: string) => void;
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

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-2" aria-live={liveMode} aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} role="status" className={`px-4 py-3 rounded-lg shadow-lg border cursor-pointer ${
            t.type==='success' ? 'bg-green-50 border-green-200 text-green-800' : t.type==='error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-800'
          }`} onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

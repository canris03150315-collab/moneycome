import { create } from 'zustand';
import type { ToastType } from '../components/Toast';

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastState {
    toasts: ToastItem[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
    clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    
    showToast: (message, type = 'info') => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        set((state) => ({
            toasts: [...state.toasts, { id, type, message }]
        }));
    },
    
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id)
        }));
    },
    
    clearAll: () => {
        set({ toasts: [] });
    }
}));

// 便捷函數
export const toast = {
    success: (message: string) => useToastStore.getState().showToast(message, 'success'),
    error: (message: string) => useToastStore.getState().showToast(message, 'error'),
    info: (message: string) => useToastStore.getState().showToast(message, 'info'),
    warning: (message: string) => useToastStore.getState().showToast(message, 'warning'),
};

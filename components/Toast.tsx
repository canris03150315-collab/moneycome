import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from './icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    type: ToastType;
    message: string;
    duration?: number;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const styles = {
        success: {
            bg: 'bg-green-50 border-green-500',
            text: 'text-green-800',
            icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />
        },
        error: {
            bg: 'bg-red-50 border-red-500',
            text: 'text-red-800',
            icon: <XCircleIcon className="w-5 h-5 text-red-500" />
        },
        info: {
            bg: 'bg-blue-50 border-blue-500',
            text: 'text-blue-800',
            icon: <InformationCircleIcon className="w-5 h-5 text-blue-500" />
        },
        warning: {
            bg: 'bg-yellow-50 border-yellow-500',
            text: 'text-yellow-800',
            icon: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
        }
    };

    const style = styles[type];

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg ${style.bg} ${style.text} min-w-[300px] max-w-[500px]`}>
                {style.icon}
                <p className="flex-1 text-sm font-medium">{message}</p>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="關閉"
                >
                    <XCircleIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// Toast 容器組件
interface ToastContainerProps {
    toasts: Array<{ id: string; type: ToastType; message: string }>;
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </div>
    );
};

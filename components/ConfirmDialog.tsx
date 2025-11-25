import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from './icons';

export type ConfirmDialogType = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: ConfirmDialogType;
    isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = '確認',
    cancelText = '取消',
    onConfirm,
    onCancel,
    type = 'warning',
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <XCircleIcon className="w-12 h-12 text-red-500" />,
                    iconBg: 'bg-red-100',
                    confirmBtn: 'bg-red-500 hover:bg-red-600 text-white',
                };
            case 'info':
                return {
                    icon: <InformationCircleIcon className="w-12 h-12 text-blue-500" />,
                    iconBg: 'bg-blue-100',
                    confirmBtn: 'bg-blue-500 hover:bg-blue-600 text-white',
                };
            default: // warning
                return {
                    icon: <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />,
                    iconBg: 'bg-yellow-100',
                    confirmBtn: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-95 animate-modal-pop">
                {/* 圖標 */}
                <div className="flex justify-center mb-4">
                    <div className={`${styles.iconBg} rounded-full p-3`}>
                        {styles.icon}
                    </div>
                </div>

                {/* 標題 */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    {title}
                </h3>

                {/* 訊息 */}
                <div className="text-gray-600 text-center mb-6">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                {/* 按鈕 */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
                    >
                        {isLoading ? '處理中...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hook for easier usage
export function useConfirmDialog() {
    const [dialog, setDialog] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string | React.ReactNode;
        onConfirm: () => void;
        type?: ConfirmDialogType;
        confirmText?: string;
        cancelText?: string;
    } | null>(null);

    const confirm = React.useCallback((options: {
        title: string;
        message: string | React.ReactNode;
        onConfirm: () => void;
        type?: ConfirmDialogType;
        confirmText?: string;
        cancelText?: string;
    }) => {
        setDialog({
            isOpen: true,
            ...options
        });
    }, []);

    const close = React.useCallback(() => {
        setDialog(null);
    }, []);

    const DialogComponent = dialog ? (
        <ConfirmDialog
            isOpen={dialog.isOpen}
            title={dialog.title}
            message={dialog.message}
            onConfirm={() => {
                dialog.onConfirm();
                close();
            }}
            onCancel={close}
            type={dialog.type}
            confirmText={dialog.confirmText}
            cancelText={dialog.cancelText}
        />
    ) : null;

    return { confirm, close, DialogComponent };
}

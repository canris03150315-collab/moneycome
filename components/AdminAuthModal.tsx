import React, { useState } from 'react';

interface AdminAuthModalProps {
    authError: string | null;
    onClose: () => void;
    onVerifyPassword: (password: string) => Promise<void>;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ authError, onClose, onVerifyPassword }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onVerifyPassword(password);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 m-4 max-w-sm w-full transform transition-all duration-300 scale-95 animate-modal-pop"
                onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">管理員驗證</h2>
                <p className="text-center text-sm text-gray-600 mb-4">為確保安全，請再次輸入您的密碼以進入後台管理。</p>
                <form onSubmit={handleVerifySubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="admin-password" className="sr-only">密碼</label>
                            <input
                                id="admin-password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoFocus
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-gray-400 focus:border-gray-400 sm:text-sm"
                                placeholder="請輸入您的密碼"
                            />
                        </div>
                        {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-6 space-x-3">
                        <button type="button" onClick={onClose} className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">取消</button>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-300">
                            {isLoading ? '驗證中...' : '確認'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
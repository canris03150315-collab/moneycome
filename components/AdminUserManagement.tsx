import React, { useState, useMemo } from 'react';
import type { User, Transaction } from '../types';

interface UserRowProps {
    user: User;
    currentUser: User; // The currently logged-in admin
    isLastAdmin: boolean;
    onUpdateUserPoints: (userId: string, newPoints: number, notes: string) => void;
    onUpdateUserRole: (userId: string, newRole: 'USER' | 'ADMIN') => void;
    onViewTransactions: (username: string) => void;
    onViewProfile: (user: User) => void;
    onChangeUserPassword: (userId: string, newPassword: string) => Promise<any> | any;
}

const UserRow: React.FC<UserRowProps> = ({ user, currentUser, isLastAdmin, onUpdateUserPoints, onUpdateUserRole, onViewTransactions, onViewProfile, onChangeUserPassword }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [points, setPoints] = useState(user.points);
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        onUpdateUserPoints(user.id, Number(points), notes);
        setIsEditing(false);
        setNotes('');
    };

    const handleCancel = () => {
        setPoints(user.points);
        setIsEditing(false);
        setNotes('');
    }

    const canChangeRole = user.id !== currentUser.id && !(isLastAdmin && user.role === 'ADMIN');
    const handleChangePassword = async () => {
        const pwd = window.prompt('請輸入新密碼（至少 6 碼）：') || '';
        if (!pwd || pwd.length < 6) { window.alert('新密碼長度至少需 6 碼'); return; }
        try { await onChangeUserPassword(user.id, pwd); window.alert('密碼已更新'); } catch (e:any) { window.alert(e?.message || '更新失敗'); }
    };

    return (
        <tr className={user.id === currentUser.id ? 'bg-yellow-50' : ''}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {isEditing ? (
                    <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                        className="w-24 border border-gray-300 rounded-md py-1 px-2"
                    />
                ) : (
                    user.points.toLocaleString()
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <select 
                  value={user.role}
                  onChange={(e) => onUpdateUserRole(user.id, e.target.value as 'USER' | 'ADMIN')}
                  disabled={!canChangeRole}
                  className={`border rounded-md py-1 px-2 ${canChangeRole ? 'border-gray-300' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                  title={!canChangeRole ? "無法更改自己的角色或唯一的管理員" : ""}
                >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {isEditing && (
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="選填，說明調整原因"
                        className="w-full border border-gray-300 rounded-md py-1 px-2"
                    />
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                {isEditing ? (
                    <>
                        <button onClick={handleSave} className="text-green-600 hover:text-green-900">儲存</button>
                        <button onClick={handleCancel} className="text-gray-600 hover:text-gray-900">取消</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onViewProfile(user)} className="text-gray-700 hover:text-black">查看資料</button>
                        <button onClick={() => onViewTransactions(user.username)} className="text-blue-600 hover:text-blue-900">查看訂單</button>
                        <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-900">編輯點數</button>
                        <button onClick={handleChangePassword} className="text-red-600 hover:text-red-900">變更密碼</button>
                    </>
                )}
            </td>
        </tr>
    );
};

const UserDetailModal: React.FC<{ user: User; transactions: Transaction[]; onClose: () => void; }>
 = ({ user, transactions, onClose }) => {
    const userTxs = useMemo(() => transactions.filter(tx => tx.userId === user.id), [transactions, user.id]);
    const addresses = user.shippingAddresses || [];
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">會員資料</h3>
                    <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>關閉</button>
                </div>
                <div className="space-y-6">
                    <section>
                        <h4 className="font-semibold text-lg mb-2">基本資料</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-gray-50 p-4 rounded-lg">
                            <p><span className="text-gray-600">使用者名稱：</span>{user.username}</p>
                            <p><span className="text-gray-600">Email：</span>{user.email}</p>
                            <p><span className="text-gray-600">點數：</span>{user.points.toLocaleString()} P</p>
                            <p><span className="text-gray-600">角色：</span>{user.role}</p>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-semibold text-lg mb-2">收件地址</h4>
                        {addresses.length === 0 ? (
                            <p className="text-gray-500 text-sm">尚無地址</p>
                        ) : (
                            <div className="space-y-2">
                                {addresses.map(a => (
                                    <div key={a.id} className="text-sm bg-gray-50 p-3 rounded-lg">
                                        <p><span className="text-gray-600">收件人：</span>{a.name} {a.isDefault ? <span className="ml-2 text-xs text-white bg-black px-2 py-0.5 rounded">預設</span> : null}</p>
                                        <p><span className="text-gray-600">電話：</span>{a.phone}</p>
                                        <p><span className="text-gray-600">地址：</span>{a.address}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    <section>
                        <h4 className="font-semibold text-lg mb-2">消費紀錄</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">說明</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">點數</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {userTxs.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">尚無紀錄</td></tr>
                                    ) : userTxs
                                        .slice()
                                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{new Date(tx.date).toLocaleString()}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{tx.type}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{tx.description}</td>
                                            <td className={`px-4 py-2 text-sm text-right font-semibold ${tx.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>{tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} P</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export const AdminUserManagement: React.FC<{ 
    users: User[], 
    currentUser: User | null,
    transactions: Transaction[],
    onUpdateUserPoints: (userId: string, newPoints: number, notes: string) => void,
    onUpdateUserRole: (userId: string, newRole: 'USER' | 'ADMIN') => void,
    onViewUserTransactions: (username: string) => void,
    onChangeUserPassword: (userId: string, newPassword: string) => Promise<any> | any,
}> = ({ users, currentUser, transactions, onUpdateUserPoints, onUpdateUserRole, onViewUserTransactions, onChangeUserPassword }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const adminCount = useMemo(() => users.filter(u => u.role === 'ADMIN').length, [users]);
    const isLastAdmin = adminCount === 1;

    if (!currentUser) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold">使用者管理</h2>
                 <input
                    type="text"
                    placeholder="搜尋使用者名稱或 Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm p-2 border border-gray-300 rounded-md"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用者名稱</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">點數</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註 (編輯時)</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map(user => (
                            <UserRow 
                                key={user.id} 
                                user={user} 
                                currentUser={currentUser}
                                isLastAdmin={isLastAdmin}
                                onUpdateUserPoints={onUpdateUserPoints} 
                                onUpdateUserRole={onUpdateUserRole}
                                onViewTransactions={onViewUserTransactions}
                                onViewProfile={(u) => setSelectedUser(u)} 
                                onChangeUserPassword={onChangeUserPassword}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedUser && (
                <UserDetailModal user={selectedUser} transactions={transactions} onClose={() => setSelectedUser(null)} />
            )}
        </div>
    );
};
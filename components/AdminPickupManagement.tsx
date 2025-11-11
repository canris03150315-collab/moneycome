import React, { useState, useMemo } from 'react';
import type { PickupRequest, PrizeInstance } from '../types';
import { XCircleIcon } from './icons';

interface AdminPickupManagementProps {
    pickupRequests: PickupRequest[];
    inventory: { [key: string]: PrizeInstance };
    onUpdatePickupRequestStatus: (requestId: string, status: 'READY_FOR_PICKUP' | 'COMPLETED') => void;
}

const statusStyles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    READY_FOR_PICKUP: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
};

const statusText = {
    PENDING: '待處理',
    READY_FOR_PICKUP: '可取貨',
    COMPLETED: '已完成',
};

const PickupDetailModal: React.FC<{
    request: PickupRequest;
    inventory: { [key: string]: PrizeInstance };
    onClose: () => void;
    onUpdateStatus: (requestId: string, status: 'READY_FOR_PICKUP' | 'COMPLETED') => void;
}> = ({ request, inventory, onClose, onUpdateStatus }) => {
    
    const handleUpdate = (status: 'READY_FOR_PICKUP' | 'COMPLETED') => {
        onUpdateStatus(request.id, status);
        if (status === 'COMPLETED') {
            onClose();
        }
    };
    
    const prizes = request.prizeInstanceIds.map(id => inventory[id]).filter(Boolean);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 m-4 max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircleIcon className="w-8 h-8"/></button>
                <h3 className="text-2xl font-bold mb-6">自取單詳情</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-lg mb-2">基本資訊</h4>
                        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
                            <p><strong>單號:</strong> {request.id}</p>
                            <p><strong>申請人:</strong> {request.username} ({request.userId})</p>
                            <p><strong>申請時間:</strong> {new Date(request.requestedAt).toLocaleString()}</p>
                             {request.completedAt && <p><strong>完成時間:</strong> {new Date(request.completedAt).toLocaleString()}</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg mb-2">撿貨清單 ({prizes.length}件)</h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-2">
                            {prizes.map(p => (
                                <div key={p.instanceId} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded" loading="lazy"/>
                                    <div>
                                        <p className="font-semibold text-sm">{p.grade} - {p.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-lg mb-3">更新狀態</h4>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {request.status === 'PENDING' && (
                            <button onClick={() => handleUpdate('READY_FOR_PICKUP')} className="w-full md:w-auto bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600">
                                標示為可取貨
                            </button>
                        )}
                        {request.status === 'READY_FOR_PICKUP' && (
                             <button onClick={() => handleUpdate('COMPLETED')} className="w-full md:w-auto bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-600">
                                標示為已完成
                             </button>
                        )}
                         {request.status === 'COMPLETED' && (
                            <p className="text-green-600 font-semibold">此訂單已完成。</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const AdminPickupManagement: React.FC<AdminPickupManagementProps> = ({ pickupRequests, inventory, onUpdatePickupRequestStatus }) => {
    const [filterStatus, setFilterStatus] = useState<'ALL' | PickupRequest['status']>('ALL');
    const [selectedRequest, setSelectedRequest] = useState<PickupRequest | null>(null);

    const sortedAndFilteredRequests = useMemo(() => {
        const unique = Array.from(new Map<string, PickupRequest>(pickupRequests.map((r) => [r.id, r])).values());
        return unique
            .filter(s => filterStatus === 'ALL' || s.status === filterStatus)
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [pickupRequests, filterStatus]);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">自取管理</h2>
            <div className="mb-4">
                <div className="flex space-x-2">
                    {(['ALL', 'PENDING', 'READY_FOR_PICKUP', 'COMPLETED'] as const).map(status => (
                        <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${filterStatus === status ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                            {status === 'ALL' ? '全部' : statusText[status]}
                        </button>
                    ))}
                </div>
            </div>
            
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請時間</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請人</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">件數</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedAndFilteredRequests.map(r => (
                             <tr key={r.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(r.requestedAt).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.prizeInstanceIds.length}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[r.status]}`}>
                                        {statusText[r.status]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => setSelectedRequest(r)} className="text-indigo-600 hover:text-indigo-900">檢視詳情</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sortedAndFilteredRequests.length === 0 && <p className="text-center py-4 text-gray-500">沒有符合條件的自取單。</p>}
            
            {selectedRequest && (
                <PickupDetailModal 
                    request={selectedRequest}
                    inventory={inventory}
                    onClose={() => setSelectedRequest(null)}
                    onUpdateStatus={(...args) => {
                        onUpdatePickupRequestStatus(...args);
                        const updatedRequest = { ...selectedRequest, status: args[1] };
                        setSelectedRequest(updatedRequest);
                    }}
                />
            )}
        </div>
    );
};
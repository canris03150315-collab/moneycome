import React, { useState, useMemo } from 'react';
import type { Shipment, User, PrizeInstance } from '../types';
import { XCircleIcon } from './icons';
import { useToast } from './ToastProvider';
import { useConfirmDialog } from './ConfirmDialog';
import { getFriendlyErrorMessage } from '../api';

interface AdminShipmentManagementProps {
    shipments: Shipment[];
    users: User[];
    inventory: { [key: string]: PrizeInstance };
    onUpdateShipmentStatus: (shipmentId: string, status: 'PROCESSING' | 'SHIPPED', trackingNumber?: string, carrier?: string) => void;
    canManage?: boolean;
}

const statusStyles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-green-100 text-green-800',
};

const statusLabels: Record<Shipment['status'], string> = {
    PENDING: '待處理',
    PROCESSING: '處理中',
    SHIPPED: '已出貨',
};

const ShipmentDetailModal: React.FC<{
    shipment: Shipment;
    inventory: { [key: string]: PrizeInstance };
    onClose: () => void;
    onUpdateStatus: (shipmentId: string, status: 'PROCESSING' | 'SHIPPED', trackingNumber?: string, carrier?: string) => void;
    canManage?: boolean;
}> = ({ shipment, inventory, onClose, onUpdateStatus, canManage = true }) => {
    const toast = useToast();
    const { confirm, DialogComponent } = useConfirmDialog();
    const [trackingNumber, setTrackingNumber] = useState(shipment.trackingNumber || '');
    const [carrier, setCarrier] = useState(shipment.carrier || '');

    const handleUpdate = (status: 'PROCESSING' | 'SHIPPED') => {
        const statusText = status === 'PROCESSING' ? '處理中' : '已出貨';
        
        confirm({
            title: '確認更新狀態',
            message: `確定要將運送單狀態更新為「${statusText}」嗎？`,
            type: 'warning',
            confirmText: '確認更新',
            onConfirm: async () => {
                try {
                    onUpdateStatus(shipment.id, status, trackingNumber, carrier);
                    toast.success(`運送單狀態已更新為「${statusText}」`);
                    if (status === 'SHIPPED') {
                        onClose();
                    }
                } catch (error: any) {
                    toast.error('更新失敗：' + getFriendlyErrorMessage(error));
                }
            }
        });
    };
    
    const prizes = shipment.prizeInstanceIds.map(id => inventory[id]).filter(Boolean);
    const totalWeight = (shipment as any).totalWeightInGrams ?? prizes.reduce((s, p) => s + (p.weight || 0), 0);
    const addr = (shipment as any).shippingAddress || ({} as any);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 m-4 max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-modal-pop" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircleIcon className="w-8 h-8"/></button>
                <h3 className="text-2xl font-bold mb-6">出貨單詳情</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-lg mb-2">基本資訊</h4>
                        <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
                            <p><strong>單號:</strong> {shipment.id}</p>
                            <p><strong>申請人:</strong> {shipment.username} ({shipment.userId})</p>
                            <p><strong>申請時間:</strong> {new Date(shipment.requestedAt).toLocaleString()}</p>
                            <p><strong>運費:</strong> {shipment.shippingCostInPoints} P</p>
                            <p><strong>總重量:</strong> {(totalWeight / 1000).toFixed(2)} kg</p>
                        </div>
                        <h4 className="font-semibold text-lg mb-2 mt-4">收件地址</h4>
                        <div className="text-sm bg-gray-50 p-4 rounded-lg">
                            <p><strong>收件人:</strong> {addr?.name || '—'}</p>
                            <p><strong>電話:</strong> {addr?.phone || '—'}</p>
                            <p><strong>地址:</strong> {addr?.address || '—'}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg mb-2">撿貨清單 ({prizes.length}件)</h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-2">
                            {prizes.map((p) => {
                                const name = p?.name ?? '—';
                                const imageUrl = p?.imageUrl ?? '';
                                const grade = p?.grade ?? '';
                                const weight = p?.weight ?? 0;
                                const instanceId = p?.instanceId ?? `${name}-${grade}-${weight}`;
                                return (
                                    <div key={instanceId} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                                        <img src={imageUrl} alt={name} className="w-12 h-12 object-cover rounded" loading="lazy"/>
                                        <div>
                                            <p className="font-semibold text-sm">{grade} - {name}</p>
                                            <p className="text-xs text-gray-500">{weight}g</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-lg mb-3">更新狀態</h4>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {shipment.status === 'PENDING' && (
                            <button disabled={!canManage} onClick={() => handleUpdate('PROCESSING')} className={`w-full md:w-auto font-bold py-2 px-4 rounded-lg shadow-md ${canManage ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>標示為處理中</button>
                        )}
                        {shipment.status !== 'SHIPPED' && (
                             <div className="flex-grow w-full space-y-2 p-4 bg-gray-100 rounded-lg">
                                <input disabled={!canManage} type="text" placeholder="物流公司 (例如: 黑貓宅急便)" value={carrier} onChange={e => setCarrier(e.target.value)} className={`w-full border p-2 rounded-md ${canManage ? 'border-gray-300' : 'border-gray-200 bg-gray-100'}`}/>
                                <input disabled={!canManage} type="text" placeholder="物流追蹤碼" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className={`w-full border p-2 rounded-md ${canManage ? 'border-gray-300' : 'border-gray-200 bg-gray-100'}`}/>
                                <button disabled={!canManage || !carrier || !trackingNumber} onClick={() => handleUpdate('SHIPPED')} className={`w-full font-bold py-2 px-4 rounded-lg shadow-md ${canManage && carrier && trackingNumber ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>標示為已出貨</button>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            {DialogComponent}
        </div>
    );
};


export const AdminShipmentManagement: React.FC<AdminShipmentManagementProps> = ({ shipments, inventory, onUpdateShipmentStatus, canManage = true }) => {
    const [filterStatus, setFilterStatus] = useState<'ALL' | Shipment['status']>('ALL');
    const [agingFilter, setAgingFilter] = useState<'ALL' | 'GT24' | 'GT48'>('ALL');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const sortedAndFilteredShipments = useMemo(() => {
        const unique = Array.from(new Map<string, Shipment>(shipments.map((s) => [s.id, s])).values());
        const now = Date.now();
        return unique
            .filter(s => filterStatus === 'ALL' || s.status === filterStatus)
            .filter(s => {
                if (agingFilter === 'ALL') return true;
                const ageH = Math.floor((now - new Date(s.requestedAt).getTime()) / 3600000);
                if (agingFilter === 'GT48') return ageH >= 48 && s.status !== 'SHIPPED';
                if (agingFilter === 'GT24') return ageH >= 24 && s.status !== 'SHIPPED';
                return true;
            })
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [shipments, filterStatus]);
    const overdueCounts = useMemo(() => {
        const now = Date.now();
        let gt24 = 0, gt48 = 0;
        for (const s of shipments) {
            const ageH = Math.floor((now - new Date(s.requestedAt).getTime()) / 3600000);
            if (s.status === 'SHIPPED') continue;
            if (ageH >= 48) gt48++; else if (ageH >= 24) gt24++;
        }
        return { gt24, gt48 };
    }, [shipments]);

    const allSelected = sortedAndFilteredShipments.length>0 && selectedIds.size===sortedAndFilteredShipments.length;
    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(sortedAndFilteredShipments.map(s=>s.id)));
    };
    const toggleOne = (id: string) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

    const exportPickListCsv = (rows: Shipment[]) => {
        const headers = ['單號','申請時間','使用者','件數','總重量(g)','運費(P)','收件人','電話','地址'];
        const toRow = (s: Shipment) => [
            s.id,
            (()=>{ try { return new Date(s.requestedAt).toLocaleString('zh-TW',{hour12:false}); } catch { return s.requestedAt; } })(),
            `${s.username} (${s.userId})`,
            String(s.prizeInstanceIds.length),
            String(s.totalWeightInGrams||0),
            String(s.shippingCostInPoints||0),
            s.shippingAddress?.name||'',
            s.shippingAddress?.phone||'',
            s.shippingAddress?.address||'',
        ];
        const data = [headers, ...rows.map(toRow)]
            .map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g,'""') + '"' : String(v)).join(','))
            .join('\n');
        const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'pick-list.csv'; a.click(); URL.revokeObjectURL(url);
    };

    const printPackingSlips = (rows: Shipment[]) => {
        const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Packing Slips</title>
        <style>
        body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Helvetica, Arial;}
        .slip{border:1px solid #ddd; padding:12px; margin:10px 0; page-break-inside: avoid;}
        .title{font-weight:700; font-size:16px; margin-bottom:6px}
        .row{display:flex; gap:8px; font-size:12px;}
        .label{color:#555}
        </style></head><body>
        ${rows.map(s=>{
            const prizes = s.prizeInstanceIds.map(id=>inventory[id]).filter(Boolean);
            const items = prizes.map(p=>`<li>${p?.grade||''} - ${p?.name||''} (${p?.weight||0}g)</li>`).join('');
            return `<div class=\"slip\">
                <div class=\"title\">出貨單 #${s.id}</div>
                <div class=\"row\"><span class=\"label\">申請人：</span>${s.username} (${s.userId})</div>
                <div class=\"row\"><span class=\"label\">申請時間：</span>${new Date(s.requestedAt).toLocaleString('zh-TW',{hour12:false})}</div>
                <div class=\"row\"><span class=\"label\">收件人：</span>${s.shippingAddress?.name||''}</div>
                <div class=\"row\"><span class=\"label\">電話：</span>${s.shippingAddress?.phone||''}</div>
                <div class=\"row\"><span class=\"label\">地址：</span>${s.shippingAddress?.address||''}</div>
                <div class=\"row\"><span class=\"label\">件數：</span>${s.prizeInstanceIds.length}　<span class=\"label\">總重量：</span>${(s.totalWeightInGrams/1000).toFixed(2)} kg　<span class=\"label\">運費：</span>${s.shippingCostInPoints} P</div>
                <div class=\"row\"><span class=\"label\">內含：</span><ul>${items}</ul></div>
            </div>`;
        }).join('')}
        </body></html>`;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">出貨管理</h2>
            <div className="mb-4 space-y-3">
                {(overdueCounts.gt48>0 || overdueCounts.gt24>0) && (
                    <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                        逾期待處理：<span className="font-semibold">{overdueCounts.gt48} 筆(≥48h)</span>、{overdueCounts.gt24} 筆(≥24h)
                    </div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                    {(['ALL', 'PENDING', 'PROCESSING', 'SHIPPED'] as const).map(status => (
                        <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${filterStatus === status ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                            {status === 'ALL' ? '全部' : status === 'PENDING' ? '待處理' : status === 'PROCESSING' ? '處理中' : '已出貨'}
                        </button>
                    ))}
                    <span className="mx-1 text-gray-300">|</span>
                    {(['ALL','GT24','GT48'] as const).map(k => (
                        <button key={k} onClick={()=>setAgingFilter(k)} className={`px-3 py-1.5 text-sm rounded-full ${agingFilter===k?'bg-amber-800 text-white':'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>{k==='ALL'?'全部時效':k==='GT24'?'>=24h':'>=48h'}</button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} /> 全選（{selectedIds.size}）
                    </label>
                    <button disabled={selectedIds.size===0} onClick={()=>exportPickListCsv(sortedAndFilteredShipments.filter(s=>selectedIds.has(s.id)))} className={`px-3 py-1.5 rounded ${selectedIds.size>0?'bg-slate-800 text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>匯出揀貨清單 CSV（已勾選）</button>
                    <button disabled={selectedIds.size===0} onClick={()=>printPackingSlips(sortedAndFilteredShipments.filter(s=>selectedIds.has(s.id)))} className={`px-3 py-1.5 rounded ${selectedIds.size>0?'bg-black text-white':'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>列印出貨明細（已勾選）</button>
                </div>
            </div>
            
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="全選"/></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請時間</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請人</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">件數</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedAndFilteredShipments.map(s => (
                             <tr key={s.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={()=>toggleOne(s.id)} aria-label={`選取 ${s.id}`}/></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(s.requestedAt).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.prizeInstanceIds.length}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[s.status]}`}>
                                        {statusLabels[s.status]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {(() => {
                                        const ageH = Math.floor((Date.now() - new Date(s.requestedAt).getTime()) / 3600000);
                                        if (s.status === 'SHIPPED') return <span className="text-gray-500">—</span>;
                                        if (ageH >= 48) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">≥48h</span>;
                                        if (ageH >= 24) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">≥24h</span>;
                                        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{"<24h"}</span>;
                                    })()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => setSelectedShipment(s)} className="text-indigo-600 hover:text-indigo-900">檢視詳情</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sortedAndFilteredShipments.length === 0 && <p className="text-center py-4 text-gray-500">沒有符合條件的出貨單。</p>}
            
            {selectedShipment && (
                <ShipmentDetailModal 
                    shipment={selectedShipment}
                    inventory={inventory}
                    onClose={() => setSelectedShipment(null)}
                    onUpdateStatus={(...args) => {
                        onUpdateShipmentStatus(...args);
                        const updatedShipment = { ...selectedShipment, status: args[1] };
                        if(args[1] === 'SHIPPED') {
                             updatedShipment.trackingNumber = args[2];
                             updatedShipment.carrier = args[3];
                        }
                        setSelectedShipment(updatedShipment);
                    }}
                    canManage={canManage}
                />
            )}
        </div>
    );
};
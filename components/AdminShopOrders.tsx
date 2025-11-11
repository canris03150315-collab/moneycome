import React from 'react';
import type { ShopOrder } from '../types';
import { useAuthStore } from '../store/authStore';
import { useToast } from './ToastProvider';
import { ConfirmationModal } from './ConfirmationModal';

type Filter = {
  q: string;
  type: '' | 'DIRECT' | 'PREORDER_FULL' | 'PREORDER_DEPOSIT';
  payment: '' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  status: '' | 'PENDING' | 'CONFIRMED' | 'FULFILLING' | 'SHIPPED' | 'OUT_OF_STOCK' | 'COMPLETED' | 'CANCELLED';
};

export const AdminShopOrders: React.FC = () => {
  const toast = useToast();
  const fetchAdminShopOrders = useAuthStore(s => s.fetchAdminShopOrders);
  const adminFinalizeReady = useAuthStore(s => s.adminFinalizeReady);
  const adminUpdateShopOrderStatus = useAuthStore(s => s.adminUpdateShopOrderStatus);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<ShopOrder[]>([]);
  const [filter, setFilter] = React.useState<Filter>({ q: '', type: '', payment: '', status: '' });
  const [qInput, setQInput] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'createdAt'|'payment'|'status'|'type'>('createdAt');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');
  const [listBusy, setListBusy] = React.useState(false);

  const [activeOrder, setActiveOrder] = React.useState<ShopOrder | null>(null);
  const [showFinalize, setShowFinalize] = React.useState(false);
  const [showLogistics, setShowLogistics] = React.useState(false);
  const [showStatus, setShowStatus] = React.useState(false);
  const [finalizeChannel, setFinalizeChannel] = React.useState<'站內信'|'Email'>('站內信');

  // selection for batch operations
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set<string>());
  const allSelected = orders.length>0 && selectedIds.size===orders.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set<string>());
    else setSelectedIds(new Set<string>(orders.map(o=>o.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => { const next = new Set<string>(prev as Set<string>); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const clearSelection = () => setSelectedIds(new Set<string>());
  const [showBatchFinalize, setShowBatchFinalize] = React.useState(false);
  const [showBatchStatus, setShowBatchStatus] = React.useState(false);
  const [batchStatus, setBatchStatus] = React.useState<ShopOrder['status']>('CONFIRMED');
  const [confirmDanger, setConfirmDanger] = React.useState<{open:boolean; ids:string[]; status:'OUT_OF_STOCK'|'CANCELLED'|null}>({open:false, ids:[], status:null});

  // pagination & csv
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const exportCsv = (rows: ShopOrder[]) => {
    const headers = ['訂單編號','建立時間','使用者','商品','類型','付款','狀態','已付','總額'];
    const toRow = (o: ShopOrder) => [
      o.id,
      (()=>{ try { return new Date(o.createdAt).toLocaleString('zh-TW', { hour12:false }); } catch { return o.createdAt; } })(),
      o.username,
      o.productTitle,
      o.type,
      o.payment,
      o.status,
      String(o.paidPoints ?? 0),
      String(o.totalPoints ?? 0),
    ];
    const data = [headers, ...rows.map(toRow)]
      .map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g,'""') + '"' : String(v)).join(','))
      .join('\n');
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'shop-orders.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const load = React.useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const list = await fetchAdminShopOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (e:any) {
      setError(e?.message || '讀取失敗');
    } finally { setLoading(false); }
  }, [fetchAdminShopOrders]);

  React.useEffect(() => { load(); }, [load]);

  // Restore state from URL on mount
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const sp = url.searchParams;
      const q = sp.get('q') || '';
      const type = (sp.get('type') as Filter['type']) || '';
      const payment = (sp.get('payment') as Filter['payment']) || '';
      const status = (sp.get('status') as Filter['status']) || '';
      const sb = (sp.get('sortBy') as 'createdAt'|'payment'|'status'|'type') || 'createdAt';
      const sd = (sp.get('sortDir') as 'asc'|'desc') || 'desc';
      const pg = parseInt(sp.get('page') || '1', 10) || 1;
      const ps = parseInt(sp.get('pageSize') || '10', 10) || 10;
      setFilter({ q, type, payment, status });
      setQInput(q);
      setSortBy(sb);
      setSortDir(sd);
      setPage(pg);
      setPageSize(ps);
    } catch {}
    initializedRef.current = true;
  }, []);

  // Debounce q input into filter.q
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setFilter(f => (f.q === qInput ? f : { ...f, q: qInput }));
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  // When filters or pageSize change, reset to page 1
  React.useEffect(() => {
    setPage(1);
  }, [filter.type, filter.payment, filter.status, filter.q, pageSize]);

  // Write state to URL
  React.useEffect(() => {
    if (!initializedRef.current) return;
    try {
      const url = new URL(window.location.href);
      const sp = url.searchParams;
      const setOrDel = (k: string, v: string | number | undefined) => {
        const sv = String(v ?? '');
        if (sv === '' || sv === '0') sp.delete(k); else sp.set(k, sv);
      };
      setOrDel('q', filter.q);
      setOrDel('type', filter.type);
      setOrDel('payment', filter.payment);
      setOrDel('status', filter.status);
      setOrDel('sortBy', sortBy);
      setOrDel('sortDir', sortDir);
      setOrDel('page', page);
      setOrDel('pageSize', pageSize);
      url.search = sp.toString();
      window.history.replaceState(null, '', url.toString());
    } catch {}
  }, [filter.q, filter.type, filter.payment, filter.status, sortBy, sortDir, page, pageSize]);

  // Popstate: restore from URL when navigating back/forward
  React.useEffect(() => {
    const handler = () => {
      try {
        const url = new URL(window.location.href);
        const sp = url.searchParams;
        const q = sp.get('q') || '';
        const type = (sp.get('type') as Filter['type']) || '';
        const payment = (sp.get('payment') as Filter['payment']) || '';
        const status = (sp.get('status') as Filter['status']) || '';
        const sb = (sp.get('sortBy') as 'createdAt'|'payment'|'status'|'type') || 'createdAt';
        const sd = (sp.get('sortDir') as 'asc'|'desc') || 'desc';
        const pg = parseInt(sp.get('page') || '1', 10) || 1;
        const ps = parseInt(sp.get('pageSize') || '10', 10) || 10;
        setFilter({ q, type, payment, status });
        setQInput(q);
        setSortBy(sb);
        setSortDir(sd);
        setPage(pg);
        setPageSize(ps);
      } catch {}
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Lightweight busy state on filter/sort/pagination changes
  React.useEffect(() => {
    setListBusy(true);
    const id = window.setTimeout(() => setListBusy(false), 120);
    return () => window.clearTimeout(id);
  }, [filter.q, filter.type, filter.payment, filter.status, sortBy, sortDir, page, pageSize]);

  const filtered = React.useMemo(() => {
    let arr = [...orders];
    if (filter.q) {
      const q = filter.q.toLowerCase();
      arr = arr.filter(o => (o.productTitle||'').toLowerCase().includes(q) || (o.username||'').toLowerCase().includes(q) || o.id.includes(q));
    }
    if (filter.type) arr = arr.filter(o => o.type === filter.type);
    if (filter.payment) arr = arr.filter(o => o.payment === filter.payment);
    if (filter.status) arr = arr.filter(o => o.status === filter.status);
    arr.sort((a,b) => {
      let va:any, vb:any;
      switch (sortBy) {
        case 'createdAt': va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); break;
        case 'payment': va = a.payment; vb = b.payment; break;
        case 'status': va = a.status; vb = b.status; break;
        case 'type': va = a.type; vb = b.type; break;
      }
      if (va < vb) return sortDir==='asc' ? -1 : 1;
      if (va > vb) return sortDir==='asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [orders, filter, sortBy, sortDir]);

  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const summary = React.useMemo(() => {
    let count = filtered.length;
    let total = 0;
    let paid = 0;
    for (const o of filtered) {
      total += o.totalPoints || 0;
      paid += o.paidPoints || 0;
    }
    return { count, total, paid };
  }, [filtered]);

  const TYPE_LABEL: Record<string,string> = { DIRECT:'直購', PREORDER_FULL:'全額預購', PREORDER_DEPOSIT:'訂金預購' };
  const PAY_LABEL: Record<string,string> = { UNPAID:'未付款', PARTIALLY_PAID:'部分付款', PAID:'已付款' };
  const STATUS_LABEL: Record<string,string> = { PENDING:'待確認', CONFIRMED:'已確認', FULFILLING:'備貨中', SHIPPED:'已出貨', OUT_OF_STOCK:'缺貨', COMPLETED:'已完成', CANCELLED:'已取消' };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex-1 flex flex-wrap gap-2 items-center">
          <input value={qInput} onChange={e=>setQInput(e.target.value)} placeholder="搜尋 訂單編號/商品/使用者" className="w-full md:w-64 px-3 py-2 border rounded"/>
          <select className="px-2 py-2 border rounded" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value as Filter['type']}))}>
            <option value="">類型</option>
            <option value="DIRECT">直購</option>
            <option value="PREORDER_FULL">全額預購</option>
            <option value="PREORDER_DEPOSIT">訂金預購</option>
          </select>
          <select className="px-2 py-2 border rounded" value={filter.payment} onChange={e=>setFilter(f=>({...f,payment:e.target.value as Filter['payment']}))}>
            <option value="">付款</option>
            <option value="UNPAID">未付款</option>
            <option value="PARTIALLY_PAID">部分付款</option>
            <option value="PAID">已付款</option>
          </select>
          <select className="px-2 py-2 border rounded" value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value as Filter['status']}))}>
            <option value="">狀態</option>
            <option value="PENDING">待確認</option>
            <option value="CONFIRMED">已確認</option>
            <option value="FULFILLING">備貨中</option>
            <option value="SHIPPED">已出貨</option>
            <option value="OUT_OF_STOCK">缺貨</option>
            <option value="COMPLETED">已完成</option>
            <option value="CANCELLED">已取消</option>
          </select>
          <select className="px-2 py-2 border rounded" value={sortBy} onChange={e=>setSortBy(e.target.value as any)}>
            <option value="createdAt">排序：建立時間</option>
            <option value="payment">排序：付款</option>
            <option value="status">排序：狀態</option>
            <option value="type">排序：類型</option>
          </select>
          <button className="px-3 py-2 border rounded" onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>{sortDir==='asc'?'升冪':'降冪'}</button>
        </div>
        <div className="flex items-center gap-2">
          {/* quick filters */}
          <div className="flex flex-wrap gap-2">
            <button className="px-2.5 py-1.5 text-sm rounded border" onClick={()=>setFilter(f=>({...f, payment: 'UNPAID'}))}>未付款</button>
            <button className="px-2.5 py-1.5 text-sm rounded border" onClick={()=>setFilter(f=>({...f, payment: 'PARTIALLY_PAID'}))}>部分付款</button>
            <button className="px-2.5 py-1.5 text-sm rounded border" onClick={()=>setFilter(f=>({...f, payment: 'PAID'}))}>已付款</button>
            <button className="px-2.5 py-1.5 text-sm rounded border" onClick={()=>setFilter(f=>({...f, type: 'PREORDER_DEPOSIT'}))}>訂金預購</button>
            <button className="px-2.5 py-1.5 text-sm rounded border" onClick={()=>setFilter({ q:'', type:'', payment:'', status:'' })}>清除篩選</button>
          </div>
          <button onClick={()=>exportCsv(filtered)} className="px-3 py-2 rounded border">匯出 CSV（目前篩選）</button>
          {selectedIds.size>0 && (
            <>
              <button className="px-3 py-2 rounded bg-amber-500 text-white" onClick={()=>setShowBatchFinalize(true)}>批次通知可補款</button>
              <button className="px-3 py-2 rounded bg-black text-white" onClick={()=>setShowBatchStatus(true)}>批次變更狀態</button>
              <button className="px-3 py-2 rounded border" onClick={clearSelection}>清除勾選</button>
            </>
          )}
          <button onClick={load} className="px-3 py-2 rounded border">重新整理</button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-50 border rounded-md px-3 py-2 text-sm" role="status" aria-live="polite">
        <div>符合條件：<span className="font-semibold">{summary.count}</span> 筆</div>
        <div className="flex items-center gap-3">
          <span>總額：<span className="font-semibold">{summary.total.toLocaleString()} P</span></span>
          <span>已付：<span className="font-semibold">{summary.paid.toLocaleString()} P</span></span>
        </div>
      </div>

      {loading || listBusy ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-4 border animate-pulse h-24" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-3" aria-busy={loading || listBusy}>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span className="text-sm text-gray-600">全選（{selectedIds.size}）</span>
          </div>
          {paged.map(o => {
            const timeText = (() => { try { return new Date(o.createdAt).toLocaleString('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }); } catch { return ''; } })();
            return (
              <div key={o.id} className="bg-white rounded-lg shadow p-4 border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1" checked={selectedIds.has(o.id)} onChange={()=>toggleOne(o.id)} />
                    <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {o.productImageUrl ? <img src={o.productImageUrl} alt={o.productTitle} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">無圖片</div>}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{o.productTitle}</div>
                      <div className="text-xs text-gray-500">{timeText}</div>
                      <div className="text-sm text-gray-600">#{o.id}・{o.username}</div>
                      <div className="text-sm text-gray-800">{(o.paidPoints||0).toLocaleString()} / {(o.totalPoints||0).toLocaleString()} P</div>
                    </div>
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <div><span className="px-2 py-0.5 rounded-full bg-gray-100 border text-gray-700">{TYPE_LABEL[o.type] || o.type}</span></div>
                    <div><span className={`px-2 py-0.5 rounded-full border ${o.payment==='PAID' ? 'bg-green-50 border-green-200 text-green-700' : o.payment==='PARTIALLY_PAID' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>{PAY_LABEL[o.payment] || o.payment}</span></div>
                    <div><span className={`px-2 py-0.5 rounded-full border ${o.status==='COMPLETED' || o.status==='CONFIRMED' || o.status==='SHIPPED' ? 'bg-green-50 border-green-200 text-green-700' : o.status==='PENDING' || o.status==='FULFILLING' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : o.status==='OUT_OF_STOCK' || o.status==='CANCELLED' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>{STATUS_LABEL[o.status] || o.status}</span></div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.type==='PREORDER_DEPOSIT' && !o.canFinalize && (
                    <button className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm" onClick={()=>{ setActiveOrder(o); setFinalizeChannel('站內信'); setShowFinalize(true); }}>通知可補款</button>
                  )}
                  <button className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm" onClick={()=>{ setActiveOrder(o); setShowLogistics(true); }}>編輯物流</button>
                  <button className="px-3 py-1.5 rounded bg-black text-white text-sm" onClick={()=>{ setActiveOrder(o); setShowStatus(true); }}>變更狀態</button>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && (
            <div className="text-center text-gray-500 py-12">沒有符合條件的訂單</div>
          )}
          {/* pagination controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span>每頁</span>
              <select className="border rounded px-2 py-1" aria-label="每頁筆數" value={pageSize} onChange={e=>{ setPage(1); setPageSize(parseInt(e.target.value) || 10); }}>
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>筆， 共 {filtered.length} 筆</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 border rounded" aria-label="上一頁" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>上一頁</button>
              <span className="text-sm">{page} / {totalPages}</span>
              <button className="px-2 py-1 border rounded" aria-label="下一頁" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>下一頁</button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Ready Modal */}
      {showFinalize && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="finalize-title">
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
            <div id="finalize-title" className="font-bold mb-2">通知可補款</div>
            <div className="text-sm text-gray-600 mb-3">訂單：{activeOrder.productTitle}</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-700 mr-2">通知管道</label>
                <select className="px-2 py-2 border rounded" value={finalizeChannel} onChange={e=>setFinalizeChannel(e.target.value as '站內信'|'Email')}>
                  <option value="站內信">站內信</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1.5 rounded border" onClick={()=>{ setShowFinalize(false); setActiveOrder(null); }}>取消</button>
                <button className="px-3 py-1.5 rounded bg-black text-white" onClick={async()=>{
                  try { await adminFinalizeReady(activeOrder.id, finalizeChannel); toast.show({ type:'success', message:'已通知可補款'}); setShowFinalize(false); setActiveOrder(null); load(); }
                  catch(e:any){ toast.show({ type:'error', message: e?.message || '操作失敗'}); }
                }}>送出</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Modal */}
      {showLogistics && activeOrder && (
        <LogisticsModal
          order={activeOrder}
          onClose={()=>{ setShowLogistics(false); setActiveOrder(null); }}
          onSave={async (carrier, trackingNumber) => {
            try { await adminUpdateShopOrderStatus(activeOrder.id, activeOrder.status, trackingNumber, carrier); toast.show({ type:'success', message:'已更新物流'}); setShowLogistics(false); setActiveOrder(null); load(); }
            catch(e:any){ toast.show({ type:'error', message: e?.message || '更新失敗'}); }
          }}
        />
      )}

      {/* Status Modal */}
      {showStatus && activeOrder && (
        <StatusModal
          order={activeOrder}
          onClose={()=>{ setShowStatus(false); setActiveOrder(null); }}
          onSave={async (status) => {
            const danger = status==='OUT_OF_STOCK' || status==='CANCELLED';
            if (danger) {
              setConfirmDanger({ open: true, ids: [activeOrder.id], status });
              return;
            }
            try { await adminUpdateShopOrderStatus(activeOrder.id, status); toast.show({ type:'success', message:'已更新狀態'}); setShowStatus(false); setActiveOrder(null); load(); }
            catch(e:any){ toast.show({ type:'error', message: e?.message || '更新失敗'}); }
          }}
        />
      )}

      {/* Batch Finalize */}
      {showBatchFinalize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="batch-finalize-title">
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
            <div id="batch-finalize-title" className="font-bold mb-2">批次通知可補款</div>
            <div className="text-sm text-gray-600 mb-3">已選擇 {selectedIds.size} 筆</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-700 mr-2">通知管道</label>
                <select className="px-2 py-2 border rounded" value={finalizeChannel} onChange={e=>setFinalizeChannel(e.target.value as '站內信'|'Email')}>
                  <option value="站內信">站內信</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1.5 rounded border" onClick={()=>setShowBatchFinalize(false)}>取消</button>
                <button className="px-3 py-1.5 rounded bg-black text-white" onClick={async()=>{
                  try {
                    const ids: string[] = Array.from(selectedIds as Set<string>);
                    for (const id of ids) { await adminFinalizeReady(id, finalizeChannel); }
                    toast.show({ type:'success', message:'已批次通知可補款' }); setShowBatchFinalize(false); clearSelection(); load();
                  } catch(e:any){ toast.show({ type:'error', message: e?.message || '操作失敗'}); }
                }}>送出</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Status */}
      {showBatchStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="batch-status-title">
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
            <div id="batch-status-title" className="font-bold mb-2">批次變更狀態</div>
            <div className="text-sm text-gray-600 mb-3">已選擇 {selectedIds.size} 筆</div>
            <select className="w-full px-3 py-2 border rounded mb-3" value={batchStatus} onChange={e=>setBatchStatus(e.target.value as ShopOrder['status'])}>
              <option value="PENDING">待確認</option>
              <option value="CONFIRMED">已確認</option>
              <option value="FULFILLING">備貨中</option>
              <option value="SHIPPED">已出貨</option>
              <option value="OUT_OF_STOCK">缺貨</option>
              <option value="COMPLETED">已完成</option>
              <option value="CANCELLED">已取消</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1.5 rounded border" onClick={()=>setShowBatchStatus(false)}>取消</button>
              <button className="px-3 py-1.5 rounded bg-black text-white" onClick={async()=>{
                const danger = batchStatus==='OUT_OF_STOCK' || batchStatus==='CANCELLED';
                if (danger) { setConfirmDanger({ open:true, ids: Array.from(selectedIds), status: batchStatus as any }); return; }
                try {
                  const ids: string[] = Array.from(selectedIds as Set<string>);
                  for (const id of ids) { await adminUpdateShopOrderStatus(id, batchStatus); }
                  toast.show({ type:'success', message:'已批次更新狀態' }); setShowBatchStatus(false); clearSelection(); load();
                } catch(e:any){ toast.show({ type:'error', message: e?.message || '更新失敗'}); }
              }}>送出</button>
            </div>
          </div>
        </div>
      )}

      {/* Danger confirm for OUT_OF_STOCK / CANCELLED */}
      <ConfirmationModal
        isOpen={confirmDanger.open}
        title="請再次確認"
        message={`即將將 ${confirmDanger.ids.length} 筆訂單設定為「${confirmDanger.status==='OUT_OF_STOCK'?'缺貨':'取消'}」。此操作可能影響客訴，是否繼續？`}
        onCancel={()=>setConfirmDanger({ open:false, ids:[], status:null })}
        onConfirm={async ()=>{
          try {
            for (const id of confirmDanger.ids) { await adminUpdateShopOrderStatus(id, confirmDanger.status!); }
            toast.show({ type:'success', message:'已更新狀態' });
          } catch(e:any){ toast.show({ type:'error', message: e?.message || '更新失敗'}); }
          finally {
            setConfirmDanger({ open:false, ids:[], status:null }); setShowStatus(false); setActiveOrder(null); setShowBatchStatus(false); clearSelection(); load();
          }
        }}
      />
    </div>
  );
};

const LogisticsModal: React.FC<{ order: ShopOrder; onClose: () => void; onSave: (carrier?: string, trackingNumber?: string) => void; }> = ({ order, onClose, onSave }) => {
  const [carrier, setCarrier] = React.useState(order.carrier || '');
  const [tracking, setTracking] = React.useState(order.trackingNumber || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
        <div className="font-bold mb-2">編輯物流</div>
        <div className="space-y-2">
          <input value={carrier} onChange={e=>setCarrier(e.target.value)} placeholder="承運商" className="w-full px-3 py-2 border rounded"/>
          <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="貨運編號" className="w-full px-3 py-2 border rounded"/>
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <button className="px-3 py-1.5 rounded border" onClick={onClose}>取消</button>
          <button className="px-3 py-1.5 rounded bg-black text-white" onClick={()=>onSave(carrier || undefined, tracking || undefined)}>儲存</button>
        </div>
      </div>
    </div>
  );
};

const StatusModal: React.FC<{ order: ShopOrder; onClose: () => void; onSave: (status: ShopOrder['status']) => void; }> = ({ order, onClose, onSave }) => {
  const [status, setStatus] = React.useState<ShopOrder['status']>(order.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
        <div className="font-bold mb-2">變更狀態</div>
        <select className="w-full px-3 py-2 border rounded" value={status} onChange={e=>setStatus(e.target.value as ShopOrder['status'])}>
          <option value="PENDING">待確認</option>
          <option value="CONFIRMED">已確認</option>
          <option value="FULFILLING">備貨中</option>
          <option value="SHIPPED">已出貨</option>
          <option value="OUT_OF_STOCK">缺貨</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <div className="mt-3 flex gap-2 justify-end">
          <button className="px-3 py-1.5 rounded border" onClick={onClose}>取消</button>
          <button className="px-3 py-1.5 rounded bg-black text-white" onClick={()=>onSave(status)}>儲存</button>
        </div>
      </div>
    </div>
  );
};

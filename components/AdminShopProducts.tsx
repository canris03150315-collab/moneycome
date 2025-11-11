import React from 'react';
import { apiCall } from '../api';
import type { ShopProduct, ShopProductStockStatus } from '../types';

type EditState = Partial<ShopProduct> & { id?: string };

export const AdminShopProducts: React.FC = () => {
  const [items, setItems] = React.useState<ShopProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<EditState | null>(() => {
    try {
      const raw = localStorage.getItem('__admin_shop_editing__');
      return raw ? (JSON.parse(raw) as EditState) : null;
    } catch { return null; }
  });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await apiCall('/admin/shop/products');
      setItems(list || []);
    } catch (e: any) {
      setError(e?.message || '讀取失敗');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // persist editing state
  React.useEffect(() => {
    try {
      if (editing) localStorage.setItem('__admin_shop_editing__', JSON.stringify(editing));
      else localStorage.removeItem('__admin_shop_editing__');
      // also pin admin tab to shopProducts to resist reload/tab-loss
      localStorage.setItem('__admin_active_tab__', 'shopProducts' as any);
    } catch {}
  }, [editing]);

  // prevent accidental page navigation by file drag/drop while editing
  React.useEffect(() => {
    if (!editing) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, [editing]);

  const onNew = () => {
    setEditing({
      title: '',
      description: '',
      imageUrl: '',
      price: 0,
      depositPrice: undefined,
      allowDirectBuy: true,
      allowPreorderFull: true,
      allowPreorderDeposit: true,
      stockStatus: 'IN_STOCK',
    });
  };

  const onEdit = (p: ShopProduct) => setEditing({ ...p });
  const onCancel = () => setEditing(null);

  const onDelete = async (id: string) => {
    if (!confirm('確定刪除此商品？')) return;
    try {
      setSaving(true);
      await apiCall(`/admin/shop/products/${id}`, { method: 'DELETE' });
      await load();
    } catch (e:any) { setError(e?.message || '刪除失敗'); }
    finally { setSaving(false); }
  };

  const onSave = async () => {
    if (!editing) return;
    const { id, title, description, imageUrl, price, depositPrice, allowDirectBuy, allowPreorderFull, allowPreorderDeposit, stockStatus } = editing as any;
    if (!title || !imageUrl || !stockStatus) { setError('請填寫必要欄位'); return; }
    try {
      setSaving(true); setError(null);
      const payload = { id, title, description, imageUrl, price: Number(price||0), depositPrice: (depositPrice===''? undefined : (typeof depositPrice==='number'? depositPrice : Number(depositPrice))), allowDirectBuy: !!allowDirectBuy, allowPreorderFull: !!allowPreorderFull, allowPreorderDeposit: !!allowPreorderDeposit, stockStatus: stockStatus as ShopProductStockStatus };
      await apiCall('/admin/shop/products', { method: 'POST', body: JSON.stringify(payload) });
      setEditing(null);
      await load();
    } catch (e:any) {
      setError(e?.message || '儲存失敗');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">商城商品</h2>
        <button type="button" onClick={onNew} className="px-4 py-2 rounded bg-black text-white">新增商品</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {editing && (
        <div className="p-4 border rounded space-y-3 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm" htmlFor="shop-title">標題
              <input id="shop-title" name="shopTitle" className="mt-1 w-full border rounded px-3 py-2" value={editing.title || ''} onChange={e=>setEditing(prev=>({ ...(prev||{}), title: e.target.value }))} />
            </label>
            <label className="text-sm" htmlFor="shop-image-url">圖片 URL
              <input id="shop-image-url" name="shopImageUrl" className="mt-1 w-full border rounded px-3 py-2" value={editing.imageUrl || ''} onChange={e=>setEditing(prev=>({ ...(prev||{}), imageUrl: e.target.value }))} />
            </label>
            <div className="md:col-span-2">
              {editing.imageUrl && (
                <img src={editing.imageUrl} alt="預覽" className="w-full max-w-sm h-36 object-cover rounded border mb-2" />
              )}
              <label className="text-sm block" htmlFor="shop-image-upload">或上傳圖片
                <input
                  id="shop-image-upload"
                  name="shopImageUpload"
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full border rounded px-3 py-2"
                  onClick={(e)=>{ e.stopPropagation(); }}
                  onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); } }}
                  onChange={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.target.files && e.target.files[0];
                    if(!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const dataUrl = reader.result as string;
                      setEditing(prev=>({ ...(prev||{}), imageUrl: dataUrl }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            <label className="text-sm md:col-span-2" htmlFor="shop-desc">描述
              <textarea id="shop-desc" name="shopDescription" className="mt-1 w-full border rounded px-3 py-2" rows={3} value={editing.description || ''} onChange={e=>setEditing(prev=>({ ...(prev||{}), description: e.target.value }))} />
            </label>
            <label className="text-sm" htmlFor="shop-price">售價（點數）
              <input id="shop-price" name="shopPrice" type="number" className="mt-1 w-full border rounded px-3 py-2" value={editing.price as any || 0} onChange={e=>setEditing(prev=>({ ...(prev||{}), price: Number(e.target.value||0) }))} />
            </label>
            <label className="text-sm" htmlFor="shop-deposit">訂金（可留空）
              <input id="shop-deposit" name="shopDeposit" type="number" className="mt-1 w-full border rounded px-3 py-2" value={(editing.depositPrice as any) ?? ''} onChange={e=>setEditing(prev=>({ ...(prev||{}), depositPrice: e.target.value===''? undefined : Number(e.target.value) }))} />
            </label>
            <label className="text-sm" htmlFor="shop-stock">庫存狀態
              <select id="shop-stock" name="shopStockStatus" className="mt-1 w-full border rounded px-3 py-2" value={editing.stockStatus as any || 'IN_STOCK'} onChange={e=>setEditing(prev=>({ ...(prev||{}), stockStatus: e.target.value as ShopProductStockStatus }))}>
                <option value="IN_STOCK">IN_STOCK（有現貨）</option>
                <option value="PREORDER_ONLY">PREORDER_ONLY（僅預購）</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK（缺貨）</option>
              </select>
            </label>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.allowDirectBuy} onChange={e=>setEditing(prev=>({ ...(prev||{}), allowDirectBuy: e.target.checked }))} /> 允許直接購買
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.allowPreorderFull} onChange={e=>setEditing(prev=>({ ...(prev||{}), allowPreorderFull: e.target.checked }))} /> 允許全額預購
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.allowPreorderDeposit} onChange={e=>setEditing(prev=>({ ...(prev||{}), allowPreorderDeposit: e.target.checked }))} /> 允許訂金預購
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={saving} onClick={onSave} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">儲存</button>
            <button type="button" disabled={saving} onClick={onCancel} className="px-4 py-2 rounded border">取消</button>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">商品</th>
              <th className="p-2 text-left">售價</th>
              <th className="p-2 text-left">訂金</th>
              <th className="p-2 text-left">庫存</th>
              <th className="p-2 text-left">模式</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>載入中…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-3" colSpan={6}>尚無商品</td></tr>
            ) : items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} alt={p.title} className="w-12 h-12 object-cover rounded" />
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[320px]">{p.description}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">{p.price}</td>
                <td className="p-2">{p.depositPrice ?? '-'}</td>
                <td className="p-2">{p.stockStatus}</td>
                <td className="p-2 text-xs space-y-1">
                  <div>直購：{p.allowDirectBuy ? '可' : '否'}</div>
                  <div>全額預購：{p.allowPreorderFull ? '可' : '否'}</div>
                  <div>訂金預購：{p.allowPreorderDeposit ? '可' : '否'}</div>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-1 rounded border" onClick={()=>onEdit(p)}>編輯</button>
                    <button type="button" className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50" disabled={saving} onClick={()=>onDelete(p.id)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

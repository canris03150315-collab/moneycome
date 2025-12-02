import React from 'react';
import { apiCall, clearApiCache } from '../api';
import type { ShopProduct, ShopProductStockStatus } from '../types';
import { ImageCropper } from './ImageCropper';
import { uploadImageToImgBB } from '../utils/imageUpload';

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
  const [cropperState, setCropperState] = React.useState<{ file: File } | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    console.log('[AdminShopProducts] Loading products...');
    setLoading(true); setError(null);
    try {
      const list = await apiCall('/admin/shop/products');
      console.log('[AdminShopProducts] Loaded', list?.length || 0, 'products');
      setItems(Array.isArray(list) ? list : []);
    } catch (e:any) {
      console.error('[AdminShopProducts] Load error:', e);
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
      weight: undefined,
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
    const { id, title, description, imageUrl, images, price, depositPrice, weight, allowDirectBuy, allowPreorderFull, allowPreorderDeposit, stockStatus } = editing as any;
    if (!title || !imageUrl || !stockStatus) { setError('請填寫必要欄位'); return; }
    try {
      setSaving(true); setError(null);
      const payload = { id, title, description, imageUrl, images, price: Number(price||0), depositPrice: (depositPrice===''? undefined : (typeof depositPrice==='number'? depositPrice : Number(depositPrice))), weight: (weight===''? undefined : (typeof weight==='number'? weight : Number(weight))), allowDirectBuy: !!allowDirectBuy, allowPreorderFull: !!allowPreorderFull, allowPreorderDeposit: !!allowPreorderDeposit, stockStatus: stockStatus as ShopProductStockStatus };
      console.log('[AdminShopProducts] Saving product:', id || 'new', 'images:', images);
      await apiCall('/admin/shop/products', { method: 'POST', body: JSON.stringify(payload) });
      setEditing(null);
      // 清除緩存並刷新
      console.log('[AdminShopProducts] Clearing cache and reloading...');
      clearApiCache('/admin/shop/products');
      await load();
    } catch (e:any) {
      console.error('[AdminShopProducts] Save error:', e);
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
            <label className="text-sm" htmlFor="shop-image-url">主圖片 URL
              <input id="shop-image-url" name="shopImageUrl" className="mt-1 w-full border rounded px-3 py-2" value={editing.imageUrl || ''} onChange={e=>setEditing(prev=>({ ...(prev||{}), imageUrl: e.target.value }))} />
            </label>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">🆕 多圖上傳（第一張為主圖）</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-2 w-full border rounded px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setUploading(true);
                  try {
                    const uploadPromises = Array.from(files).map(file => uploadImageToImgBB(file));
                    const uploadedUrls = await Promise.all(uploadPromises);
                    const currentImages = (editing as any).images || [];
                    const newImages = [...currentImages, ...uploadedUrls];
                    setEditing(prev => ({ 
                      ...(prev||{}), 
                      images: newImages,
                      imageUrl: (prev as any)?.imageUrl || newImages[0]
                    } as any));
                    alert(`成功上傳 ${uploadedUrls.length} 張圖片！`);
                  } catch (error: any) {
                    alert(`圖片上傳失敗：${error.message || '請稍後再試'}`);
                  } finally {
                    setUploading(false);
                    e.target.value = '';
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">可一次選擇多張圖片上傳</p>
            </div>
            <div className="md:col-span-2">
              {((editing as any).images && Array.isArray((editing as any).images) && (editing as any).images.length > 0) && (
                <div className="p-3 border rounded bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-2">已上傳圖片（{(editing as any).images.length} 張）</div>
                  <div className="flex flex-wrap gap-3">
                    {(editing as any).images.map((url: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`圖片 ${idx + 1}`} className="w-24 h-24 object-cover rounded border-2 border-gray-300" />
                        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">{idx + 1}</div>
                        {idx === 0 && <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">主圖</div>}
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = (editing as any).images.filter((_: string, i: number) => i !== idx);
                            setEditing(prev => ({ 
                              ...(prev||{}), 
                              images: newImages.length > 0 ? newImages : undefined,
                              imageUrl: newImages.length > 0 ? newImages[0] : (prev as any)?.imageUrl
                            } as any));
                          }}
                          className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="刪除此圖片"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = [...(editing as any).images];
                              const [movedImage] = newImages.splice(idx, 1);
                              newImages.unshift(movedImage);
                              setEditing(prev => ({ 
                                ...(prev||{}), 
                                images: newImages,
                                imageUrl: newImages[0]
                              } as any));
                            }}
                            className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                            title="設為主圖"
                          >
                            設為主圖
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <details className="mt-3">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">進階：手動輸入圖片 URL</summary>
                <textarea 
                  className="mt-2 w-full border rounded px-3 py-2 font-mono text-xs" 
                  rows={3} 
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  value={((editing as any).images || []).join('\n')} 
                  onChange={e=>{
                    const urls = e.target.value.split('\n').filter(u => u.trim());
                    setEditing(prev=>({ 
                      ...(prev||{}), 
                      images: urls.length > 0 ? urls : undefined,
                      imageUrl: urls.length > 0 ? urls[0] : (prev as any)?.imageUrl
                    } as any));
                  }} 
                />
              </details>
              <label className="text-sm block mt-3" htmlFor="shop-image-upload">或上傳單張圖片（支援裁切）
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
                    setCropperState({ file });
                    e.target.value = ''; // 清空以允許重複選擇同一文件
                  }}
                />
              </label>
              {uploading && <div className="text-sm text-blue-600 mt-2">上傳中...</div>}
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
            <label className="text-sm" htmlFor="shop-weight">重量（公克，用於計算運費）
              <input id="shop-weight" name="shopWeight" type="number" className="mt-1 w-full border rounded px-3 py-2" placeholder="例如：500" value={(editing.weight as any) ?? ''} onChange={e=>setEditing(prev=>({ ...(prev||{}), weight: e.target.value===''? undefined : Number(e.target.value) }))} />
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
            ) : items.map(p => {
              const isPending = (p as any).approval?.status === 'PENDING';
              const isRejected = (p as any).approval?.status === 'REJECTED';
              const reviewNote = (p as any).approval?.reviewNote;
              
              return (
              <tr key={p.id} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} alt={p.title} className="w-12 h-12 object-cover rounded" />
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{p.title}</div>
                        {isPending && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-500 text-white rounded">待審核</span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded">已拒絕</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[320px]">{p.description}</div>
                      {isRejected && reviewNote && (
                        <div className="text-xs text-red-600 mt-1">拒絕原因: {reviewNote}</div>
                      )}
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
                  <div className="flex gap-2 flex-wrap">
                    {isRejected && (
                      <button 
                        type="button" 
                        className="px-3 py-1 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                        onClick={async () => {
                          const note = prompt('請輸入重新提交的說明（可選）：');
                          if (note !== null) {
                            try {
                              await apiCall(`/admin/shop/products/${p.id}/resubmit`, {
                                method: 'POST',
                                body: JSON.stringify({ note })
                              });
                              alert('✅ 商品已重新提交審核！');
                              load();
                            } catch (error: any) {
                              alert('❌ 重新提交失敗：' + (error.message || '未知錯誤'));
                            }
                          }
                        }}
                      >
                        🔄 重新提交
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={()=>onEdit(p)}
                      disabled={isPending}
                      title={isPending ? "待審核商品無法編輯" : "編輯"}
                    >
                      編輯
                    </button>
                    <button 
                      type="button" 
                      className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                      disabled={saving || isPending} 
                      onClick={()=>onDelete(p.id)}
                      title={isPending ? "待審核商品無法刪除" : "刪除"}
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 圖片裁切器 */}
      {cropperState && (
        <ImageCropper
          imageFile={cropperState.file}
          onCropComplete={async (croppedFile) => {
            try {
              setUploading(true);
              const imageUrl = await uploadImageToImgBB(croppedFile);
              setEditing(prev => ({ ...(prev || {}), imageUrl }));
              setCropperState(null);
            } catch (e: any) {
              setError(e?.message || '圖片上傳失敗');
            } finally {
              setUploading(false);
            }
          }}
          onCancel={() => setCropperState(null)}
          aspectRatio={4 / 3}
        />
      )}
    </div>
  );
};

import React from 'react';
import { StackedCoinIcon } from './icons';
import { useToast } from './ToastProvider';
import { ConfirmationModal } from './ConfirmationModal';
import { ImageLightbox } from './ImageLightbox';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../api';
import type { ShopProduct } from '../types';
import { useAuthStore } from '../store/authStore';

export const ShopProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = React.useState<ShopProduct | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [mode, setMode] = React.useState<'DIRECT'|'PREORDER_FULL'|'PREORDER_DEPOSIT'|null>(null);
  const [contactName, setContactName] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [showPostOrderConfirm, setShowPostOrderConfirm] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const toast = useToast();
  const createShopOrder = useAuthStore(s => s.createShopOrder);
  const currentUser = useAuthStore(s => s.currentUser);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list: ShopProduct[] = await apiCall('/shop/products');
        const found = (list || []).find(p => p.id === id);
        if (!found) throw new Error('找不到商品');
        if (mounted) setProduct(found);
      } catch (e: any) {
        if (mounted) setError(e?.message || '讀取失敗');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="aspect-video bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-20 bg-gray-100 rounded" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-9 bg-gray-200 rounded" />
              <div className="h-9 bg-gray-200 rounded" />
              <div className="h-9 bg-gray-200 rounded" />
            </div>
            <div className="h-10 bg-gray-300 rounded w-40" />
          </div>
        </div>
      </div>
    </div>
  );
  if (error) return <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>;
  if (!product) return <div className="container mx-auto px-4 py-8">找不到商品</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-black mb-4">← 返回</button>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* 圖片區域 */}
          <div className="p-4 space-y-3">
            {/* 主圖 */}
            <div 
              className="aspect-square bg-white border rounded-lg overflow-hidden cursor-zoom-in group relative"
              onClick={() => setShowLightbox(true)}
            >
              <img 
                src={((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0) 
                  ? (product as any).images[selectedImageIndex] 
                  : product.imageUrl
                } 
                alt={`${product.title} - ${selectedImageIndex + 1}`} 
                className="w-full h-full object-contain transition-transform group-hover:scale-105" 
              />
              {/* 放大提示 */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  點擊放大查看
                </div>
              </div>
            </div>
            
            {/* 縮圖列表 */}
            {((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 1) && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(product as any).images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden transition-all ${
                      idx === selectedImageIndex 
                        ? 'border-black shadow-md' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.title} - 縮圖 ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.title}</h1>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{product.description}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <StackedCoinIcon className="w-7 h-7 text-yellow-400 mr-2" />
                <div className="text-2xl font-extrabold text-gray-900">{product.price}<span className="ml-1 text-sm font-medium text-gray-600"> P</span></div>
              </div>
              {currentUser && (
                <div className="text-sm text-gray-600">我的點數：<span className="font-bold text-yellow-600">{currentUser.points.toLocaleString()} P</span></div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-700">
              {product.allowDirectBuy && <span className="px-2 py-0.5 rounded-full bg-gray-100 border">直購</span>}
              {product.allowPreorderFull && <span className="px-2 py-0.5 rounded-full bg-gray-100 border">全額預購</span>}
              {product.allowPreorderDeposit && <span className="px-2 py-0.5 rounded-full bg-gray-100 border">訂金預購{typeof product.depositPrice==='number' ? `（${product.depositPrice} P）` : ''}</span>}
              {(() => { const text = product.stockStatus==='IN_STOCK' ? '有現貨' : product.stockStatus==='PREORDER_ONLY' ? '只限預購' : '缺貨'; return (
                <span className={`px-2 py-0.5 rounded-full border ${product.stockStatus==='IN_STOCK'?'text-green-700 border-green-300 bg-green-50': product.stockStatus==='PREORDER_ONLY'?'text-yellow-700 border-yellow-300 bg-yellow-50':'text-gray-700 border-gray-300 bg-gray-50'}`}>{text}</span>
              ); })()}
            </div>
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={!product.allowDirectBuy || product.stockStatus!=='IN_STOCK' || creating}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold ${mode==='DIRECT'?'bg-black text-white':'bg-white hover:bg-gray-50'} disabled:opacity-50`}
                  onClick={()=>setMode('DIRECT')}
                >直購</button>
                <button
                  type="button"
                  disabled={!product.allowPreorderFull || creating}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold ${mode==='PREORDER_FULL'?'bg-black text-white':'bg-white hover:bg-gray-50'} disabled:opacity-50`}
                  onClick={()=>setMode('PREORDER_FULL')}
                >全額預購</button>
                <button
                  type="button"
                  disabled={!product.allowPreorderDeposit || typeof product.depositPrice !== 'number' || creating}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold ${mode==='PREORDER_DEPOSIT'?'bg-black text-white':'bg-white hover:bg-gray-50'} disabled:opacity-50`}
                  onClick={()=>setMode('PREORDER_DEPOSIT')}
                >訂金預購{typeof product.depositPrice==='number' ? `（${product.depositPrice} P）` : ''}</button>
              </div>
            </div>

            {mode === 'PREORDER_DEPOSIT' && (
              <div className="space-y-3 border rounded p-4 bg-gray-50">
                <div className="text-sm text-gray-700">請留下聯絡資訊以便補款通知</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm">聯絡姓名
                    <input className="mt-1 w-full border rounded px-3 py-2" value={contactName} onChange={e=>setContactName(e.target.value)} />
                  </label>
                  <label className="text-sm">聯絡電話
                    <input className="mt-1 w-full border rounded px-3 py-2" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
                  </label>
                </div>
                <label className="text-sm">備註（選填）
                  <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} value={remark} onChange={e=>setRemark(e.target.value)} />
                </label>
              </div>
            )}

            {/* Price hint and insufficient points warning */}
            <div className="pt-1">
              {mode && (
                <div className="text-sm text-gray-700">
                  需支付：
                  <span className="font-bold text-gray-900">
                    {mode==='PREORDER_DEPOSIT' ? (product.depositPrice as number) : product.price} P
                  </span>
                </div>
              )}
              {currentUser && mode && (
                ((mode==='PREORDER_DEPOSIT' ? (product.depositPrice as number) : product.price) > (currentUser.points || 0)) && (
                  <div className="mt-2 p-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">點數不足，請先儲值後再試。</div>
                )
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 bg-[#ffc400] text-black border-2 border-black hover:bg-yellow-400 focus:ring-yellow-400 disabled:opacity-50"
                disabled={creating || !mode || (mode==='PREORDER_DEPOSIT' && (!contactName || !contactPhone))}
                onClick={async ()=>{
                  if (!id || !mode) return;
                  if (!currentUser) { toast.show({ type:'info', message:'請先登入後再下單。'}); navigate('/auth'); return; }
                  if (mode==='PREORDER_DEPOSIT') {
                    const nameOk = contactName.trim().length >= 2;
                    const phoneOk = /^\+?\d[\d\-\s]{7,}$/.test(contactPhone.trim());
                    if (!nameOk || !phoneOk) { toast.show({ type:'error', message:'請填寫正確的姓名與電話再提交。'}); return; }
                  }
                  try {
                    setCreating(true);
                    await createShopOrder({ productId: id, mode, contactName: mode==='PREORDER_DEPOSIT'?contactName: undefined, contactPhone: mode==='PREORDER_DEPOSIT'?contactPhone: undefined, remark: mode==='PREORDER_DEPOSIT'?remark: undefined });
                    toast.show({ type:'success', message:'下單成功！'});
                    setShowPostOrderConfirm(true);
                  } catch (e:any) {
                    const msg = e?.message ? String(e.message) : '下單失敗，請稍後再試或重新整理。';
                    toast.show({ type:'error', message: msg });
                  } finally { setCreating(false); }
                }}
              >{creating ? '處理中…' : '確認下單'}</button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showPostOrderConfirm}
        title="前往會員中心？"
        message="訂單已建立，是否前往會員中心查看訂單？"
        onCancel={()=>setShowPostOrderConfirm(false)}
        onConfirm={()=>{ setShowPostOrderConfirm(false); navigate('/profile'); }}
      />

      {/* 圖片放大查看 */}
      {showLightbox && (
        <ImageLightbox
          images={((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0) 
            ? (product as any).images 
            : [product.imageUrl]
          }
          currentIndex={selectedImageIndex}
          onClose={() => setShowLightbox(false)}
          onPrevious={() => setSelectedImageIndex(prev => {
            const images = (product as any).images || [product.imageUrl];
            return prev === 0 ? images.length - 1 : prev - 1;
          })}
          onNext={() => setSelectedImageIndex(prev => {
            const images = (product as any).images || [product.imageUrl];
            return prev === images.length - 1 ? 0 : prev + 1;
          })}
        />
      )}
    </div>
  );
};

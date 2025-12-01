import React, { useState, useEffect } from 'react';
import { apiCall } from '../api';
import type { LotterySet } from '../types';

interface ApprovalInfo {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  submittedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
  reviewNote?: string;
}

interface ApprovalProduct {
  id: string;
  title: string;
  bannerUrl?: string;
  price: number;
  prizes?: any[];
  subtitle?: string;
  approval: ApprovalInfo;
  productType: 'LOTTERY';
}

interface ShopProduct {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  price: number;
  depositPrice?: number;
  weight?: number;
  stockStatus: string;
  approval: ApprovalInfo;
  productType: 'SHOP';
}

export const AdminProductApproval: React.FC = () => {
  const [products, setProducts] = useState<(ApprovalProduct | ShopProduct)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ApprovalProduct | ShopProduct | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadPendingProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // 同時獲取一番賞和商城商品
      const [lotteryResponse, shopResponse] = await Promise.all([
        apiCall('/admin/lottery-sets/pending-approval'),
        apiCall('/admin/shop/products/pending-approval')
      ]);
      
      const lotteryProducts = (lotteryResponse.products || []).map((p: any) => ({ ...p, productType: 'LOTTERY' as const }));
      const shopProducts = (shopResponse.products || []).map((p: any) => ({ ...p, productType: 'SHOP' as const }));
      
      // 合併並按提交時間排序
      const allProducts = [...lotteryProducts, ...shopProducts].sort((a, b) => {
        const timeA = new Date(a.approval?.submittedAt || 0).getTime();
        const timeB = new Date(b.approval?.submittedAt || 0).getTime();
        return timeB - timeA; // 最新的在前面
      });
      
      setProducts(allProducts);
    } catch (err: any) {
      setError(err.message || '載入失敗');
      console.error('[AdminProductApproval] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingProducts();
  }, []);

  const handleApprove = async (product: ApprovalProduct | ShopProduct) => {
    if (!confirm('確定要審核通過這個商品嗎？')) return;
    
    setProcessing(true);
    try {
      const endpoint = product.productType === 'SHOP' 
        ? `/admin/shop/products/${product.id}/approve`
        : `/admin/lottery-sets/${product.id}/approve`;
        
      await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify({ note: approveNote || '審核通過' })
      });
      
      alert('✅ 商品審核通過！');
      setSelectedProduct(null);
      setApproveNote('');
      await loadPendingProducts();
    } catch (err: any) {
      alert('❌ 審核失敗：' + (err.message || '未知錯誤'));
      console.error('[AdminProductApproval] Approve error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (product: ApprovalProduct | ShopProduct) => {
    if (!rejectNote.trim()) {
      alert('請輸入拒絕原因');
      return;
    }
    
    if (!confirm('確定要拒絕這個商品嗎？')) return;
    
    setProcessing(true);
    try {
      const endpoint = product.productType === 'SHOP'
        ? `/admin/shop/products/${product.id}/reject`
        : `/admin/lottery-sets/${product.id}/reject`;
        
      await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify({ note: rejectNote })
      });
      
      alert('✅ 商品已拒絕！');
      setSelectedProduct(null);
      setRejectNote('');
      await loadPendingProducts();
    } catch (err: any) {
      alert('❌ 拒絕失敗：' + (err.message || '未知錯誤'));
      console.error('[AdminProductApproval] Reject error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">❌ {error}</p>
        <button
          onClick={loadPendingProducts}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">商品審核</h2>
        <button
          onClick={loadPendingProducts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          🔄 重新載入
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg">✅ 目前沒有待審核的商品</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    類型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    價格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提交者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提交時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const imageUrl = product.productType === 'SHOP' 
                    ? (product as ShopProduct).imageUrl 
                    : (product as ApprovalProduct).bannerUrl;
                  
                  return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        product.productType === 'SHOP' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {product.productType === 'SHOP' ? '商城商品' : '一番賞'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {product.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.price.toLocaleString()} P
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.approval?.submittedBy || '未知'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {product.approval?.submittedAt 
                          ? new Date(product.approval.submittedAt).toLocaleString('zh-TW')
                          : '未知'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        查看詳情
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 審核詳情 Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">審核商品</h3>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setApproveNote('');
                    setRejectNote('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* 商品信息 */}
              <div className="space-y-6 mb-6">
                {/* Banner 圖片 */}
                {selectedProduct.bannerUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主要圖片</label>
                    <img
                      src={selectedProduct.bannerUrl}
                      alt={selectedProduct.title}
                      className="w-full h-80 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                )}
                
                {/* 基本信息 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">基本信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">商品名稱</label>
                      <p className="text-lg font-semibold">{selectedProduct.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">價格</label>
                      <p className="text-lg font-semibold text-green-600">{selectedProduct.price.toLocaleString()} P</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">商品 ID</label>
                      <p className="text-sm text-gray-700 font-mono">{selectedProduct.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">狀態</label>
                      <p className="text-sm">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          待審核
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 副標題 */}
                {selectedProduct.subtitle && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">副標題</label>
                    <p className="text-gray-800 mt-1">{selectedProduct.subtitle}</p>
                  </div>
                )}

                {/* 獎項信息 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">獎項信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">獎項數量</label>
                      <p className="text-lg font-semibold">{selectedProduct.prizes?.length || 0} 個獎項</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">總數量</label>
                      <p className="text-lg font-semibold">
                        {selectedProduct.prizes?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0} 個
                      </p>
                    </div>
                  </div>
                  
                  {/* 獎項列表 */}
                  {selectedProduct.prizes && selectedProduct.prizes.length > 0 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">獎項列表</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedProduct.prizes.map((prize, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded border border-gray-200">
                            {prize.imageUrl && (
                              <img
                                src={prize.imageUrl}
                                alt={prize.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{prize.tier} - {prize.name}</p>
                              <p className="text-sm text-gray-600">數量: {prize.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 提交信息 */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">提交信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">提交者</label>
                      <p className="text-lg font-semibold">{selectedProduct.approval?.submittedBy || '未知'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">提交時間</label>
                      <p className="text-sm text-gray-700">
                        {selectedProduct.approval?.submittedAt 
                          ? new Date(selectedProduct.approval.submittedAt).toLocaleString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '未知'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 審核操作 */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    審核通過備註（可選）
                  </label>
                  <textarea
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={2}
                    placeholder="例如：商品內容完整，符合規範"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    拒絕原因（必填）
                  </label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="請說明拒絕原因，例如：圖片不清晰、價格設定不合理等"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedProduct)}
                    disabled={processing}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {processing ? '處理中...' : '✅ 審核通過'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedProduct)}
                    disabled={processing || !rejectNote.trim()}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {processing ? '處理中...' : '❌ 拒絕商品'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

# 📚 第二階段優化使用指南

**完成時間：** 2025-11-25  
**新增組件：** 3 個

---

## 🎯 新增的功能

### 1️⃣ 統一 API 錯誤處理 ✅

**位置：** `api.ts`

#### 錯誤訊息映射表
已添加 20+ 個常見錯誤的友善訊息：

```typescript
const ERROR_MESSAGES = {
  // 認證相關
  'INVALID_CREDENTIALS': '帳號或密碼錯誤',
  'SESSION_EXPIRED': '登入已過期，請重新登入',
  
  // 點數相關
  'INSUFFICIENT_POINTS': '點數不足，請先充值',
  
  // 抽獎相關
  'ALREADY_DRAWN': '此號碼已被抽走',
  'QUEUE_EXPIRED': '排隊已過期，請重新排隊',
  
  // 訂單相關
  'INVALID_ADDRESS': '收件地址無效',
  'OUT_OF_STOCK': '商品已售完',
  
  // 網路相關
  'NETWORK_ERROR': '網路連線失敗，請檢查網路',
  'TIMEOUT': '請求超時，請稍後再試',
  // ... 更多
};
```

#### 使用方式

```typescript
import { getFriendlyErrorMessage } from '../api';

try {
  await someAction();
} catch (error) {
  const friendlyMessage = getFriendlyErrorMessage(error);
  toast.error(friendlyMessage);
}
```

#### 自動處理的錯誤類型
- ✅ 錯誤代碼 (error.code)
- ✅ 錯誤訊息 (error.message)
- ✅ 網路錯誤 (NetworkError)
- ✅ 超時錯誤 (TimeoutError)
- ✅ 未知錯誤（預設訊息）

---

### 2️⃣ 確認對話框組件 ✅

**位置：** `components/ConfirmDialog.tsx`

#### 功能特點
- ✅ 3 種類型：danger, warning, info
- ✅ 精美圖標和配色
- ✅ 載入狀態支援
- ✅ 自定義按鈕文字
- ✅ 支援 React 節點作為訊息

#### 基本使用

```typescript
import { ConfirmDialog } from './components/ConfirmDialog';

const [isConfirmOpen, setIsConfirmOpen] = useState(false);

// 顯示確認對話框
<ConfirmDialog
  isOpen={isConfirmOpen}
  title="確認刪除"
  message="此操作無法撤銷，確定要刪除嗎？"
  type="danger"
  confirmText="刪除"
  cancelText="取消"
  onConfirm={() => {
    // 執行刪除
    handleDelete();
    setIsConfirmOpen(false);
  }}
  onCancel={() => setIsConfirmOpen(false)}
/>
```

#### 使用 Hook（更簡單）

```typescript
import { useConfirmDialog } from './components/ConfirmDialog';

const MyComponent = () => {
  const { confirm, DialogComponent } = useConfirmDialog();
  
  const handleDelete = () => {
    confirm({
      title: '確認刪除',
      message: '此操作無法撤銷，確定要刪除嗎？',
      type: 'danger',
      confirmText: '刪除',
      onConfirm: async () => {
        await deleteItem();
        toast.success('刪除成功！');
      }
    });
  };
  
  return (
    <>
      <button onClick={handleDelete}>刪除</button>
      {DialogComponent}
    </>
  );
};
```

#### 三種類型效果

**Danger（危險操作）**
- 紅色圖標和按鈕
- 適用於：刪除、清空、重置

**Warning（警告操作）**
- 黃色圖標和按鈕
- 適用於：更新狀態、批次操作

**Info（資訊確認）**
- 藍色圖標和按鈕
- 適用於：一般確認、提示

---

### 3️⃣ 全局載入指示器 ✅

**位置：** `components/LoadingBar.tsx`

#### 功能特點
- ✅ 頂部進度條
- ✅ 漸層色彩動畫
- ✅ 輕量級實作
- ✅ 不阻擋用戶操作

#### 使用方式

```typescript
import { LoadingBar } from './components/LoadingBar';

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <>
      <LoadingBar isLoading={isLoading} />
      {/* 其他內容 */}
    </>
  );
};
```

#### 在路由切換時使用

```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingBar } from './components/LoadingBar';

const App = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 500);
    return () => clearTimeout(timer);
  }, [location]);
  
  return (
    <>
      <LoadingBar isLoading={isNavigating} />
      {/* Routes */}
    </>
  );
};
```

---

## 💡 實際應用範例

### 範例 1：帶確認的刪除操作

```typescript
import { useConfirmDialog } from './components/ConfirmDialog';
import { useToast } from './components/ToastProvider';
import { getFriendlyErrorMessage } from '../api';

const MyComponent = () => {
  const { confirm, DialogComponent } = useConfirmDialog();
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = (itemId: string) => {
    confirm({
      title: '確認刪除',
      message: '此操作無法撤銷，確定要刪除這個項目嗎？',
      type: 'danger',
      confirmText: '刪除',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteItem(itemId);
          toast.success('刪除成功！');
        } catch (error) {
          const message = getFriendlyErrorMessage(error);
          toast.error(message);
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };
  
  return (
    <>
      <button onClick={() => handleDelete('123')}>刪除</button>
      {DialogComponent}
    </>
  );
};
```

### 範例 2：批次操作確認

```typescript
const handleBatchUpdate = () => {
  const count = selectedItems.length;
  
  confirm({
    title: '批次更新',
    message: (
      <div>
        <p>您選擇了 <strong>{count}</strong> 個項目</p>
        <p className="text-sm text-gray-500 mt-2">
          確定要批次更新這些項目的狀態嗎？
        </p>
      </div>
    ),
    type: 'warning',
    confirmText: `更新 ${count} 個項目`,
    onConfirm: async () => {
      await batchUpdate(selectedItems);
      toast.success(`成功更新 ${count} 個項目！`);
    }
  });
};
```

### 範例 3：帶載入狀態的確認

```typescript
const [isProcessing, setIsProcessing] = useState(false);

<ConfirmDialog
  isOpen={isConfirmOpen}
  title="處理訂單"
  message="確定要處理這個訂單嗎？"
  type="info"
  isLoading={isProcessing}
  onConfirm={async () => {
    setIsProcessing(true);
    try {
      await processOrder();
      toast.success('訂單處理成功！');
      setIsConfirmOpen(false);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }}
  onCancel={() => setIsConfirmOpen(false)}
/>
```

---

## 🔄 替換現有的 confirm()

### 改善前（原生 confirm）

```typescript
const handleUpdate = () => {
  if (!confirm('確定要更新嗎？')) return;
  
  updateStatus();
};
```

### 改善後（ConfirmDialog）

```typescript
const { confirm, DialogComponent } = useConfirmDialog();

const handleUpdate = () => {
  confirm({
    title: '確認更新',
    message: '確定要更新訂單狀態嗎？',
    type: 'warning',
    onConfirm: () => {
      updateStatus();
      toast.success('更新成功！');
    }
  });
};

return (
  <>
    <button onClick={handleUpdate}>更新</button>
    {DialogComponent}
  </>
);
```

---

## 📊 優化效果

### 錯誤處理改善
| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| **錯誤訊息** | 技術性錯誤碼 | 友善的中文訊息 |
| **一致性** | 各處不同 | 統一處理 |
| **用戶理解** | 難以理解 | 清楚明瞭 |

### 確認對話框改善
| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| **視覺效果** | 原生對話框 | 精美自定義 |
| **類型區分** | 無 | 3 種類型 |
| **載入狀態** | 無 | 支援 |

---

## 🎯 建議應用場景

### 高優先級（立即替換）
1. ✅ **AdminShipmentManagement** - 已使用原生 confirm
2. ✅ **AdminPickupManagement** - 已使用原生 confirm
3. **ProfilePage** - 批次回收確認
4. **AddressFormModal** - 刪除地址確認

### 中優先級（建議添加）
5. **AdminPage** - 用戶管理操作
6. **RechargeModal** - 大額充值確認
7. **ShopProductPage** - 購買確認

---

## 🚀 下一步行動

### 立即可做
1. ✅ 替換 AdminPage 中的原生 confirm
2. ✅ 在 ProfilePage 添加批次回收確認
3. ✅ 統一使用 getFriendlyErrorMessage

### 測試驗證
1. 測試確認對話框的 3 種類型
2. 測試錯誤訊息是否友善
3. 測試載入指示器效果

---

**第二階段優化完成！現在系統有更好的錯誤處理和用戶確認體驗！** 🎉

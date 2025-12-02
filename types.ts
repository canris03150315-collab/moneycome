// All the cross-component type definitions for the application.

export interface Banner {
    id: string;
    imageUrl: string;
    title: string;
    subtitle: string;
    linkToLotterySetId?: string;
    externalLink?: string;
}

export type ShopProductStockStatus = 'IN_STOCK' | 'PREORDER_ONLY' | 'OUT_OF_STOCK';
export interface ShopProduct {
    id: string;
    title: string;
    categoryId: string; // 商品分類 ID
    description?: string;
    imageUrl: string;
    images?: string[]; // 多圖支持
    price: number;
    depositPrice?: number; // if provided, enables deposit preorder
    weight?: number; // 商品重量（公克），用於計算運費
    allowDirectBuy: boolean; // direct purchase when in stock
    allowPreorderFull: boolean; // full payment preorder
    allowPreorderDeposit: boolean; // deposit preorder
    stockStatus: ShopProductStockStatus;
}

export type ShopOrderStatus = 'PENDING' | 'CONFIRMED' | 'FULFILLING' | 'SHIPPED' | 'OUT_OF_STOCK' | 'COMPLETED' | 'CANCELLED';
export type ShopPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type ShopOrderType = 'DIRECT' | 'PREORDER_FULL' | 'PREORDER_DEPOSIT';

export interface ShopOrder {
    id: string;
    userId: string;
    username: string;
    productTitle: string;
    productImageUrl?: string;
    type: ShopOrderType;
    payment: ShopPaymentStatus;
    status: ShopOrderStatus;
    totalPoints: number;
    paidPoints: number;
    createdAt: string;
    contactName?: string;
    contactPhone?: string;
    remark?: string;
    canFinalize?: boolean;
    finalizeNotifiedAt?: string;
    finalizeNotifyChannel?: '站內信' | 'Email';
    carrier?: string;
    trackingNumber?: string;
    shippingAddress?: ShippingAddress;
}

export interface SiteConfig {
    storeName: string;
    banners: Banner[];
    bannerInterval: number;
    categoryDisplayOrder?: string[]; // New field for homepage category order
    shopProductsDisplayOrder?: string[]; // New field for homepage shop products order
}

export interface Category {
    id: string;
    name: string;
    children: Category[];
}

export interface Prize {
    id: string;
    grade: string;
    name: string;
    imageUrl: string;
    total: number;
    remaining: number;
    type: 'NORMAL' | 'LAST_ONE';
    recycleValue?: number;
    weight: number; // in grams
    allowSelfPickup?: boolean; // per-prize self-pickup flag
}

export interface PrizeInstance extends Prize {
    instanceId: string;
    lotterySetId: string; // Added to link back to the parent set
    isRecycled: boolean;
    userId: string;
    status: 'IN_INVENTORY' | 'IN_SHIPMENT' | 'SHIPPED' | 'PENDING_PICKUP' | 'PICKED_UP';
}

export interface LotterySet {
    id: string;
    title: string;
    categoryId: string;
    price: number;
    discountPrice?: number;
    imageUrl: string;
    status: 'AVAILABLE' | 'UPCOMING' | 'SOLD_OUT';
    tags: string[];
    releaseDate?: string;
    description: string;
    rules: string;
    prizes: Prize[];
    drawnTicketIndices: number[];
    prizeOrder?: string[];
    poolCommitmentHash?: string;
    poolSeed?: string;
    allowSelfPickup: boolean;
    remainingTickets?: number; // 剩餘籤數
}

export interface ShippingAddress {
    id: string;
    name: string;
    phone: string;
    address: string;
    isDefault: boolean;
}

export interface User {
    id:string;
    email: string;
    password?: string;
    username: string;
    points: number;
    role?: 'USER' | 'ADMIN';  // 舊格式：單一字串
    roles?: string[];          // 新格式：陣列
    lotteryStats?: {
        [lotteryId: string]: {
            cumulativeDraws: number;
            availableExtensions: number;
        };
    };
    shippingAddresses?: ShippingAddress[];
}

export interface Shipment {
    id: string;
    userId: string;
    username: string;
    status: 'PENDING' | 'PROCESSING' | 'SHIPPED';
    prizeInstanceIds: string[];
    shippingAddress: ShippingAddress;
    shippingCostInPoints: number;
    totalWeightInGrams: number;
    trackingNumber?: string;
    carrier?: string;
    requestedAt: string;
    shippedAt?: string;
}

export interface PickupRequest {
    id: string;
    userId: string;
    username: string;
    status: 'PENDING' | 'READY_FOR_PICKUP' | 'COMPLETED';
    prizeInstanceIds: string[];
    requestedAt: string;
    completedAt?: string;
}


export interface TicketLock {
    lotteryId: string;
    ticketIndex: number;
    userId: string;
    expiresAt: number;
}

export interface QueueEntry {
    userId: string;
    expiresAt: number;
}

export interface Order {
    id: string;
    userId: string;
    date: string;
    lotterySetTitle: string;
    prizeInstanceIds: string[];
    costInPoints: number;
    drawHash: string;
    secretKey: string;
    drawnTicketIndices: number[];
    // Optional enriched fields from /orders/recent for UI summaries
    prizeSummary?: Record<string, number>;
    gradeByInstance?: Record<string, string>;
    username?: string;
    usernameMasked?: string;
}

export interface Transaction {
    id: string;
    userId: string;
    username: string;
    type: 'RECHARGE' | 'DRAW' | 'RECYCLE' | 'ADMIN_ADJUSTMENT' | 'SHIPPING' | 'PICKUP_REQUEST';
    amount: number;
    date: string;
    description: string;
    prizeInstanceIds?: string[];
}

export interface RechargeOption {
    points: number;
    price: number;
    bonus?: number;
    isPopular?: boolean;
}

// FIX: Moved AdminModalMode and AppState here to centralize application types.
export type AdminModalMode = 'hidden' | 're-auth';

export interface AppState {
  adminModalMode: AdminModalMode;
  siteConfig: SiteConfig;
  categories: Category[];
  currentUser: User | null;
  users: User[];
  authError: string | null;
  lotterySets: LotterySet[];
  isLoadingSets: boolean;
  ticketLocks: TicketLock[];
  lotteryQueues: Record<string, QueueEntry[]>;
  orders: Order[];
  transactions: Transaction[];
  inventory: { [key: string]: PrizeInstance };
  shipments: Shipment[];
  pickupRequests: PickupRequest[];
  shopOrders: ShopOrder[];
}
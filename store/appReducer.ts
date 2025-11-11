import type { SiteConfig, LotterySet, Category, User, Order, Transaction, Prize, TicketLock, QueueEntry, Banner, PrizeInstance, Shipment, ShippingAddress, PickupRequest, AppState, AdminModalMode } from '../types';
import { mockSiteConfig, mockCategories, mockUsers, mockOrders, mockTransactions, mockShipments, mockPickupRequests } from '../data/mockData';

export const initialState: AppState = {
  adminModalMode: 'hidden',
  siteConfig: mockSiteConfig,
  categories: mockCategories,
  currentUser: null,
  users: mockUsers,
  authError: null,
  lotterySets: [],
  isLoadingSets: true,
  ticketLocks: [],
  lotteryQueues: {},
  orders: mockOrders,
  transactions: mockTransactions,
  inventory: {},
  shipments: mockShipments,
  pickupRequests: mockPickupRequests,
};

export type AppAction =
  | { type: 'SET_ADMIN_MODAL_MODE'; payload: AdminModalMode }
  | { type: 'UPDATE_SITE_CONFIG'; payload: SiteConfig }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING_SETS'; payload: boolean }
  | { type: 'SET_LOTTERY_SETS'; payload: LotterySet[] }
  | { type: 'ADD_LOTTERY_SET'; payload: LotterySet }
  | { type: 'UPDATE_LOTTERY_SET'; payload: Partial<LotterySet> & { id: string } }
  | { type: 'DELETE_LOTTERY_SET'; payload: string }
  | { type: 'UPDATE_TICKET_LOCKS'; payload: TicketLock[] }
  | { type: 'UPDATE_LOTTERY_QUEUES'; payload: Record<string, QueueEntry[]> }
  | { type: 'UPDATE_SINGLE_QUEUE'; payload: { lotteryId: string; queue: QueueEntry[] } }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_INVENTORY'; payload: { [key: string]: PrizeInstance } }
  | { type: 'ADD_SHIPMENT'; payload: Shipment }
  | { type: 'SET_SHIPMENTS'; payload: Shipment[] }
  | { type: 'UPDATE_SHIPMENT'; payload: Shipment }
  | { type: 'ADD_PICKUP_REQUEST'; payload: PickupRequest }
  | { type: 'SET_PICKUP_REQUESTS'; payload: PickupRequest[] }
  | { type: 'UPDATE_PICKUP_REQUEST'; payload: PickupRequest };


export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_ADMIN_MODAL_MODE': return { ...state, adminModalMode: action.payload };
    case 'UPDATE_SITE_CONFIG': return { ...state, siteConfig: action.payload };
    case 'SET_CATEGORIES': return { ...state, categories: action.payload };
    case 'SET_CURRENT_USER': return { ...state, currentUser: action.payload, authError: null };
    case 'SET_AUTH_ERROR': return { ...state, authError: action.payload };
    case 'ADD_USER': return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER': return { ...state, users: state.users.map(u => (u.id === action.payload.id ? action.payload : u)), currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser };
    case 'SET_LOADING_SETS': return { ...state, isLoadingSets: action.payload };
    case 'SET_LOTTERY_SETS': return { ...state, lotterySets: action.payload, isLoadingSets: false };
    case 'ADD_LOTTERY_SET': return { ...state, lotterySets: [...state.lotterySets, action.payload] };
    case 'UPDATE_LOTTERY_SET': return { ...state, lotterySets: state.lotterySets.map(s => (s.id === action.payload.id ? { ...s, ...action.payload } : s)) };
    case 'DELETE_LOTTERY_SET': return { ...state, lotterySets: state.lotterySets.filter(s => s.id !== action.payload) };
    case 'UPDATE_TICKET_LOCKS': return { ...state, ticketLocks: action.payload };
    case 'UPDATE_LOTTERY_QUEUES': return { ...state, lotteryQueues: action.payload };
    case 'UPDATE_SINGLE_QUEUE':
        return {
            ...state,
            lotteryQueues: {
                ...state.lotteryQueues,
                [action.payload.lotteryId]: action.payload.queue,
            },
        };
    case 'ADD_ORDER': return { ...state, orders: [...state.orders, action.payload] };
    case 'SET_ORDERS': return { ...state, orders: action.payload };
    case 'ADD_TRANSACTION': return { ...state, transactions: [...state.transactions, action.payload] };
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload };
    case 'SET_INVENTORY': return { ...state, inventory: action.payload };
    case 'ADD_SHIPMENT': return { ...state, shipments: [...state.shipments, action.payload] };
    case 'SET_SHIPMENTS': return { ...state, shipments: action.payload };
    case 'UPDATE_SHIPMENT': return { ...state, shipments: state.shipments.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'ADD_PICKUP_REQUEST': return { ...state, pickupRequests: [...state.pickupRequests, action.payload] };
    case 'SET_PICKUP_REQUESTS': return { ...state, pickupRequests: action.payload };
    case 'UPDATE_PICKUP_REQUEST': return { ...state, pickupRequests: state.pickupRequests.map(p => p.id === action.payload.id ? action.payload : p) };
    default: return state;
  }
};
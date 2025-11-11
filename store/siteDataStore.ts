import { create } from 'zustand';
import { apiCall } from '../api';
import type { SiteConfig, Category, LotterySet } from '../types';
import { mockSiteConfig } from '../data/mockData';

interface SiteDataState {
    siteConfig: SiteConfig;
    categories: Category[];
    lotterySets: LotterySet[];
    isLoading: boolean;
    fetchSiteData: () => Promise<void>;
    fetchLotterySets: () => Promise<void>;
    startPollingLotterySets: () => () => void; // Returns a function to stop polling
    // Admin actions
    addLotterySet: (lotterySet: LotterySet) => Promise<void>;
    updateLotterySet: (lotterySet: LotterySet) => Promise<void>;
    deleteLotterySet: (lotterySetId: string) => Promise<void>;
    updateSiteConfig: (config: SiteConfig) => Promise<void>;
    saveCategories: (categories: Category[]) => Promise<void>;
    // Storage sync helper (for future: can selectively refresh site data)
    syncFromStorage: (keys: string[]) => Promise<void>;
}

export const useSiteStore = create<SiteDataState>((set, get) => ({
    siteConfig: mockSiteConfig, // Start with mock/default
    categories: [],
    lotterySets: [],
    isLoading: true,

    fetchSiteData: async () => {
        if(!get().isLoading) set({ isLoading: true });
        try {
            const [siteConfig, categories, lotterySets] = await Promise.all([
                apiCall('/site-config'),
                apiCall('/categories'),
                apiCall('/lottery-sets')
            ]);
            set({ siteConfig, categories, lotterySets, isLoading: false });
        } catch (error) {
            console.error("Failed to fetch initial site data", error);
            set({ isLoading: false });
        }
    },

    fetchLotterySets: async () => {
        try {
            const lotterySets = await apiCall('/lottery-sets');
            set({ lotterySets });
        } catch (error) {
            console.error("Failed to poll lottery sets:", error);
        }
    },
    
    startPollingLotterySets: () => {
        let intervalId: any = null;
        const start = () => {
            if (intervalId) return;
            intervalId = setInterval(() => { get().fetchLotterySets(); }, 30000);
        };
        const stop = () => {
            if (intervalId) { clearInterval(intervalId); intervalId = null; }
        };
        if (!document.hidden) start();
        const onVis = () => { if (document.hidden) stop(); else start(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
    },
    
    // Admin Actions
    addLotterySet: async (lotterySet) => {
        const newSet = await apiCall('/admin/lottery-sets', { method: 'POST', body: JSON.stringify(lotterySet) });
        set(state => ({ lotterySets: [...state.lotterySets, newSet] }));
    },
    updateLotterySet: async (lotterySet) => {
        const updatedSet = await apiCall(`/admin/lottery-sets/${lotterySet.id}`, { method: 'PUT', body: JSON.stringify(lotterySet) });
        set(state => ({
            lotterySets: state.lotterySets.map(s => s.id === updatedSet.id ? updatedSet : s)
        }));
    },
    deleteLotterySet: async (lotterySetId) => {
        await apiCall(`/admin/lottery-sets/${lotterySetId}`, { method: 'DELETE' });
        set(state => ({
            lotterySets: state.lotterySets.filter(s => s.id !== lotterySetId)
        }));
    },
    updateSiteConfig: async (config) => {
        const updatedConfig = await apiCall('/admin/site-config', { method: 'POST', body: JSON.stringify(config) });
        set({ siteConfig: updatedConfig });
    },
    saveCategories: async (categories) => {
        const updatedCategories = await apiCall('/admin/categories', { method: 'POST', body: JSON.stringify(categories) });
        set({ categories: updatedCategories });
    },

    // Selective refresh: if inventory changed, re-fetch lottery sets snapshot
    syncFromStorage: async (keys) => {
        try {
            const setKeys = new Set(keys || []);
            if (setKeys.has('__mock_inventory__')) {
                await get().fetchLotterySets();
            }
            if (setKeys.has('__mock_lottery_sets__')) {
                await get().fetchLotterySets();
            }
        } catch {}
    }
}));

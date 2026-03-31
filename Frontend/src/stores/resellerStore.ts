import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ResellerUser {
  id: number;
  name: string;
  email: string;
  companyName: string | null;
  planId?: number | null;
  expiryDate?: string | null;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  isLocked?: boolean;
}

interface ResellerState {
  reseller: ResellerUser | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (data: ResellerUser, token: string) => void;
  logout: () => void;
  updateReseller: (updates: Partial<ResellerUser>) => void;
  isSubscriptionActive: () => boolean;
  isProfileLocked: () => boolean;
}

export const useResellerStore = create<ResellerState>()(
  persist(
    (set, get) => ({
      reseller: null,
      token: null,
      isAuthenticated: false,

      login: (data, token) => {
        set({ reseller: data, token, isAuthenticated: true });
      },

      logout: () => {
        set({ reseller: null, token: null, isAuthenticated: false });
      },

      updateReseller: (updates) => {
        set((state) => ({
          reseller: state.reseller ? { ...state.reseller, ...updates } : state.reseller,
        }));
      },

      isSubscriptionActive: () => {
        const { reseller } = get();
        if (!reseller?.planId || !reseller?.expiryDate) return false;
        return new Date(reseller.expiryDate) >= new Date() && reseller.subscriptionStatus === 'active';
      },

      isProfileLocked: () => {
        const { reseller } = get();
        return !!reseller?.isLocked;
      },
    }),
    {
      name: 'reseller-storage',
      partialize: (state) => ({
        reseller: state.reseller,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

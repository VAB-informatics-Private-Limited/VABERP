import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EnterpriseBranding } from '@/types/branding';

interface BrandingState {
  branding: EnterpriseBranding | null;
  _hasHydrated: boolean;

  setBranding: (branding: EnterpriseBranding | null) => void;
  clearBranding: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      branding: null,
      _hasHydrated: false,

      setBranding: (branding) => set({ branding }),
      clearBranding: () => set({ branding: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'branding-storage',
      partialize: (state) => ({ branding: state.branding }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

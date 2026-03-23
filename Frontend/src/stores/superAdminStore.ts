import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SuperAdminUser {
  id: number;
  name: string;
  email: string;
}

interface SuperAdminState {
  superAdmin: SuperAdminUser | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (data: SuperAdminUser, token: string) => void;
  logout: () => void;
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      superAdmin: null,
      token: null,
      isAuthenticated: false,

      login: (data, token) => {
        set({ superAdmin: data, token, isAuthenticated: true });
      },

      logout: () => {
        set({ superAdmin: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'superadmin-storage',
      partialize: (state) => ({
        superAdmin: state.superAdmin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

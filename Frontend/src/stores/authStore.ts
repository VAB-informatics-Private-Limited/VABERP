import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee, Enterprise, MenuPermissions, UserType } from '@/types';

export type PermissionModule =
  | 'sales' | 'catalog' | 'enquiry' | 'orders' | 'inventory'
  | 'invoicing' | 'reports' | 'configurations' | 'procurement' | 'employees';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

interface AuthState {
  user: Employee | Enterprise | null;
  userType: UserType | null;
  isAuthenticated: boolean;
  permissions: MenuPermissions | null;
  token: string | null;

  // Actions
  login: (user: Employee | Enterprise, userType: UserType, token?: string) => void;
  logout: () => void;
  setPermissions: (permissions: MenuPermissions) => void;
  setToken: (token: string) => void;
  getEnterpriseId: () => number | null;
  getEmployeeId: () => number | null;
  isSubscriptionActive: () => boolean;
  isProfileLocked: () => boolean;
  updateUser: (updates: Partial<Enterprise>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userType: null,
      isAuthenticated: false,
      permissions: null,
      token: null,

      login: (user, userType, token) => {
        set({
          user,
          userType,
          isAuthenticated: true,
          token: token || null,
        });
      },

      logout: () => {
        set({
          user: null,
          userType: null,
          isAuthenticated: false,
          permissions: null,
          token: null,
        });
      },

      setPermissions: (permissions) => {
        set({ permissions });
      },

      setToken: (token) => {
        set({ token });
      },

      getEnterpriseId: () => {
        const { user, userType } = get();
        if (!user) return null;

        if (userType === 'enterprise') {
          return (user as Enterprise).enterprise_id;
        } else if (userType === 'employee') {
          return (user as Employee).enterprise_id;
        }
        return null;
      },

      getEmployeeId: () => {
        const { user, userType } = get();
        if (!user || userType !== 'employee') return null;
        return (user as Employee).id;
      },

      isSubscriptionActive: () => {
        const { user, userType } = get();
        // Only enterprise users are gated; employees pass through
        if (userType !== 'enterprise') return true;
        const ent = user as Enterprise;
        if (!ent?.plan_id || !ent?.expiry_date) return false;
        return new Date(ent.expiry_date) >= new Date() && ent.subscription_status === 'active';
      },

      isProfileLocked: () => {
        const { user, userType } = get();
        if (userType !== 'enterprise') return false;
        return !!(user as Enterprise & { is_locked?: boolean })?.is_locked;
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? ({ ...state.user, ...updates } as Employee | Enterprise) : state.user,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        userType: state.userType,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        token: state.token,
      }),
    }
  )
);

// Hook for checking permissions
export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions);
  const userType = useAuthStore((state) => state.userType);

  // Overloads:
  // hasPermission(module) → true if ANY submodule has ANY action = 1
  // hasPermission(module, action) → true if ANY submodule has that action = 1 (backward compat)
  // hasPermission(module, submodule, action) → exact granular check
  const hasPermission = (
    module: string,
    submoduleOrAction?: string,
    action?: string,
  ): boolean => {
    // Enterprise users have full access to all modules
    if (userType === 'enterprise') return true;

    if (!permissions) return false;

    const modulePerms = permissions[module];
    if (!modulePerms) return false;

    if (action !== undefined && submoduleOrAction !== undefined) {
      // 3-arg: exact granular check (module, submodule, action)
      return modulePerms[submoduleOrAction]?.[action] === 1;
    }

    if (submoduleOrAction !== undefined) {
      // 2-arg backward compat: (module, action) — check if ANY submodule has that action = 1
      return Object.values(modulePerms).some(
        (subPerms) => subPerms[submoduleOrAction] === 1,
      );
    }

    // 1-arg: check if ANY submodule has ANY action = 1
    return Object.values(modulePerms).some(
      (subPerms) => Object.values(subPerms).some((v) => v === 1),
    );
  };

  return { permissions, hasPermission };
}

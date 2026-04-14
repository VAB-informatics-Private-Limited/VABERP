'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { getPermissions } from '@/lib/api/auth';
import { normalizePermissions } from '@/lib/api/employees';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, userType, setPermissions, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Don't redirect until the store has rehydrated from localStorage
    if (!_hasHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    // Always sync the latest permissions from the server for employees
    // so changes made by admin are reflected without requiring re-login
    if (userType === 'employee') {
      getPermissions().then((res) => {
        if (res.data) {
          setPermissions(normalizePermissions(res.data));
        }
      }).catch(() => {
        // silently ignore — stale permissions in store are still usable
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated, user]);

  // Show spinner while waiting for localStorage rehydration
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

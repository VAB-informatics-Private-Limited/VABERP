'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { getPermissions } from '@/lib/api/auth';
import { normalizePermissions } from '@/lib/api/employees';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const PERMISSION_POLL_MS = 5000;

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, userType, setPermissions, _hasHydrated } = useAuthStore();
  const lastPermissionsRef = useRef<string>('');

  useEffect(() => {
    // Don't redirect until the store has rehydrated from localStorage
    if (!_hasHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (userType !== 'employee') return;

    const syncPermissions = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await getPermissions();
        if (!res.data) return;
        const normalized = normalizePermissions(res.data);
        const serialized = JSON.stringify(normalized);
        if (serialized !== lastPermissionsRef.current) {
          lastPermissionsRef.current = serialized;
          setPermissions(normalized);
        }
      } catch {
        // silently ignore — stale permissions in store are still usable
      }
    };

    syncPermissions();
    const intervalId = setInterval(syncPermissions, PERMISSION_POLL_MS);
    const onVisibility = () => { if (!document.hidden) syncPermissions(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated, user, userType]);

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

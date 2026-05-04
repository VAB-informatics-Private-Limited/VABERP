'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { useBrandingStore } from '@/stores/brandingStore';
import { getPermissions } from '@/lib/api/auth';
import { getMyBranding } from '@/lib/api/branding';
import { normalizePermissions } from '@/lib/api/employees';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const PERMISSION_POLL_MS = 5000;
const PERMISSIONS_CHANNEL = 'vab-permissions-sync';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, userType, setPermissions, _hasHydrated } = useAuthStore();
  const setBranding = useBrandingStore((s) => s.setBranding);
  const brandingHydrated = useBrandingStore((s) => s._hasHydrated);
  const branding = useBrandingStore((s) => s.branding);
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
          // Invalidate sidebar's my-permissions query so the sidebar menu
          // picks up the new permissions on its next render.
          queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
        }
      } catch {
        // silently ignore — stale permissions in store are still usable
      }
    };

    // Initial fire + interval
    syncPermissions();
    const intervalId = setInterval(syncPermissions, PERMISSION_POLL_MS);

    // Refetch when tab becomes visible again
    const onVisibility = () => { if (!document.hidden) syncPermissions(); };
    document.addEventListener('visibilitychange', onVisibility);

    // Refetch when browser regains focus (covers window-switch cases
    // where visibilitychange may not fire)
    const onFocus = () => syncPermissions();
    window.addEventListener('focus', onFocus);

    // Cross-tab sync: if any tab in this browser refreshes perms,
    // the other tabs re-sync immediately instead of waiting for the next tick.
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(PERMISSIONS_CHANNEL);
        bc.onmessage = () => syncPermissions();
      } catch {
        bc = null;
      }
    }

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      bc?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated, user, userType]);

  // After auth, fetch latest branding from server and populate the store.
  // Branding store is cleared on logout, so without this the user lands on
  // default colors until they happen to open Settings → Branding.
  useEffect(() => {
    if (!_hasHydrated || !brandingHydrated || !isAuthenticated || !user) return;
    if (branding) return; // already loaded
    (async () => {
      try {
        const res = await getMyBranding();
        if (res.data) setBranding(res.data);
      } catch {
        // ignore — fallback styling stays in effect
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, brandingHydrated, isAuthenticated, user]);

  // Fire a sync whenever the employee navigates to a new route, so freshly-
  // granted pages become accessible the moment they click a link.
  useEffect(() => {
    if (!_hasHydrated || userType !== 'employee' || !isAuthenticated) return;
    (async () => {
      try {
        const res = await getPermissions();
        if (!res.data) return;
        const normalized = normalizePermissions(res.data);
        const serialized = JSON.stringify(normalized);
        if (serialized !== lastPermissionsRef.current) {
          lastPermissionsRef.current = serialized;
          setPermissions(normalized);
          queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
        }
      } catch { /* ignore */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

'use client';

import { useState, useEffect, Suspense } from 'react';
import { Tabs, Typography, Spin } from 'antd';
import { UserOutlined, ShopOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { EnterpriseLoginForm } from '@/components/auth/EnterpriseLoginForm';
import { useAuthStore } from '@/stores/authStore';
import { useBrandingStore } from '@/stores/brandingStore';
import { getBrandingBySlug } from '@/lib/api/branding';
import { DEFAULT_BRANDING } from '@/types/branding';

const { Title, Text } = Typography;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}><Spin size="large" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get('org');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [activeTab, setActiveTab] = useState('employee');

  const branding = useBrandingStore((s) => s.branding);
  const setBranding = useBrandingStore((s) => s.setBranding);
  const [slugLoading, setSlugLoading] = useState(!!orgSlug);

  // Fetch branding by slug if ?org= is in URL
  useEffect(() => {
    if (orgSlug && !branding) {
      setSlugLoading(true);
      getBrandingBySlug(orgSlug)
        .then((res) => {
          if (res.data) setBranding(res.data);
        })
        .catch(() => {})
        .finally(() => setSlugLoading(false));
    } else {
      setSlugLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const displayName = branding?.app_name || branding?.businessName || DEFAULT_BRANDING.app_name;
  const logoSrc = branding?.logo_url || DEFAULT_BRANDING.logo_url;
  const tagline = branding?.tagline || 'Sign in to your account';

  if (slugLoading) {
    return (
      <div className="login-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'employee',
      label: (
        <span>
          <UserOutlined />
          Employee
        </span>
      ),
      children: <LoginForm />,
    },
    {
      key: 'enterprise',
      label: (
        <span>
          <ShopOutlined />
          Enterprise
        </span>
      ),
      children: <EnterpriseLoginForm />,
    },
  ];

  return (
    <div className="login-card">
      <div className="text-center mb-8">
        <div className="flex flex-col items-center mb-4">
          <img src={logoSrc!} alt={displayName!} className="w-14 h-14 object-contain mb-2" />
          <div className="text-center leading-tight">
            <div className="font-bold text-gray-900 text-xl tracking-tight">{displayName}</div>
          </div>
        </div>
        <Text type="secondary">{tagline}</Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        centered
        className="login-tabs"
      />

      <div className="mt-6 text-center space-y-2">
        <Link href="/forgot-password" className="text-primary hover:underline text-sm">
          Forgot your password?
        </Link>

        {activeTab === 'enterprise' && (
          <div className="pt-4 border-t mt-4">
            <Text type="secondary" className="text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Register your business
              </Link>
            </Text>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center gap-6">
          <Link href="/reseller/login" className="text-xs text-gray-400 hover:text-gray-600">
            Reseller Login
          </Link>
          <Link href="/superadmin/login" className="text-xs text-gray-400 hover:text-gray-600">
            Super Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

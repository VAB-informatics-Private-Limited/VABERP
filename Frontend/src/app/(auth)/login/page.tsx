'use client';

import { useState, useEffect, Suspense } from 'react';
import { Tabs, Typography, Spin } from 'antd';
import { UserOutlined, ShopOutlined, CloseOutlined } from '@ant-design/icons';
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
    <div className="login-card relative">
      {/* Close button — back to landing */}
      <Link
        href="/"
        aria-label="Back to home"
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <CloseOutlined style={{ fontSize: 12 }} />
      </Link>

      <div className="login-card-brand">
        <img src={logoSrc!} alt={displayName!} />
        <div>
          <div className="login-card-brand-name">{displayName}</div>
          <div className="login-card-brand-tagline">{tagline}</div>
        </div>
      </div>

      <h1 className="login-card-headline">Welcome Back</h1>
      <p className="login-card-sub">
        Enter your credentials to access the command center.
      </p>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="login-tabs"
      />

      <div className="text-center mt-3">
        <Link href="/forgot-password" className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Forgot your password?
        </Link>
      </div>

      {activeTab === 'enterprise' && (
        <div className="text-center mt-4">
          <Text type="secondary" className="text-sm" style={{ fontWeight: 300 }}>
            Don&apos;t have an account?{' '}
            <Link href="/register">Register your business</Link>
          </Text>
        </div>
      )}

      <div className="login-card-footer">
        <div className="login-card-footer-row">
          <Link href="/reseller/login">Reseller Login</Link>
          <Link href="/superadmin/login">Super Admin Login</Link>
        </div>
      </div>
    </div>
  );
}

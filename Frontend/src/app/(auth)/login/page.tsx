'use client';

import { useState, useEffect } from 'react';
import { Tabs, Typography } from 'antd';
import { UserOutlined, ShopOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { EnterpriseLoginForm } from '@/components/auth/EnterpriseLoginForm';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [activeTab, setActiveTab] = useState('employee');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

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
          <img src="/logo-icon.png" alt="VAB Informatics" className="w-14 h-14 object-contain mb-2" />
          <div className="text-center leading-tight">
            <div className="font-bold text-gray-900 text-xl tracking-tight">VAB Informatics</div>
            <div className="text-gray-400 text-xs tracking-widest uppercase">Private Limited</div>
          </div>
        </div>
        <Title level={2} className="!mb-1">
          VAB Enterprise
        </Title>
        <Text type="secondary">Sign in to your account</Text>
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
      </div>
    </div>
  );
}

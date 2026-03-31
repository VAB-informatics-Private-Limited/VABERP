'use client';

import { useState } from 'react';
import { Button, Typography, Result, Spin } from 'antd';
import {
  ClockCircleOutlined,
  WarningOutlined,
  LogoutOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { getEnterpriseStatus } from '@/lib/api/auth';
import { Enterprise } from '@/types';

const { Title, Text } = Typography;

export default function ActivatePage() {
  const router = useRouter();
  const { user, userType, logout, updateUser, isAuthenticated } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated or not an enterprise user
  if (!isAuthenticated || userType !== 'enterprise') {
    router.replace('/login');
    return null;
  }

  const ent = user as Enterprise;
  const status = ent?.subscription_status ?? 'none';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getEnterpriseStatus();
      if (res.data?.subscriptionStatus === 'active') {
        updateUser({
          subscription_status: 'active',
          expiry_date: res.data.expiryDate ?? undefined,
          plan_id: res.data.planId,
        });
        router.replace('/dashboard');
      } else {
        updateUser({
          subscription_status: res.data?.subscriptionStatus ?? status,
          expiry_date: res.data?.expiryDate ?? ent?.expiry_date,
          plan_id: res.data?.planId ?? ent?.plan_id,
        });
      }
    } catch {
      // silently ignore
    } finally {
      setRefreshing(false);
    }
  };

  const isExpired = status === 'expired';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="VAB" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">VAB Informatics</div>
            <div className="text-gray-400 text-xs">Enterprise Platform</div>
          </div>
        </div>
        <Button
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          type="text"
          className="text-slate-600"
        >
          Logout
        </Button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-lg w-full text-center">
          {isExpired ? (
            <WarningOutlined className="text-5xl text-orange-500 mb-4" />
          ) : (
            <ClockCircleOutlined className="text-5xl text-blue-500 mb-4" />
          )}

          <Title level={3} className="!mb-2">
            {isExpired ? 'Subscription Expired' : 'Account Not Yet Activated'}
          </Title>

          <Text type="secondary" className="text-sm">
            Welcome, <strong>{ent?.business_name}</strong>
          </Text>

          <div className="mt-6 mb-8 p-4 bg-slate-50 rounded-xl text-left">
            {isExpired ? (
              <>
                <p className="text-slate-700 text-sm font-medium mb-1">Your subscription has expired.</p>
                {ent?.expiry_date && (
                  <p className="text-slate-500 text-sm">
                    Expired on: <strong>{new Date(ent.expiry_date).toLocaleDateString('en-IN')}</strong>
                  </p>
                )}
                <p className="text-slate-500 text-sm mt-2">
                  Please contact your administrator or reseller to renew your subscription.
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-700 text-sm font-medium mb-1">Your account is pending subscription activation.</p>
                <p className="text-slate-500 text-sm mt-1">
                  Please contact your administrator or reseller to get your plan assigned and activate your account.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="primary"
              icon={refreshing ? <Spin size="small" /> : <ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              size="large"
              block
            >
              Refresh Status
            </Button>
            <Text type="secondary" className="text-xs">
              Already activated? Click &quot;Refresh Status&quot; to check again.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button, Typography, Spin } from 'antd';
import {
  ClockCircleOutlined,
  WarningOutlined,
  LogoutOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useResellerStore } from '@/stores/resellerStore';
import { resellerClient } from '@/lib/api/reseller-client';

const { Title, Text } = Typography;

export default function ResellerActivatePage() {
  const router = useRouter();
  const { reseller, isAuthenticated, logout, updateReseller } = useResellerStore();
  const [refreshing, setRefreshing] = useState(false);

  if (!isAuthenticated) {
    router.replace('/reseller/login');
    return null;
  }

  const status = reseller?.subscriptionStatus ?? 'none';
  const isExpired = status === 'expired';

  const handleLogout = () => {
    logout();
    router.replace('/reseller/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await resellerClient.get('/resellers/me/status');
      const data = res.data?.data;
      if (data?.subscriptionStatus === 'active') {
        updateReseller({
          subscriptionStatus: 'active',
          expiryDate: data.expiryDate ?? null,
          planId: data.planId,
        });
        router.replace('/reseller/dashboard');
      } else {
        updateReseller({
          subscriptionStatus: data?.subscriptionStatus ?? status,
          expiryDate: data?.expiryDate ?? reseller?.expiryDate,
          planId: data?.planId ?? reseller?.planId,
        });
      }
    } catch {
      // silently ignore
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="VAB" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">VAB Informatics</div>
            <div className="text-gray-400 text-xs">Reseller Portal</div>
          </div>
        </div>
        <Button icon={<LogoutOutlined />} onClick={handleLogout} type="text" className="text-slate-600">
          Logout
        </Button>
      </header>

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
            Welcome, <strong>{reseller?.name}</strong>
          </Text>

          <div className="mt-6 mb-8 p-4 bg-slate-50 rounded-xl text-left">
            {isExpired ? (
              <>
                <p className="text-slate-700 text-sm font-medium mb-1">Your reseller subscription has expired.</p>
                {reseller?.expiryDate && (
                  <p className="text-slate-500 text-sm">
                    Expired on: <strong>{new Date(reseller.expiryDate).toLocaleDateString('en-IN')}</strong>
                  </p>
                )}
                <p className="text-slate-500 text-sm mt-2">
                  Please contact your administrator to renew your reseller subscription, or use your wallet to subscribe to a new plan.
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-700 text-sm font-medium mb-1">Your reseller account is pending subscription activation.</p>
                <p className="text-slate-500 text-sm mt-1">
                  Please contact your administrator to get a plan assigned, or top up your wallet to subscribe to a plan yourself.
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

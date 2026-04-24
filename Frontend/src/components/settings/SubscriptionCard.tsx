'use client';

import { Card, Tag, Descriptions, Spin, Button } from 'antd';
import { CheckCircleOutlined, WarningOutlined, StopOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getEnterpriseStatus } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';

export function SubscriptionCard() {
  const router = useRouter();
  const { userType, user } = useAuthStore();

  // Only enterprise users have a subscription to show.
  const { data: statusRes, isLoading } = useQuery({
    queryKey: ['enterprise-status'],
    queryFn: getEnterpriseStatus,
    enabled: userType === 'enterprise',
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (userType !== 'enterprise') return null;

  const live = statusRes?.data;
  // Fall back to cached user data while the live fetch is in flight.
  const cached = user as { plan_id?: number | null; expiry_date?: string | null; subscription_status?: string } | null;

  const status = (live?.subscriptionStatus ?? cached?.subscription_status ?? 'none') as 'active' | 'expired' | 'none';
  const expiryDate = live?.expiryDate ?? cached?.expiry_date ?? null;
  const planId = live?.planId ?? cached?.plan_id ?? null;

  const statusMeta: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active:  { color: 'success', icon: <CheckCircleOutlined />, label: 'Active' },
    expired: { color: 'error',   icon: <StopOutlined />,        label: 'Expired' },
    none:    { color: 'default', icon: <WarningOutlined />,     label: 'No subscription' },
  };
  const meta = statusMeta[status] ?? statusMeta.none;

  const daysTag = (() => {
    if (!expiryDate) return null;
    const days = dayjs(expiryDate).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (days < 0) {
      return <Tag color="error">Expired {Math.abs(days)} day(s) ago</Tag>;
    }
    if (days === 0) {
      return <Tag color="warning">Expires today</Tag>;
    }
    if (days <= 7) {
      return <Tag color="warning">Expires in {days} day(s)</Tag>;
    }
    if (days <= 30) {
      return <Tag color="processing">Expires in {days} day(s)</Tag>;
    }
    return <Tag color="success">Expires in {days} day(s)</Tag>;
  })();

  return (
    <Card
      title="Subscription"
      className="card-shadow mb-6"
      extra={
        status !== 'active' && (
          <Button type="primary" onClick={() => router.push('/activate')}>
            {status === 'expired' ? 'Renew Plan' : 'Activate Plan'}
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-6"><Spin /></div>
      ) : (
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Status">
            <Tag color={meta.color} icon={meta.icon}>{meta.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Plan">
            {planId != null ? <span>Plan #{planId}</span> : <span className="text-gray-400">None</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Expiry Date">
            {expiryDate ? (
              <span>
                <CalendarOutlined className="mr-1" />
                {dayjs(expiryDate).format('DD MMM YYYY')}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Remaining">
            {daysTag || <span className="text-gray-400">—</span>}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}

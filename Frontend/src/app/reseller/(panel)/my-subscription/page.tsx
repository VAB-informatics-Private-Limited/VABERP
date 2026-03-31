'use client';

import { useState } from 'react';
import { Card, Row, Col, Tag, Typography, Spin, Button, Modal, message, Divider } from 'antd';
import {
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WalletOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyCurrentSubscription,
  getMySubscriptionPlans,
  getMyWallet,
  subscribeToPlan,
} from '@/lib/api/reseller-client';
import { useResellerStore } from '@/stores/resellerStore';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  commissionPercentage: number;
  maxTenants: number | null;
  features: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function DaysLeft({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-slate-400">—</span>;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (expiry < now) return <span className="text-red-600 font-medium">{expiry.toLocaleDateString('en-IN')} (Expired)</span>;
  if (daysLeft <= 30) return <span className="text-orange-500 font-medium">{expiry.toLocaleDateString('en-IN')} ({daysLeft}d left)</span>;
  return <span className="text-green-600">{expiry.toLocaleDateString('en-IN')} ({daysLeft}d left)</span>;
}

export default function MySubscriptionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateReseller } = useResellerStore();
  const [subscribing, setSubscribing] = useState<number | null>(null);

  const { data: subData, isLoading: subLoading } = useQuery({ queryKey: ['my-subscription'], queryFn: getMyCurrentSubscription });
  const { data: plansData, isLoading: plansLoading } = useQuery({ queryKey: ['my-subscription-plans'], queryFn: getMySubscriptionPlans });
  const { data: walletData } = useQuery({ queryKey: ['my-wallet'], queryFn: getMyWallet });

  const currentSub = subData?.data;
  const plans: Plan[] = plansData?.data ?? [];
  const walletBalance: number = walletData?.data?.balance ?? 0;

  if (subLoading || plansLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const handleSubscribe = (plan: Plan) => {
    if (walletBalance < plan.price) {
      message.error(`Insufficient wallet balance. Need ${formatCurrency(plan.price)}, have ${formatCurrency(walletBalance)}`);
      return;
    }
    Modal.confirm({
      title: `Subscribe to ${plan.name}?`,
      content: (
        <div className="mt-2">
          <p>Cost: <strong>{formatCurrency(plan.price)}</strong> will be deducted from your wallet</p>
          <p className="text-slate-500 text-sm mt-1">Wallet balance after: {formatCurrency(walletBalance - plan.price)}</p>
          <p className="text-slate-500 text-sm">Duration: {plan.durationDays} days</p>
          <p className="text-slate-500 text-sm">Commission: <strong className="text-indigo-600">{plan.commissionPercentage}%</strong> on tenant sales</p>
        </div>
      ),
      okText: 'Confirm Subscribe',
      okType: 'primary',
      onOk: async () => {
        setSubscribing(plan.id);
        try {
          const res = await subscribeToPlan(plan.id);
          message.success(`Subscribed to ${plan.name} successfully!`);
          updateReseller({
            subscriptionStatus: 'active',
            expiryDate: res.data?.expiryDate ?? null,
            planId: plan.id,
          });
          queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
          queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
          router.replace('/reseller/dashboard');
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Failed to subscribe');
        } finally {
          setSubscribing(null);
        }
      },
    });
  };

  const parseFeatures = (features: string | null): string[] => {
    if (!features) return [];
    try { return JSON.parse(features); } catch { return [features]; }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CrownOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">My Subscription</Title>
      </div>

      {/* Current subscription */}
      <Card className="mb-6" title="Current Subscription">
        {currentSub?.planId ? (
          <Row gutter={[24, 12]}>
            <Col xs={24} sm={6}>
              <div className="text-slate-500 text-xs mb-1">Plan</div>
              <div className="font-semibold">{currentSub.planName ?? `Plan #${currentSub.planId}`}</div>
            </Col>
            <Col xs={24} sm={6}>
              <div className="text-slate-500 text-xs mb-1">Status</div>
              {currentSub.subscriptionStatus === 'active' ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
              ) : (
                <Tag color="red" icon={<CloseCircleOutlined />}>Expired</Tag>
              )}
            </Col>
            <Col xs={24} sm={6}>
              <div className="text-slate-500 text-xs mb-1">Expiry</div>
              <DaysLeft expiryDate={currentSub.expiryDate} />
            </Col>
            <Col xs={24} sm={6}>
              <div className="text-slate-500 text-xs mb-1">Commission Rate</div>
              <span className="font-bold text-indigo-600 text-base">
                {(currentSub as any).commissionPercentage > 0
                  ? `${(currentSub as any).commissionPercentage}%`
                  : '—'}
              </span>
            </Col>
          </Row>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <CrownOutlined className="text-3xl mb-2 text-slate-300" />
            <p>No active subscription. Subscribe below to get started.</p>
          </div>
        )}
      </Card>

      {/* Wallet balance indicator */}
      <div className="flex items-center gap-2 mb-4">
        <WalletOutlined className="text-green-600" />
        <Text className="text-sm">
          Your wallet balance: <strong className="text-green-600">{formatCurrency(walletBalance)}</strong>
        </Text>
      </div>

      <Divider orientation="left">Available Plans</Divider>

      {plans.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-slate-500">No plans available. Contact your administrator.</div>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {plans.map((plan) => {
            const features = parseFeatures(plan.features);
            const canAfford = walletBalance >= plan.price;
            return (
              <Col xs={24} sm={12} lg={8} key={plan.id}>
                <Card
                  className="h-full"
                  actions={[
                    <Button
                      key="subscribe"
                      type="primary"
                      disabled={!canAfford}
                      loading={subscribing === plan.id}
                      onClick={() => handleSubscribe(plan)}
                      icon={<ThunderboltOutlined />}
                      block
                    >
                      {canAfford ? 'Subscribe' : 'Insufficient Balance'}
                    </Button>,
                  ]}
                >
                  <div className="mb-3">
                    <Tag color="blue">{plan.durationDays} days</Tag>
                    {plan.maxTenants && <Tag color="purple">Up to {plan.maxTenants} tenants</Tag>}
                  </div>
                  <Title level={4} className="!mb-1">{plan.name}</Title>
                  {plan.description && <p className="text-slate-500 text-sm mb-3">{plan.description}</p>}

                  <div className="mb-3">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(plan.price)}</div>
                  </div>

                  {plan.commissionPercentage > 0 && (
                    <div className="bg-indigo-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                      <span className="text-indigo-600 font-bold text-lg">{plan.commissionPercentage}%</span>
                      <span className="text-indigo-500 text-sm">commission on tenant sales</span>
                    </div>
                  )}

                  {features.length > 0 && (
                    <ul className="text-sm text-slate-600 space-y-1">
                      {features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <CheckCircleOutlined className="text-green-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                      {features.length > 4 && <li className="text-slate-400 text-xs">+{features.length - 4} more</li>}
                    </ul>
                  )}

                  {!canAfford && (
                    <p className="text-red-500 text-xs mt-2">
                      Need {formatCurrency(plan.price - walletBalance)} more in wallet
                    </p>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Modal, Select, message, Spin,
} from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getResellersSubscriptionsOverview,
  getResellerPlans,
  assignPlanToReseller,
} from '@/lib/api/super-admin';

const { Title } = Typography;

interface ResellerSub {
  id: number;
  name: string;
  email: string;
  companyName: string | null;
  status: string;
  planId: number | null;
  planName: string | null;
  durationDays: number | null;
  commissionPercentage: number;
  subscriptionStartDate: string | null;
  expiryDate: string | null;
  subscriptionStatus: 'active' | 'expired' | 'none';
}

interface ResellerPlan { id: number; name: string; durationDays: number; price: number; commissionPercentage: number; }

function subStatusColor(s: string) {
  if (s === 'active') return 'green';
  if (s === 'expired') return 'red';
  return 'default';
}

export default function ResellerSubscriptionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [assignTarget, setAssignTarget] = useState<ResellerSub | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reseller-subscriptions-overview'],
    queryFn: getResellersSubscriptionsOverview,
  });
  const { data: plansData } = useQuery({
    queryKey: ['reseller-plans'],
    queryFn: getResellerPlans,
  });

  const resellers: ResellerSub[] = data?.data ?? [];
  const plans: ResellerPlan[] = plansData?.data ?? [];

  async function handleAssign() {
    if (!assignTarget || !selectedPlanId) return;
    setAssigning(true);
    try {
      await assignPlanToReseller(assignTarget.id, selectedPlanId);
      message.success('Plan assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['reseller-subscriptions-overview'] });
      setAssignTarget(null);
      setSelectedPlanId(null);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to assign plan');
    } finally {
      setAssigning(false);
    }
  }

  const columns = [
    {
      title: 'Reseller',
      key: 'reseller',
      render: (_: any, r: ResellerSub) => (
        <div>
          <div
            className="font-medium text-blue-600 cursor-pointer hover:underline"
            onClick={() => router.push(`/superadmin/resellers/${r.id}`)}
          >
            {r.name}
          </div>
          {r.companyName && <div className="text-xs text-slate-500">{r.companyName}</div>}
          <div className="text-xs text-slate-400">{r.email}</div>
        </div>
      ),
    },
    {
      title: 'Account Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (_: any, r: ResellerSub) =>
        r.planName ? (
          <div>
            <div className="font-medium text-sm">{r.planName}</div>
            {r.durationDays && <div className="text-xs text-slate-400">{r.durationDays} days</div>}
          </div>
        ) : (
          <span className="text-slate-400 text-sm">No plan</span>
        ),
    },
    {
      title: 'Commission',
      dataIndex: 'commissionPercentage',
      key: 'commissionPercentage',
      render: (v: number) => v > 0
        ? <span className="font-semibold text-indigo-600">{v}%</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      title: 'Subscription',
      key: 'subStatus',
      render: (_: any, r: ResellerSub) => (
        <Tag color={subStatusColor(r.subscriptionStatus)}>
          {r.subscriptionStatus.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string | null) => {
        if (!d) return <span className="text-slate-400">—</span>;
        const expiry = new Date(d);
        const today = new Date();
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
        return (
          <div>
            <div className={expiry < today ? 'text-red-600 font-medium text-sm' : 'text-sm'}>
              {expiry.toLocaleDateString('en-IN')}
            </div>
            {expiry >= today && (
              <div className="text-xs text-slate-400">{daysLeft}d left</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ResellerSub) => (
        <Button
          size="small"
          icon={<CrownOutlined />}
          onClick={() => { setAssignTarget(r); setSelectedPlanId(r.planId); }}
        >
          {r.planId ? 'Change Plan' : 'Assign Plan'}
        </Button>
      ),
    },
  ];

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CrownOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Reseller Subscriptions</Title>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={resellers}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={`Assign Plan — ${assignTarget?.name}`}
        open={!!assignTarget}
        onCancel={() => { setAssignTarget(null); setSelectedPlanId(null); }}
        onOk={handleAssign}
        okText="Assign Plan"
        confirmLoading={assigning}
        okButtonProps={{ disabled: !selectedPlanId }}
      >
        <p className="text-sm text-slate-500 mb-3">
          Select a subscription plan to assign directly (no wallet deduction).
        </p>
        <Select
          className="w-full"
          placeholder="Select a plan"
          value={selectedPlanId}
          onChange={setSelectedPlanId}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} — ₹${Number(p.price).toLocaleString('en-IN')} (${p.durationDays}d, ${p.commissionPercentage}% commission)`,
          }))}
        />
      </Modal>
    </div>
  );
}

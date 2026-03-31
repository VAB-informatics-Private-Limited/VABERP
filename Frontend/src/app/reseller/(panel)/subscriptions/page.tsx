'use client';

import { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Spin, Tabs } from 'antd';
import {
  CreditCardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMySubscriptions } from '@/lib/api/reseller-client';

const { Title } = Typography;

interface Subscription {
  id: number;
  businessName: string;
  email: string;
  status: string;
  expiryDate: string | null;
  subscriptionStartDate: string | null;
  planId: number | null;
  planName: string | null;
  planPrice: number | null;
  subscriptionStatus: 'active' | 'expired' | 'none';
}

function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-400">—</span>;
  const expiry = new Date(date);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (expiry < now) return <span className="text-red-600 font-medium">{expiry.toLocaleDateString('en-IN')}</span>;
  if (daysLeft <= 30) return <span className="text-orange-500 font-medium">{expiry.toLocaleDateString('en-IN')} <span className="text-xs">({daysLeft}d left)</span></span>;
  return <span className="text-green-600">{expiry.toLocaleDateString('en-IN')}</span>;
}

function SubStatusBadge({ status }: { status: 'active' | 'expired' | 'none' }) {
  if (status === 'active') return <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>;
  if (status === 'expired') return <Tag color="red" icon={<CloseCircleOutlined />}>Expired</Tag>;
  return <Tag color="default" icon={<MinusCircleOutlined />}>No Plan</Tag>;
}

export default function ResellerSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading } = useQuery({ queryKey: ['reseller-subscriptions'], queryFn: getMySubscriptions });

  const allSubs: Subscription[] = data?.data ?? [];
  const summary = data?.summary ?? { total: 0, active: 0, expired: 0, none: 0 };

  const filtered = activeTab === 'all' ? allSubs
    : allSubs.filter((s) => s.subscriptionStatus === activeTab);

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const columns = [
    {
      title: 'Business',
      key: 'business',
      render: (_: unknown, r: Subscription) => (
        <div>
          <div className="font-medium">{r.businessName}</div>
          <div className="text-xs text-slate-500">{r.email}</div>
        </div>
      ),
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (_: unknown, r: Subscription) =>
        r.planName ? (
          <div>
            <div className="font-medium text-sm">{r.planName}</div>
            {r.planPrice != null && <div className="text-xs text-slate-500">₹{r.planPrice.toLocaleString('en-IN')}</div>}
          </div>
        ) : <span className="text-slate-400 text-sm">No plan</span>,
    },
    {
      title: 'Start Date',
      dataIndex: 'subscriptionStartDate',
      key: 'start',
      render: (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN') : '—',
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiry',
      render: (d: string | null) => <ExpiryCell date={d} />,
      sorter: (a: Subscription, b: Subscription) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      },
    },
    {
      title: 'Status',
      key: 'subscriptionStatus',
      render: (_: unknown, r: Subscription) => <SubStatusBadge status={r.subscriptionStatus} />,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCardOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Subscriptions</Title>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Tenants" value={summary.total} prefix={<TeamOutlined className="text-blue-500" />} valueStyle={{ color: '#2563eb' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Active" value={summary.active} prefix={<CheckCircleOutlined className="text-green-500" />} valueStyle={{ color: '#16a34a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Expired" value={summary.expired} prefix={<CloseCircleOutlined className="text-red-500" />} valueStyle={{ color: '#dc2626' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="No Plan" value={summary.none} prefix={<MinusCircleOutlined className="text-slate-400" />} valueStyle={{ color: '#64748b' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="mb-4"
          items={[
            { key: 'all', label: `All (${summary.total})` },
            { key: 'active', label: `Active (${summary.active})` },
            { key: 'expired', label: `Expired (${summary.expired})` },
            { key: 'none', label: `No Plan (${summary.none})` },
          ]}
        />
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
}

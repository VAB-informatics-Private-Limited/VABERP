'use client';

import { Card, Table, Tag, Typography, Spin } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getEnterprisePlansForReseller } from '@/lib/api/reseller-client';

const { Title, Text } = Typography;

interface EnterprisePlan {
  id: number;
  name: string;
  description: string | null;
  businessPrice: number;
  myPrice: number;
  durationDays: number;
  maxEmployees: number | null;
  features: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function ResellerPlansPage() {
  const { data, isLoading } = useQuery({ queryKey: ['enterprise-plans-reseller'], queryFn: getEnterprisePlansForReseller });
  const plans: EnterprisePlan[] = data?.data ?? [];

  const columns = [
    {
      title: 'Plan Name',
      dataIndex: 'name',
      key: 'name',
      render: (n: string) => <span className="font-semibold">{n}</span>,
    },
    {
      title: 'Duration',
      dataIndex: 'durationDays',
      key: 'durationDays',
      render: (d: number) => `${d} days`,
    },
    {
      title: 'Max Users',
      dataIndex: 'maxEmployees',
      key: 'maxEmployees',
      render: (v: number | null) => v ? v.toString() : '—',
    },
    {
      title: 'Business Price',
      dataIndex: 'businessPrice',
      key: 'businessPrice',
      render: (v: number, r: EnterprisePlan) =>
        r.myPrice < r.businessPrice ? (
          <span className="line-through text-slate-400">{formatCurrency(v)}</span>
        ) : (
          formatCurrency(v)
        ),
    },
    {
      title: 'Your Price',
      dataIndex: 'myPrice',
      key: 'myPrice',
      render: (v: number) => <span className="font-semibold text-green-600">{formatCurrency(v)}</span>,
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: any, r: EnterprisePlan) => {
        const margin = r.businessPrice - r.myPrice;
        return margin > 0 ? <Tag color="blue">{formatCurrency(margin)}</Tag> : <span className="text-slate-400 text-xs">No custom price</span>;
      },
    },
    {
      title: 'Features',
      dataIndex: 'features',
      key: 'features',
      render: (f: string | null) => f ? <span className="text-sm text-slate-600">{f}</span> : <span className="text-slate-400">—</span>,
    },
  ];

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <CrownOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Available Plans</Title>
      </div>
      <Text type="secondary" className="block mb-6">
        Enterprise subscription plans available to assign to your tenants. Contact your administrator to configure custom pricing.
      </Text>

      {plans.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-slate-500">
            No active plans available. Contact your administrator.
          </div>
        </Card>
      ) : (
        <Card>
          <Table columns={columns} dataSource={plans} rowKey="id" pagination={false} />
        </Card>
      )}
    </div>
  );
}

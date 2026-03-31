'use client';

import { Card, Table, Tag, Typography, Spin, Statistic } from 'antd';
import { WalletOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyWallet } from '@/lib/api/reseller-client';

const { Title, Text } = Typography;

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  createdDate: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

const referenceTypeLabels: Record<string, string> = {
  top_up: 'Top-up',
  own_subscription: 'Own Subscription',
  tenant_plan: 'Tenant Plan',
};

export default function ResellerWalletPage() {
  const { data, isLoading } = useQuery({ queryKey: ['my-wallet'], queryFn: getMyWallet });

  const balance: number = data?.data?.balance ?? 0;
  const transactions: Transaction[] = data?.data?.transactions ?? [];

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
      defaultSortOrder: 'descend' as const,
      sorter: (a: Transaction, b: Transaction) =>
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => (
        <Tag
          color={t === 'credit' ? 'green' : 'red'}
          icon={t === 'credit' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        >
          {t === 'credit' ? 'Credit' : 'Debit'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number, row: Transaction) => (
        <span className={`font-semibold ${row.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Balance After',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (v: number) => <span className="text-slate-600">{formatCurrency(v)}</span>,
    },
    {
      title: 'Reference',
      dataIndex: 'referenceType',
      key: 'referenceType',
      render: (r: string | null) => (
        <span className="text-sm text-slate-500">{r ? (referenceTypeLabels[r] ?? r) : '—'}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (d: string | null) => <span className="text-sm text-slate-600">{d ?? '—'}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <WalletOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Wallet</Title>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-6">
          <Statistic
            title="Current Balance"
            value={balance}
            formatter={(v) => formatCurrency(Number(v))}
            valueStyle={{ color: '#16a34a', fontSize: 28 }}
            prefix={<WalletOutlined />}
          />
        </div>
        <p className="text-slate-500 text-sm mt-3">
          Contact your administrator to add funds to your wallet. Your wallet balance is used to subscribe to plans and assign plans to your tenants.
        </p>
      </Card>

      <Card title="Transaction History">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No transactions yet.</div>
        ) : (
          <Table
            columns={columns}
            dataSource={transactions}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        )}
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Modal, InputNumber, Input, message, Spin, Statistic, Row, Col,
} from 'antd';
import { WalletOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getResellersWalletsOverview, creditResellerWallet } from '@/lib/api/super-admin';

const { Title } = Typography;

interface ResellerWallet {
  id: number;
  name: string;
  email: string;
  companyName: string | null;
  status: string;
  balance: number;
  lastUpdated: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function ResellerWalletsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creditTarget, setCreditTarget] = useState<ResellerWallet | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [crediting, setCrediting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reseller-wallets-overview'],
    queryFn: getResellersWalletsOverview,
  });

  const resellers: ResellerWallet[] = data?.data ?? [];
  const totalBalance = resellers.reduce((sum, r) => sum + r.balance, 0);

  async function handleCredit() {
    if (!creditTarget || !amount || amount <= 0) return;
    setCrediting(true);
    try {
      await creditResellerWallet(creditTarget.id, { amount, description: description || undefined });
      message.success(`₹${amount.toLocaleString('en-IN')} credited to ${creditTarget.name}`);
      queryClient.invalidateQueries({ queryKey: ['reseller-wallets-overview'] });
      setCreditTarget(null);
      setAmount(null);
      setDescription('');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to credit wallet');
    } finally {
      setCrediting(false);
    }
  }

  const columns = [
    {
      title: 'Reseller',
      key: 'reseller',
      render: (_: any, r: ResellerWallet) => (
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Wallet Balance',
      dataIndex: 'balance',
      key: 'balance',
      sorter: (a: ResellerWallet, b: ResellerWallet) => a.balance - b.balance,
      defaultSortOrder: 'descend' as const,
      render: (v: number) => (
        <span className={`font-semibold ${v > 0 ? 'text-green-600' : 'text-slate-400'}`}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (d: string | null) =>
        d ? new Date(d).toLocaleDateString('en-IN') : <span className="text-slate-400">Never</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ResellerWallet) => (
        <Button
          size="small"
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={() => { setCreditTarget(r); setAmount(null); setDescription(''); }}
        >
          Credit
        </Button>
      ),
    },
  ];

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <WalletOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Reseller Wallets</Title>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Resellers"
              value={resellers.length}
              valueStyle={{ color: '#475569' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Wallet Balance"
              value={totalBalance}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<WalletOutlined className="text-green-500" />}
              valueStyle={{ color: '#16a34a', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="With Balance"
              value={resellers.filter((r) => r.balance > 0).length}
              valueStyle={{ color: '#4f46e5' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Zero Balance"
              value={resellers.filter((r) => r.balance === 0).length}
              valueStyle={{ color: '#d97706' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={resellers}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={`Credit Wallet — ${creditTarget?.name}`}
        open={!!creditTarget}
        onCancel={() => setCreditTarget(null)}
        onOk={handleCredit}
        okText="Credit Wallet"
        confirmLoading={crediting}
        okButtonProps={{ disabled: !amount || amount <= 0 }}
      >
        {creditTarget && (
          <div className="space-y-4 mt-2">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              Current balance:{' '}
              <span className="font-semibold text-green-600">{formatCurrency(creditTarget.balance)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹)</label>
              <InputNumber
                className="w-full"
                min={1}
                placeholder="Enter amount"
                value={amount}
                onChange={(v) => setAmount(v)}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Input
                placeholder="e.g. Top-up for April"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

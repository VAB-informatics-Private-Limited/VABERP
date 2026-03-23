'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, Table, Tag, Select, Typography, Row, Col, Statistic } from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getPlatformAccounts } from '@/lib/api/super-admin';

const { Title } = Typography;
const { Option } = Select;

const MonthlyAccountsChart = dynamic(
  () => import('./AccountsCharts').then((m) => m.MonthlyAccountsChart),
  { ssr: false }
);

interface TopEnterprise {
  id: number;
  businessName: string;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
}

interface RecentPayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  enterpriseName: string;
  customerName: string;
}

interface MonthlyPoint {
  month: string;
  revenue: number;
  cost: number;
}

interface PlatformTotals {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface AccountsData {
  topEnterprisesByRevenue: TopEnterprise[];
  platformTotals: PlatformTotals;
  monthlyRevenue: MonthlyPoint[];
  recentPayments: RecentPayment[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AccountsPage() {
  const [data, setData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPlatformAccounts(period);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topEnterpriseColumns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_: unknown, __: TopEnterprise, index: number) => (
        <span className="font-semibold text-slate-500">{index + 1}</span>
      ),
    },
    {
      title: 'Enterprise',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (v: number) => <span className="text-blue-600">{formatCurrency(v)}</span>,
    },
    {
      title: 'Costs',
      dataIndex: 'totalCosts',
      key: 'totalCosts',
      render: (v: number) => <span className="text-orange-500">{formatCurrency(v)}</span>,
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      key: 'profit',
      render: (v: number) => (
        <span className={v >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(v)}</span>
      ),
    },
    {
      title: 'Margin %',
      key: 'margin',
      render: (_: unknown, record: TopEnterprise) => {
        const margin = record.totalRevenue > 0
          ? ((record.profit / record.totalRevenue) * 100).toFixed(1)
          : '0.0';
        const isPositive = parseFloat(margin) >= 0;
        return (
          <Tag color={isPositive ? 'green' : 'red'}>{margin}%</Tag>
        );
      },
    },
  ];

  const recentPaymentColumns = [
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <span className="font-medium text-green-600">{formatCurrency(v)}</span>,
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (v: string) => <Tag>{v || '—'}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Enterprise',
      dataIndex: 'enterpriseName',
      key: 'enterpriseName',
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (v: string) => v || '—',
    },
  ];

  const totals = data?.platformTotals;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={4} className="!mb-0">
            Platform Accounts
          </Title>
          <p className="text-slate-500 text-sm mt-1">Financial overview across all enterprises</p>
        </div>
        <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
          <Option value="30d">Last 30 days</Option>
          <Option value="90d">Last 90 days</Option>
          <Option value="1y">Last 1 year</Option>
        </Select>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={8} md={4} xs={12}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={totals?.totalRevenue ?? 0}
              prefix={<DollarOutlined className="text-blue-500" />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#3b82f6', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8} md={4} xs={12}>
          <Card>
            <Statistic
              title="Total Costs"
              value={totals?.totalCosts ?? 0}
              prefix={<FallOutlined className="text-orange-500" />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#f97316', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8} md={4} xs={12}>
          <Card>
            <Statistic
              title="Net Profit"
              value={totals?.totalProfit ?? 0}
              prefix={<RiseOutlined className="text-green-500" />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: (totals?.totalProfit ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8} md={4} xs={12}>
          <Card>
            <Statistic
              title="Total Collected"
              value={totals?.totalCollected ?? 0}
              prefix={<CheckCircleOutlined className="text-green-600" />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#16a34a', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8} md={4} xs={12}>
          <Card>
            <Statistic
              title="Outstanding"
              value={totals?.totalOutstanding ?? 0}
              prefix={<ClockCircleOutlined className="text-yellow-500" />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#eab308', fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Monthly Revenue vs Costs (Last 12 Months)" className="mb-6">
        {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
          <MonthlyAccountsChart data={data.monthlyRevenue} />
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-400">
            No data available
          </div>
        )}
      </Card>

      <Row gutter={16}>
        <Col span={24} lg={14}>
          <Card title="Top Enterprises by Revenue" className="mb-6">
            <Table
              columns={topEnterpriseColumns}
              dataSource={data?.topEnterprisesByRevenue ?? []}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={24} lg={10}>
          <Card title="Recent Payments" className="mb-6">
            <Table
              columns={recentPaymentColumns}
              dataSource={data?.recentPayments ?? []}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={false}
              scroll={{ y: 380 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

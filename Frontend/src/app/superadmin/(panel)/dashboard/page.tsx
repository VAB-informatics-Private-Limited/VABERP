'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, Row, Col, Table, Tag, Statistic, Typography, Spin } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  DollarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { getAnalytics } from '@/lib/api/super-admin';

const { Title, Text } = Typography;

const MonthlyRevenueChart = dynamic(
  () => import('./DashboardCharts').then((m) => m.MonthlyRevenueChart),
  { ssr: false }
);
const MonthlySignupsChart = dynamic(
  () => import('./DashboardCharts').then((m) => m.MonthlySignupsChart),
  { ssr: false }
);
const StatusPieChart = dynamic(
  () => import('./DashboardCharts').then((m) => m.StatusPieChart),
  { ssr: false }
);

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
}

const activityTypeColors: Record<string, string> = {
  Invoice: 'blue',
  'Purchase Order': 'orange',
  'Sales Order': 'green',
};

const statusColors: Record<string, string> = {
  paid: 'green',
  fully_paid: 'green',
  unpaid: 'red',
  partial: 'orange',
  approved: 'green',
  draft: 'default',
  pending: 'orange',
  cancelled: 'red',
  confirmed: 'blue',
  delivered: 'green',
  active: 'green',
};

interface Analytics {
  kpis: {
    totalEnterprises: number;
    activeEnterprises: number;
    totalEmployees: number;
    totalInvoices: number;
    totalPurchaseOrders: number;
    totalSalesOrders: number;
    platformRevenue: number;
  };
  monthlySignups: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  enterpriseStatusBreakdown: { status: string; count: number }[];
  recentActivity: {
    type: string;
    refNumber: string;
    amount: number;
    status: string;
    date: string;
    enterpriseId: number;
    businessName: string;
  }[];
  topEnterprises: {
    enterpriseId: number;
    businessName: string;
    invoiceCount: number;
    poCount: number;
    soCount: number;
    totalRevenue: number;
  }[];
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;

  const activityColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (t: string) => <Tag color={activityTypeColors[t] ?? 'default'}>{t}</Tag>,
    },
    {
      title: 'Reference',
      dataIndex: 'refNumber',
      key: 'refNumber',
      render: (v: string) => <span className="font-mono text-sm">{v || '—'}</span>,
    },
    {
      title: 'Enterprise',
      dataIndex: 'businessName',
      key: 'businessName',
      ellipsis: true,
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <span className="text-blue-600 font-medium">{formatCurrency(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={statusColors[s] ?? 'default'}>{s?.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
    },
  ];

  const topEnterpriseColumns = [
    {
      title: 'Enterprise',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    {
      title: 'Invoices',
      dataIndex: 'invoiceCount',
      key: 'invoiceCount',
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'POs',
      dataIndex: 'poCount',
      key: 'poCount',
      render: (v: number) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: 'Sales Orders',
      dataIndex: 'soCount',
      key: 'soCount',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (v: number) => <span className="text-green-600 font-semibold">{formatCurrency(v)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-0">Analytics Dashboard</Title>
        <Text type="secondary" className="text-sm">Real-time platform overview across all enterprises</Text>
      </div>

      {/* KPI Cards */}
      <Row gutter={[12, 12]} className="mb-6">
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Enterprises"
              value={kpis?.totalEnterprises ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3b82f6', fontSize: 22 }}
            />
            <div className="text-xs text-green-600 mt-1">{kpis?.activeEnterprises ?? 0} active</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={kpis?.totalEmployees ?? 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#8b5cf6', fontSize: 22 }}
            />
            <div className="text-xs text-slate-400 mt-1">across all enterprises</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Platform Revenue"
              value={kpis?.platformRevenue ?? 0}
              prefix={<DollarOutlined />}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#22c55e', fontSize: 20 }}
            />
            <div className="text-xs text-slate-400 mt-1">all time (invoices)</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Active Enterprises"
              value={kpis?.activeEnterprises ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#10b981', fontSize: 22 }}
            />
            <div className="text-xs text-slate-400 mt-1">
              of {kpis?.totalEnterprises ?? 0} total
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Invoices"
              value={kpis?.totalInvoices ?? 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3b82f6', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Purchase Orders"
              value={kpis?.totalPurchaseOrders ?? 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#f97316', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Sales Orders"
              value={kpis?.totalSalesOrders ?? 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#22c55e', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={(kpis?.totalInvoices ?? 0) + (kpis?.totalPurchaseOrders ?? 0) + (kpis?.totalSalesOrders ?? 0)}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
            <div className="text-xs text-slate-400 mt-1">invoices + POs + SOs</div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Monthly Platform Revenue (Last 12 Months)">
            {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
              <MonthlyRevenueChart data={data.monthlyRevenue} />
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400">No revenue data yet</div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Enterprise Signups (Last 12 Months)">
            {data?.monthlySignups && data.monthlySignups.length > 0 ? (
              <MonthlySignupsChart data={data.monthlySignups} />
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400">No signup data yet</div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={8}>
          <Card title="Enterprise Status Breakdown" style={{ height: '100%' }}>
            {data?.enterpriseStatusBreakdown && data.enterpriseStatusBreakdown.length > 0 ? (
              <StatusPieChart data={data.enterpriseStatusBreakdown} />
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400">No data</div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Top Enterprises by Activity">
            <Table
              columns={topEnterpriseColumns}
              dataSource={data?.topEnterprises ?? []}
              rowKey="enterpriseId"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Activity Feed */}
      <Card title={`Recent Activity (Last 30 Days) — ${data?.recentActivity?.length ?? 0} transactions`}>
        <Table
          columns={activityColumns}
          dataSource={data?.recentActivity ?? []}
          rowKey={(r) => `${r.type}-${r.refNumber}-${r.date}`}
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 700 }}
        />
      </Card>
    </div>
  );
}

'use client';

import { Card, Row, Col, Statistic, Typography, Spin, Table, Tag } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyReport, getMyTenants } from '@/lib/api/reseller-client';

const { Title } = Typography;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

interface Tenant {
  id: number;
  businessName: string;
  email: string;
  status: string;
  expiryDate: string | null;
  subscriptionStartDate: string | null;
}

export default function ResellerReportsPage() {
  const { data: reportData, isLoading: reportLoading } = useQuery({ queryKey: ['my-report'], queryFn: getMyReport });
  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({ queryKey: ['my-tenants'], queryFn: getMyTenants });

  const report = reportData?.data;
  const tenants: Tenant[] = tenantsData?.data ?? [];

  if (reportLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const tenantColumns = [
    {
      title: 'Business',
      key: 'business',
      render: (_: any, r: Tenant) => (
        <div>
          <div className="font-medium">{r.businessName}</div>
          <div className="text-xs text-slate-500">{r.email}</div>
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
      title: 'Subscription Start',
      dataIndex: 'subscriptionStartDate',
      key: 'subscriptionStartDate',
      render: (d: string | null) => d ? new Date(d).toLocaleDateString() : '—',
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string | null) => {
        if (!d) return '—';
        const expiry = new Date(d);
        const expired = expiry < new Date();
        return <span className={expired ? 'text-red-600 font-medium' : 'text-green-600'}>{expiry.toLocaleDateString()}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChartOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Reports</Title>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Tenants"
              value={report?.totalTenants ?? 0}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Subscriptions"
              value={report?.activeSubscriptions ?? 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Expired Subscriptions"
              value={report?.expiredSubscriptions ?? 0}
              prefix={<CloseCircleOutlined className="text-red-500" />}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={report?.totalRevenue ?? 0}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<DollarOutlined className="text-indigo-500" />}
              valueStyle={{ color: '#4f46e5' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Tenant Breakdown">
        <Table
          columns={tenantColumns}
          dataSource={tenants}
          rowKey="id"
          loading={tenantsLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

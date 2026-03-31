'use client';

import { Card, Row, Col, Statistic, Table, Tag, Typography, Spin } from 'antd';
import {
  ThunderboltOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyUsage } from '@/lib/api/reseller-client';

const { Title } = Typography;

interface UsageRow {
  id: number;
  businessName: string;
  status: string;
  employeeCount: number;
  activeEmployees: number;
}

export default function ResellerUsagePage() {
  const { data, isLoading } = useQuery({ queryKey: ['reseller-usage'], queryFn: getMyUsage });

  const rows: UsageRow[] = data?.data ?? [];
  const summary = data?.summary ?? { totalTenants: 0, totalEmployees: 0, totalActiveEmployees: 0 };

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const columns = [
    {
      title: 'Business Name',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (name: string) => <span className="font-medium">{name}</span>,
      sorter: (a: UsageRow, b: UsageRow) => a.businessName.localeCompare(b.businessName),
    },
    {
      title: 'Enterprise Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'blocked' ? 'red' : 'orange'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Total Employees',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
      sorter: (a: UsageRow, b: UsageRow) => a.employeeCount - b.employeeCount,
      render: (v: number) => <span className="font-medium">{v}</span>,
    },
    {
      title: 'Active Employees',
      dataIndex: 'activeEmployees',
      key: 'activeEmployees',
      sorter: (a: UsageRow, b: UsageRow) => a.activeEmployees - b.activeEmployees,
      render: (v: number) => <span className="text-green-600 font-medium">{v}</span>,
    },
    {
      title: 'Inactive Employees',
      key: 'inactive',
      render: (_: unknown, r: UsageRow) => {
        const inactive = r.employeeCount - r.activeEmployees;
        return inactive > 0 ? <span className="text-slate-500">{inactive}</span> : <span className="text-slate-300">0</span>;
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ThunderboltOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Usage</Title>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Tenants"
              value={summary.totalTenants}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Employees"
              value={summary.totalEmployees}
              prefix={<UserOutlined className="text-indigo-500" />}
              valueStyle={{ color: '#4f46e5' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Employees"
              value={summary.totalActiveEmployees}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Per-Tenant Usage Breakdown">
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="id"
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
}

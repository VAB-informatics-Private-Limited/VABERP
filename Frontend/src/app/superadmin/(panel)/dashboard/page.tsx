'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Tag, Statistic, Typography } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getDashboard } from '@/lib/api/super-admin';

const { Title } = Typography;

interface DashboardData {
  total: number;
  active: number;
  blocked: number;
  expired: number;
  recentSignups: {
    id: number;
    businessName: string;
    email: string;
    status: string;
    expiryDate: string | null;
    createdDate: string;
  }[];
}

const statusColors: Record<string, string> = {
  active: 'green',
  blocked: 'red',
  pending: 'orange',
  inactive: 'default',
};

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Business Name', dataIndex: 'businessName', key: 'businessName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Joined',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Title level={4} className="!mb-6">
        Dashboard
      </Title>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Enterprises"
              value={data?.total ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="Active"
              value={data?.active ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="Blocked"
              value={data?.blocked ?? 0}
              prefix={<StopOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="Expired"
              value={data?.expired ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Sign-ups" loading={loading}>
        <Table
          columns={columns}
          dataSource={data?.recentSignups ?? []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

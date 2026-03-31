'use client';

import { Card, Row, Col, Statistic, Table, Typography, Spin } from 'antd';
import {
  DollarOutlined,
  TrophyOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyCommissions } from '@/lib/api/reseller-client';

const { Title, Text } = Typography;

interface CommissionRow {
  id: number;
  billedAmount: number;
  resellerPrice: number;
  commission: number;
  createdDate: string;
  businessName: string;
  planName: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export default function ResellerCommissionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['reseller-commissions'], queryFn: getMyCommissions });

  const rows: CommissionRow[] = data?.data ?? [];
  const summary = data?.summary ?? { totalCommission: 0, totalBilled: 0, transactionCount: 0 };

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const columns = [
    {
      title: 'Business',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Plan',
      dataIndex: 'planName',
      key: 'planName',
      render: (name: string) => <span className="text-sm">{name}</span>,
    },
    {
      title: 'Billed Amount',
      dataIndex: 'billedAmount',
      key: 'billedAmount',
      render: (v: number) => <span className="text-sm">{formatCurrency(v)}</span>,
      sorter: (a: CommissionRow, b: CommissionRow) => a.billedAmount - b.billedAmount,
    },
    {
      title: 'Your Price',
      dataIndex: 'resellerPrice',
      key: 'resellerPrice',
      render: (v: number) => <span className="text-slate-500 text-sm">{formatCurrency(v)}</span>,
    },
    {
      title: 'Commission',
      dataIndex: 'commission',
      key: 'commission',
      render: (v: number) => (
        <span className={`font-semibold ${v > 0 ? 'text-green-600' : 'text-slate-400'}`}>
          {formatCurrency(v)}
        </span>
      ),
      sorter: (a: CommissionRow, b: CommissionRow) => a.commission - b.commission,
    },
    {
      title: 'Date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
      sorter: (a: CommissionRow, b: CommissionRow) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <DollarOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Commissions</Title>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Commission Earned"
              value={summary.totalCommission}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<TrophyOutlined className="text-yellow-500" />}
              valueStyle={{ color: '#d97706', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Billed"
              value={summary.totalBilled}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<DollarOutlined className="text-indigo-500" />}
              valueStyle={{ color: '#4f46e5', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={summary.transactionCount}
              prefix={<BarChartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Commission Breakdown"
        extra={
          <Text type="secondary" className="text-xs">
            Commission = Billed Amount − Your Plan Price
          </Text>
        }
      >
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

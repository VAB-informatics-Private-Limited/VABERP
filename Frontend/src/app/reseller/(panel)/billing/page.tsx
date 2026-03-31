'use client';

import { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Spin, Select, DatePicker } from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMyBilling } from '@/lib/api/reseller-client';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface BillingRow {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  createdDate: string;
  businessName: string;
  email: string;
  planName: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export default function ResellerBillingPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['reseller-billing'], queryFn: getMyBilling });

  const allRows: BillingRow[] = data?.data ?? [];
  const summary = data?.summary ?? { totalBilled: 0, verifiedPayments: 0, pendingPayments: 0, totalTransactions: 0 };

  const rows = allRows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateRange) {
      const d = dayjs(r.createdDate);
      if (d.isBefore(dateRange[0].startOf('day')) || d.isAfter(dateRange[1].endOf('day'))) return false;
    }
    return true;
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  const columns = [
    {
      title: 'Business',
      key: 'business',
      render: (_: unknown, r: BillingRow) => (
        <div>
          <div className="font-medium">{r.businessName}</div>
          <div className="text-xs text-slate-500">{r.email}</div>
        </div>
      ),
    },
    {
      title: 'Plan',
      dataIndex: 'planName',
      key: 'planName',
      render: (name: string) => <span className="text-sm">{name}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <span className="font-medium">{formatCurrency(v)}</span>,
      sorter: (a: BillingRow, b: BillingRow) => a.amount - b.amount,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <span className="text-xs text-slate-600 capitalize">{method.replace(/_/g, ' ')}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'verified' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
      sorter: (a: BillingRow, b: BillingRow) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileTextOutlined className="text-2xl text-slate-600" />
        <Title level={3} className="!mb-0">Billing</Title>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
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
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Verified"
              value={summary.verifiedPayments}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pending"
              value={summary.pendingPayments}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: '#d97706' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={summary.totalTransactions}
              valueStyle={{ color: '#475569' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Payment History"
        extra={
          <div className="flex items-center gap-2">
            <RangePicker
              size="small"
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Select
              size="small"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 130 }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>
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

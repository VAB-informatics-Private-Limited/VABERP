'use client';

import { useState } from 'react';
import { Typography, Card, Table, Tag, Button, Input, Space, DatePicker } from 'antd';
import { SearchOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getAllPayments } from '@/lib/api/invoices';
import { PAYMENT_METHOD_OPTIONS } from '@/types/invoice';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const fmt = (v: number | string) =>
  Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['all-payments', page, pageSize, search, dateRange],
    queryFn: () =>
      getAllPayments({
        page,
        pageSize,
        search: search || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
  });

  const handleClear = () => {
    setSearch('');
    setDateRange(null);
    setPage(1);
  };

  const getMethodLabel = (v: string) =>
    PAYMENT_METHOD_OPTIONS.find((m) => m.value === v)?.label || v?.replace('_', ' ').toUpperCase();

  const columns = [
    {
      title: 'Payment #',
      dataIndex: 'payment_number',
      key: 'payment_number',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text: string, record: any) => (
        <Button
          type="link"
          className="p-0 font-medium"
          onClick={() => router.push(`/invoices/${record.invoice_id}`)}
        >
          {text || '-'}
        </Button>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Payment Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (v: number) => (
        <span className="font-semibold text-green-700">₹{fmt(v)}</span>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (v: string) => getMethodLabel(v),
    },
    {
      title: 'Reference',
      dataIndex: 'reference_number',
      key: 'reference_number',
      render: (v: string) => v || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'cancelled' ? 'red' : 'orange'}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/invoices/${record.invoice_id}`)}
        />
      ),
    },
  ];

  // Compute total from current page
  const pageTotal = (data?.data || []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Payments Received</Title>
        <ExportDropdown
          data={data?.data || []}
          disabled={!data?.data?.length}
          filename="payments"
          title="Payments"
          columns={[
            { key: 'payment_number', title: 'Payment #' },
            { key: 'invoice_number', title: 'Invoice #' },
            { key: 'customer_name', title: 'Customer' },
            { key: 'payment_date', title: 'Date' },
            { key: 'amount', title: 'Amount' },
            { key: 'payment_method', title: 'Method' },
            { key: 'reference_number', title: 'Reference' },
            { key: 'status', title: 'Status' },
          ]}
        />
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search by payment #, invoice #, customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => { setDateRange(dates); setPage(1); }}
            format="DD-MM-YYYY"
          />
          <Button icon={<ClearOutlined />} onClick={handleClear}>Clear</Button>
        </Space>
      </div>

      {data?.data && data.data.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-4">
          <span className="text-gray-600 text-sm">Page Total Received:</span>
          <span className="text-green-700 font-bold text-lg">₹{fmt(pageTotal)}</span>
          <span className="text-gray-400 text-sm ml-4">
            ({data.totalRecords} payment{data.totalRecords !== 1 ? 's' : ''} total)
          </span>
        </div>
      )}

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}

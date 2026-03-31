'use client';

import { Typography, Button, Card, Input, Select, Space, DatePicker, Table, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getInvoiceList } from '@/lib/api/invoices';
import { INVOICE_STATUS_OPTIONS } from '@/types/invoice';
import type { Invoice } from '@/types/invoice';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function InvoicesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, pageSize, search, status, dateRange],
    queryFn: () =>
      getInvoiceList({
        page,
        pageSize,
        search: search || undefined,
        status,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
  });

  const handleClear = () => {
    setSearch('');
    setStatus(undefined);
    setDateRange(null);
    setPage(1);
  };

  const getStatusColor = (s: string) => {
    const opt = INVOICE_STATUS_OPTIONS.find((o) => o.value === s);
    return opt?.color || 'default';
  };
  const getStatusLabel = (s: string) => {
    const opt = INVOICE_STATUS_OPTIONS.find((o) => o.value === s);
    return opt?.label || s;
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      sorter: (a, b) => a.invoice_number.localeCompare(b.invoice_number),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => a.customer_name.localeCompare(b.customer_name),
    },
    {
      title: 'Date',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      sorter: (a, b) => a.invoice_date.localeCompare(b.invoice_date),
    },
    {
      title: 'PO Total',
      key: 'po_total',
      sorter: (a: Invoice, b: Invoice) => (a.so_grand_total ?? a.grand_total) - (b.so_grand_total ?? b.grand_total),
      render: (_: any, record: Invoice) => {
        const val = record.so_grand_total ?? record.grand_total;
        return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
    },
    {
      title: 'Paid',
      dataIndex: 'total_paid',
      key: 'total_paid',
      render: (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
    },
    {
      title: 'PO Balance',
      key: 'po_balance',
      render: (_: any, record: Invoice) => {
        if (!record.sales_order_id || record.so_remaining_amount == null) {
          return <span className="text-gray-400">—</span>;
        }
        const rem = record.so_remaining_amount;
        return (
          <span className={rem > 0 ? 'text-orange-500 font-medium' : 'text-green-600'}>
            ₹{Number(rem).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => router.push(`/invoices/${record.id}`)} />
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Invoices</Title>
        <Space>
          <ExportDropdown
            data={data?.data || []}
            disabled={!data?.data?.length}
            filename="invoices"
            title="Invoices"
            columns={[{ key: 'invoice_number', title: 'Invoice #' }, { key: 'customer_name', title: 'Customer' }, { key: 'invoice_date', title: 'Date' }, { key: 'so_grand_total', title: 'PO Total' }, { key: 'total_paid', title: 'Paid' }, { key: 'status', title: 'Status' }]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/invoices/add')}>
            Create Invoice
          </Button>
        </Space>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 220 }}
            prefix={<SearchOutlined />}
            allowClear
            onPressEnter={() => setPage(1)}
          />
          <Select
            placeholder="Status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 160 }}
            allowClear
          >
            {INVOICE_STATUS_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => { setDateRange(dates); setPage(1); }}
            format="DD-MM-YYYY"
          />
          <Button icon={<ClearOutlined />} onClick={handleClear}>Clear</Button>
        </Space>
      </div>

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
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
          }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
}

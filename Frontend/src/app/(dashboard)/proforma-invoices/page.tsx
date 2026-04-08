'use client';

import { Typography, Button, Card, Input, Select, Space, Table, Tag } from 'antd';
import { SearchOutlined, ClearOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getProformaInvoices } from '@/lib/api/proforma-invoices';
import type { ProformaInvoice } from '@/types/proforma-invoice';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'converted', label: 'Converted' },
];

function statusTag(status: string) {
  const colors: Record<string, string> = {
    draft: 'default',
    sent: 'blue',
    converted: 'green',
  };
  return <Tag color={colors[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
}

export default function ProformaInvoicesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['proforma-invoices', page, pageSize, search, status],
    queryFn: () => getProformaInvoices({ page, limit: pageSize, search: search || undefined, status }),
  });

  const piList: ProformaInvoice[] = data?.data || [];
  const total = data?.totalRecords || 0;

  const columns: ColumnsType<ProformaInvoice> = [
    {
      title: 'PI Number',
      dataIndex: 'pi_number',
      key: 'pi_number',
      render: (val) => <span className="font-medium text-blue-600">{val}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Date',
      dataIndex: 'pi_date',
      key: 'pi_date',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Grand Total',
      dataIndex: 'grand_total',
      key: 'grand_total',
      align: 'right',
      render: (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val) => statusTag(val),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); router.push(`/proforma-invoices/${record.id}`); }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Title level={4} className="!mb-0">Proforma Invoices</Title>
      </div>

      <Card className="mb-4">
        <Space wrap>
          <Input
            placeholder="Search by PI number or customer..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(val) => { setStatus(val); setPage(1); }}
            allowClear
            style={{ width: 140 }}
          />
          {(search || status) && (
            <Button icon={<ClearOutlined />} onClick={() => { setSearch(''); setStatus(undefined); setPage(1); }}>
              Clear
            </Button>
          )}
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={piList}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} records`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          onRow={(record) => ({
            onClick: () => router.push(`/proforma-invoices/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}

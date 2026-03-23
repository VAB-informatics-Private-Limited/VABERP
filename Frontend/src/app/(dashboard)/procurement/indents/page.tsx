'use client';

import { useState } from 'react';
import { Table, Tag, Card, Button, Select, Space, Typography, Tabs } from 'antd';
import { EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getIndentList } from '@/lib/api/indents';
import { INDENT_STATUS_OPTIONS } from '@/types/indent';
import type { Indent } from '@/types/indent';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function IndentsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['indents', page, pageSize, statusFilter],
    queryFn: () => getIndentList({ page, pageSize, status: statusFilter }),
  });

  const columns = [
    {
      title: 'Indent #',
      dataIndex: 'indent_number',
      key: 'indent_number',
      render: (text: string) => (
        <span className="font-medium text-blue-600">
          <FileTextOutlined className="mr-1" />
          {text}
        </span>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => source === 'inventory'
        ? <Tag color="purple">Individual Order from Inventory</Tag>
        : <Tag color="blue">Material Request</Tag>,
    },
    {
      title: 'MR Number',
      dataIndex: 'material_request_number',
      key: 'mr_number',
      render: (text: string) => text || '-',
    },
    {
      title: 'Sales Order',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text: string) => text || '-',
    },
    {
      title: 'Date',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (text: string) => text ? dayjs(text).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Items',
      key: 'items_count',
      render: (_: unknown, record: Indent) => (
        <span>{record.items?.length || 0} items</span>
      ),
    },
    {
      title: 'Requested By',
      dataIndex: 'requested_by_name',
      key: 'requested_by',
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const opt = INDENT_STATUS_OPTIONS.find((o) => o.value === status);
        return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Indent) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/procurement/indents/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'All Indents' },
    { key: 'pending', label: 'Pending' },
    { key: 'partially_ordered', label: 'Partially Ordered' },
    { key: 'fully_ordered', label: 'Fully Ordered' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Indents</Title>
        <ExportDropdown
          data={data?.data || []}
          disabled={!data?.data?.length}
          filename="indents"
          title="Procurement Indents"
          columns={[{ key: 'indent_number', title: 'Indent #' }, { key: 'material_request_number', title: 'MR Number' }, { key: 'order_number', title: 'Sales Order' }, { key: 'request_date', title: 'Date' }, { key: 'requested_by_name', title: 'Requested By' }, { key: 'status', title: 'Status' }]}
        />
      </div>

      <Card>
        <Tabs
          items={tabItems}
          onChange={(key) => {
            setStatusFilter(key === 'all' ? undefined : key);
            setPage(1);
          }}
          className="mb-4"
        />

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
        />
      </Card>
    </div>
  );
}

'use client';

import { Typography, Button, Card, Input, Select, Space, Table, Tag, Popconfirm, message } from 'antd';
import dayjs from 'dayjs';
import { SearchOutlined, ClearOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSalesOrderList, deleteSalesOrder } from '@/lib/api/sales-orders';
import { SO_STATUS_OPTIONS } from '@/types/sales-order';
import type { SalesOrder } from '@/types/sales-order';
import type { ColumnsType } from 'antd/es/table';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function SalesOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', page, pageSize, search, status],
    queryFn: () => getSalesOrderList({ page, pageSize, search: search || undefined, status }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSalesOrder(id),
    onSuccess: () => { message.success('Sales order deleted'); queryClient.invalidateQueries({ queryKey: ['sales-orders'] }); },
    onError: (err: any) => { message.error(err?.response?.data?.message || 'Failed to delete'); },
  });

  const getStatusColor = (s: string) => SO_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => SO_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  const columns: ColumnsType<SalesOrder> = [
    { title: 'Order #', dataIndex: 'order_number', key: 'order_number', sorter: (a, b) => a.order_number.localeCompare(b.order_number) },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Date', dataIndex: 'order_date', key: 'order_date' },
    { title: 'ETA', dataIndex: 'expected_delivery', key: 'expected_delivery', render: (v) => {
      if (!v) return <Typography.Text type="secondary">Not set</Typography.Text>;
      const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
      return <Typography.Text type={isOverdue ? 'danger' : undefined}>{dayjs(v).format('DD MMM YYYY')}{isOverdue ? ' ⚠' : ''}</Typography.Text>;
    }},
    { title: 'Total', dataIndex: 'grand_total', key: 'grand_total', render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/sales-orders/${record.id}`); }} />
          <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Sales Orders</Title>
        <ExportDropdown
          data={data?.data || []}
          disabled={!data?.data?.length}
          filename="sales-orders"
          title="Sales Orders"
          columns={[{ key: 'order_number', title: 'Order #' }, { key: 'customer_name', title: 'Customer' }, { key: 'order_date', title: 'Date' }, { key: 'expected_delivery', title: 'Delivery' }, { key: 'grand_total', title: 'Total' }, { key: 'status', title: 'Status' }]}
        />
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 220 }} prefix={<SearchOutlined />} allowClear />
          <Select placeholder="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} style={{ width: 160 }} allowClear>
            {SO_STATUS_OPTIONS.map((s) => <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>)}
          </Select>
          <Button icon={<ClearOutlined />} onClick={() => { setSearch(''); setStatus(undefined); setPage(1); }}>Clear</Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => router.push(`/sales-orders/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page, pageSize, total: data?.totalRecords || 0,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}

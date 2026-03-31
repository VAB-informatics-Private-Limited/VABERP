'use client';

import { useState } from 'react';
import { Card, Table, Tag, Button, Select, Space, Typography, Badge } from 'antd';
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getGoodReceiptList } from '@/lib/api/goods-receipts';
import { GoodsReceipt, GRN_STATUS_OPTIONS } from '@/types/goods-receipt';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function GoodsReceiptsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['goods-receipts', statusFilter, page],
    queryFn: () => getGoodReceiptList({ status: statusFilter, page, limit: 20 }),
  });

  const getStatusTag = (status: string) => {
    const opt = GRN_STATUS_OPTIONS.find((o) => o.value === status);
    return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
  };

  const columns = [
    {
      title: 'GRN Number',
      dataIndex: 'grn_number',
      key: 'grn_number',
      render: (val: string) => <Text strong>{val}</Text>,
    },
    {
      title: 'Indent',
      dataIndex: 'indent_number',
      key: 'indent_number',
      render: (val?: string) => val || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => getStatusTag(val),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items?: GoodsReceipt['items']) => (
        <Space>
          <Badge count={items?.length || 0} color="blue" />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {items?.filter((i) => i.status === 'confirmed').length || 0} confirmed
          </Text>
        </Space>
      ),
    },
    {
      title: 'Released By',
      dataIndex: 'released_by_name',
      key: 'released_by_name',
      render: (val?: string) => val || '—',
    },
    {
      title: 'Received By',
      dataIndex: 'received_by_name',
      key: 'received_by_name',
      render: (val?: string) => val ? <Text type="success">{val}</Text> : <Text type="secondary">Not yet</Text>,
    },
    {
      title: 'Received Date',
      dataIndex: 'received_date',
      key: 'received_date',
      render: (val?: string) => val ? dayjs(val).format('DD-MM-YYYY') : '—',
    },
    {
      title: 'Created',
      dataIndex: 'created_date',
      key: 'created_date',
      render: (val: string) => dayjs(val).format('DD-MM-YYYY'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: GoodsReceipt) => (
        <Button
          type={record.status === 'pending' ? 'primary' : 'default'}
          icon={record.status === 'pending' ? <CheckCircleOutlined /> : <EyeOutlined />}
          size="small"
          onClick={() => router.push(`/inventory/goods-receipts/${record.id}`)}
        >
          {record.status === 'pending' ? 'Confirm Receipt' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={4} className="!mb-1">Goods Receipts (GRN)</Title>
          <Text type="secondary">
            Items released by procurement — confirm receipt to update inventory stock
          </Text>
        </div>
      </div>

      <Card className="card-shadow">
        <div className="flex gap-3 mb-4">
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            options={[
              { value: 'pending', label: 'Pending Confirmation' },
              { value: 'partially_confirmed', label: 'Partially Confirmed' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </div>

        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          onRow={(record: GoodsReceipt) => ({
            onClick: () => router.push(`/inventory/goods-receipts/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.totalRecords || 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          rowClassName={(record) => record.status === 'pending' ? 'bg-orange-50' : ''}
        />
      </Card>
    </div>
  );
}

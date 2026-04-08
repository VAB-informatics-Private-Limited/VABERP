'use client';

import { useState } from 'react';
import {
  Table, Tag, Card, Button, Typography, Space, Select, message, Popconfirm,
} from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getPurchaseOrderList, deletePurchaseOrder } from '@/lib/api/purchase-orders';
import { PO_STATUS_OPTIONS } from '@/types/purchase-order';
import type { PurchaseOrder } from '@/types/purchase-order';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';
import { usePermissions } from '@/stores/authStore';

const { Title } = Typography;

export default function ProcurementPurchaseOrdersPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-purchase-orders', page, statusFilter],
    queryFn: () => getPurchaseOrderList({ page, pageSize: 20, status: statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePurchaseOrder(id),
    onSuccess: () => {
      message.success('Purchase order deleted');
      queryClient.invalidateQueries({ queryKey: ['procurement-purchase-orders'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to delete'),
  });

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'po_number',
      key: 'po_number',
      render: (text: string, record: PurchaseOrder) => (
        <Button type="link" className="p-0 font-medium" onClick={(e) => { e.stopPropagation(); router.push(`/procurement/purchase-orders/${record.id}`); }}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '-',
    },
    {
      title: 'ETA',
      dataIndex: 'expected_delivery',
      key: 'expected_delivery',
      render: (v: string) => {
        if (!v) return <Typography.Text type="secondary">—</Typography.Text>;
        const d = dayjs(v);
        const isOverdue = d.isBefore(dayjs(), 'day');
        return (
          <Typography.Text type={isOverdue ? 'danger' : undefined}>
            {d.format('DD MMM YYYY')}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const opt = PO_STATUS_OPTIONS.find((o) => o.value === status);
        return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: 'Grand Total',
      dataIndex: 'grand_total',
      key: 'grand_total',
      align: 'right' as const,
      render: (v: number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: PurchaseOrder) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); router.push(`/procurement/purchase-orders/${record.id}`); }}
          />
          {hasPermission('orders', 'purchase_orders', 'delete') && record.status === 'draft' && (
            <Popconfirm title="Delete this purchase order?" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button type="link" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Purchase Orders</Title>
        <Space>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            options={PO_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
          <ExportDropdown
            data={data?.data || []}
            disabled={!data?.data?.length}
            filename="purchase-orders"
            title="Purchase Orders"
            columns={[
              { key: 'po_number', title: 'PO Number' },
              { key: 'supplier_name', title: 'Supplier' },
              { key: 'order_date', title: 'Order Date' },
              { key: 'expected_delivery', title: 'ETA' },
              { key: 'status', title: 'Status' },
              { key: 'grand_total', title: 'Grand Total' },
            ]}
          />
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => router.push(`/procurement/purchase-orders/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.totalRecords || 0,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>
    </div>
  );
}

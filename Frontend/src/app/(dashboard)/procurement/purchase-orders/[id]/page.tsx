'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Descriptions, Space, Alert, Modal, Badge,
  Form, Input, Spin, Divider, message,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, LinkOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getPurchaseOrderById, updatePOExpectedDelivery, receivePurchaseOrder } from '@/lib/api/purchase-orders';
import { PO_STATUS_OPTIONS } from '@/types/purchase-order';
import type { PurchaseOrderItem } from '@/types/purchase-order';
import dayjs from 'dayjs';
import { usePermissions } from '@/stores/authStore';

const { Title, Text } = Typography;

export default function ProcurementPODetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-po', id],
    queryFn: () => getPurchaseOrderById(id),
    enabled: !!id,
  });

  const etaMutation = useMutation({
    mutationFn: (expectedDelivery: string) => updatePOExpectedDelivery(id, expectedDelivery),
    onSuccess: () => {
      message.success('ETA updated');
      setEtaModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['procurement-po', id] });
      queryClient.invalidateQueries({ queryKey: ['procurement-purchase-orders'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update ETA'),
  });

  const receiveMutation = useMutation({
    mutationFn: () => receivePurchaseOrder(id),
    onSuccess: () => {
      message.success('Purchase order marked as received — stock updated');
      queryClient.invalidateQueries({ queryKey: ['procurement-po', id] });
      queryClient.invalidateQueries({ queryKey: ['procurement-purchase-orders'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to mark as received'),
  });

  if (isLoading) {
    return <div className="p-6 flex justify-center"><Spin size="large" /></div>;
  }

  const po = data?.data;

  if (!po) {
    return <div className="p-6"><Alert type="error" message="Purchase order not found" /></div>;
  }

  const statusOpt = PO_STATUS_OPTIONS.find((o) => o.value === po.status);

  const itemColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, idx: number) => idx + 1,
    },
    {
      title: 'Material / Item',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (val: number, record: PurchaseOrderItem) => `${val} ${record.unit_of_measure || ''}`.trim(),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right' as const,
      render: (val: number) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_percent',
      key: 'tax_percent',
      align: 'right' as const,
      render: (val: number) => `${val}%`,
    },
    {
      title: 'Line Total',
      dataIndex: 'line_total',
      key: 'line_total',
      align: 'right' as const,
      render: (val: number) => <Text strong>₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>,
    },
  ];

  const handleUpdateETA = async () => {
    const values = await form.validateFields();
    etaMutation.mutate(values.expectedDelivery);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/procurement/purchase-orders')}>
            Back
          </Button>
          <Title level={3} className="!mb-0">{po.po_number}</Title>
          <Tag color={statusOpt?.color || 'default'} style={{ fontSize: 14, padding: '2px 12px' }}>
            {statusOpt?.label || po.status}
          </Tag>
        </Space>
        <Space>
          {hasPermission('orders', 'purchase_orders', 'edit') && po.status !== 'received' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={receiveMutation.isPending}
              onClick={() => {
                Modal.confirm({
                  title: 'Mark as Received?',
                  content: 'Confirm that all goods from this purchase order have been received. This will update raw material stock.',
                  okText: 'Mark as Received',
                  onOk: () => receiveMutation.mutateAsync(),
                });
              }}
            >
              Mark as Received
            </Button>
          )}
          {hasPermission('orders', 'purchase_orders', 'edit') && (
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                form.setFieldsValue({
                  expectedDelivery: po.expected_delivery ? dayjs(po.expected_delivery).format('YYYY-MM-DD') : '',
                });
                setEtaModalOpen(true);
              }}
            >
              Update ETA
            </Button>
          )}
        </Space>
      </div>

      {/* PO Info */}
      <Card className="mb-6">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="PO Number">{po.po_number}</Descriptions.Item>
          <Descriptions.Item label="Order Date">
            {po.order_date ? dayjs(po.order_date).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusOpt?.color}>{statusOpt?.label || po.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">{po.supplier_name}</Descriptions.Item>
          <Descriptions.Item label="Contact">{po.supplier_contact || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{po.supplier_email || '-'}</Descriptions.Item>
          {po.supplier_address && (
            <Descriptions.Item label="Address" span={2}>{po.supplier_address}</Descriptions.Item>
          )}
          <Descriptions.Item label="ETA">
            {po.expected_delivery ? (
              <Text type={dayjs(po.expected_delivery).isBefore(dayjs(), 'day') ? 'danger' : undefined}>
                {dayjs(po.expected_delivery).format('DD MMM YYYY')}
              </Text>
            ) : (
              <Text type="secondary">Not set</Text>
            )}
          </Descriptions.Item>
          {po.indent_id && (
            <Descriptions.Item label="Indent">
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => router.push(`/procurement/indents/${po.indent_id}`)}
              >
                View Indent
              </Button>
            </Descriptions.Item>
          )}
          {po.notes && (
            <Descriptions.Item label="Notes" span={3}>{po.notes}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Items */}
      <Card title={`Items (${po.items?.length || 0})`} className="mb-6">
        <Table
          columns={itemColumns}
          dataSource={po.items || []}
          rowKey="id"
          pagination={false}
          size="small"
        />

        <Divider />

        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-1">
              <Text type="secondary">Subtotal</Text>
              <Text>₹{Number(po.sub_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </div>
            <div className="flex justify-between py-1">
              <Text type="secondary">Tax</Text>
              <Text>₹{Number(po.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </div>
            <Divider className="my-2" />
            <div className="flex justify-between py-1">
              <Text strong>Grand Total</Text>
              <Text strong style={{ fontSize: 16 }}>
                ₹{Number(po.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Update ETA Modal */}
      <Modal
        title="Update Expected Delivery Date"
        open={etaModalOpen}
        onCancel={() => { setEtaModalOpen(false); form.resetFields(); }}
        onOk={handleUpdateETA}
        confirmLoading={etaMutation.isPending}
        okText="Update ETA"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="expectedDelivery"
            label="Expected Delivery Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import { Typography, Card, Descriptions, Tag, Button, Space, Table, message, Spin, Row, Col, Popconfirm } from 'antd';
import { ArrowLeftOutlined, FileDoneOutlined, ToolOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalesOrderById, sendToManufacturing, createInvoiceFromSO } from '@/lib/api/sales-orders';
import { SO_STATUS_OPTIONS } from '@/types/sales-order';

const { Title } = Typography;

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const soId = Number(params.id);
  const queryClient = useQueryClient();

  const { data: soData, isLoading } = useQuery({
    queryKey: ['sales-order', soId],
    queryFn: () => getSalesOrderById(soId),
    enabled: !!soId,
  });

  const manufacturingMutation = useMutation({
    mutationFn: () => sendToManufacturing(soId),
    onSuccess: () => {
      message.success('Job cards created from sales order');
      queryClient.invalidateQueries({ queryKey: ['sales-order', soId] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const invoiceMutation = useMutation({
    mutationFn: () => createInvoiceFromSO(soId, { amount: Number(soData?.data?.grand_total || 0) }),
    onSuccess: (data: any) => {
      message.success('Invoice created from sales order');
      const invoiceId = data?.data?.id;
      if (invoiceId) router.push(`/invoices/${invoiceId}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const so = soData?.data;
  const getStatusColor = (s: string) => SO_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => SO_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  if (!so) return <div className="text-center py-8"><Title level={4}>Sales Order not found</Title><Button onClick={() => router.push('/sales-orders')}>Back</Button></div>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/sales-orders')}>Back</Button>
          <Title level={4} className="!mb-0">{so.order_number}</Title>
          <Tag color={getStatusColor(so.status)}>{getStatusLabel(so.status)}</Tag>
        </div>
        <Space>
          {so.status === 'confirmed' && (
            <Popconfirm title="Send to manufacturing?" onConfirm={() => manufacturingMutation.mutate()} okText="Yes">
              <Button icon={<ToolOutlined />} loading={manufacturingMutation.isPending}>Send to Manufacturing</Button>
            </Popconfirm>
          )}
          {so.status !== 'cancelled' && (
            <Popconfirm title="Create invoice from this order?" onConfirm={() => invoiceMutation.mutate()} okText="Yes">
              <Button type="primary" icon={<FileDoneOutlined />} loading={invoiceMutation.isPending}>Create Invoice</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Order Details" className="card-shadow mb-4">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Order Number">{so.order_number}</Descriptions.Item>
              <Descriptions.Item label="Order Date">{so.order_date}</Descriptions.Item>
              <Descriptions.Item label="Customer">{so.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Expected Delivery">{so.expected_delivery || '-'}</Descriptions.Item>
              {so.billing_address && <Descriptions.Item label="Billing Address" span={2}>{so.billing_address}</Descriptions.Item>}
              {so.shipping_address && <Descriptions.Item label="Shipping Address" span={2}>{so.shipping_address}</Descriptions.Item>}
            </Descriptions>
          </Card>

          <Card title="Line Items" className="card-shadow mb-4">
            <Table
              dataSource={so.items || []}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              columns={[
                { title: '#', key: 'idx', width: 50, render: (_, __, i) => i + 1 },
                { title: 'Item', dataIndex: 'item_name', key: 'item_name' },
                { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60 },
                { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', render: (v) => `₹${Number(v).toFixed(2)}` },
                { title: 'Tax %', dataIndex: 'tax_percent', key: 'tax_percent', render: (v) => `${v || 0}%` },
                { title: 'Total', dataIndex: 'line_total', key: 'line_total', render: (v) => `₹${Number(v).toFixed(2)}` },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Order Summary" className="card-shadow">
            <div className="space-y-3">
              <div className="flex justify-between"><span>Sub Total:</span><span>₹{Number(so.sub_total).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax:</span><span>₹{Number(so.tax_amount).toFixed(2)}</span></div>
              <hr />
              <div className="flex justify-between text-lg font-bold"><span>Grand Total:</span><span>₹{Number(so.grand_total).toFixed(2)}</span></div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

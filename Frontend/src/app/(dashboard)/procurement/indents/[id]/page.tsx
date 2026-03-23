'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Descriptions, Space, Alert, Modal,
  Form, InputNumber, Input, message, Spin, Progress, Divider, Popconfirm, Steps,
} from 'antd';
import {
  ArrowLeftOutlined, ShoppingCartOutlined, LinkOutlined,
  EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined,
  CheckCircleOutlined, InboxOutlined, SendOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  getIndentById, createPOFromIndent, updateIndentItem, removeIndentItem,
  cancelIndent, receiveIndentGoods, releaseIndentToInventory, releaseAllIndentItems,
} from '@/lib/api/indents';
import { INDENT_STATUS_OPTIONS } from '@/types/indent';
import type { IndentItem } from '@/types/indent';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function IndentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const [createPOModalOpen, setCreatePOModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [receiveItems, setReceiveItems] = useState<{ indentItemId: number; itemName: string; maxQty: number; receivedQuantity: number }[]>([]);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['indent', id],
    queryFn: () => getIndentById(id),
    enabled: !!id,
  });

  const indent = data?.data;

  const createPOMutation = useMutation({
    mutationFn: (values: any) => createPOFromIndent(id, values),
    onSuccess: () => {
      message.success('Purchase Order created successfully');
      setCreatePOModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to create PO');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: { shortageQuantity?: number; notes?: string } }) =>
      updateIndentItem(id, itemId, data),
    onSuccess: () => {
      message.success('Item updated');
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => removeIndentItem(id, itemId),
    onSuccess: () => {
      message.success('Item removed');
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to remove'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelIndent(id),
    onSuccess: () => {
      message.success('Indent cancelled');
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to cancel'),
  });

  const receiveGoodsMutation = useMutation({
    mutationFn: (items: { indentItemId: number; receivedQuantity: number }[]) =>
      receiveIndentGoods(id, items),
    onSuccess: () => {
      message.success('Goods received successfully! Raw material stock updated.');
      setReceiveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to receive goods'),
  });

  const releaseMutation = useMutation({
    mutationFn: () => releaseIndentToInventory(id),
    onSuccess: (res: any) => {
      message.success(res?.message || 'Released to inventory! Material Request is now pending re-approval.');
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to release'),
  });

  const releaseAllMutation = useMutation({
    mutationFn: () => releaseAllIndentItems(id),
    onSuccess: (res: any) => {
      message.success(res?.message || 'All items released to inventory and issued to manufacturing!');
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to release items'),
  });

  if (isLoading) {
    return <div className="p-6 flex justify-center"><Spin size="large" /></div>;
  }

  if (!indent) {
    return <div className="p-6"><Alert type="error" message="Indent not found" /></div>;
  }

  const statusOpt = INDENT_STATUS_OPTIONS.find((o) => o.value === indent.status);
  const pendingItems = indent.items?.filter((i) => i.status === 'pending') || [];
  const orderedItems = indent.items?.filter((i) => i.status === 'ordered') || [];
  const receivableItems = indent.items?.filter(
    (i) => (i.status === 'ordered' || i.status === 'received') && i.received_quantity < i.shortage_quantity,
  ) || [];
  const receivedItems = indent.items?.filter((i) => i.received_quantity > 0) || [];
  const allReceived = indent.items?.every((i) => i.received_quantity >= i.shortage_quantity) || false;

  const canCreatePO = pendingItems.length > 0 && indent.status !== 'cancelled' && indent.status !== 'closed';
  const canReceiveGoods = receivableItems.length > 0;
  const canReleaseToInventory = receivedItems.length > 0 && indent.status !== 'closed' && indent.material_request_id && indent.source !== 'inventory';
  const isEditable = indent.status === 'pending';

  // Workflow step calculation
  const getWorkflowStep = () => {
    if (indent.status === 'cancelled') return -1;
    if (indent.status === 'closed') return 3;
    if (allReceived) return 2;
    if (orderedItems.length > 0 || receivedItems.length > 0) return 1;
    return 0;
  };

  const startEdit = (item: IndentItem) => {
    setEditingItemId(item.id);
    setEditQty(item.shortage_quantity);
    setEditNotes(item.notes || '');
  };

  const saveEdit = (itemId: number) => {
    updateItemMutation.mutate({
      itemId,
      data: { shortageQuantity: editQty, notes: editNotes },
    });
  };

  const openReceiveModal = () => {
    setReceiveItems(
      receivableItems.map((item) => ({
        indentItemId: item.id,
        itemName: item.item_name,
        maxQty: item.shortage_quantity - item.received_quantity,
        receivedQuantity: item.shortage_quantity - item.received_quantity,
      })),
    );
    setReceiveModalOpen(true);
  };

  const handleReceiveGoods = () => {
    const items = receiveItems
      .filter((i) => i.receivedQuantity > 0)
      .map((i) => ({ indentItemId: i.indentItemId, receivedQuantity: i.receivedQuantity }));
    if (items.length === 0) {
      message.warning('Enter quantity to receive');
      return;
    }
    receiveGoodsMutation.mutate(items);
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, idx: number) => idx + 1,
    },
    {
      title: 'Material',
      key: 'material',
      render: (_: unknown, record: IndentItem) => (
        <div>
          <div className="font-medium">{record.item_name}</div>
          {record.raw_material_code && (
            <div className="text-xs text-gray-500">{record.raw_material_code}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Required Qty',
      dataIndex: 'required_quantity',
      key: 'required_quantity',
      align: 'right' as const,
      render: (val: number, record: IndentItem) => `${val} ${record.unit_of_measure || ''}`,
    },
    {
      title: 'Available',
      dataIndex: 'available_quantity',
      key: 'available_quantity',
      align: 'right' as const,
      render: (val: number) => <Text type={val > 0 ? 'success' : 'danger'}>{val}</Text>,
    },
    {
      title: 'Shortage (to procure)',
      dataIndex: 'shortage_quantity',
      key: 'shortage_quantity',
      align: 'right' as const,
      render: (val: number, record: IndentItem) => {
        if (editingItemId === record.id) {
          return (
            <InputNumber
              min={1}
              value={editQty}
              onChange={(v) => setEditQty(Number(v) || 0)}
              size="small"
              style={{ width: 100 }}
            />
          );
        }
        return <Text type="danger" strong>{val}</Text>;
      },
    },
    {
      title: 'Ordered',
      dataIndex: 'ordered_quantity',
      key: 'ordered_quantity',
      align: 'right' as const,
      render: (val: number) => val > 0 ? <Text type="warning">{val}</Text> : '0',
    },
    {
      title: 'Received',
      dataIndex: 'received_quantity',
      key: 'received_quantity',
      align: 'right' as const,
      render: (val: number) => val > 0 ? <Text type="success" strong>{val}</Text> : '0',
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 120,
      render: (_: unknown, record: IndentItem) => {
        const pct = record.shortage_quantity > 0
          ? Math.round((record.received_quantity / record.shortage_quantity) * 100)
          : 0;
        return <Progress percent={pct} size="small" status={pct >= 100 ? 'success' : 'active'} />;
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      render: (notes: string, record: IndentItem) => {
        if (editingItemId === record.id) {
          return (
            <Input
              size="small"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes..."
            />
          );
        }
        return notes ? <Text type="secondary" className="text-xs">{notes}</Text> : '-';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', ordered: 'blue', received: 'green' };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    ...(isEditable ? [{
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, record: IndentItem) => {
        if (editingItemId === record.id) {
          return (
            <Space>
              <Button
                type="link"
                size="small"
                icon={<SaveOutlined />}
                loading={updateItemMutation.isPending}
                onClick={() => saveEdit(record.id)}
              />
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setEditingItemId(null)}
              />
            </Space>
          );
        }
        return (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => startEdit(record)} />
            <Popconfirm title="Remove this item?" onConfirm={() => removeItemMutation.mutate(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    }] : []),
  ];

  const handleCreatePO = () => {
    form.setFieldsValue({
      items: pendingItems.map((item) => ({
        indentItemId: item.id,
        itemName: item.item_name,
        quantity: item.shortage_quantity - item.ordered_quantity,
        unitPrice: 0,
        taxPercent: 0,
      })),
    });
    setCreatePOModalOpen(true);
  };

  const handleSubmitPO = async () => {
    const values = await form.validateFields();
    const payload = {
      items: values.items
        .filter((item: any) => item.quantity > 0)
        .map((item: any) => ({
          indentItemId: item.indentItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          taxPercent: item.taxPercent || 0,
        })),
      expectedDelivery: values.expectedDelivery,
      notes: values.notes,
    };
    createPOMutation.mutate(payload);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/procurement/indents')}>
            Back
          </Button>
          <Title level={3} className="!mb-0">
            {indent.indent_number}
          </Title>
          <Tag color={statusOpt?.color || 'default'} style={{ fontSize: 14, padding: '2px 12px' }}>
            {statusOpt?.label || indent.status}
          </Tag>
        </Space>
        <Space>
          {canCreatePO && (
            <Button type="primary" icon={<ShoppingCartOutlined />} onClick={handleCreatePO} size="large">
              Create Purchase Order
            </Button>
          )}
          {canReceiveGoods && (
            <Button
              type="primary"
              icon={<InboxOutlined />}
              onClick={openReceiveModal}
              size="large"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Mark Received
            </Button>
          )}
          {canReleaseToInventory && (
            <Popconfirm
              title="Release All Required Items to Inventory?"
              description="This will auto-approve and issue all items to manufacturing. Stock will be deducted and manufacturing will see materials as fully issued."
              onConfirm={() => releaseAllMutation.mutate()}
              okText="Yes, Release All"
            >
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={releaseAllMutation.isPending}
                size="large"
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Release All Required Items to Inventory
              </Button>
            </Popconfirm>
          )}
          {isEditable && (
            <Popconfirm title="Cancel this indent?" onConfirm={() => cancelMutation.mutate()}>
              <Button danger>Cancel Indent</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Workflow Progress */}
      {indent.status !== 'cancelled' && (
        <Card className="mb-4">
          <Steps
            current={getWorkflowStep()}
            size="small"
            items={indent.source === 'inventory' ? [
              { title: 'Order Created', description: 'Individual order from inventory' },
              { title: 'PO Created', description: 'Order placed with supplier' },
              { title: 'Goods Received', description: 'Stock updated in inventory' },
              { title: 'Closed', description: 'Order complete' },
            ] : [
              { title: 'Indent Created', description: 'Shortage items identified' },
              { title: 'PO Created', description: 'Order placed with supplier' },
              { title: 'Goods Received', description: 'Materials arrived' },
              { title: 'Released to Inventory', description: 'Available for manufacturing' },
            ]}
          />
        </Card>
      )}

      {/* Status-specific alerts */}
      {indent.status === 'pending' && (
        <Alert
          type="info"
          showIcon
          message="This indent has items pending procurement. You can edit quantities, remove items, then create a Purchase Order."
          className="mb-4"
        />
      )}
      {(indent.status === 'partially_ordered' || indent.status === 'fully_ordered') && !allReceived && (
        <Alert
          type="warning"
          showIcon
          message={`Purchase Order has been created. When goods arrive, click "Mark Received" to update stock.`}
          className="mb-4"
        />
      )}
      {allReceived && indent.status !== 'closed' && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message='All goods received! Click "Release All Required Items to Inventory" to approve and issue materials directly to manufacturing.'
          className="mb-4"
        />
      )}
      {indent.status === 'closed' && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="This indent is complete. Materials have been received and released to inventory."
          className="mb-4"
        />
      )}

      <Card className="mb-6">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="Indent Number">{indent.indent_number}</Descriptions.Item>
          <Descriptions.Item label="Request Date">
            {indent.request_date ? dayjs(indent.request_date).format('DD MMM YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusOpt?.color}>{statusOpt?.label || indent.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Source">
            {indent.source === 'inventory'
              ? <Tag color="purple">Individual Order from Inventory</Tag>
              : <Tag color="blue">Material Request</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Material Request">
            {indent.material_request_number ? (
              <Button type="link" size="small" icon={<LinkOutlined />}
                onClick={() => router.push(`/material-requests/${indent.material_request_id}`)}>
                {indent.material_request_number}
              </Button>
            ) : indent.material_request_id ? (
              <Button type="link" size="small" icon={<LinkOutlined />}
                onClick={() => router.push(`/material-requests/${indent.material_request_id}`)}>
                MR #{indent.material_request_id}
              </Button>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Sales Order">
            {indent.order_number ? (
              <Button type="link" size="small" icon={<LinkOutlined />}
                onClick={() => router.push(`/purchase-orders/${indent.sales_order_id}`)}>
                {indent.order_number}
              </Button>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Requested By">{indent.requested_by_name || '-'}</Descriptions.Item>
          {indent.notes && <Descriptions.Item label="Notes" span={3}>{indent.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card title={`Indent Items (${indent.items?.length || 0})`}
        extra={isEditable && <Text type="secondary" className="text-xs">Click edit icon to modify quantities</Text>}
      >
        <Table
          columns={columns}
          dataSource={indent.items || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Create PO Modal */}
      <Modal
        title="Create Purchase Order from Indent"
        open={createPOModalOpen}
        onCancel={() => { setCreatePOModalOpen(false); form.resetFields(); }}
        onOk={handleSubmitPO}
        confirmLoading={createPOMutation.isPending}
        width={800}
        okText="Create Purchase Order"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="expectedDelivery" label="Expected Delivery">
            <Input type="date" />
          </Form.Item>

          <Divider>Items</Divider>

          <Form.List name="items">
            {(fields) => (
              <Table
                dataSource={fields}
                rowKey="key"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Material',
                    render: (_, __, idx) => (
                      <>
                        <Form.Item name={[idx, 'indentItemId']} hidden><Input /></Form.Item>
                        <Form.Item name={[idx, 'itemName']} noStyle>
                          <Input disabled bordered={false} />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    title: 'Quantity',
                    width: 120,
                    render: (_, __, idx) => (
                      <Form.Item name={[idx, 'quantity']} noStyle rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'Unit Price',
                    width: 120,
                    render: (_, __, idx) => (
                      <Form.Item name={[idx, 'unitPrice']} noStyle>
                        <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
                      </Form.Item>
                    ),
                  },
                  {
                    title: 'Tax %',
                    width: 100,
                    render: (_, __, idx) => (
                      <Form.Item name={[idx, 'taxPercent']} noStyle>
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    ),
                  },
                ]}
              />
            )}
          </Form.List>

          <Form.Item name="notes" label="Notes" className="mt-4">
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Receive Goods Modal */}
      <Modal
        title="Receive Goods"
        open={receiveModalOpen}
        onCancel={() => setReceiveModalOpen(false)}
        onOk={handleReceiveGoods}
        confirmLoading={receiveGoodsMutation.isPending}
        width={600}
        okText="Confirm Receipt"
      >
        <Alert
          type="info"
          showIcon
          message="Enter the quantity received for each item. This will update raw material stock."
          className="mb-4"
        />
        <Table
          dataSource={receiveItems}
          rowKey="indentItemId"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Material',
              dataIndex: 'itemName',
              key: 'itemName',
            },
            {
              title: 'Remaining to Receive',
              dataIndex: 'maxQty',
              key: 'maxQty',
              align: 'right' as const,
              render: (val: number) => <Text type="warning">{val}</Text>,
            },
            {
              title: 'Qty Received',
              key: 'receivedQuantity',
              width: 150,
              render: (_: unknown, record: any, idx: number) => (
                <InputNumber
                  min={0}
                  max={record.maxQty}
                  value={record.receivedQuantity}
                  onChange={(v) => {
                    const updated = [...receiveItems];
                    updated[idx] = { ...updated[idx], receivedQuantity: Number(v) || 0 };
                    setReceiveItems(updated);
                  }}
                  style={{ width: '100%' }}
                />
              ),
            },
          ]}
        />
      </Modal>

    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Descriptions, Space, Alert, Modal,
  Form, InputNumber, Input, Select, message, Spin, Progress, Divider, Popconfirm, Steps,
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
  ReleaseAllResult,
} from '@/lib/api/indents';
import { getSupplierList } from '@/lib/api/suppliers';
import { INDENT_STATUS_OPTIONS } from '@/types/indent';
import type { IndentItem, IndentPO } from '@/types/indent';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function IndentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const [createPOModalOpen, setCreatePOModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  // Per-item vendor: indentItemId → supplierId
  const [itemVendors, setItemVendors] = useState<Record<number, number | undefined>>({});
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [editQty, setEditQty] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [receiveItems, setReceiveItems] = useState<{ indentItemId: number; itemName: string; maxQty: number; receivedQuantity: number }[]>([]);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['indent', id],
    queryFn: () => getIndentById(id),
    enabled: !!id,
  });

  // Load all suppliers (with categories) once when modal opens; filter per-item client-side
  const { data: allSuppliersRes } = useQuery({
    queryKey: ['suppliers-all-active'],
    queryFn: () => getSupplierList({ pageSize: 200, status: 'active' }),
    enabled: createPOModalOpen,
    staleTime: 1000 * 60 * 5,
  });
  const allSuppliers = allSuppliersRes?.data || [];

  // Returns suppliers whose category mapping matches the given material category/subcategory.
  // Falls back to all suppliers when none match.
  const getSuppliersForItem = (category?: string, subcategory?: string) => {
    if (!category || allSuppliers.length === 0) return allSuppliers;
    const filtered = allSuppliers.filter((s) =>
      (s.categories || []).some(
        (c) => c.category === category && (!subcategory || c.subcategory === subcategory),
      ),
    );
    return filtered.length > 0 ? filtered : allSuppliers;
  };

  const indent = data?.data;


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
    onSuccess: (res: ReleaseAllResult) => {
      setReleaseModalOpen(false);
      message.success(res.message);
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

  const releasePreview = (indent.items || [])
    .filter((i) => i.received_quantity > 0)
    .map((i) => ({
      key: i.id,
      itemName: i.item_name,
      shortageQty: i.shortage_quantity,
      receivedQty: i.received_quantity,
      unit: i.unit_of_measure,
      isPartial: i.received_quantity < i.shortage_quantity,
      receivePercent: i.shortage_quantity > 0
        ? Math.round((i.received_quantity / i.shortage_quantity) * 100)
        : 100,
    }));
  const hasPartialItems = releasePreview.some((i) => i.isPartial);


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
    setItemVendors({});
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
    const activeItems = (values.items as any[]).filter((item) => Number(item.quantity) > 0);
    if (activeItems.length === 0) { message.warning('Enter quantity for at least one item'); return; }

    // Group items by their assigned vendor (supplierId); items with no vendor go into group 'none'
    const groups = new Map<string, typeof activeItems>();
    for (const item of activeItems) {
      const key = String(itemVendors[item.indentItemId] ?? 'none');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    setPoSubmitting(true);
    try {
      await Promise.all(
        Array.from(groups.entries()).map(([vendorKey, items]) =>
          createPOFromIndent(id, {
            supplierId: vendorKey !== 'none' ? Number(vendorKey) : undefined,
            items: items.map((item: any) => ({
              indentItemId: item.indentItemId,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice) || 0,
              taxPercent: Number(item.taxPercent) || 0,
            })),
            expectedDelivery: values.expectedDelivery || undefined,
            notes: values.notes || undefined,
          }),
        ),
      );
      const count = groups.size;
      message.success(`${count} Purchase Order${count > 1 ? 's' : ''} created successfully`);
      setCreatePOModalOpen(false);
      form.resetFields();
      setItemVendors({});
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setPoSubmitting(false);
    }
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
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={releaseAllMutation.isPending}
              size="large"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => setReleaseModalOpen(true)}
            >
              Release All Required Items to Inventory
            </Button>
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
          {(indent.purchase_orders?.length ?? 0) > 0 && (
            <Descriptions.Item label="Purchase Orders" span={3}>
              <Space wrap>
                {indent.purchase_orders!.map((po) => (
                  <Button
                    key={po.id}
                    size="small"
                    type="link"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => router.push(`/procurement/purchase-orders/${po.id}`)}
                  >
                    {po.po_number}
                    <Tag
                      color={po.status === 'received' ? 'green' : po.status === 'approved' ? 'blue' : 'orange'}
                      style={{ marginLeft: 4 }}
                    >
                      {po.status}
                    </Tag>
                  </Button>
                ))}
              </Space>
            </Descriptions.Item>
          )}
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
        onCancel={() => { setCreatePOModalOpen(false); form.resetFields(); setItemVendors({}); }}
        onOk={handleSubmitPO}
        confirmLoading={poSubmitting}
        width={1000}
        okText="Create Purchase Order"
      >
        <div className="mb-3 p-3 bg-blue-50 rounded text-sm text-blue-700">
          Select a vendor for each material. Vendors are filtered by the material&apos;s category.
          If items have different vendors, separate Purchase Orders will be created automatically.
        </div>

        <Form form={form} layout="vertical">
          <div className="flex gap-4">
            <Form.Item name="expectedDelivery" label="Expected Delivery" className="flex-1">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="notes" label="Notes" className="flex-1">
              <Input placeholder="Additional notes..." />
            </Form.Item>
          </div>

          <Divider className="my-3">Materials &amp; Vendor Assignment</Divider>

          <Form.List name="items">
            {(fields) => (
              <Table
                dataSource={fields}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
                columns={[
                  {
                    title: 'Material',
                    width: 200,
                    render: (_, __, idx) => {
                      const item = pendingItems[idx];
                      return (
                        <>
                          <Form.Item name={[idx, 'indentItemId']} hidden><Input /></Form.Item>
                          <Form.Item name={[idx, 'itemName']} noStyle>
                            <Input disabled variant="borderless" style={{ padding: 0, fontWeight: 500 }} />
                          </Form.Item>
                          {item?.raw_material_category && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                              {item.raw_material_category}
                              {item.raw_material_subcategory ? ` › ${item.raw_material_subcategory}` : ''}
                            </div>
                          )}
                        </>
                      );
                    },
                  },
                  {
                    title: 'Vendor',
                    width: 220,
                    render: (_, __, idx) => {
                      const item = pendingItems[idx];
                      const suppliers = getSuppliersForItem(item?.raw_material_category, item?.raw_material_subcategory);
                      const isFiltered = item?.raw_material_category &&
                        allSuppliers.filter((s) =>
                          (s.categories || []).some((c) => c.category === item.raw_material_category),
                        ).length > 0;
                      return (
                        <div>
                          <Select
                            placeholder="Select vendor"
                            style={{ width: '100%' }}
                            showSearch
                            allowClear
                            size="small"
                            loading={!allSuppliersRes}
                            filterOption={(input, opt) =>
                              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                            value={itemVendors[item?.id]}
                            onChange={(val) =>
                              setItemVendors((prev) => ({ ...prev, [item!.id]: val }))
                            }
                            options={suppliers.map((s) => ({
                              value: s.id,
                              label: s.supplier_name,
                            }))}
                          />
                          {item?.raw_material_category && (
                            <div style={{ fontSize: 10, color: isFiltered ? '#52c41a' : '#faad14', marginTop: 2 }}>
                              {isFiltered
                                ? `Filtered by: ${item.raw_material_category}`
                                : 'No mapped vendors — showing all'}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    title: 'Qty',
                    width: 110,
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
                    width: 90,
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

      {/* Release All — Pre-flight Confirmation Modal */}
      <Modal
        title="Release All Required Items to Inventory"
        open={releaseModalOpen}
        onCancel={() => setReleaseModalOpen(false)}
        onOk={() => releaseAllMutation.mutate()}
        confirmLoading={releaseAllMutation.isPending}
        okText="Confirm Release"
        okButtonProps={{ style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } }}
        width={700}
      >
        {hasPartialItems ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Some items are only partially received"
            description="Items will be issued at their received quantity — not the full shortage amount. Manufacturing will see partial availability."
          />
        ) : (
          <Alert
            type="success"
            showIcon
            className="mb-4"
            message="All items fully received — ready to release"
          />
        )}
        <Table
          dataSource={releasePreview}
          rowKey="key"
          pagination={false}
          size="small"
          columns={[
            { title: 'Material', dataIndex: 'itemName' },
            {
              title: 'Shortage Qty',
              dataIndex: 'shortageQty',
              align: 'right' as const,
              render: (val: number, rec: any) => `${val} ${rec.unit || ''}`.trim(),
            },
            {
              title: 'Received Qty',
              dataIndex: 'receivedQty',
              align: 'right' as const,
              render: (val: number, rec: any) => (
                <Text type={rec.isPartial ? 'warning' : 'success'}>{val} {rec.unit || ''}</Text>
              ),
            },
            {
              title: 'Receipt %',
              dataIndex: 'receivePercent',
              align: 'center' as const,
              render: (pct: number) => (
                <Tag color={pct >= 100 ? 'green' : pct >= 50 ? 'orange' : 'red'}>{pct}%</Tag>
              ),
            },
            {
              title: 'Will Issue',
              align: 'right' as const,
              render: (_: unknown, rec: any) => (
                <Text strong>{rec.receivedQty} {rec.unit || ''}</Text>
              ),
            },
          ]}
        />
        <p className="mt-3 text-xs text-gray-500">
          Stock will be deducted from inventory and manufacturing will see materials as issued.
        </p>
      </Modal>

    </div>
  );
}

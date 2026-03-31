'use client';

import { useState } from 'react';
import {
  Card, Table, Tag, Button, Typography, Descriptions, Space, Alert, Modal,
  Form, InputNumber, Input, Select, message, Spin, Progress, Divider, Popconfirm, Steps,
  Upload, Tooltip, Badge, DatePicker,
} from 'antd';
import {
  ArrowLeftOutlined, ShoppingCartOutlined, LinkOutlined,
  EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined,
  CheckCircleOutlined, InboxOutlined, SendOutlined, FilePdfOutlined,
  UploadOutlined, MailOutlined, FileSearchOutlined,
  TrophyOutlined, ThunderboltOutlined, CarOutlined, WarningOutlined,
  RetweetOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  getIndentById, createPOFromIndent, updateIndentItem, removeIndentItem,
  cancelIndent, receiveIndentGoods, releaseIndentToInventory, releaseAllIndentItems,
  reorderRejectedIndentItems, createReplacementIndent, reissueRejectedItems,
  ReleaseAllResult, updateIndentETA,
} from '@/lib/api/indents';
import { getSupplierList } from '@/lib/api/suppliers';
import {
  createRFQ, addRFQVendors, sendRFQEmails, getRFQByIndent, getRFQComparison,
  updateVendorQuote, uploadVendorQuotePDF, getVendorPDFUrl,
} from '@/lib/api/rfqs';
import { INDENT_STATUS_OPTIONS } from '@/types/indent';
import type { IndentItem, IndentPO, IndentGRN } from '@/types/indent';
import type { Rfq, RfqComparison } from '@/types/rfq';
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
  const [rfqForm] = Form.useForm();
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [rfqModalMode, setRfqModalMode] = useState<'create' | 'add'>('create');
  const [quoteModalVendorId, setQuoteModalVendorId] = useState<number | null>(null);
  const [quoteForm] = Form.useForm();
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [etaValue, setEtaValue] = useState<dayjs.Dayjs | null>(null);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [replacementReason, setReplacementReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['indent', id],
    queryFn: () => getIndentById(id),
    enabled: !!id,
  });

  // Load all suppliers (with categories) once when modal opens; filter per-item client-side
  const { data: allSuppliersRes } = useQuery({
    queryKey: ['suppliers-all-active'],
    queryFn: () => getSupplierList({ pageSize: 200, status: 'active' }),
    enabled: createPOModalOpen || rfqModalOpen,
    staleTime: 1000 * 60 * 5,
  });
  const allSuppliers = allSuppliersRes?.data || [];

  // RFQ data — always fetched for this indent
  const { data: rfqData, refetch: refetchRfq } = useQuery({
    queryKey: ['rfq-by-indent', id],
    queryFn: () => getRFQByIndent(id),
    enabled: !!id,
    staleTime: 0,
  });
  const rfq: Rfq | null = rfqData || null;

  const respondedVendors = rfq?.vendors.filter((v) => v.status === 'responded') || [];
  // Only show comparison when ≥2 responded vendors share at least 1 common item
  const showComparison =
    respondedVendors.length >= 2 &&
    respondedVendors.some((a) =>
      respondedVendors.some(
        (b) =>
          b.id !== a.id &&
          a.items.some((ai) => b.items.some((bi) => bi.indent_item_id === ai.indent_item_id)),
      ),
    );

  const { data: comparisonData } = useQuery({
    queryKey: ['rfq-comparison', rfq?.id],
    queryFn: () => getRFQComparison(rfq!.id),
    enabled: showComparison && !!rfq?.id,
    staleTime: 0,
  });
  const comparison: RfqComparison | null = comparisonData || null;

  const createRfqMutation = useMutation({
    mutationFn: (vals: { vendorItems: { supplierId: number; indentItemIds: number[] }[]; notes?: string }) =>
      createRFQ(id, vals.vendorItems, vals.notes),
    onSuccess: () => {
      message.success('RFQ created');
      setRfqModalOpen(false);
      rfqForm.resetFields();
      refetchRfq();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create RFQ'),
  });

  const addVendorsMutation = useMutation({
    mutationFn: (vendorItems: { supplierId: number; indentItemIds: number[] }[]) =>
      addRFQVendors(rfq!.id, vendorItems),
    onSuccess: () => {
      message.success('Materials added to RFQ successfully');
      setRfqModalOpen(false);
      rfqForm.resetFields();
      refetchRfq();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to add vendors to RFQ'),
  });

  const handleCreateRfq = () => {
    rfqForm.validateFields().then((vals) => {
      // Build vendorItems: invert itemVendors map (itemId → supplierIds[]) to (supplierId → itemIds[])
      const vendorItemMap = new Map<number, number[]>();
      Object.entries(vals.itemVendors || {}).forEach(([itemId, supplierIds]: [string, any]) => {
        if (Array.isArray(supplierIds)) {
          supplierIds.forEach((sid: number) => {
            if (!vendorItemMap.has(sid)) vendorItemMap.set(sid, []);
            vendorItemMap.get(sid)!.push(Number(itemId));
          });
        }
      });
      if (vendorItemMap.size === 0) {
        message.error('Select at least one vendor for at least one item');
        return;
      }
      const vendorItems = Array.from(vendorItemMap.entries()).map(([supplierId, indentItemIds]) => ({
        supplierId,
        indentItemIds,
      }));
      if (rfqModalMode === 'add') {
        addVendorsMutation.mutate(vendorItems);
      } else {
        createRfqMutation.mutate({ vendorItems, notes: vals.notes });
      }
    });
  };

  const sendEmailsMutation = useMutation({
    mutationFn: () => sendRFQEmails(rfq!.id),
    onSuccess: (res) => {
      message.success(res.message);
      refetchRfq();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to send emails'),
  });

  const updateQuoteMutation = useMutation({
    mutationFn: (vals: { vendorId: number; deliveryDays?: number; items: { indentItemId: number; unitPrice: number; taxPercent?: number }[] }) =>
      updateVendorQuote(rfq!.id, vals.vendorId, vals.items, vals.deliveryDays),
    onSuccess: () => {
      message.success('Prices saved');
      setQuoteModalVendorId(null);
      quoteForm.resetFields();
      refetchRfq();
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', rfq?.id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to save prices'),
  });

  // Returns suppliers strictly mapped to the given material category/subcategory.
  // No fallback — returns empty array when no vendors are mapped.
  const getSuppliersForItem = (category?: string, subcategory?: string) => {
    if (!category || allSuppliers.length === 0) return [];
    return allSuppliers.filter((s) =>
      (s.categories || []).some(
        (c) =>
          c.category === category &&
          (!subcategory || !c.subcategory || c.subcategory === subcategory),
      ),
    );
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

  const reorderRejectedMutation = useMutation({
    mutationFn: () => reorderRejectedIndentItems(id),
    onSuccess: (res) => {
      message.success(res.message || `${res.reorderedCount} item(s) reset for re-ordering`);
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
      queryClient.invalidateQueries({ queryKey: ['indents-grn-rejected-count'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to reset items'),
  });

  const reissueMutation = useMutation({
    mutationFn: () => reissueRejectedItems(id),
    onSuccess: (res) => {
      message.success(res.message || 'Items re-issued to inventory. A new GRN is pending confirmation.');
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
      queryClient.invalidateQueries({ queryKey: ['indents-grn-rejected-count'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to re-issue items'),
  });

  const createReplacementMutation = useMutation({
    mutationFn: () => createReplacementIndent(id, replacementReason || undefined),
    onSuccess: (res) => {
      message.success('Replacement indent created successfully');
      setReplacementModalOpen(false);
      setReplacementReason('');
      if (res.data?.id) {
        router.push(`/procurement/indents/${res.data.id}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['indent', id] });
      }
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create replacement indent'),
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

  const etaMutation = useMutation({
    mutationFn: (expectedDelivery: string) => updateIndentETA(id, expectedDelivery),
    onSuccess: () => {
      message.success('ETA updated');
      setEtaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['indent', id] });
    },
    onError: () => message.error('Failed to update ETA'),
  });

  if (isLoading) {
    return <div className="p-6 flex justify-center"><Spin size="large" /></div>;
  }

  if (!indent) {
    return <div className="p-6"><Alert type="error" message="Indent not found" /></div>;
  }

  const statusOpt = INDENT_STATUS_OPTIONS.find((o) => o.value === indent.status);
  const pendingItems = indent.items?.filter((i) => i.status === 'pending') || [];

  // Items not yet covered by any vendor assignment in the existing RFQ
  const coveredItemIds = rfq
    ? new Set((rfq.vendors || []).flatMap((v) => v.items.map((i) => i.indent_item_id)))
    : new Set<number>();
  const uncoveredItems = rfq ? pendingItems.filter((i) => !coveredItemIds.has(i.id)) : [];

  const orderedItems = indent.items?.filter((i) => i.status === 'ordered') || [];
  // Fully rejected by inventory team
  const grnRejectedItems = indent.items?.filter((i) => i.status === 'grn_rejected') || [];
  // Short delivery — accepted less than ordered (partial status from GRN confirmation)
  const partialItems = indent.items?.filter((i) => i.status === 'partial') || [];
  const receivableItems = indent.items?.filter(
    (i) => (i.status === 'ordered' || i.status === 'received' || (i.status === 'pending' && i.grn_rtv_status === 'returned')) && i.received_quantity < i.shortage_quantity,
  ) || [];
  // Items returned to vendor that are now pending replacement delivery
  const replacementNeededItems = indent.items?.filter(
    (i) => i.status === 'pending' && i.grn_rtv_status === 'returned',
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


  const canCreatePO = pendingItems.length > 0 && indent.status !== 'cancelled' && indent.status !== 'closed' && !!rfq;
  const canReceiveGoods = receivableItems.length > 0;
  const grn: IndentGRN | null | undefined = indent.grn;
  const grnPending = grn && grn.status === 'pending';
  const grnRejected = grn && grn.status === 'rejected';
  const canReleaseToInventory = receivedItems.length > 0 && indent.status !== 'cancelled' && (!grn || grnRejected);
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
      render: (status: string, record: IndentItem) => {
        const colors: Record<string, string> = { pending: 'orange', ordered: 'blue', received: 'green', grn_rejected: 'red', partial: 'gold' };
        const labels: Record<string, string> = { pending: 'Pending', ordered: 'Ordered', received: 'Received', grn_rejected: 'GRN Rejected', partial: 'Short Delivery' };
        const reasonLabels: Record<string, string> = { damaged: 'Damaged', defective: 'Defective', incorrect_item: 'Incorrect Item', other: 'Other' };
        const isReplacementNeeded = status === 'pending' && record.grn_rtv_status === 'returned';
        return (
          <div>
            <Tag color={isReplacementNeeded ? 'gold' : (colors[status] || 'default')}>
              {isReplacementNeeded ? 'Awaiting Replacement' : (labels[status] || status)}
            </Tag>
            {status === 'grn_rejected' && record.grn_rejection_reason && (
              <div className="text-xs text-red-500 mt-1">
                {reasonLabels[record.grn_rejection_reason] || record.grn_rejection_reason}
                {record.grn_rejected_qty !== undefined && ` (${record.grn_rejected_qty} ${record.unit_of_measure || ''})`}
              </div>
            )}
            {isReplacementNeeded && (
              <div className="text-xs text-orange-500 mt-1">Returned to vendor — replacement pending</div>
            )}
          </div>
        );
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
          {pendingItems.length > 0 && indent.status !== 'cancelled' && indent.status !== 'closed' && !rfq && (
            <Tooltip title="Create an RFQ first to collect vendor quotes before placing a Purchase Order">
              <Button icon={<ShoppingCartOutlined />} size="large" disabled>
                Create Purchase Order
              </Button>
            </Tooltip>
          )}
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
              style={{ backgroundColor: grnRejected ? '#ff4d4f' : '#52c41a', borderColor: grnRejected ? '#ff4d4f' : '#52c41a' }}
              onClick={() => setReleaseModalOpen(true)}
            >
              {grnRejected ? 'Re-release Items to Inventory' : 'Release All Required Items to Inventory'}
            </Button>
          )}
          {isEditable && (
            <Popconfirm title="Cancel this indent?" onConfirm={() => cancelMutation.mutate()}>
              <Button danger>Cancel Indent</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Replacement banner — shown when this indent is a replacement for another */}
      {indent.is_replacement && indent.parent_indent_id && (
        <Alert
          type="warning"
          showIcon
          icon={<RetweetOutlined />}
          className="mb-4"
          style={{ background: '#fffbe6', borderColor: '#ffe58f' }}
          message={
            <span style={{ fontWeight: 600 }}>
              This is a <strong>Replacement Indent</strong> — created for damaged/rejected goods from{' '}
              <Button
                type="link"
                style={{ padding: 0, height: 'auto', fontWeight: 700 }}
                onClick={() => router.push(`/procurement/indents/${indent.parent_indent_id}`)}
              >
                {indent.parent_indent_number || `Indent #${indent.parent_indent_id}`}
              </Button>
            </span>
          }
          description={
            indent.rejection_reason
              ? <span style={{ fontSize: 12, color: '#888' }}>Rejection reason: {indent.rejection_reason}</span>
              : undefined
          }
        />
      )}

      {/* Workflow Progress */}
      {indent.status !== 'cancelled' && (
        <Card className="mb-4">
          <Steps
            current={getWorkflowStep()}
            size="small"
            items={indent.source === 'inventory' ? [
              { title: 'Order Created', description: 'Individual order from inventory' },
              { title: 'PO Created', description: 'Order placed with vendor' },
              { title: 'Goods Received', description: 'Stock updated in inventory' },
              { title: 'Closed', description: 'Order complete' },
            ] : [
              { title: 'Indent Created', description: 'Shortage items identified' },
              { title: 'PO Created', description: 'Order placed with vendor' },
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
      {allReceived && !grn && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message='All goods received! Click "Release All Required Items to Inventory" to send to the inventory team for verification.'
          className="mb-4"
        />
      )}
      {grnPending && (
        <Alert
          type="warning"
          showIcon
          message={`GRN ${grn!.grn_number} is awaiting verification by the inventory team. No action needed from procurement.`}
          className="mb-4"
        />
      )}
      {grnRejected && (
        <Alert
          type="error"
          showIcon
          message={`GRN ${grn!.grn_number} was rejected by inventory. Please re-release the items to create a new GRN.`}
          className="mb-4"
        />
      )}
      {grnRejectedItems.length > 0 && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message={`${grnRejectedItems.length} item(s) were rejected by the inventory team`}
          description={
            <div>
              {/* Per-item rejection details */}
              <div className="mt-2 mb-3">
                {grnRejectedItems.map((item) => {
                  const reasonLabels: Record<string, string> = {
                    damaged: 'Damaged',
                    defective: 'Defective / Not Working',
                    incorrect_item: 'Incorrect Item',
                    other: 'Other',
                  };
                  const reason = item.grn_rejection_reason
                    ? reasonLabels[item.grn_rejection_reason] || item.grn_rejection_reason
                    : 'Reason not specified';
                  return (
                    <div key={item.id} style={{ padding: '6px 10px', marginBottom: 6, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, fontSize: 13 }}>
                      <strong>{item.item_name}</strong>
                      {item.grn_rejected_qty !== undefined && (
                        <span className="ml-2 text-red-600">— {item.grn_rejected_qty} {item.unit_of_measure || ''} rejected</span>
                      )}
                      <span className="ml-2 text-gray-500">Reason: {reason}</span>
                      {item.grn_rejection_notes && (
                        <span className="ml-2 text-gray-400 italic">"{item.grn_rejection_notes}"</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Contact the supplier to arrange replacement delivery under the existing purchase order.
                When replacement goods arrive, click <strong>"Re-issue to Inventory"</strong> to send them for fresh verification.
              </p>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<InboxOutlined />}
                  loading={reissueMutation.isPending}
                  onClick={() => reissueMutation.mutate()}
                >
                  Re-issue to Inventory
                </Button>
                <Button
                  icon={<RetweetOutlined />}
                  onClick={() => setReplacementModalOpen(true)}
                >
                  Create Replacement Indent
                </Button>
                <Button
                  ghost
                  danger
                  loading={reorderRejectedMutation.isPending}
                  onClick={() => reorderRejectedMutation.mutate()}
                >
                  Reset to Pending
                </Button>
              </Space>
            </div>
          }
        />
      )}
      {partialItems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={`${partialItems.length} item(s) have a short delivery — less quantity received than ordered`}
          description={
            <div>
              <p className="mb-2">
                The following items were partially received. The remaining quantity still needs to be ordered:
              </p>
              <ul className="mb-2 list-disc list-inside">
                {partialItems.map((i) => (
                  <li key={i.id}>
                    <strong>{i.item_name}</strong> — received {i.received_quantity}, still need{' '}
                    <strong>{i.shortage_quantity - i.received_quantity} {i.unit_of_measure || ''}</strong>
                  </li>
                ))}
              </ul>
              <p className="mb-2">
                Click <strong>"Re-order Remaining"</strong> to reset these items so you can create a new Purchase Order for the outstanding quantity.
              </p>
              <Button
                type="primary"
                icon={<WarningOutlined />}
                loading={reorderRejectedMutation.isPending}
                onClick={() => reorderRejectedMutation.mutate()}
              >
                Re-order Remaining ({partialItems.length})
              </Button>
            </div>
          }
        />
      )}
      {replacementNeededItems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<CarOutlined />}
          className="mb-4"
          message={`${replacementNeededItems.length} item(s) awaiting replacement delivery from supplier`}
          description={
            <div>
              <p className="mb-2 text-sm">
                The following items were returned to the vendor. Contact the supplier to arrange re-delivery under the existing purchase order.
                When the replacement goods arrive, click <strong>"Mark Received"</strong> to update stock.
              </p>
              <div className="mb-3">
                {replacementNeededItems.map((item) => (
                  <div key={item.id} style={{ padding: '6px 10px', marginBottom: 6, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, fontSize: 13 }}>
                    <strong>{item.item_name}</strong>
                    <span className="ml-2 text-orange-600">— {item.shortage_quantity} {item.unit_of_measure || ''} needed</span>
                    {item.notes && (
                      <div className="text-xs text-gray-500 mt-1 italic">{item.notes}</div>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="primary"
                icon={<InboxOutlined />}
                onClick={openReceiveModal}
                style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
              >
                Mark Received (Replacement Arrived)
              </Button>
            </div>
          }
        />
      )}
      {grn && (grn.status === 'confirmed' || grn.status === 'partially_confirmed') && grnRejectedItems.length === 0 && partialItems.length === 0 && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={`GRN ${grn.grn_number} confirmed by inventory. Stock updated and materials issued to manufacturing.`}
          className="mb-4"
        />
      )}
      {indent.status === 'closed' && !grn && (
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
          <Descriptions.Item label="ETA">
            <Space>
              {indent.expected_delivery ? (
                <Text type={dayjs(indent.expected_delivery).isBefore(dayjs(), 'day') ? 'danger' : undefined}>
                  {dayjs(indent.expected_delivery).format('DD MMM YYYY')}
                  {dayjs(indent.expected_delivery).isBefore(dayjs(), 'day') && ' (Overdue)'}
                </Text>
              ) : <Text type="secondary">Not set</Text>}
              <Button size="small" onClick={() => { setEtaValue(indent.expected_delivery ? dayjs(indent.expected_delivery) : null); setEtaModalOpen(true); }}>Set ETA</Button>
            </Space>
          </Descriptions.Item>
          {(indent.purchase_orders?.length ?? 0) > 0 && (
            <Descriptions.Item label="Purchase Orders" span={3}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {indent.purchase_orders!.map((po) => (
                  <div key={po.id} className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="small"
                      type="link"
                      icon={<ShoppingCartOutlined />}
                      style={{ padding: 0 }}
                      onClick={() => router.push(`/procurement/purchase-orders/${po.id}`)}
                    >
                      {po.po_number}
                    </Button>
                    <Tag
                      color={po.status === 'received' ? 'green' : po.status === 'approved' ? 'blue' : 'orange'}
                    >
                      {po.status}
                    </Tag>
                    {po.supplier_name && (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Vendor: <Text strong style={{ fontSize: 13 }}>{po.supplier_name}</Text>
                      </Text>
                    )}
                  </div>
                ))}
              </Space>
            </Descriptions.Item>
          )}
          {indent.notes && <Descriptions.Item label="Notes" span={3}>{indent.notes}</Descriptions.Item>}
          {/* Replacement indent links */}
          {(indent.replacement_indents?.length ?? 0) > 0 && (
            <Descriptions.Item label="Replacement Indents" span={3}>
              <Space direction="vertical" size={4}>
                {indent.replacement_indents!.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="small"
                      type="link"
                      icon={<RetweetOutlined />}
                      style={{ padding: 0, color: '#fa8c16' }}
                      onClick={() => router.push(`/procurement/indents/${r.id}`)}
                    >
                      {r.indent_number}
                    </Button>
                    <Tag color={r.status === 'closed' ? 'green' : r.status === 'pending' ? 'orange' : 'blue'}>
                      {r.status}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Created: {dayjs(r.created_date).format('DD MMM YYYY')}
                    </Text>
                  </div>
                ))}
              </Space>
            </Descriptions.Item>
          )}
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

      {/* RFQ Section */}
      {indent.status !== 'cancelled' && (
        <Card
          title={<Space><FileSearchOutlined /> Request for Quotation (RFQ)</Space>}
          className="mt-6"
          extra={
            !rfq && (
              <Button type="primary" onClick={() => { setRfqModalMode('create'); setRfqModalOpen(true); }}>
                Create RFQ
              </Button>
            )
          }
        >
          {!rfq ? (
            <Alert
              type="info"
              showIcon
              message="Create an RFQ to collect vendor quotes before placing a Purchase Order."
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* RFQ Header */}
              <Space>
                <Text strong>{rfq.rfq_number}</Text>
                <Tag color={rfq.status === 'completed' ? 'green' : rfq.status === 'sent' ? 'blue' : 'orange'}>
                  {rfq.status.toUpperCase()}
                </Tag>
                {rfq.sent_date && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Sent: {dayjs(rfq.sent_date).format('DD MMM YYYY')}
                  </Text>
                )}
                {rfq.status === 'draft' && (
                  <Button
                    type="primary"
                    icon={<MailOutlined />}
                    loading={sendEmailsMutation.isPending}
                    onClick={() => sendEmailsMutation.mutate()}
                    size="small"
                  >
                    Send RFQ Emails
                  </Button>
                )}
              </Space>

              {/* Vendors table */}
              <Table
                dataSource={rfq.vendors}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Vendor',
                    dataIndex: 'supplier_name',
                    key: 'supplier_name',
                    render: (name: string) => <Text strong>{name}</Text>,
                  },
                  {
                    title: 'Email Sent',
                    dataIndex: 'email_sent_at',
                    key: 'email_sent_at',
                    render: (v: string) => v ? dayjs(v).format('DD MMM YYYY HH:mm') : <Tag>Not sent</Tag>,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (s: string) => (
                      <Tag color={s === 'responded' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>
                        {s}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Delivery',
                    key: 'delivery',
                    render: (_: unknown, vendor: any) =>
                      vendor.delivery_days != null ? `${vendor.delivery_days} days` : '-',
                  },
                  {
                    title: 'Quoted Total',
                    key: 'total',
                    render: (_: unknown, vendor: any) => {
                      const vComp = comparison?.vendors.find((v) => v.id === vendor.id);
                      return vComp?.grand_total ? `₹${vComp.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
                    },
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_: unknown, vendor: any) => (
                      <Space>
                        <Button
                          size="small"
                          onClick={() => {
                            setQuoteModalVendorId(vendor.id);
                            quoteForm.setFieldsValue({
                              deliveryDays: vendor.delivery_days ?? undefined,
                              items: (vendor.items || []).map((item: any) => ({
                                indentItemId: item.indent_item_id,
                                itemName: item.item_name,
                                unitPrice: item.unit_price,
                                taxPercent: item.tax_percent,
                              })),
                            });
                          }}
                        >
                          Enter Prices
                        </Button>
                        <Upload
                          accept=".pdf"
                          showUploadList={false}
                          customRequest={async ({ file, onSuccess, onError }) => {
                            try {
                              await uploadVendorQuotePDF(rfq.id, vendor.id, file as File);
                              message.success('PDF uploaded');
                              refetchRfq();
                              onSuccess?.({});
                            } catch (err: any) {
                              message.error('Upload failed');
                              onError?.(err);
                            }
                          }}
                        >
                          <Button size="small" icon={<UploadOutlined />}>Upload PDF</Button>
                        </Upload>
                        {vendor.quote_pdf_path && (
                          <Tooltip title="View PDF">
                            <Button
                              size="small"
                              icon={<FilePdfOutlined />}
                              onClick={() => window.open(getVendorPDFUrl(rfq.id, vendor.id), '_blank')}
                            >
                              View PDF
                            </Button>
                          </Tooltip>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />

              {/* Uncovered items warning */}
              {uncoveredItems.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={`${uncoveredItems.length} material${uncoveredItems.length > 1 ? 's' : ''} not covered by this RFQ`}
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        The following material{uncoveredItems.length > 1 ? 's were' : ' was'} not assigned to any vendor when the RFQ was created:
                        {' '}<strong>{uncoveredItems.map((i) => i.item_name).join(', ')}</strong>
                      </div>
                      <Button
                        size="small"
                        icon={<FileSearchOutlined />}
                        style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', color: '#fff' }}
                        onClick={() => {
                          setRfqModalMode('add');
                          rfqForm.resetFields();
                          setRfqModalOpen(true);
                        }}
                      >
                        Add Remaining Materials to RFQ
                      </Button>
                    </div>
                  }
                />
              )}

              {/* Comparison table */}
              {showComparison && comparison && (
                <div style={{ marginTop: 8 }}>

                  {/* ── Section header ── */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #1677ff 0%, #0950c8 100%)',
                    borderRadius: '10px 10px 0 0',
                    color: '#fff',
                  }}>
                    <Space>
                      <TrophyOutlined style={{ fontSize: 18 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                          Price &amp; Delivery Comparison
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                          {comparison.vendors.length} vendor{comparison.vendors.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {comparison.rows.length} item{comparison.rows.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </Space>
                    {comparison.is_urgent && (
                      <Tag icon={<ThunderboltOutlined />} color="gold" style={{ marginLeft: 'auto', fontWeight: 600 }}>
                        Urgent — Delivery weighted 70%
                      </Tag>
                    )}
                  </div>

                  {/* ── Comparison table ── */}
                  <div style={{ overflowX: 'auto', border: '1px solid #e0e7ff', borderTop: 'none', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(22,119,255,0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', background: '#f8faff', borderBottom: '2px solid #e0e7ff', color: '#555', fontWeight: 600, minWidth: 160, position: 'sticky', left: 0, zIndex: 3 }}>
                            Material
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', background: '#f8faff', borderBottom: '2px solid #e0e7ff', color: '#555', fontWeight: 600, width: 80, position: 'sticky', left: 160, zIndex: 3 }}>
                            Qty
                          </th>
                          {comparison.vendors.map((v) => {
                            // Each badge type has its own distinct color
                            const accentColor =
                              v.badge === 'Recommended' ? '#722ed1'   // purple
                              : v.badge === 'Best Price' ? '#52c41a'  // green
                              : v.badge === 'Fastest'   ? '#1677ff'   // blue
                              : v.badge === 'Caution'   ? '#fa8c16'   // orange
                              : '#d9d9d9';                             // gray (no badge)
                            const scoreColor =
                              v.score !== null && v.score >= 70 ? { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d' }
                              : v.score !== null && v.score >= 50 ? { bg: '#fff7e6', border: '#ffd591', text: '#d46b08' }
                              : { bg: '#fff1f0', border: '#ffa39e', text: '#cf1322' };
                            const tagColor =
                              v.badge === 'Recommended' ? 'purple'
                              : v.badge === 'Best Price' ? 'success'
                              : v.badge === 'Fastest'   ? 'blue'
                              : v.badge === 'Caution'   ? 'warning'
                              : 'default';
                            return (
                              <th
                                key={v.id}
                                style={{
                                  padding: '10px 16px',
                                  textAlign: 'center',
                                  background: '#f8faff',
                                  borderBottom: '2px solid #e0e7ff',
                                  borderTop: `3px solid ${accentColor}`,
                                  minWidth: 170,
                                  verticalAlign: 'top',
                                }}
                              >
                                {v.badge ? (
                                  <div style={{ marginBottom: 6 }}>
                                    <Tooltip title={v.hint || ''}>
                                      <Tag color={tagColor} style={{ cursor: 'default', fontWeight: 600, fontSize: 11 }}>
                                        {v.badge === 'Recommended' ? '◆ '
                                          : v.badge === 'Best Price' ? '★ '
                                          : v.badge === 'Fastest' ? '⚡ '
                                          : v.badge === 'Caution' ? '⚠ '
                                          : ''}{v.badge}
                                      </Tag>
                                    </Tooltip>
                                  </div>
                                ) : <div style={{ height: 22, marginBottom: 6 }} />}
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{v.supplier_name}</div>
                                {v.score !== null && (
                                  <div style={{
                                    display: 'inline-block', marginTop: 5,
                                    padding: '2px 10px',
                                    background: scoreColor.bg,
                                    border: `1px solid ${scoreColor.border}`,
                                    borderRadius: 12,
                                    fontSize: 11, fontWeight: 700,
                                    color: scoreColor.text,
                                  }}>
                                    Score: {v.score}/100
                                  </div>
                                )}
                                {v.delivery_days != null && (
                                  <div style={{ fontSize: 11, color: '#888', marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                    <CarOutlined /> {v.delivery_days} days delivery
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {[...comparison.rows].sort((a, b) => a.item_name.localeCompare(b.item_name)).map((row, rowIdx) => {
                          const totals = row.assigned_vendor_ids
                            .map((vid) => row.vendor_prices[vid]?.line_total)
                            .filter((t): t is number => t !== null && t !== undefined);
                          const minTotal = totals.length >= 2 ? Math.min(...totals) : null;

                          return (
                            <tr key={row.indent_item_id} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fafbff' }}>
                              <td style={{ padding: '10px 16px', borderBottom: '1px solid #f0f3ff', fontWeight: 500, color: '#1a1a1a', position: 'sticky', left: 0, zIndex: 1, background: rowIdx % 2 === 0 ? '#fff' : '#fafbff' }}>
                                {row.item_name}
                              </td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', borderBottom: '1px solid #f0f3ff', color: '#888', position: 'sticky', left: 160, zIndex: 1, background: rowIdx % 2 === 0 ? '#fff' : '#fafbff' }}>
                                {row.quantity} {row.unit || ''}
                              </td>
                              {comparison.vendors.map((v) => {
                                const isAssigned = row.assigned_vendor_ids.includes(v.id);
                                const vp = row.vendor_prices[v.id];
                                const isLowest = isAssigned && vp?.line_total !== null && vp?.line_total === minTotal;

                                if (!isAssigned) {
                                  return (
                                    <td key={v.id} style={{
                                      padding: '10px 16px',
                                      borderBottom: '1px solid #f0f3ff',
                                      background: 'repeating-linear-gradient(45deg, #f9f9f9, #f9f9f9 4px, #f4f4f4 4px, #f4f4f4 8px)',
                                      textAlign: 'center',
                                    }}>
                                      <span style={{ fontSize: 11, color: '#c0c0c0', fontStyle: 'italic' }}>Doesn&apos;t supply</span>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={v.id} style={{
                                    padding: '10px 16px',
                                    textAlign: 'right',
                                    borderBottom: '1px solid #f0f3ff',
                                    background: isLowest ? '#f6ffed' : undefined,
                                  }}>
                                    {vp?.unit_price !== null && vp?.unit_price !== undefined ? (
                                      <div>
                                        <div style={{ fontWeight: isLowest ? 700 : 500, color: isLowest ? '#389e0d' : '#262626', fontSize: 13 }}>
                                          {isLowest && <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />}
                                          ₹{Number(vp.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        {vp.tax_percent ? (
                                          <div style={{ fontSize: 10, color: isLowest ? '#52c41a' : '#aaa', marginTop: 1 }}>
                                            +{vp.tax_percent}% tax
                                          </div>
                                        ) : null}
                                        {vp.line_total !== null && (
                                          <div style={{ fontSize: 10, color: isLowest ? '#52c41a' : '#bbb', marginTop: 1 }}>
                                            Line: ₹{Number(vp.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#bfbfbf', fontSize: 12 }}>Awaiting quote</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}

                        {/* Grand total row */}
                        <tr>
                          <td colSpan={2} style={{
                            padding: '12px 16px',
                            background: '#1a1f36',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13,
                            borderTop: '2px solid #e0e7ff',
                            borderRadius: '0 0 0 10px',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                          }}>
                            Grand Total
                          </td>
                          {comparison.vendors.map((v, idx) => (
                            <td key={v.id} style={{
                              padding: '12px 16px',
                              textAlign: 'right',
                              background: '#1a1f36',
                              fontWeight: 700,
                              fontSize: 14,
                              color: v.grand_total > 0 ? '#73d13d' : '#555',
                              borderTop: '2px solid #e0e7ff',
                              borderRadius: idx === comparison.vendors.length - 1 ? '0 0 10px 0' : undefined,
                            }}>
                              {v.grand_total > 0
                                ? `₹${v.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── Create PO footer ── */}
                  <div style={{
                    marginTop: 12,
                    padding: '12px 16px',
                    background: '#f0f5ff',
                    borderRadius: 8,
                    border: '1px solid #d6e4ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    <Text style={{ fontSize: 12, color: '#555', flexShrink: 0 }}>
                      Create PO with quoted prices pre-filled:
                    </Text>
                    <Space wrap>
                      {comparison.vendors.map((v) => {
                        const vendorObj = rfq.vendors.find((rv) => rv.id === v.id);
                        return (
                          <Button
                            key={v.id}
                            type="primary"
                            icon={<ShoppingCartOutlined />}
                            style={
                              v.badge === 'Recommended'
                                ? { background: '#722ed1', borderColor: '#722ed1' }
                                : v.badge === 'Best Price'
                                ? { background: '#52c41a', borderColor: '#52c41a' }
                                : undefined
                            }
                            onClick={() => {
                              const vendorItems = indent.items
                                ?.filter((i) => i.status === 'pending')
                                .filter((item) => {
                                  const compRow = comparison.rows.find((r) => r.indent_item_id === item.id);
                                  return compRow?.assigned_vendor_ids.includes(v.id);
                                })
                                .map((item) => {
                                  const compRow = comparison.rows.find((r) => r.indent_item_id === item.id);
                                  const vp = compRow?.vendor_prices[v.id];
                                  return {
                                    indentItemId: item.id,
                                    itemName: item.item_name,
                                    quantity: item.shortage_quantity - item.ordered_quantity,
                                    unitPrice: vp?.unit_price ?? 0,
                                    taxPercent: vp?.tax_percent ?? 0,
                                  };
                                }) || [];
                              if (vendorObj?.supplier_id) {
                                setItemVendors(
                                  Object.fromEntries(
                                    vendorItems.map((i) => [i.indentItemId, vendorObj.supplier_id]),
                                  ),
                                );
                              }
                              form.setFieldsValue({ items: vendorItems });
                              setCreatePOModalOpen(true);
                            }}
                          >
                            {v.badge === 'Recommended' ? '◆ ' : v.badge === 'Best Price' ? '★ ' : ''}{v.supplier_name}
                          </Button>
                        );
                      })}
                    </Space>
                  </div>
                </div>
              )}
            </Space>
          )}
        </Card>
      )}

      {/* Create / Add-to RFQ Modal */}
      <Modal
        title={rfqModalMode === 'add' ? 'Add Remaining Materials to RFQ' : 'Create Request for Quotation'}
        open={rfqModalOpen}
        onCancel={() => { setRfqModalOpen(false); rfqForm.resetFields(); }}
        onOk={handleCreateRfq}
        confirmLoading={rfqModalMode === 'add' ? addVendorsMutation.isPending : createRfqMutation.isPending}
        okText={rfqModalMode === 'add' ? 'Add to RFQ' : 'Create RFQ'}
        width={640}
      >
        {rfqModalMode === 'add' ? (
          <Alert
            type="warning"
            showIcon
            message={`Assigning vendors for ${uncoveredItems.length} uncovered material${uncoveredItems.length > 1 ? 's' : ''}`}
            description="These materials were not covered when the RFQ was first created. Select vendors to add them now."
            className="mb-4"
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Select vendors for each material. Only vendors mapped to that material's category are shown."
            className="mb-4"
          />
        )}
        <Form form={rfqForm} layout="vertical">
          {(rfqModalMode === 'add' ? uncoveredItems : pendingItems).map((item) => {
            const vendors = getSuppliersForItem(item.raw_material_category, item.raw_material_subcategory);
            const hasVendors = vendors.length > 0;
            return (
              <div key={item.id} className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Text strong className="text-sm">{item.item_name}</Text>
                  <Tag color="blue" className="text-xs">{item.shortage_quantity} {item.unit_of_measure}</Tag>
                  {item.raw_material_category && (
                    <Tag color="purple" className="text-xs">{item.raw_material_category}{item.raw_material_subcategory ? ` › ${item.raw_material_subcategory}` : ''}</Tag>
                  )}
                </div>
                <Form.Item
                  name={['itemVendors', String(item.id)]}
                  className="!mb-0"
                  rules={[]}
                >
                  {hasVendors ? (
                    <Select
                      mode="multiple"
                      placeholder="Select vendor(s) for this material..."
                      showSearch
                      filterOption={(input, opt) =>
                        (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      options={vendors.map((s) => ({ value: s.id, label: s.supplier_name }))}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div className="text-orange-500 text-xs py-1">
                      ⚠ No vendors mapped to category &quot;{item.raw_material_category || 'Unknown'}&quot;. Add vendors in the Vendors module first.
                    </div>
                  )}
                </Form.Item>
              </div>
            );
          })}
          {rfqModalMode === 'create' && (
            <Form.Item name="notes" label="Notes (optional)" className="mt-2">
              <Input.TextArea rows={2} placeholder="Any specific requirements..." />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Enter Prices Modal */}
      {quoteModalVendorId && rfq && (
        <Modal
          title={`Enter Prices — ${rfq.vendors.find((v) => v.id === quoteModalVendorId)?.supplier_name}`}
          open={!!quoteModalVendorId}
          onCancel={() => { setQuoteModalVendorId(null); quoteForm.resetFields(); }}
          onOk={() => {
            quoteForm.validateFields().then((vals) => {
              updateQuoteMutation.mutate({
                vendorId: quoteModalVendorId,
                deliveryDays: Number(vals.deliveryDays) || undefined,
                items: (vals.items || []).map((item: any) => ({
                  indentItemId: item.indentItemId,
                  unitPrice: Number(item.unitPrice) || 0,
                  taxPercent: Number(item.taxPercent) || 0,
                })),
              });
            });
          }}
          confirmLoading={updateQuoteMutation.isPending}
          okText="Save Prices"
          width={700}
        >
          <Form form={quoteForm} layout="vertical">
            <Form.Item
              name="deliveryDays"
              label="Expected Delivery"
              rules={[{ required: true, message: 'Enter delivery days' }]}
              style={{ marginBottom: 16 }}
            >
              <InputNumber min={1} max={365} addonAfter="days" style={{ width: 200 }} placeholder="e.g. 7" />
            </Form.Item>
            <Divider className="my-3">Item Prices</Divider>
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
                      render: (_: unknown, __: unknown, idx: number) => (
                        <>
                          <Form.Item name={[idx, 'indentItemId']} hidden><Input /></Form.Item>
                          <Form.Item name={[idx, 'itemName']} noStyle>
                            <Input disabled variant="borderless" style={{ padding: 0 }} />
                          </Form.Item>
                        </>
                      ),
                    },
                    {
                      title: 'Unit Price (₹)',
                      width: 150,
                      render: (_: unknown, __: unknown, idx: number) => (
                        <Form.Item name={[idx, 'unitPrice']} noStyle rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
                        </Form.Item>
                      ),
                    },
                    {
                      title: 'Tax %',
                      width: 100,
                      render: (_: unknown, __: unknown, idx: number) => (
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
      )}

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
                      const itemId = form.getFieldValue(['items', idx, 'indentItemId']);
                      const item = indent.items?.find((i) => i.id === itemId);
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
                      const itemId = form.getFieldValue(['items', idx, 'indentItemId']);
                      const item = indent.items?.find((i) => i.id === itemId);
                      const suppliers = getSuppliersForItem(item?.raw_material_category, item?.raw_material_subcategory);
                      const hasVendors = suppliers.length > 0;
                      return (
                        <div>
                          {hasVendors ? (
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
                              value={item ? itemVendors[item.id] : undefined}
                              onChange={(val) =>
                                setItemVendors((prev) => ({ ...prev, ...(item ? { [item.id]: val } : {}) }))
                              }
                              options={suppliers.map((s) => ({
                                value: s.id,
                                label: s.supplier_name,
                              }))}
                            />
                          ) : (
                            <div style={{ fontSize: 10, color: '#faad14' }}>
                              ⚠ No vendors mapped to &quot;{item?.raw_material_category || 'this category'}&quot;
                            </div>
                          )}
                          {hasVendors && item?.raw_material_category && (
                            <div style={{ fontSize: 10, color: '#52c41a', marginTop: 2 }}>
                              Filtered by: {item.raw_material_category}
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

      <Modal
        title="Set ETA"
        open={etaModalOpen}
        onCancel={() => setEtaModalOpen(false)}
        onOk={() => etaMutation.mutate(etaValue ? etaValue.format('YYYY-MM-DD') : '')}
        okText="Save"
        confirmLoading={etaMutation.isPending}
      >
        <DatePicker
          value={etaValue}
          onChange={(d) => setEtaValue(d)}
          format="DD MMM YYYY"
          style={{ width: '100%' }}
          placeholder="Select ETA date"
        />
      </Modal>

      {/* Create Replacement Indent Modal */}
      <Modal
        title={
          <Space>
            <RetweetOutlined style={{ color: '#fa8c16' }} />
            Create Replacement Indent
          </Space>
        }
        open={replacementModalOpen}
        onCancel={() => { setReplacementModalOpen(false); setReplacementReason(''); }}
        onOk={() => createReplacementMutation.mutate()}
        confirmLoading={createReplacementMutation.isPending}
        okText="Create Replacement Indent"
        okButtonProps={{ style: { backgroundColor: '#fa8c16', borderColor: '#fa8c16' } }}
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          message="A new indent will be created for the rejected items, linked back to this one."
          description={`The replacement indent will reference ${indent.indent_number} so you can trace the full procurement trail. Once goods arrive, receive and process them through the replacement indent.`}
          className="mb-4"
        />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
            Items that will be carried to the replacement indent:
          </div>
          <Table
            dataSource={grnRejectedItems}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Material',
                dataIndex: 'item_name',
                key: 'item_name',
                render: (name: string) => <Text strong>{name}</Text>,
              },
              {
                title: 'Qty Needed',
                key: 'qty',
                align: 'right' as const,
                render: (_: unknown, r: IndentItem) => {
                  const remaining = r.shortage_quantity - r.received_quantity;
                  const qty = remaining > 0 ? remaining : r.shortage_quantity;
                  return <Text type="danger">{qty} {r.unit_of_measure || ''}</Text>;
                },
              },
            ]}
          />
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
            Rejection Reason <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text>
          </div>
          <Input.TextArea
            value={replacementReason}
            onChange={(e) => setReplacementReason(e.target.value)}
            placeholder="e.g. Items received were damaged in transit, wrong specifications, short supply..."
            rows={3}
          />
        </div>
      </Modal>

    </div>
  );
}

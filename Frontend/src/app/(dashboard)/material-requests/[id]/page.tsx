'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography, Card, Button, Table, Tag, Descriptions, Space, message,
  Modal, InputNumber, Select, Spin, Empty, Progress, Alert, Input, Tooltip, Steps,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, SendOutlined,
  WarningOutlined, ExclamationCircleOutlined, ReloadOutlined,
  ShopOutlined, FileTextOutlined, InboxOutlined, GiftOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { getMaterialRequestById, approveMaterialRequest, issueMaterials, issueSingleItem, issuePartialItem, recheckStock, refreshStock } from '@/lib/api/material-requests';
import { getIndentByMR, createIndentFromMR } from '@/lib/api/indents';
import { MR_STATUS_OPTIONS } from '@/types/material-request';
import type { MaterialRequestItem } from '@/types/material-request';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  insufficient: 'volcano',
  partially_issued: 'cyan',
  issued: 'blue',
};

export default function MaterialRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const [approveModal, setApproveModal] = useState(false);
  const [approvals, setApprovals] = useState<Record<number, { qty: number; status: string; notes: string }>>({});
  const [issuingItemId, setIssuingItemId] = useState<number | null>(null);
  const [partialIssueModal, setPartialIssueModal] = useState(false);
  const [partialIssueItem, setPartialIssueItem] = useState<MaterialRequestItem | null>(null);
  const [partialIssueQty, setPartialIssueQty] = useState<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['material-request', id],
    queryFn: () => getMaterialRequestById(id),
    enabled: !!id,
  });

  const mr = data?.data;

  // Always try to fetch indent for this MR (it may exist from previous approval or manual creation)
  const { data: indentData } = useQuery({
    queryKey: ['indent-by-mr', id],
    queryFn: () => getIndentByMR(id),
    enabled: !!mr,
    retry: false,
  });
  const indent = indentData?.data;

  const approveMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(approvals).map(([itemId, val]) => ({
        itemId: Number(itemId),
        quantityApproved: val.status === 'rejected' ? 0 : val.qty,
        status: val.status,
        notes: val.notes || undefined,
      }));
      return approveMaterialRequest(id, items);
    },
    onSuccess: (result: any) => {
      if (result?.indent) {
        message.success(`Approved available items. Indent ${result.indent.indentNumber || ''} created for ${result.insufficientCount || 0} insufficient item(s) — sent to Procurement.`, 8);
      } else {
        message.success('Material request updated — manufacturing team has been notified');
      }
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['indent-by-mr', id] });
      setApproveModal(false);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to approve'),
  });

  // Issue ALL approved items at once
  const issueAllMutation = useMutation({
    mutationFn: () => issueMaterials(id),
    onSuccess: () => {
      message.success('All approved materials issued to manufacturing successfully!');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to issue materials'),
  });

  // Issue a SINGLE item
  const issueItemMutation = useMutation({
    mutationFn: (itemId: number) => issueSingleItem(id, itemId),
    onSuccess: (_, itemId) => {
      const itemName = mr?.items?.find(i => i.id === itemId)?.item_name || 'Item';
      message.success(`"${itemName}" issued to manufacturing successfully`);
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      setIssuingItemId(null);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to issue item');
      setIssuingItemId(null);
    },
  });

  // Recheck stock for rejected items
  const recheckMutation = useMutation({
    mutationFn: () => recheckStock(id),
    onSuccess: (result) => {
      const recheck = result.recheckResult;
      if (recheck && recheck.nowAvailable > 0) {
        const itemNames = recheck.items.map((i) => `${i.itemName} (${i.available} available)`).join(', ');
        message.success(
          `Stock available for ${recheck.nowAvailable} item(s): ${itemNames}. Please review and approve them now.`,
          6,
        );
      } else {
        message.warning('Stock still not available for the rejected items. Please add stock in Inventory and try again.');
      }
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to recheck stock'),
  });

  // Refresh stock for all items
  const refreshStockMutation = useMutation({
    mutationFn: () => refreshStock(id),
    onSuccess: (result) => {
      const refresh = result.refreshResult;
      if (refresh && refresh.updatedCount > 0) {
        const itemDetails = refresh.updatedItems.map((i) => `${i.itemName}: ${i.previousStock} → ${i.currentStock}`).join(', ');
        message.success(`Stock updated for ${refresh.updatedCount} item(s): ${itemDetails}`, 6);
      } else {
        message.info('Stock levels are already up to date.');
      }
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to refresh stock'),
  });

  // Issue PARTIAL quantity of a single item
  const issuePartialMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      issuePartialItem(id, itemId, quantity),
    onSuccess: () => {
      message.success('Partial materials issued successfully');
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-purchase-orders'] });
      setPartialIssueModal(false);
      setPartialIssueItem(null);
      setPartialIssueQty(0);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to issue partial materials'),
  });

  // Create indent for shortage items
  const createIndentMutation = useMutation({
    mutationFn: () => createIndentFromMR(id),
    onSuccess: (result) => {
      const indentNum = result?.data?.indent_number || '';
      message.success(`Indent ${indentNum} created successfully! Redirecting...`, 3);
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
      queryClient.invalidateQueries({ queryKey: ['indent-by-mr', id] });
      if (result?.data?.id) {
        setTimeout(() => router.push(`/procurement/indents/${result.data!.id}`), 1000);
      }
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create indent'),
  });

  const openPartialIssue = (item: MaterialRequestItem) => {
    const remaining = item.quantity_approved - item.quantity_issued;
    setPartialIssueItem(item);
    setPartialIssueQty(Math.floor(remaining / 2) || 1);
    setPartialIssueModal(true);
  };

  const handleRecheck = () => {
    recheckMutation.mutate();
  };

  const handleIssueItem = (item: MaterialRequestItem) => {
    setIssuingItemId(item.id);
    const qtyToIssue = Math.max(item.quantity_approved, item.quantity_requested) - item.quantity_issued;
    Modal.confirm({
      title: `Issue "${item.item_name}" to Manufacturing?`,
      content: (
        <div>
          <p>This will issue <strong>{qtyToIssue} {item.unit_of_measure || 'units'}</strong> from inventory to manufacturing.</p>
          <p className="text-gray-500 text-sm mt-2">Stock will be reduced immediately.</p>
        </div>
      ),
      okText: 'Issue to Manufacturing',
      okType: 'primary',
      onOk: () => issueItemMutation.mutateAsync(item.id),
      onCancel: () => setIssuingItemId(null),
    });
  };

  const openApproveModal = () => {
    if (!mr?.items) return;
    const initial: Record<number, { qty: number; status: string; notes: string }> = {};
    mr.items.forEach((item) => {
      if (item.status === 'pending') {
        const isShort = item.available_stock < item.quantity_requested;
        initial[item.id] = {
          qty: isShort ? item.available_stock : item.quantity_requested,
          status: isShort && item.available_stock === 0 ? 'rejected' : 'approved',
          notes: isShort && item.available_stock === 0 ? 'Insufficient stock' : '',
        };
      }
    });
    setApprovals(initial);
    setApproveModal(true);
  };

  const getStatusColor = (s: string) => MR_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => MR_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  // Detect procurement fulfillment scenarios
  const procurementFulfilledItems = mr?.items?.filter(
    (i) => i.status === 'pending' && i.notes?.includes('Procurement fulfilled'),
  ) || [];
  const hasProcurementFulfillment = procurementFulfilledItems.length > 0;

  // Detect procurement auto-released items (from Release All Required Items button)
  const procurementReleasedItems = mr?.items?.filter(
    (i) => i.status === 'issued' && i.notes?.includes('Released from Indent'),
  ) || [];
  const hasProcurementRelease = procurementReleasedItems.length > 0;

  // Indent status helpers
  const indentClosed = indent?.status === 'closed';
  const indentHasReceivedItems = indent?.items?.some((i) => i.received_quantity > 0);

  const itemColumns: ColumnsType<MaterialRequestItem> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: 'Material',
      key: 'product',
      render: (_, record) => (
        <div>
          <Text strong>{record.item_name}</Text>
          {record.raw_material_code && <div className="text-xs text-gray-400 font-mono">{record.raw_material_code}</div>}
          {!record.raw_material_code && record.product_code && <div className="text-xs text-gray-400">Code: {record.product_code}</div>}
          {record.notes?.includes('Procurement fulfilled') && (
            <Tag color="green" className="mt-1" style={{ fontSize: 10 }}>
              <GiftOutlined /> Procured
            </Tag>
          )}
          {record.notes?.includes('Released from Indent') && (
            <Tag color="blue" className="mt-1" style={{ fontSize: 10 }}>
              <CheckCircleOutlined /> Released by Procurement
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Requested Qty',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 120,
      align: 'center',
      render: (qty: number, record: MaterialRequestItem) => (
        <Text strong>{qty} {record.unit_of_measure || ''}</Text>
      ),
    },
    {
      title: 'Available Stock',
      dataIndex: 'available_stock',
      key: 'available_stock',
      width: 130,
      align: 'center',
      render: (stock: number, record: MaterialRequestItem) => {
        const isShort = stock < record.quantity_requested;
        const wasProcured = record.notes?.includes('Procurement fulfilled') || record.notes?.includes('Released from Indent');
        return (
          <div>
            <Text type={isShort ? 'danger' : 'success'} strong>{stock} {record.unit_of_measure || ''}</Text>
            {isShort && !wasProcured && (
              <div className="text-xs text-red-500">Short by {record.quantity_requested - stock}</div>
            )}
            {!isShort && wasProcured && (
              <div className="text-xs text-green-600">Restocked</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Stock Status',
      key: 'stock_status',
      width: 110,
      align: 'center',
      render: (_: unknown, record: MaterialRequestItem) => {
        const isAvailable = record.available_stock >= record.quantity_requested;
        const wasProcured = record.notes?.includes('Procurement fulfilled') || record.notes?.includes('Released from Indent');
        if (wasProcured) {
          return <Tag color="green"><InboxOutlined /> Procured</Tag>;
        }
        return isAvailable
          ? <Tag color="green">Available</Tag>
          : <Tag color="red"><WarningOutlined /> Shortage</Tag>;
      },
    },
    {
      title: 'Approved',
      dataIndex: 'quantity_approved',
      key: 'quantity_approved',
      width: 100,
      align: 'center',
      render: (qty: number) => qty > 0 ? <Text strong className="text-green-600">{qty}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Issued',
      dataIndex: 'quantity_issued',
      key: 'quantity_issued',
      width: 100,
      align: 'center',
      render: (qty: number) => qty > 0 ? <Text strong className="text-blue-600">{qty}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Fulfillment',
      key: 'fulfillment',
      width: 120,
      render: (_, record) => {
        if (record.quantity_requested === 0) return <Text type="secondary">-</Text>;
        const pct = Math.min(100, Math.round((record.quantity_issued / record.quantity_requested) * 100));
        return (
          <div>
            <Progress percent={pct} size="small" showInfo={false}
              strokeColor={pct === 100 ? '#52c41a' : pct > 0 ? '#1677ff' : '#d9d9d9'} />
            <div className="text-xs text-center">{record.quantity_issued}/{record.quantity_requested}</div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (s: string) => <Tag color={ITEM_STATUS_COLORS[s] || 'default'}>{s?.toUpperCase()}</Tag>,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      render: (notes: string) => notes ? <Text type="secondary" className="text-xs">{notes}</Text> : '-',
    },
    {
      title: 'Action',
      key: 'action',
      width: 180,
      align: 'center',
      render: (_, record) => {
        const canIssue = (record.status === 'approved' || record.status === 'partially_issued') && record.quantity_issued < record.quantity_approved;
        const isFullyIssued = record.status === 'issued';
        const remaining = record.quantity_approved - record.quantity_issued;
        const remainingVsRequested = record.quantity_requested - record.quantity_issued;
        const hasRemainingToIssue = isFullyIssued && remainingVsRequested > 0;

        if (isFullyIssued && !hasRemainingToIssue) {
          return <Tag color="blue" icon={<CheckCircleOutlined />}>Fully Issued</Tag>;
        }
        if (hasRemainingToIssue) {
          return (
            <Space direction="vertical" size={4}>
              <Tag color="cyan" className="!m-0">Issued {record.quantity_issued}/{record.quantity_requested}</Tag>
              <Tooltip title={`Issue remaining ${remainingVsRequested} ${record.unit_of_measure || 'units'}`}>
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={issuingItemId === record.id && issueItemMutation.isPending}
                  onClick={() => handleIssueItem({ ...record, quantity_approved: record.quantity_requested } as MaterialRequestItem)}
                >
                  Issue Remaining ({remainingVsRequested})
                </Button>
              </Tooltip>
              <Button
                size="small"
                onClick={() => openPartialIssue({ ...record, quantity_approved: record.quantity_requested } as MaterialRequestItem)}
              >
                Issue Partial
              </Button>
            </Space>
          );
        }
        if (record.status === 'partially_issued') {
          return (
            <Space direction="vertical" size={4}>
              <Tag color="cyan" className="!m-0">Partial ({record.quantity_issued}/{record.quantity_approved})</Tag>
              <Tooltip title={`Issue remaining ${remaining} ${record.unit_of_measure || 'units'}`}>
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={issuingItemId === record.id && issueItemMutation.isPending}
                  onClick={() => handleIssueItem(record)}
                >
                  Issue Remaining
                </Button>
              </Tooltip>
              <Button
                size="small"
                onClick={() => openPartialIssue(record)}
              >
                Issue Partial
              </Button>
            </Space>
          );
        }
        if (canIssue) {
          return (
            <Space direction="vertical" size={4}>
              <Tooltip title={`Issue all ${remaining} ${record.unit_of_measure || 'units'} to manufacturing`}>
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={issuingItemId === record.id && issueItemMutation.isPending}
                  onClick={() => handleIssueItem(record)}
                >
                  Issue to Mfg
                </Button>
              </Tooltip>
              <Button
                size="small"
                onClick={() => openPartialIssue(record)}
              >
                Issue Partial
              </Button>
            </Space>
          );
        }
        if (record.status === 'insufficient') {
          return (
            <Space direction="vertical" size={4}>
              <Tag color="volcano" className="!m-0">Insufficient</Tag>
              <Tag color="blue" className="!m-0 cursor-pointer" onClick={() => indent && router.push(`/procurement/indents/${indent.id}`)}>
                Sent to Procurement
              </Tag>
            </Space>
          );
        }
        if (record.status === 'rejected') {
          return (
            <Space direction="vertical" size={4}>
              <Tag color="red" className="!m-0">Not Available</Tag>
              <Tooltip title="Recheck stock availability">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={recheckMutation.isPending}
                  onClick={handleRecheck}
                >
                  Recheck
                </Button>
              </Tooltip>
            </Space>
          );
        }
        // Pending items — show if they were procured
        if (record.status === 'pending' && record.notes?.includes('Procurement fulfilled')) {
          return (
            <Space direction="vertical" size={4}>
              <Tag color="green" className="!m-0"><GiftOutlined /> Ready</Tag>
              <Text type="secondary" className="text-xs">Approve to issue</Text>
            </Space>
          );
        }
        return <Tag color="orange">Pending</Tag>;
      },
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }

  if (!mr) {
    return <Empty description="Material request not found" />;
  }

  const hasPendingItems = mr.items?.some((i) => i.status === 'pending');
  const hasApprovedItems = mr.items?.some((i) => i.status === 'approved' && i.quantity_issued < i.quantity_approved);
  const pendingItems = mr.items?.filter((i) => i.status === 'pending') || [];
  const shortItems = pendingItems.filter(i => i.available_stock < i.quantity_requested);
  const allShortItems = mr.items?.filter(i => i.available_stock < i.quantity_requested && i.status !== 'issued' && i.status !== 'approved') || [];
  const isManufacturingRequest = mr.purpose?.includes('Manufacturing') || mr.sales_order_id;
  const approvedNotIssuedCount = mr.items?.filter(i => i.status === 'approved' && i.quantity_issued < i.quantity_approved).length || 0;
  const issuedButRemainingItems = mr.items?.filter(i => i.status === 'issued' && i.quantity_issued < i.quantity_requested) || [];
  const canCreateIndent = allShortItems.length > 0 && !indent;
  const allItemsIssued = mr.items?.every(i => i.quantity_issued >= i.quantity_requested);

  // Workflow step for this MR
  const getMRWorkflowStep = () => {
    if (allItemsIssued) return 3;
    if (hasApprovedItems || approvedNotIssuedCount > 0) return 2;
    if (mr.status === 'approved' || mr.status === 'partially_approved') return 2;
    if (hasProcurementRelease) return 3;
    if (indent && (indentClosed || indentHasReceivedItems)) return 1;
    if (indent) return 1;
    return 0;
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/material-requests')} type="text" />
          <div>
            <Title level={4} className="!mb-0">{mr.request_number}</Title>
            {mr.job_card_name && (
              <Text className="text-sm text-gray-600">{mr.job_card_name}{mr.job_card_number ? ` (${mr.job_card_number})` : ''}</Text>
            )}
          </div>
          {mr.order_number && (
            <Tag color="blue" style={{ fontSize: 14, padding: '2px 12px' }}>PO: {mr.order_number}</Tag>
          )}
          <Tag color={getStatusColor(mr.status)} style={{ fontSize: 14, padding: '2px 12px' }}>
            {getStatusLabel(mr.status)}
          </Tag>
          {isManufacturingRequest && <Tag color="purple">Manufacturing Request</Tag>}
        </div>
        <Space wrap>
          {/* Refresh Stock Button — always visible */}
          <Button
            icon={<SyncOutlined spin={refreshStockMutation.isPending} />}
            onClick={() => refreshStockMutation.mutate()}
            loading={refreshStockMutation.isPending}
            size="large"
          >
            Refresh Stock
          </Button>
          {hasPendingItems && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={openApproveModal} size="large">
              {hasProcurementFulfillment ? 'Approve Procured Items' : 'Review & Approve'}
            </Button>
          )}
          {canCreateIndent && (
            <Button
              type="primary"
              danger
              icon={<FileTextOutlined />}
              size="large"
              loading={createIndentMutation.isPending}
              onClick={() => {
                Modal.confirm({
                  title: 'Create Indent for Shortage Items',
                  content: (
                    <div>
                      <p className="mb-2">This will create an indent for <strong>{allShortItems.length} item(s)</strong> with insufficient stock:</p>
                      <ul className="list-disc pl-5">
                        {allShortItems.map(i => (
                          <li key={i.id}>
                            <strong>{i.item_name}</strong>: needs {i.quantity_requested}, available {i.available_stock} — <span className="text-red-500">short by {i.quantity_requested - i.available_stock}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-gray-500">You can edit the indent before sending to procurement.</p>
                    </div>
                  ),
                  okText: 'Create Indent',
                  okType: 'primary',
                  width: 500,
                  onOk: () => createIndentMutation.mutateAsync(),
                });
              }}
            >
              Create Indent ({allShortItems.length} short)
            </Button>
          )}
          {indent && (
            <Button
              icon={<FileTextOutlined />}
              size="large"
              onClick={() => router.push(`/procurement/indents/${indent.id}`)}
              className="border-blue-400 text-blue-600"
            >
              View Indent ({indent.indent_number})
            </Button>
          )}
          {hasApprovedItems && approvedNotIssuedCount > 0 && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Issue All Approved Materials to Manufacturing',
                  content: `This will issue all ${approvedNotIssuedCount} approved item(s) from inventory to manufacturing. Continue?`,
                  okText: 'Issue All to Manufacturing',
                  onOk: () => issueAllMutation.mutateAsync(),
                });
              }}
              loading={issueAllMutation.isPending}
              size="large"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Issue All to Manufacturing ({approvedNotIssuedCount})
            </Button>
          )}
        </Space>
      </div>

      {/* Workflow Progress - show when indent exists */}
      {indent && (
        <Card className="mb-4">
          <Steps
            current={getMRWorkflowStep()}
            size="small"
            items={[
              {
                title: 'Shortage Identified',
                description: `Indent ${indent.indent_number} created`,
              },
              {
                title: 'Procurement',
                description: indentClosed ? 'Materials procured' : indentHasReceivedItems ? 'Partially received' : 'Waiting for PO',
              },
              {
                title: 'Approve & Issue',
                description: hasApprovedItems ? 'Ready to issue' : hasProcurementFulfillment ? 'Ready to approve' : hasProcurementRelease ? 'Auto-issued' : 'Waiting',
              },
              {
                title: 'Issued to Manufacturing',
                description: allItemsIssued || hasProcurementRelease ? 'Complete' : 'Pending',
              },
            ]}
          />
        </Card>
      )}

      {/* PROCUREMENT RELEASED ALERT — Items auto-issued by procurement */}
      {hasProcurementRelease && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          className="mb-4"
          style={{ border: '2px solid #52c41a', backgroundColor: '#f6ffed' }}
          message={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Procurement Released Stock — All Items Issued to Manufacturing!
            </span>
          }
          description={
            <div>
              <p className="mb-2">
                The procurement team has procured and released <strong>{procurementReleasedItems.length} item(s)</strong> directly to inventory.
                Materials have been <strong>auto-approved and issued</strong> to manufacturing.
              </p>
              <div className="bg-white rounded p-3 mb-3">
                {procurementReleasedItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b last:border-0">
                    <Text strong>{item.item_name}</Text>
                    <Space>
                      <Tag color="blue">Issued: {item.quantity_issued} {item.unit_of_measure || ''}</Tag>
                      <Tag color="green" icon={<CheckCircleOutlined />}>Complete</Tag>
                    </Space>
                  </div>
                ))}
              </div>
              <Space>
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => refreshStockMutation.mutate()}
                  loading={refreshStockMutation.isPending}
                >
                  Refresh Stock Levels
                </Button>
                {indent && (
                  <Button icon={<FileTextOutlined />} onClick={() => router.push(`/procurement/indents/${indent.id}`)}>
                    View Indent Details
                  </Button>
                )}
              </Space>
            </div>
          }
        />
      )}

      {/* PROCUREMENT FULFILLED ALERT - Items pending re-approval */}
      {hasProcurementFulfillment && (
        <Alert
          type="success"
          showIcon
          icon={<GiftOutlined />}
          className="mb-4"
          style={{ border: '2px solid #52c41a', backgroundColor: '#f6ffed' }}
          message={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Procurement Team Fulfilled Indent Requirements!
            </span>
          }
          description={
            <div>
              <p className="mb-2">
                <strong>{procurementFulfilledItems.length} item(s)</strong> have been procured and stock is now available.
                These items were previously marked as insufficient and have been restocked via indent <strong>{indent?.indent_number}</strong>.
              </p>
              <div className="bg-white rounded p-3 mb-3">
                {procurementFulfilledItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b last:border-0">
                    <Text strong>{item.item_name}</Text>
                    <Space>
                      <Tag color="green">Available: {item.available_stock}</Tag>
                      <Tag color="blue">Needs: {item.quantity_requested}</Tag>
                    </Space>
                  </div>
                ))}
              </div>
              <Space>
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => refreshStockMutation.mutate()}
                  loading={refreshStockMutation.isPending}
                >
                  Refresh Stock Levels
                </Button>
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={openApproveModal}>
                  Approve Now & Issue to Manufacturing
                </Button>
                {indent && (
                  <Button icon={<FileTextOutlined />} onClick={() => router.push(`/procurement/indents/${indent.id}`)}>
                    View Indent Details
                  </Button>
                )}
              </Space>
            </div>
          }
        />
      )}

      {/* Alerts */}
      {hasPendingItems && isManufacturingRequest && !hasProcurementFulfillment && !hasProcurementRelease && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="mb-4"
          message="Manufacturing Approval Required"
          description="The manufacturing team is waiting for your approval. Check material availability for each item and approve or reject. The manufacturing team cannot proceed until you respond."
        />
      )}

      {shortItems.length > 0 && hasPendingItems && !hasProcurementFulfillment && !hasProcurementRelease && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          className="mb-4"
          message={`${shortItems.length} item(s) have insufficient stock`}
          description={
            <div>
              <div>{shortItems.map(i => `${i.item_name}: needs ${i.quantity_requested}, available ${i.available_stock}`).join(' | ')}</div>
              <Button
                icon={<SyncOutlined />}
                size="small"
                className="mt-2"
                onClick={() => refreshStockMutation.mutate()}
                loading={refreshStockMutation.isPending}
              >
                Refresh Stock
              </Button>
            </div>
          }
        />
      )}

      {mr.status === 'approved' && isManufacturingRequest && (
        <Alert type="success" showIcon className="mb-4"
          message="All materials approved — ready to issue to manufacturing" />
      )}

      {mr.status === 'rejected' && (
        <Alert type="error" showIcon className="mb-4"
          message="This request was rejected — the manufacturing team has been notified"
          description="Click 'Recheck Stock' to check if inventory has been restocked. Items with available stock will be reset for re-approval."
          action={
            <Space>
              <Button size="small" icon={<SyncOutlined />} loading={refreshStockMutation.isPending} onClick={() => refreshStockMutation.mutate()}>
                Refresh Stock
              </Button>
              <Button size="small" icon={<ReloadOutlined />} loading={recheckMutation.isPending} onClick={handleRecheck}>
                Recheck Stock
              </Button>
              <Button size="small" icon={<ShopOutlined />} onClick={() => router.push('/inventory')} className="border-blue-400 text-blue-600">
                Visit Inventory
              </Button>
            </Space>
          }
        />
      )}

      {mr.status === 'partially_approved' && isManufacturingRequest && !hasProcurementFulfillment && !hasProcurementRelease && (
        <Alert type="info" showIcon className="mb-4"
          message="Partially approved — some items were rejected or sent to procurement."
          description="Click 'Refresh Stock' to check latest stock levels, or 'Recheck Stock' to reset rejected items for re-approval."
          action={
            <Space>
              <Button size="small" icon={<SyncOutlined />} loading={refreshStockMutation.isPending} onClick={() => refreshStockMutation.mutate()}>
                Refresh Stock
              </Button>
              <Button size="small" icon={<ReloadOutlined />} loading={recheckMutation.isPending} onClick={handleRecheck}>
                Recheck Stock
              </Button>
              <Button size="small" icon={<ShopOutlined />} onClick={() => router.push('/inventory')} className="border-blue-400 text-blue-600">
                Visit Inventory
              </Button>
            </Space>
          }
        />
      )}

      {hasApprovedItems && !hasProcurementFulfillment && !hasProcurementRelease && (
        <Alert type="info" showIcon icon={<SendOutlined />} className="mb-4"
          message={`${approvedNotIssuedCount} item(s) approved and ready to issue to manufacturing — use the "Issue" button on each row or "Issue All" at the top`}
        />
      )}

      {issuedButRemainingItems.length > 0 && (
        <Alert type="warning" showIcon icon={<ExclamationCircleOutlined />} className="mb-4"
          message={`${issuedButRemainingItems.length} item(s) partially issued — remaining quantity not yet issued`}
          description={issuedButRemainingItems.map(i => `${i.item_name}: issued ${i.quantity_issued} of ${i.quantity_requested} (${i.quantity_requested - i.quantity_issued} remaining)`).join(' | ')}
        />
      )}

      {allItemsIssued && !hasProcurementRelease && (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="mb-4"
          message="All materials have been issued to manufacturing. Production can now begin!"
        />
      )}

      {mr.status === 'fulfilled' && allItemsIssued && (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="mb-4"
          style={{ border: '2px solid #52c41a' }}
          message={
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Material Request Fulfilled — All items issued to manufacturing. Production can proceed!
            </span>
          }
        />
      )}

      {indent && !hasProcurementFulfillment && !hasProcurementRelease && indent.status !== 'closed' && (
        <Alert
          type="info"
          showIcon
          icon={<ShopOutlined />}
          className="mb-4"
          message={`Indent ${indent.indent_number} — ${indent.status === 'pending' ? 'Waiting for Purchase Order' : indent.status === 'partially_ordered' ? 'Partially Ordered' : indent.status === 'fully_ordered' ? 'Ordered, Waiting for Delivery' : indent.status}`}
          description={
            <div>
              <span>Items with insufficient stock have been sent to the Procurement team.</span>
              <Button type="link" size="small" onClick={() => router.push(`/procurement/indents/${indent.id}`)}>
                View Indent →
              </Button>
            </div>
          }
        />
      )}

      {/* Request Details */}
      <Card className="card-shadow mb-4" title="Request Details">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" labelStyle={{ fontWeight: 600, color: '#555' }}>
          <Descriptions.Item label="Request Number">
            <Text strong>{mr.request_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Request Date">
            {mr.request_date ? new Date(mr.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(mr.status)}>{getStatusLabel(mr.status)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Requested By">
            {mr.requested_by_name || '-'}
          </Descriptions.Item>
          {mr.job_card_name && (
            <Descriptions.Item label="Job Card">
              <Text strong className="text-purple-600">{mr.job_card_name}</Text>
              {mr.job_card_number && <span className="text-xs text-gray-400 ml-1">({mr.job_card_number})</span>}
            </Descriptions.Item>
          )}
          {mr.order_number && (
            <Descriptions.Item label="Purchase Order">
              <Text strong className="text-blue-600">{mr.order_number}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Purpose">
            {mr.purpose || '-'}
          </Descriptions.Item>
          {mr.approved_date && (
            <Descriptions.Item label="Approved Date">
              {new Date(mr.approved_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Total Items">
            <Text strong>{mr.items?.length || 0}</Text>
          </Descriptions.Item>
          {mr.notes && (
            <Descriptions.Item label="Notes" span={2}>{mr.notes}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Items Table */}
      <Card className="card-shadow" title={`Requested Items (${mr.items?.length || 0})`}
        extra={
          <Button
            icon={<SyncOutlined spin={refreshStockMutation.isPending} />}
            size="small"
            onClick={() => refreshStockMutation.mutate()}
            loading={refreshStockMutation.isPending}
          >
            Refresh Stock
          </Button>
        }
      >
        <Table
          columns={itemColumns}
          dataSource={mr.items || []}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
          rowClassName={(record) => {
            if (record.notes?.includes('Released from Indent')) return 'bg-blue-50';
            if (record.notes?.includes('Procurement fulfilled') && record.status === 'pending') return 'bg-green-50';
            if (record.status === 'issued') return 'bg-blue-50';
            if (record.status === 'approved') return 'bg-green-50';
            if (record.status === 'rejected') return 'bg-red-50';
            return '';
          }}
          summary={(pageData) => {
            const totalRequested = pageData.reduce((sum, item) => sum + item.quantity_requested, 0);
            const totalApproved = pageData.reduce((sum, item) => sum + item.quantity_approved, 0);
            const totalIssued = pageData.reduce((sum, item) => sum + item.quantity_issued, 0);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#fafafa' }}>
                  <Table.Summary.Cell index={0} />
                  <Table.Summary.Cell index={1}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="center"><Text strong>{totalRequested}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="center" />
                  <Table.Summary.Cell index={4} align="center" />
                  <Table.Summary.Cell index={5} align="center"><Text strong>{totalApproved}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="center"><Text strong>{totalIssued}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9} />
                  <Table.Summary.Cell index={10} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* Approve Modal */}
      <Modal
        title={
          <span>
            <CheckCircleOutlined className="text-blue-500 mr-2" />
            {hasProcurementFulfillment ? 'Approve Procured Materials' : 'Review & Approve Materials'}
          </span>
        }
        open={approveModal}
        onCancel={() => setApproveModal(false)}
        width={850}
        maskClosable={false}
        footer={
          <div className="flex justify-between items-center">
            <Text type="secondary" className="text-xs">
              {Object.values(approvals).filter(a => a.status === 'approved').length} approved,{' '}
              {Object.values(approvals).filter(a => a.status === 'rejected').length} rejected
            </Text>
            <Space>
              <Button onClick={() => setApproveModal(false)}>Cancel</Button>
              <Button type="primary" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                Submit Decision
              </Button>
            </Space>
          </div>
        }
      >
        {hasProcurementFulfillment && (
          <Alert type="success" showIcon icon={<GiftOutlined />} className="mb-4"
            message="These items have been procured by the procurement team. Stock is now available — approve and issue to manufacturing."
          />
        )}
        <Alert type="warning" showIcon className="mb-4"
          message="Approving will deduct stock from inventory immediately. Ensure the approved quantity does not exceed available stock."
        />
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold">Material</th>
                <th className="text-center p-3 font-semibold w-20">Requested</th>
                <th className="text-center p-3 font-semibold w-20">In Stock</th>
                <th className="text-center p-3 font-semibold w-28">Approve Qty</th>
                <th className="text-center p-3 font-semibold w-32">Decision</th>
                <th className="text-left p-3 font-semibold w-44">Reason (if rejected)</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map(item => {
                const approval = approvals[item.id];
                const isShort = item.available_stock < item.quantity_requested;
                const isRejected = approval?.status === 'rejected';
                const wasProcured = item.notes?.includes('Procurement fulfilled');

                return (
                  <tr key={item.id} className={`border-t ${isRejected ? 'bg-red-50' : wasProcured ? 'bg-green-50' : isShort ? 'bg-yellow-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium">{item.item_name}</div>
                      {item.product_code && <div className="text-xs text-gray-400">{item.product_code}</div>}
                      {wasProcured && <Tag color="green" className="mt-1" style={{ fontSize: 10 }}><GiftOutlined /> Procured</Tag>}
                    </td>
                    <td className="p-3 text-center">{item.quantity_requested} {item.unit_of_measure || ''}</td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${isShort ? 'text-red-500' : 'text-green-600'}`}>
                        {item.available_stock}
                      </span>
                      {isShort && <div className="text-[10px] text-red-400">Short by {item.quantity_requested - item.available_stock}</div>}
                    </td>
                    <td className="p-3 text-center">
                      <InputNumber
                        min={0}
                        max={Math.min(item.quantity_requested, item.available_stock)}
                        value={approval?.qty ?? 0}
                        disabled={isRejected}
                        onChange={(val) => setApprovals(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], qty: val || 0 },
                        }))}
                        size="small"
                        style={{ width: 80 }}
                      />
                      {!isRejected && approval?.qty > item.available_stock && (
                        <div className="text-[10px] text-red-500 mt-1">Exceeds stock!</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Select
                        value={approval?.status || 'approved'}
                        onChange={(val) => setApprovals(prev => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: val,
                            qty: val === 'rejected' ? 0 : (prev[item.id]?.qty || item.quantity_requested),
                          },
                        }))}
                        size="small"
                        style={{ width: 120 }}
                      >
                        <Select.Option value="approved"><Tag color="green" className="!m-0">Available</Tag></Select.Option>
                        <Select.Option value="rejected"><Tag color="red" className="!m-0">Not Available</Tag></Select.Option>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Input
                        size="small"
                        placeholder={isRejected ? 'Why not available...' : 'Optional notes...'}
                        value={approval?.notes || ''}
                        onChange={e => setApprovals(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], notes: e.target.value },
                        }))}
                        className={isRejected ? 'border-red-300' : ''}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Partial Issue Modal */}
      <Modal
        title={<span><SendOutlined className="text-cyan-500 mr-2" />Issue Partial — {partialIssueItem?.item_name}</span>}
        open={partialIssueModal}
        onCancel={() => { setPartialIssueModal(false); setPartialIssueItem(null); }}
        onOk={() => {
          if (partialIssueItem && partialIssueQty > 0) {
            issuePartialMutation.mutate({ itemId: partialIssueItem.id, quantity: partialIssueQty });
          }
        }}
        okText="Issue Partial"
        confirmLoading={issuePartialMutation.isPending}
        width={450}
      >
        {partialIssueItem && (
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Text type="secondary">Required Qty:</Text><br /><Text strong>{partialIssueItem.quantity_requested} {partialIssueItem.unit_of_measure || ''}</Text></div>
                <div><Text type="secondary">Approved Qty:</Text><br /><Text strong className="text-green-600">{partialIssueItem.quantity_approved} {partialIssueItem.unit_of_measure || ''}</Text></div>
                <div><Text type="secondary">Already Issued:</Text><br /><Text strong className="text-blue-600">{partialIssueItem.quantity_issued} {partialIssueItem.unit_of_measure || ''}</Text></div>
                <div><Text type="secondary">Remaining:</Text><br /><Text strong className="text-orange-600">{partialIssueItem.quantity_approved - partialIssueItem.quantity_issued} {partialIssueItem.unit_of_measure || ''}</Text></div>
              </div>
            </div>
            <div>
              <Text strong className="block mb-2">Quantity to Issue Now:</Text>
              <InputNumber
                min={1}
                max={partialIssueItem.quantity_approved - partialIssueItem.quantity_issued}
                value={partialIssueQty}
                onChange={(v) => setPartialIssueQty(Number(v) || 1)}
                style={{ width: '100%' }}
                size="large"
                addonAfter={partialIssueItem.unit_of_measure || 'units'}
              />
            </div>
            <Alert type="info" showIcon className="mt-3" message={`Remaining after this issue: ${(partialIssueItem.quantity_approved - partialIssueItem.quantity_issued - partialIssueQty)} ${partialIssueItem.unit_of_measure || 'units'}`} />
          </div>
        )}
      </Modal>
    </div>
  );
}

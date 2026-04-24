'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography, Card, Button, Table, Tag, Descriptions, Space, message,
  Modal, InputNumber, Select, Spin, Empty, Progress, Alert, Input, Tooltip, Steps, DatePicker,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, SendOutlined,
  WarningOutlined, ExclamationCircleOutlined, ReloadOutlined,
  ShopOutlined, FileTextOutlined, InboxOutlined, GiftOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMaterialRequestById, approveMaterialRequest, issueMaterials, issueSingleItem, issuePartialItem, recheckStock, refreshStock, updateMaterialRequestETA } from '@/lib/api/material-requests';
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
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [etaValue, setEtaValue] = useState<dayjs.Dayjs | null>(null);

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

  const etaMutation = useMutation({
    mutationFn: (expectedDelivery: string) => updateMaterialRequestETA(id, expectedDelivery),
    onSuccess: () => {
      message.success('ETA updated');
      setEtaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['material-request', id] });
    },
    onError: () => message.error('Failed to update ETA'),
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
          qty: item.quantity_requested,
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
  // An item is "short" if it can't be fully covered from existing stock or already-issued qty.
  // Also include items explicitly marked insufficient/rejected, or approved-for-less-than-requested.
  const allShortItems = mr.items?.filter(i => {
    if (i.status === 'issued' && i.quantity_issued >= i.quantity_requested) return false;
    if (i.status === 'insufficient' || i.status === 'rejected') return true;
    const shortOfStock = Number(i.available_stock || 0) + Number(i.quantity_issued || 0) < Number(i.quantity_requested);
    const partialApproval = i.status === 'approved' && Number(i.quantity_approved || 0) < Number(i.quantity_requested);
    return shortOfStock || partialApproval;
  }) || [];
  const isManufacturingRequest = mr.purpose?.includes('Manufacturing') || mr.sales_order_id;
  const approvedNotIssuedCount = mr.items?.filter(i => i.status === 'approved' && i.quantity_issued < i.quantity_approved).length || 0;
  const issuedButRemainingItems = mr.items?.filter(i => i.status === 'issued' && i.quantity_issued < i.quantity_requested) || [];
  // Allow raising a new indent if there are shortages AND no open indent exists.
  const openIndentExists = !!indent && !indentClosed;
  const canCreateIndent = allShortItems.length > 0 && !openIndentExists;
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

  // One primary status message + one primary action, based on current state.
  const renderStatusLine = () => {
    if (hasProcurementRelease) {
      return { tone: 'success', title: 'Procurement released stock — all items auto-issued to manufacturing.' };
    }
    if (hasProcurementFulfillment) {
      return { tone: 'success', title: `${procurementFulfilledItems.length} procured item(s) ready — approve to issue.` };
    }
    if (mr.status === 'rejected') {
      return { tone: 'error', title: 'Request rejected — check inventory and recheck stock.' };
    }
    if (mr.status === 'fulfilled' && allItemsIssued) {
      return { tone: 'success', title: 'Fulfilled — all items issued to manufacturing.' };
    }
    if (allItemsIssued) {
      return { tone: 'success', title: 'All materials issued. Production can proceed.' };
    }
    if (shortItems.length > 0 && hasPendingItems) {
      return { tone: 'warning', title: `${shortItems.length} item(s) short of stock — review & approve available, raise indent for shortages.` };
    }
    if (hasPendingItems && isManufacturingRequest) {
      return { tone: 'info', title: 'Awaiting your approval for manufacturing materials.' };
    }
    if (hasApprovedItems) {
      return { tone: 'info', title: `${approvedNotIssuedCount} item(s) approved — issue to manufacturing.` };
    }
    if (mr.status === 'partially_approved') {
      return { tone: 'info', title: 'Partially approved. Refresh or recheck stock to re-process.' };
    }
    return { tone: 'info', title: `Status: ${getStatusLabel(mr.status)}` };
  };

  const statusLine = renderStatusLine();
  const toneBorder = {
    success: '#d9f7be',
    warning: '#ffe7ba',
    error: '#ffccc7',
    info: '#d9d9d9',
  } as Record<string, string>;
  const toneDot = {
    success: '#52c41a',
    warning: '#fa8c16',
    error: '#ff4d4f',
    info: '#8c8c8c',
  } as Record<string, string>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/material-requests')} type="text" />
          <div>
            <div className="flex items-center gap-2">
              <Title level={5} className="!mb-0">{mr.request_number}</Title>
              <Tag className="!m-0" style={{ borderColor: '#d9d9d9', background: '#fafafa', color: '#595959' }}>
                {getStatusLabel(mr.status)}
              </Tag>
              {mr.order_number && (
                <Tag className="!m-0" style={{ borderColor: '#d9d9d9', background: '#fff', color: '#262626' }}>
                  PO: {mr.order_number}
                </Tag>
              )}
              {isManufacturingRequest && (
                <Tag className="!m-0" style={{ borderColor: '#d9d9d9', background: '#fff', color: '#595959' }}>
                  Manufacturing
                </Tag>
              )}
            </div>
            {mr.job_card_name && (
              <Text type="secondary" className="text-xs">
                {mr.job_card_name}{mr.job_card_number ? ` · ${mr.job_card_number}` : ''}
              </Text>
            )}
          </div>
        </div>
        <Space wrap>
          <Button
            size="middle"
            icon={<SyncOutlined spin={refreshStockMutation.isPending} />}
            onClick={() => refreshStockMutation.mutate()}
            loading={refreshStockMutation.isPending}
          >
            Refresh Stock
          </Button>
          {hasPendingItems && (
            <Button
              size="middle"
              icon={<CheckCircleOutlined />}
              onClick={openApproveModal}
              style={{ background: '#000', color: '#fff', borderColor: '#000' }}
            >
              {hasProcurementFulfillment ? 'Approve Procured' : 'Review & Approve'}
            </Button>
          )}
        </Space>
      </div>

      {/* Single consolidated status line */}
      <div
        className="mb-4 rounded flex items-center gap-3 px-3 py-2 text-sm"
        style={{ border: `1px solid ${toneBorder[statusLine.tone]}`, background: '#fff' }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 999,
            background: toneDot[statusLine.tone],
            flexShrink: 0,
          }}
        />
        <span className="text-gray-700">{statusLine.title}</span>
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

      {/* Secondary actions — shown only for rejected/partially_approved states (restock recovery). */}
      {(mr.status === 'rejected' || mr.status === 'partially_approved') && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="small" icon={<ReloadOutlined />} loading={recheckMutation.isPending} onClick={handleRecheck}>
            Recheck Stock
          </Button>
          <Button size="small" icon={<ShopOutlined />} onClick={() => router.push('/inventory')}>
            Visit Inventory
          </Button>
        </div>
      )}

      {/* Shortages strip — always show when items still need procurement */}
      {allShortItems.length > 0 && (
        <Card size="small" className="mb-4 border-gray-300">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div>
              <Text strong className="text-sm block">Short of stock · {allShortItems.length} item(s)</Text>
              <Text type="secondary" className="text-xs">
                {openIndentExists
                  ? `Open indent ${indent?.indent_number} · status: ${indent?.status}`
                  : 'Raise an indent to procure the remaining quantity.'}
              </Text>
            </div>
            <Space>
              {canCreateIndent && (
                <Button
                  size="middle"
                  icon={<FileTextOutlined />}
                  loading={createIndentMutation.isPending}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Create indent for shortage items',
                      content: (
                        <div>
                          <p className="mb-2">Indent will be raised for <strong>{allShortItems.length} item(s)</strong>:</p>
                          <ul className="list-disc pl-5">
                            {allShortItems.map(i => (
                              <li key={i.id}>
                                <strong>{i.item_name}</strong>: need {i.quantity_requested}, available {i.available_stock}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ),
                      okText: 'Create Indent',
                      width: 500,
                      onOk: () => createIndentMutation.mutateAsync(),
                    });
                  }}
                  style={{ background: '#000', color: '#fff', borderColor: '#000' }}
                >
                  Create Indent ({allShortItems.length})
                </Button>
              )}
              {indent && (
                <Button size="middle" icon={<FileTextOutlined />} onClick={() => router.push(`/procurement/indents/${indent.id}`)}>
                  View Indent ({indent.indent_number})
                </Button>
              )}
            </Space>
          </div>
          <div className="flex flex-wrap gap-2">
            {allShortItems.map((i) => {
              const shortBy = Math.max(0, Number(i.quantity_requested) - Number(i.available_stock || 0) - Number(i.quantity_issued || 0));
              return (
                <div key={i.id} className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 bg-white text-xs">
                  <span className="font-medium">{i.item_name}</span>
                  <span className="text-gray-500">
                    need {i.quantity_requested} {i.unit_of_measure || ''} · have {i.available_stock}
                    {shortBy > 0 && <> · short {shortBy}</>}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Received & ready to issue — when procurement delivered, items are ready */}
      {hasApprovedItems && approvedNotIssuedCount > 0 && (
        <Card size="small" className="mb-4 border-gray-300">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <Text strong className="text-sm block">Ready to issue · {approvedNotIssuedCount} item(s)</Text>
              <Text type="secondary" className="text-xs">
                Approved materials are in stock. Issue from the row below or issue all at once.
              </Text>
            </div>
            <Button
              size="middle"
              icon={<SendOutlined />}
              loading={issueAllMutation.isPending}
              onClick={() => {
                Modal.confirm({
                  title: 'Issue All Approved Materials',
                  content: `Issue all ${approvedNotIssuedCount} approved item(s) to manufacturing?`,
                  okText: 'Issue All',
                  onOk: () => issueAllMutation.mutateAsync(),
                });
              }}
              style={{ background: '#000', color: '#fff', borderColor: '#000' }}
            >
              Issue All ({approvedNotIssuedCount})
            </Button>
          </div>
        </Card>
      )}

      {/* Procurement released — inline summary */}
      {(hasProcurementRelease || hasProcurementFulfillment) && (
        <Card size="small" className="mb-4 border-gray-300">
          <Text strong className="text-sm block mb-2">
            {hasProcurementRelease ? 'Procurement released stock (auto-issued)' : 'Procurement fulfilled — ready to approve'}
          </Text>
          <div className="flex flex-wrap gap-2">
            {(hasProcurementRelease ? procurementReleasedItems : procurementFulfilledItems).map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 bg-white text-xs">
                <span className="font-medium">{item.item_name}</span>
                <span className="text-gray-500">
                  {hasProcurementRelease
                    ? `Issued ${item.quantity_issued} ${item.unit_of_measure || ''}`
                    : `Stock ${item.available_stock} / need ${item.quantity_requested}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Request Details — compact monochrome */}
      <Card size="small" className="mb-4 border-gray-300">
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small" colon={false}
          labelStyle={{ color: '#8c8c8c', fontSize: 12 }}
          contentStyle={{ color: '#262626', fontSize: 13 }}
        >
          <Descriptions.Item label="Request date">
            {mr.request_date ? new Date(mr.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="ETA">
            <Space size={4}>
              {mr.expected_delivery ? (
                <Text type={dayjs(mr.expected_delivery).isBefore(dayjs(), 'day') ? 'danger' : undefined} className="text-xs">
                  {dayjs(mr.expected_delivery).format('DD MMM YYYY')}
                  {dayjs(mr.expected_delivery).isBefore(dayjs(), 'day') && ' · Overdue'}
                </Text>
              ) : <Text type="secondary" className="text-xs">Not set</Text>}
              <Button size="small" type="link" className="!px-1 !py-0 !h-auto"
                onClick={() => { setEtaValue(mr.expected_delivery ? dayjs(mr.expected_delivery) : null); setEtaModalOpen(true); }}>
                edit
              </Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Requested by">
            {mr.requested_by_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Total items">
            {mr.items?.length || 0}
          </Descriptions.Item>
          {mr.job_card_name && (
            <Descriptions.Item label="Job card">
              {mr.job_card_name}{mr.job_card_number && ` · ${mr.job_card_number}`}
            </Descriptions.Item>
          )}
          {mr.approved_date && (
            <Descriptions.Item label="Approved">
              {new Date(mr.approved_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Purpose" span={2}>
            {mr.purpose || '-'}
          </Descriptions.Item>
          {mr.notes && (
            <Descriptions.Item label="Notes" span={4}>
              {mr.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Items Table */}
      <Card size="small" className="border-gray-300" title={
        <span className="text-sm">Requested materials · {mr.items?.length || 0}</span>
      }>
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
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import {
  Typography, Button, Input, Space, Table, Tag, Badge, Tabs,
  Modal, Form, InputNumber, Progress, message, Card, Alert,
  Select, Spin, Statistic, Row, Col, DatePicker,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, PlayCircleOutlined,
  EditOutlined, FileTextOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, InboxOutlined,
  ClockCircleOutlined, WarningOutlined,
  PlusOutlined,
  SendOutlined, StopOutlined, SyncOutlined,
  ToolOutlined,
  AppstoreOutlined,
  RocketOutlined,
  UnlockOutlined,
  LockOutlined,
  UserOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addJobCardProgress,
  jobCardDispatchAction,
  moveToNextStage,
  getJobCardProcesses,
} from '@/lib/api/manufacturing';
import {
  getManufacturingPurchaseOrders,
  createBom,
  getBomByPurchaseOrder,
  createJobCardsFromBom,
  sendForApproval,
  updateManufacturingDetails,
} from '@/lib/api/bom';
import { acknowledgeHold } from '@/lib/api/sales-orders';
import { getStageMasters } from '@/lib/api/stage-masters';
import { getMaterialRequestById } from '@/lib/api/material-requests';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import { JobCard, JOB_CARD_STATUS_OPTIONS } from '@/types/manufacturing';
import { ManufacturingPO, Bom, BomItem } from '@/types/bom';
import { MaterialRequestItem } from '@/types/material-request';
import { StageMaster } from '@/types/stage-master';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

/* ─── Workflow status ──────────────────────────────────────────────── */

type WorkflowStatus =
  | 'pending_review'
  | 'pending_approval'
  | 'rejected'
  | 'approved'
  | 'bom_created'
  | 'job_card_created'
  | 'in_production'
  | 'completed'
  | 'ready_for_approval'
  | 'approved_for_dispatch'
  | 'dispatched'
  | 'on_hold';

const WORKFLOW_STATUS_MAP: Record<WorkflowStatus, { label: string; color: string; step: number }> = {
  on_hold:               { label: 'ON HOLD',               color: 'warning',    step: -1 },
  pending_review:        { label: 'Pending Review',        color: 'default',    step: 0 },
  bom_created:           { label: 'BOM Created',           color: 'cyan',       step: 1 },
  pending_approval:      { label: 'Sent for Approval',    color: 'processing', step: 2 },
  rejected:              { label: 'Rejected',              color: 'error',      step: 2 },
  approved:              { label: 'Approved',              color: 'success',    step: 3 },
  job_card_created:      { label: 'Job Cards Created',     color: 'blue',       step: 4 },
  in_production:         { label: 'In Production',         color: 'blue',       step: 5 },
  completed:             { label: 'Production Done',       color: 'cyan',       step: 6 },
  ready_for_approval:    { label: 'Ready',                 color: 'gold',       step: 7 },
  approved_for_dispatch: { label: 'Approved for Dispatch', color: 'purple',     step: 8 },
  dispatched:            { label: 'Dispatched',            color: 'green',      step: 9 },
};

function getWorkflowStatus(po: ManufacturingPO): WorkflowStatus {
  // On hold takes priority over everything
  if (po.status === 'on_hold') return 'on_hold';

  const approval = po.material_approval_status || 'none';
  const jcs = po.job_cards || [];

  if (jcs.length > 0) {
    const allDispatched = jcs.every(j => j.status === 'dispatched');
    if (allDispatched) return 'dispatched';
    const anyApprovedForDispatch = jcs.some(j => j.status === 'approved_for_dispatch');
    if (anyApprovedForDispatch) return 'approved_for_dispatch';
    const anyReadyForApproval = jcs.some(j => ['ready_for_approval', 'completed_production'].includes(j.status));
    if (anyReadyForApproval) return 'ready_for_approval';
    const allCompleted = jcs.every(j => ['completed_production', 'ready_for_approval', 'approved_for_dispatch', 'dispatched'].includes(j.status));
    if (allCompleted) return 'completed';
    const anyInProcess = jcs.some(j => ['in_process', 'partially_completed'].includes(j.status));
    if (anyInProcess) return 'in_production';
    return 'job_card_created';
  }

  if (approval === 'approved') return 'approved';
  if (approval === 'pending_approval') return 'pending_approval';
  if (approval === 'rejected') return 'rejected';
  if (po.bom_count > 0) return 'bom_created';
  return 'pending_review';
}

type StatusGroup = 'all' | 'needs_action' | 'in_progress' | 'done';

function getStatusGroup(ws: WorkflowStatus): StatusGroup {
  if (['on_hold', 'pending_review', 'rejected', 'bom_created', 'approved'].includes(ws)) return 'needs_action';
  if (['pending_approval', 'job_card_created', 'in_production'].includes(ws)) return 'in_progress';
  if (['completed', 'ready_for_approval', 'approved_for_dispatch', 'dispatched'].includes(ws)) return 'done';
  return 'needs_action';
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Normal', color: 'default' },
  1: { label: 'High', color: 'orange' },
  2: { label: 'Urgent', color: 'red' },
};

const fmt = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function ManufacturingPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<StatusGroup>('all');

  // Modals
  const [selectedPO, setSelectedPO] = useState<ManufacturingPO | null>(null);
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [bomViewModalOpen, setBomViewModalOpen] = useState(false);
  const [currentBom, setCurrentBom] = useState<Bom | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalForm] = Form.useForm();
  const [editingItems, setEditingItems] = useState<Array<{ id: number; itemName: string; quantity: number; description: string; unitOfMeasure: string; priority: number }>>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editItems, setEditItems] = useState<Array<{ id: number; itemName: string; quantity: number; description: string; unitOfMeasure: string }>>([]);
  const [jobCardModalOpen, setJobCardModalOpen] = useState(false);
  const [jobCardForm] = Form.useForm();
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [progressForm] = Form.useForm();

  // Job card material items
  const [jobCardMaterials, setJobCardMaterials] = useState<MaterialRequestItem[]>([]);
  const [jobCardMaterialsLoading, setJobCardMaterialsLoading] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [existingJobCardMrItemIds, setExistingJobCardMrItemIds] = useState<number[]>([]);

  // Dispatch modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchJob, setDispatchJob] = useState<JobCard | null>(null);
  const [dispatchForm] = Form.useForm();

  /* ── Queries ── */
  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ['mfg-purchase-orders', enterpriseId],
    queryFn: () => getManufacturingPurchaseOrders({ pageSize: 500 }),
    enabled: !!enterpriseId,
    refetchInterval: 30000,
  });

  const { data: stagesData } = useQuery({
    queryKey: ['stage-masters'],
    queryFn: getStageMasters,
    enabled: !!enterpriseId,
  });
  const stageMasters = stagesData?.data?.filter((s: StageMaster) => s.is_active) || [];

  /* ── Computed ── */
  const allPOs = useMemo(() => {
    return (poData?.data || []).map(po => ({
      ...po,
      workflow_status: getWorkflowStatus(po),
    }));
  }, [poData?.data]);

  const filteredPOs = useMemo(() => {
    let list = allPOs;
    if (activeTab !== 'all') {
      list = list.filter(po => getStatusGroup(po.workflow_status) === activeTab);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(po =>
        po.order_number?.toLowerCase().includes(q) ||
        po.customer_name?.toLowerCase().includes(q) ||
        po.items?.some(i => i.item_name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allPOs, activeTab, searchText]);

  const groupCounts = useMemo(() => {
    const c = { needs_action: 0, in_progress: 0, done: 0 };
    allPOs.forEach(po => {
      const g = getStatusGroup(po.workflow_status);
      if (g in c) c[g as keyof typeof c]++;
    });
    return c;
  }, [allPOs]);

  const onHoldPOs = useMemo(() =>
    allPOs.filter(po => po.workflow_status === 'on_hold'),
  [allPOs]);

  const unacknowledgedHolds = useMemo(() =>
    onHoldPOs.filter(po => !po.hold_acknowledged),
  [onHoldPOs]);

  /* ── Mutations ── */
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['mfg-purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['all-job-cards'] });
  };

  const sendForApprovalMutation = useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: any }) => sendForApproval(poId, data),
    onSuccess: () => {
      message.success('Sent for inventory approval');
      setApprovalModalOpen(false);
      approvalForm.resetFields();
      invalidateAll();

    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: any }) => updateManufacturingDetails(poId, data),
    onSuccess: () => {
      message.success('Details updated');
      setEditModalOpen(false);
      editForm.resetFields();
      invalidateAll();

    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const createBomMutation = useMutation({
    mutationFn: (poId: number) => createBom({ purchaseOrderId: poId }),
    onSuccess: (result) => {
      message.success('BOM created');
      setCurrentBom(result.data || null);
      setBomModalOpen(false);
      setBomViewModalOpen(true);
      invalidateAll();

    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create BOM'),
  });

  const createJobCardsMutation = useMutation({
    mutationFn: ({ bomId, jobCards, customMaterials }: { bomId: number; jobCards: any[]; customMaterials?: Array<{ rawMaterialId?: number; itemName: string; requiredQuantity: number; unitOfMeasure?: string }> }) => createJobCardsFromBom(bomId, jobCards, customMaterials),
    onSuccess: (res: any) => {
      message.success(res?.message || 'Job card created');
      setJobCardModalOpen(false);
      jobCardForm.resetFields();
      setSelectedMaterialId(null);
      // Re-fetch BOM to update linked job cards list
      if (selectedPO) {
        getBomByPurchaseOrder(selectedPO.id).then(r => setCurrentBom(r.data || null)).catch(() => {});
      }
      invalidateAll();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: any }) =>
      addJobCardProgress(id, { progressDate: dayjs().format('YYYY-MM-DD'), quantityCompleted: values.quantityCompleted, remarks: values.remarks }),
    onSuccess: () => {
      message.success('Progress updated');
      progressForm.resetFields();
      setProgressModalOpen(false);
      setSelectedJob(null);
      invalidateAll();

    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ jobId, action, remarks, dispatchDate }: { jobId: number; action: 'approve' | 'dispatch' | 'hold' | 'unhold' | 'request_modification'; remarks?: string; dispatchDate?: string }) => jobCardDispatchAction(jobId, action, remarks, dispatchDate),
    onSuccess: (_, vars) => {
      message.success({ approve: 'Approved for dispatch', dispatch: 'Dispatched', hold: 'On hold', unhold: 'Hold removed', request_modification: 'Modification requested' }[vars.action]);
      if (vars.action === 'dispatch') { setDispatchModalOpen(false); setDispatchJob(null); dispatchForm.resetFields(); }
      invalidateAll();

    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const completeCurrentStageMutation = useMutation({
    mutationFn: ({ jobId, notes }: { jobId: number; notes?: string }) => moveToNextStage(jobId, notes),
    onSuccess: () => {
      message.success('Stage completed');
      setProgressModalOpen(false);
      setSelectedJob(null);
      setStageProgressData([]);
      invalidateAll();

    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to complete stage'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (poId: number) => acknowledgeHold(poId),
    onSuccess: () => {
      message.success('Hold acknowledged — Purchase Order team has been notified');
      invalidateAll();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to acknowledge'),
  });

  const [stageProgressData, setStageProgressData] = useState<any[]>([]);
  const [stageProgressLoading, setStageProgressLoading] = useState(false);

  const openStageProgress = async (job: JobCard) => {
    setSelectedJob(job);
    setProgressModalOpen(true);
    setStageProgressLoading(true);
    try {
      const res = await getJobCardProcesses(job.id);
      setStageProgressData((res.data || []).sort((a: any, b: any) => a.sequence_order - b.sequence_order));
    } catch {
      setStageProgressData([]);
    }
    setStageProgressLoading(false);
  };


  /* ── Handlers ── */
  const openSendForApproval = (po: ManufacturingPO) => {
    setSelectedPO(po);
    setEditingItems(po.items.map(item => ({ id: item.id, itemName: item.item_name, quantity: item.quantity, description: '', unitOfMeasure: item.unit_of_measure || 'units', priority: 0 })));
    approvalForm.setFieldsValue({ priority: po.manufacturing_priority || 0, notes: po.manufacturing_notes || '', expectedDelivery: po.expected_delivery ? dayjs(po.expected_delivery) : undefined });
    setApprovalModalOpen(true);
  };

  const openEditDetails = (po: ManufacturingPO) => {
    setSelectedPO(po);
    setEditItems(po.items.map(item => ({ id: item.id, itemName: item.item_name, quantity: item.quantity, description: '', unitOfMeasure: item.unit_of_measure || 'units' })));
    editForm.setFieldsValue({ priority: po.manufacturing_priority || 0, notes: po.manufacturing_notes || '', expectedDelivery: po.expected_delivery ? dayjs(po.expected_delivery) : undefined });
    setEditModalOpen(true);
  };

  const handleSendForApproval = (values: any) => {
    if (!selectedPO) return;
    const sortedItems = [...editingItems].sort((a, b) => b.priority - a.priority);
    sendForApprovalMutation.mutate({ poId: selectedPO.id, data: {
      priority: values.priority, notes: values.notes,
      expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
      items: sortedItems.map(item => ({ itemId: item.id, itemName: item.itemName, quantity: item.quantity, description: item.description, unitOfMeasure: item.unitOfMeasure, priority: item.priority })),
    }});
  };

  const handleUpdateDetails = (values: any) => {
    if (!selectedPO) return;
    updateDetailsMutation.mutate({ poId: selectedPO.id, data: {
      priority: values.priority, notes: values.notes,
      expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
      items: editItems.map(item => ({ itemId: item.id, itemName: item.itemName, quantity: item.quantity, description: item.description, unitOfMeasure: item.unitOfMeasure })),
    }});
  };

  const openBomView = async (po: ManufacturingPO) => {
    setSelectedPO(po);
    if (po.bom_count > 0) {
      try { const r = await getBomByPurchaseOrder(po.id); setCurrentBom(r.data || null); setBomViewModalOpen(true); }
      catch { message.error('Failed to load BOM'); }
    } else { setBomModalOpen(true); }
  };

  const handleCreateJobCards = (values: any) => {
    if (!currentBom) return;
    createJobCardsMutation.mutate({
      bomId: currentBom.id,
      jobCards: [{ priority: values.priority || 3 }],
    });
  };


  const getStatusColor = (status: string) => JOB_CARD_STATUS_OPTIONS.find(s => s.value === status)?.color || 'default';
  const getStatusLabel = (status: string) => JOB_CARD_STATUS_OPTIONS.find(s => s.value === status)?.label || status;

  /* ── BOM item columns ── */
  const bomItemColumns = [
    { title: 'Material', key: 'material', render: (_: any, r: BomItem) => <div><div className="font-medium">{r.item_name}</div>{r.product_code && <div className="text-xs text-gray-400">{r.product_code}</div>}</div> },
    { title: 'Required', dataIndex: 'required_quantity', width: 100, align: 'center' as const, render: (qty: number, r: BomItem) => `${qty} ${r.unit_of_measure || ''}` },
  ];

  /* ── Helper: next action for a PO ── */
  const getNextAction = (po: ManufacturingPO & { workflow_status: WorkflowStatus }) => {
    const ws = po.workflow_status;
    switch (ws) {
      case 'on_hold':
        return po.hold_acknowledged ? (
          <Tag color="warning" icon={<CheckCircleOutlined />}>Hold Acknowledged</Tag>
        ) : (
          <Button size="small" type="primary" danger icon={<PauseCircleOutlined />}
            loading={acknowledgeMutation.isPending}
            onClick={() => acknowledgeMutation.mutate(po.id)}>
            Acknowledge Hold
          </Button>
        );
      case 'pending_review':
        return (
          <Space size={4} wrap>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditDetails(po)}>Edit</Button>
            {hasPermission('orders', 'create') && <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={() => router.push(`/manufacturing/po/${po.id}`)}>Create BOM</Button>}
          </Space>
        );
      case 'bom_created':
        return (
          <Space size={4} wrap>
            <Button size="small" icon={<FileTextOutlined />} onClick={() => openBomView(po)}>BOM</Button>
            <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => openSendForApproval(po)}>Send for Approval</Button>
          </Space>
        );
      case 'pending_approval':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>Awaiting Approval</Tag>;
      case 'rejected':
        return (
          <Space size={4} wrap>
            <Button size="small" type="primary" danger icon={<SendOutlined />} onClick={() => openSendForApproval(po)}>Resend</Button>
          </Space>
        );
      case 'approved':
        return (
          <Space size={4} wrap>
            {hasPermission('orders', 'create') && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => router.push(`/manufacturing/po/${po.id}`)}>Create Job Cards</Button>}
          </Space>
        );
      case 'job_card_created':
        return <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/po/${po.id}`)}>View</Button>;
      case 'in_production':
        return <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/po/${po.id}`)}>View</Button>;
      case 'ready_for_approval':
        return <Tag color="gold" icon={<ClockCircleOutlined />}>Waiting for Approval</Tag>;
      case 'approved_for_dispatch':
        return <Tag color="purple" icon={<CheckCircleOutlined />}>Approved for Dispatch</Tag>;
      case 'dispatched':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Dispatched</Tag>;
      default:
        return <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/po/${po.id}`)}>View</Button>;
    }
  };

  /* ═══════════════ RENDER ═══════════════ */

  if (poLoading) return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
        <div>
          <h1 className="page-header-title"><ToolOutlined style={{ marginRight: 8, color: '#2563eb' }} />Manufacturing Overview</h1>
          <p className="page-header-subtitle">Manage production orders and job cards</p>
        </div>
        <Input placeholder="Search PO, customer, product..." value={searchText} onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} allowClear style={{ width: 300 }} />
      </div>

      {/* Summary */}
      <Row gutter={[12, 12]} className="mb-4">
        {[
          { key: 'all' as StatusGroup, label: 'Total Orders', count: allPOs.length, color: '#1677ff', icon: <AppstoreOutlined /> },
          { key: 'needs_action' as StatusGroup, label: 'Needs Action', count: groupCounts.needs_action, color: '#faad14', icon: <ExclamationCircleOutlined /> },
          { key: 'in_progress' as StatusGroup, label: 'In Progress', count: groupCounts.in_progress, color: '#1677ff', icon: <ToolOutlined /> },
          { key: 'done' as StatusGroup, label: 'Done / Dispatched', count: groupCounts.done, color: '#52c41a', icon: <CheckCircleOutlined /> },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card size="small" className={`card-shadow cursor-pointer ${activeTab === s.key ? 'border-blue-500 border-2' : ''}`}
              onClick={() => setActiveTab(activeTab === s.key ? 'all' : s.key)} bodyStyle={{ padding: '12px 8px' }}>
              <Statistic title={<span className="text-xs">{s.label}</span>} value={s.count} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 22 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* On-Hold Alert */}
      {unacknowledgedHolds.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<PauseCircleOutlined />}
          className="mb-4"
          style={{ border: '2px solid #ffd591', background: '#fff7e6' }}
          message={
            <strong>
              <PauseCircleOutlined className="mr-1" />
              {unacknowledgedHolds.length} Purchase Order{unacknowledgedHolds.length > 1 ? 's' : ''} — Hold Request from PO Team
            </strong>
          }
          description={
            <div className="mt-2">
              {unacknowledgedHolds.map(po => (
                <div
                  key={po.id}
                  className="flex items-center gap-3 py-2 px-3 mb-2 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <Text strong className="text-orange-700">{po.order_number}</Text>
                    <Text type="secondary" className="ml-2">{po.customer_name}</Text>
                    {po.hold_reason && (
                      <div className="text-sm text-gray-600 mt-0.5">
                        <strong>Reason:</strong> {po.hold_reason}
                      </div>
                    )}
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={acknowledgeMutation.isPending}
                    onClick={() => acknowledgeMutation.mutate(po.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
              <div className="text-xs text-gray-400 mt-1">
                All production for these orders has been paused. Click &quot;Acknowledge&quot; to confirm you have received the hold request.
              </div>
            </div>
          }
        />
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={k => setActiveTab(k as StatusGroup)} items={[
        { key: 'all', label: <span><InboxOutlined /> All ({allPOs.length})</span> },
        { key: 'needs_action', label: <span><ExclamationCircleOutlined /> Needs Action ({groupCounts.needs_action})</span> },
        { key: 'in_progress', label: <span><ToolOutlined /> In Progress ({groupCounts.in_progress})</span> },
        { key: 'done', label: <span><CheckCircleOutlined /> Done ({groupCounts.done})</span> },
      ]} />

      {/* Orders List */}
      <Card className="card-shadow">
          <div className="flex justify-between items-center mb-3">
            <Text type="secondary" className="text-xs">{filteredPOs.length} order(s)</Text>
          </div>
          {filteredPOs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">{searchText ? 'No matching orders.' : 'No orders in this category.'}</div>
          ) : (
            <div className="space-y-3">
              {filteredPOs.map(po => {
                const ws = WORKFLOW_STATUS_MAP[po.workflow_status];
                const jcs = po.job_cards || [];
                const completedJobs = jcs.filter(j => ['completed_production', 'ready_for_approval', 'approved_for_dispatch', 'dispatched'].includes(j.status)).length;
                const pct = jcs.length > 0 ? Math.round((completedJobs / jcs.length) * 100) : 0;
                const priority = PRIORITY_LABELS[po.manufacturing_priority || 0];

                return (
                  <div key={po.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    po.workflow_status === 'on_hold' ? 'border-orange-300 bg-orange-50 border-2' :
                    po.workflow_status === 'rejected' ? 'border-red-200 bg-red-50' :
                    po.workflow_status === 'dispatched' ? 'border-green-200 bg-green-50' :
                    po.workflow_status === 'approved_for_dispatch' ? 'border-purple-200 bg-purple-50' :
                    po.workflow_status === 'ready_for_approval' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200'
                  }`} onClick={() => router.push(`/manufacturing/po/${po.id}`)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-blue-600 text-base">{po.order_number}</span>
                          <Tag color={ws.color}>{ws.label}</Tag>
                          {(po.manufacturing_priority || 0) > 0 && <Tag color={priority.color}>{priority.label}</Tag>}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">{po.customer_name}</div>
                        <div className="text-xs text-gray-400">
                          {po.order_date ? dayjs(po.order_date).format('DD MMM YYYY') : ''}
                          {po.expected_delivery && <span> · Due: {dayjs(po.expected_delivery).format('DD MMM YYYY')}</span>}
                          <span> · {fmt(po.grand_total)}</span>
                        </div>
                        {po.workflow_status === 'on_hold' && (
                          <div className="mt-1 px-2 py-1 bg-orange-100 rounded text-sm text-orange-700">
                            <PauseCircleOutlined className="mr-1" />
                            <strong>ON HOLD</strong>
                            {po.hold_reason && <span> — {po.hold_reason}</span>}
                          </div>
                        )}
                        <div className="mt-1 text-sm text-gray-500">
                          {po.items.slice(0, 3).map((item, i) => (
                            <span key={i}>{i > 0 && ' · '}{item.item_name} x{item.quantity}</span>
                          ))}
                          {po.items.length > 3 && <span className="text-gray-400"> +{po.items.length - 3} more</span>}
                        </div>
                      </div>
                      {jcs.length > 0 && (
                        <div className="w-32 text-center">
                          <div className="text-xs text-gray-400 mb-1">{completedJobs}/{jcs.length} jobs</div>
                          <Progress percent={pct} size="small" showInfo={false}
                            strokeColor={po.workflow_status === 'dispatched' ? '#52c41a' : pct === 100 ? '#52c41a' : '#1677ff'} />
                          <div className="text-xs text-gray-400">{pct}%</div>
                        </div>
                      )}
                      <div className="flex items-center" onClick={e => e.stopPropagation()}>{getNextAction(po)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

      {/* ═══════ MODALS ═══════ */}

      {/* Send for Approval */}
      <Modal title={<span><SendOutlined className="text-blue-500 mr-2" />Send for Inventory Approval — {selectedPO?.order_number}</span>}
        open={approvalModalOpen} onCancel={() => { setApprovalModalOpen(false); setSelectedPO(null); approvalForm.resetFields(); }}
        onOk={() => approvalForm.submit()} okText="Send for Approval" confirmLoading={sendForApprovalMutation.isPending} width={700}>
        <Alert type="info" showIcon className="mb-4" message="Review and edit items below. The Inventory team will check material availability and approve or reject each item." />
        <Form form={approvalForm} layout="vertical" onFinish={handleSendForApproval}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="priority" label="Priority"><Select options={[{ value: 0, label: 'Normal' }, { value: 1, label: 'High' }, { value: 2, label: 'Urgent' }]} /></Form.Item></Col>
            <Col span={16}><Form.Item name="expectedDelivery" label="Expected Delivery"><DatePicker className="w-full" format="DD MMM YYYY" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes for Inventory Team"><TextArea rows={2} placeholder="Any special instructions for the inventory team..." /></Form.Item>
        </Form>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Items (sorted by priority):</span>
          <Space size={4}>
            {(() => { const u = editingItems.filter(i => i.priority === 2).length; const h = editingItems.filter(i => i.priority === 1).length; const n = editingItems.filter(i => i.priority === 0).length; return (<>{u > 0 && <Tag color="red">{u} Urgent</Tag>}{h > 0 && <Tag color="orange">{h} High</Tag>}{n > 0 && <Tag color="blue">{n} Normal</Tag>}</>); })()}
          </Space>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-center p-2 w-8">#</th><th className="text-left p-2">Item</th><th className="text-center p-2 w-24">Qty</th><th className="text-left p-2 w-24">Unit</th><th className="text-left p-2 w-32">Priority</th><th className="text-left p-2">Specs</th></tr></thead>
            <tbody>{[...editingItems].sort((a, b) => b.priority - a.priority).map((item, sortedIdx) => {
              const idx = editingItems.findIndex(i => i.id === item.id);
              const rowBg = item.priority === 2 ? 'bg-red-50' : item.priority === 1 ? 'bg-orange-50' : '';
              const borderColor = item.priority === 2 ? 'border-l-red-500' : item.priority === 1 ? 'border-l-orange-400' : 'border-l-blue-300';
              return (
              <tr key={item.id} className={`border-t border-l-4 ${borderColor} ${rowBg}`}>
                <td className="p-2 text-center text-gray-400 text-xs">{sortedIdx + 1}</td>
                <td className="p-2"><Input size="small" value={item.itemName} onChange={e => { const u = [...editingItems]; u[idx] = { ...u[idx], itemName: e.target.value }; setEditingItems(u); }} /></td>
                <td className="p-2"><InputNumber size="small" min={1} value={item.quantity} className="w-full" onChange={v => { const u = [...editingItems]; u[idx] = { ...u[idx], quantity: Number(v) || 1 }; setEditingItems(u); }} /></td>
                <td className="p-2"><Input size="small" value={item.unitOfMeasure} onChange={e => { const u = [...editingItems]; u[idx] = { ...u[idx], unitOfMeasure: e.target.value }; setEditingItems(u); }} /></td>
                <td className="p-2">
                  <Select size="small" className="w-full" value={item.priority} onChange={v => { const u = [...editingItems]; u[idx] = { ...u[idx], priority: v }; setEditingItems(u); }}
                    options={[
                      { value: 2, label: <Tag color="red" className="m-0">Urgent</Tag> },
                      { value: 1, label: <Tag color="orange" className="m-0">High</Tag> },
                      { value: 0, label: <Tag color="blue" className="m-0">Normal</Tag> },
                    ]}
                  />
                </td>
                <td className="p-2"><Input size="small" value={item.description} placeholder="Specifications..." onChange={e => { const u = [...editingItems]; u[idx] = { ...u[idx], description: e.target.value }; setEditingItems(u); }} /></td>
              </tr>
            );})}</tbody>
          </table>
        </div>
      </Modal>

      {/* Edit Details */}
      <Modal title={<span><EditOutlined className="text-orange-500 mr-2" />Edit — {selectedPO?.order_number}</span>}
        open={editModalOpen} onCancel={() => { setEditModalOpen(false); setSelectedPO(null); editForm.resetFields(); }}
        onOk={() => editForm.submit()} okText="Save" confirmLoading={updateDetailsMutation.isPending} width={700}>
        <Form form={editForm} layout="vertical" onFinish={handleUpdateDetails}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="priority" label="Priority"><Select options={[{ value: 0, label: 'Normal' }, { value: 1, label: 'High' }, { value: 2, label: 'Urgent' }]} /></Form.Item></Col>
            <Col span={16}><Form.Item name="expectedDelivery" label="Expected Delivery"><DatePicker className="w-full" format="DD MMM YYYY" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes"><TextArea rows={2} /></Form.Item>
        </Form>
        <div className="mb-2 font-semibold">Items:</div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-2">Item</th><th className="text-center p-2 w-24">Qty</th><th className="text-left p-2 w-24">Unit</th><th className="text-left p-2">Specs</th></tr></thead>
            <tbody>{editItems.map((item, idx) => (
              <tr key={item.id} className="border-t">
                <td className="p-2"><Input size="small" value={item.itemName} onChange={e => { const u = [...editItems]; u[idx] = { ...u[idx], itemName: e.target.value }; setEditItems(u); }} /></td>
                <td className="p-2"><InputNumber size="small" min={1} value={item.quantity} className="w-full" onChange={v => { const u = [...editItems]; u[idx] = { ...u[idx], quantity: Number(v) || 1 }; setEditItems(u); }} /></td>
                <td className="p-2"><Input size="small" value={item.unitOfMeasure} onChange={e => { const u = [...editItems]; u[idx] = { ...u[idx], unitOfMeasure: e.target.value }; setEditItems(u); }} /></td>
                <td className="p-2"><Input size="small" value={item.description} placeholder="Specs..." onChange={e => { const u = [...editItems]; u[idx] = { ...u[idx], description: e.target.value }; setEditItems(u); }} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Modal>

      {/* Create BOM */}
      <Modal title={`Create BOM — ${selectedPO?.order_number}`} open={bomModalOpen}
        onCancel={() => { setBomModalOpen(false); setSelectedPO(null); }} onOk={() => selectedPO && createBomMutation.mutate(selectedPO.id)}
        okText="Create BOM" confirmLoading={createBomMutation.isPending}>
        {selectedPO && <div><p className="mb-3 text-gray-600">Creates Bill of Materials for this order.</p>
          <div className="bg-gray-50 p-3 rounded-lg">{selectedPO.items.map((item, i) => <div key={i} className="text-sm py-1 border-b last:border-0 border-gray-100">{item.item_name} — <strong>{item.quantity} {item.unit_of_measure || 'units'}</strong></div>)}</div></div>}
      </Modal>

      {/* BOM View */}
      <Modal title={<div className="flex items-center gap-2">BOM — {currentBom?.bom_number || ''}</div>}
        open={bomViewModalOpen} onCancel={() => { setBomViewModalOpen(false); setCurrentBom(null); setSelectedPO(null); }} width={700}
        footer={<Space>
          <Button onClick={() => { setBomViewModalOpen(false); setCurrentBom(null); }}>Close</Button>
          {currentBom && hasPermission('orders', 'create') && <Button type="primary" icon={<PlusOutlined />} onClick={async () => {
            jobCardForm.resetFields();
            setJobCardMaterials([]);
            setSelectedMaterialId(null);
            setExistingJobCardMrItemIds([]);
            setJobCardMaterialsLoading(true);
            setJobCardModalOpen(true);
            // Compute existing job card MR item IDs from linked job cards
            const existingIds: number[] = [];
            if (currentBom.job_cards) {
              currentBom.job_cards.forEach((jc: any) => {
                if (jc.selectedMaterials && Array.isArray(jc.selectedMaterials)) {
                  jc.selectedMaterials.forEach((sm: any) => { if (sm.mrItemId) existingIds.push(sm.mrItemId); });
                }
              });
            }
            setExistingJobCardMrItemIds(existingIds);
            // Fetch material request items if MR exists
            if (selectedPO?.material_request_id) {
              try {
                const mrRes = await getMaterialRequestById(selectedPO.material_request_id);
                const items = mrRes.data?.items || [];
                setJobCardMaterials(items);
              } catch { setJobCardMaterials([]); }
            }
            setJobCardMaterialsLoading(false);
          }}>Create Job Card</Button>}
        </Space>}>
        {currentBom && <div>
          <Table columns={bomItemColumns} dataSource={currentBom.items} rowKey="id" size="small" pagination={false} />
          {currentBom.job_cards && currentBom.job_cards.length > 0 && <div className="mt-4"><Text strong className="block mb-2">Linked Job Cards</Text>
            {currentBom.job_cards.map((jc: any) => <div key={jc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded mb-1"><Text strong className="text-sm">{jc.jobNumber}</Text><Tag color={getStatusColor(jc.status)}>{getStatusLabel(jc.status)}</Tag><Button size="small" type="link" onClick={() => router.push(`/manufacturing/${jc.id}`)}>View</Button></div>)}
          </div>}
        </div>}
      </Modal>

      {/* Create Job Card */}
      <Modal title={<span><ToolOutlined className="text-blue-500 mr-2" />Create Job Card</span>}
        open={jobCardModalOpen} onCancel={() => { setJobCardModalOpen(false); jobCardForm.resetFields(); setJobCardMaterials([]); setSelectedMaterialId(null); }}
        onOk={() => jobCardForm.submit()} okText="Create Job Card" confirmLoading={createJobCardsMutation.isPending} width={600}
        okButtonProps={{ disabled: jobCardMaterialsLoading || !selectedMaterialId }}>

        {jobCardMaterialsLoading ? (
          <div className="text-center py-8"><Spin tip="Loading materials..." /></div>
        ) : jobCardMaterials.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No material request found for this order.</div>
        ) : (
          <>
            {/* Check if all issued items already have job cards */}
            {(() => {
              const availableItems = jobCardMaterials.filter(m =>
                m.status !== 'rejected' &&
                Number(m.quantity_issued) > 0 &&
                !existingJobCardMrItemIds.includes(m.id)
              );
              if (availableItems.length === 0) {
                return (
                  <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="mb-4"
                    message="All issued items already have Job Cards"
                    description="Every issued material item has a Job Card created. No more Job Cards needed."
                  />
                );
              }
              return null;
            })()}

            <Form form={jobCardForm} layout="vertical" onFinish={handleCreateJobCards}>
              {/* Select Issued Item dropdown */}
              <Form.Item label={<span className="font-semibold">Select Issued Item</span>} required>
                <Select
                  placeholder="Choose an issued item..."
                  value={selectedMaterialId}
                  onChange={v => setSelectedMaterialId(v)}
                  size="large"
                  className="w-full"
                  notFoundContent={<span className="text-gray-400 text-sm">No issued items available</span>}
                  options={jobCardMaterials
                    .filter(m => m.status !== 'rejected' && Number(m.quantity_issued) > 0 && !existingJobCardMrItemIds.includes(m.id))
                    .map(item => ({
                      value: item.id,
                      label: (
                        <div className="flex items-center justify-between">
                          <span>{item.item_name}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            Issued: {Number(item.quantity_issued)} {item.unit_of_measure || 'units'}
                          </span>
                        </div>
                      ),
                    }))}
                />
              </Form.Item>

              {/* Show selected item details */}
              {selectedMaterialId && (() => {
                const item = jobCardMaterials.find(m => m.id === selectedMaterialId);
                if (!item) return null;
                const issued = Number(item.quantity_issued);
                const required = Number(item.quantity_requested);
                return (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <Text strong className="text-base">{item.item_name}</Text>
                        {item.product_code && <div className="text-xs text-gray-400">{item.product_code}</div>}
                      </div>
                      <Tag color="green" icon={<CheckCircleOutlined />}>Issued</Tag>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span>Required: <strong>{required}</strong> {item.unit_of_measure || ''}</span>
                      <span>Issued: <Text type="success" strong>{issued}</Text> {item.unit_of_measure || ''}</span>
                    </div>
                  </div>
                );
              })()}

              <Form.Item name="priority" label="Priority" initialValue={3}>
                <Select options={[
                  { value: 1, label: <Tag color="red" className="m-0">Urgent</Tag> },
                  { value: 2, label: <Tag color="orange" className="m-0">High</Tag> },
                  { value: 3, label: <Tag color="blue" className="m-0">Medium</Tag> },
                  { value: 4, label: <Tag color="default" className="m-0">Low</Tag> },
                ]} />
              </Form.Item>
            </Form>

            {/* Production stages info */}
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <Text strong className="text-xs block mb-1"><ToolOutlined className="mr-1" />Production Stages (auto from Stage Master):</Text>
              <div className="flex flex-wrap gap-1">
                {stageMasters.map((s: StageMaster, idx: number) => (
                  <Tag key={s.id} color="blue" className="text-xs">
                    {idx > 0 && <span className="mr-1">→</span>}{s.sort_order}. {s.stage_name}
                  </Tag>
                ))}
              </div>
              {stageMasters.length === 0 && <Text type="danger" className="text-xs">No active stages. Configure in Settings &gt; Stage Master.</Text>}
            </div>

            {/* Summary of existing job cards */}
            {existingJobCardMrItemIds.length > 0 && (
              <div className="text-xs text-gray-400 mt-2">
                <Tag color="blue" className="m-0 text-xs">{existingJobCardMrItemIds.length}</Tag> item(s) already have Job Cards.
                {' '}<Tag color="green" className="m-0 text-xs">
                  {jobCardMaterials.filter(m => m.status !== 'rejected' && Number(m.quantity_issued) > 0 && !existingJobCardMrItemIds.includes(m.id)).length}
                </Tag> available for new Job Cards.
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Progress */}
      <Modal title={`Production Stages — ${selectedJob?.job_card_number}`} open={progressModalOpen}
        onCancel={() => { setProgressModalOpen(false); setSelectedJob(null); setStageProgressData([]); }}
        footer={null} destroyOnClose width={560}>
        {selectedJob && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Text strong>{selectedJob.product_name}</Text>
            <div className="text-sm text-gray-500 mt-1">Qty: <strong>{selectedJob.quantity}</strong> {selectedJob.unit || 'units'}</div>
          </div>
        )}
        {stageProgressLoading ? (
          <div className="text-center py-8"><Spin /></div>
        ) : stageProgressData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No stages defined. Configure in Settings &gt; Stage Master.</div>
        ) : (
          <div className="space-y-3">
            {stageProgressData.map((stage: any, idx: number) => {
              const isDone = stage.status === 'completed';
              const isActive = stage.status === 'in_progress';
              const isPending = stage.status === 'pending';
              const completedCount = stageProgressData.filter((s: any) => s.status === 'completed').length;
              return (
                <div key={stage.id} className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      isDone ? 'border-green-500 bg-green-100 text-green-600' :
                      isActive ? 'border-blue-500 bg-blue-100 text-blue-600 ring-3 ring-blue-100' :
                      'border-gray-300 bg-gray-50 text-gray-400'
                    }`}>
                      {isDone ? <CheckCircleOutlined /> : isPending ? <LockOutlined className="text-[10px]" /> : <SyncOutlined spin />}
                    </div>
                    {idx < stageProgressData.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className={`flex-1 pb-3 border rounded-lg p-2.5 ${
                    isDone ? 'border-green-200 bg-green-50' :
                    isActive ? 'border-blue-300 bg-blue-50' :
                    'border-gray-200 bg-gray-50 opacity-60'
                  }`}>
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <Text strong className={`text-sm ${isPending ? 'text-gray-400' : ''}`}>{stage.process_name}</Text>
                        <Tag color={isDone ? 'success' : isActive ? 'processing' : 'default'} className="ml-2 text-xs">
                          {isDone ? 'Completed' : isActive ? 'In Progress' : 'Locked'}
                        </Tag>
                      </div>
                      {isActive && (
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                          style={{ background: '#52c41a', borderColor: '#52c41a' }}
                          loading={completeCurrentStageMutation.isPending}
                          onClick={() => {
                            Modal.confirm({
                              title: `Complete "${stage.process_name}"?`,
                              content: 'This will unlock the next stage.',
                              okText: 'Complete Stage',
                              okButtonProps: { style: { background: '#52c41a', borderColor: '#52c41a' } },
                              onOk: () => completeCurrentStageMutation.mutateAsync({ jobId: selectedJob!.id }),
                            });
                          }}>
                          Complete
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {stage.started_at && <span><ClockCircleOutlined className="mr-1" />{dayjs(stage.started_at).format('DD MMM HH:mm')}</span>}
                      {stage.completed_at && <span><CheckCircleOutlined className="mr-1" />{dayjs(stage.completed_at).format('DD MMM HH:mm')}</span>}
                      {stage.completed_by_name && <span><UserOutlined className="mr-1" />{stage.completed_by_name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="text-center pt-2 text-sm text-gray-400">
              {stageProgressData.filter((s: any) => s.status === 'completed').length}/{stageProgressData.length} stages completed
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════ DISPATCH MODAL ═══════ */}
      <Modal
        title={<span><RocketOutlined className="mr-2" />Dispatch — {dispatchJob?.job_card_number}</span>}
        open={dispatchModalOpen}
        onCancel={() => { setDispatchModalOpen(false); setDispatchJob(null); dispatchForm.resetFields(); }}
        onOk={() => dispatchForm.submit()}
        okText="Dispatch Now"
        okButtonProps={{ style: { backgroundColor: '#722ed1' } }}
        confirmLoading={dispatchMutation.isPending}
        destroyOnClose
        width={480}
      >
        {dispatchJob && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Text strong>{dispatchJob.product_name}</Text>
            <div className="text-sm text-gray-600 mt-1">Qty: {dispatchJob.quantity} {dispatchJob.unit || 'units'}</div>
            <Tag color="purple" className="mt-1" icon={<CheckCircleOutlined />}>Approved for Dispatch</Tag>
          </div>
        )}
        <Form form={dispatchForm} layout="vertical" onFinish={values => {
          if (!dispatchJob) return;
          dispatchMutation.mutate({
            jobId: dispatchJob.id,
            action: 'dispatch',
            remarks: values.remarks,
            dispatchDate: values.dispatchDate?.format('YYYY-MM-DD'),
          });
        }}>
          <Form.Item name="dispatchDate" label="Dispatch Date" rules={[{ required: true, message: 'Select dispatch date' }]}>
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <TextArea rows={3} placeholder="Dispatch notes, tracking info, etc..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* PO details moved to /manufacturing/po/[id] page */}
    </div>
  );
}


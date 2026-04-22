'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Button, Space, Tag, Badge, Modal, Form, InputNumber,
  Progress, message, Card, Alert, Select, Spin, Row, Col, Steps,
  DatePicker, Descriptions, Divider, Input,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, PlayCircleOutlined,
  EditOutlined, FileTextOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, ClockCircleOutlined,
  PlusOutlined, SendOutlined, StopOutlined, SyncOutlined,
  PauseCircleOutlined, ToolOutlined, AppstoreOutlined,
  RocketOutlined, UnlockOutlined, CloseCircleOutlined,
  WarningOutlined, LockOutlined, UserOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJobCardList,
  getJobCardById,
  updateJobCardStatus,
  addJobCardProgress,
  jobCardDispatchAction,
  moveToNextStage,
  getBomRawMaterials,
} from '@/lib/api/manufacturing';
import {
  getManufacturingPurchaseOrders,
  getManufacturingPurchaseOrderById,
  createBom,
  getBomByPurchaseOrder,
  createJobCardsFromBom,
  sendForApproval,
  updateManufacturingDetails,
  startProductionForItem,
  requestInventoryForItem,
} from '@/lib/api/bom';
import { getMaterialRequestById, issueMaterials, issueSingleItem, issuePartialItem, confirmMaterialsReceived } from '@/lib/api/material-requests';
import { getRawMaterialList } from '@/lib/api/raw-materials'; // kept for other usages
import { getStageMasters } from '@/lib/api/stage-masters';
import { useAuthStore } from '@/stores/authStore';
import { JobCard, JOB_CARD_STATUS_OPTIONS } from '@/types/manufacturing';
import { ManufacturingPO, Bom, BomItem } from '@/types/bom';
import { MaterialRequest } from '@/types/material-request';
import { RawMaterial } from '@/types/raw-material';
import { StageMaster } from '@/types/stage-master';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
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

function getWorkflowStatus(po: ManufacturingPO, mrStatus?: string): WorkflowStatus {
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

  // If MR is fulfilled/partially_fulfilled, materials are already issued — treat as approved
  if (mrStatus && ['fulfilled', 'partially_fulfilled'].includes(mrStatus)) return 'approved';

  if (approval === 'approved') return 'approved';
  if (approval === 'pending_approval') return 'pending_approval';
  if (approval === 'rejected') return 'rejected';
  if (po.bom_count > 0) return 'bom_created';
  return 'pending_review';
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

export default function ManufacturingPODetailPage() {
  const router = useRouter();
  const params = useParams();
  const poId = Number(params.id);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [detailPO, setDetailPO] = useState<ManufacturingPO | null>(null);
  const [detailBom, setDetailBom] = useState<Bom | null>(null);
  const [detailJobCards, setDetailJobCards] = useState<JobCard[]>([]);
  const [detailMR, setDetailMR] = useState<MaterialRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedPO, setSelectedPO] = useState<ManufacturingPO | null>(null);
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [bomViewModalOpen, setBomViewModalOpen] = useState(false);
  const [currentBom, setCurrentBom] = useState<Bom | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalForm] = Form.useForm();
  const [editingItems, setEditingItems] = useState<Array<{ id: number; itemName: string; quantity: number; description: string; unitOfMeasure: string }>>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editItems, setEditItems] = useState<Array<{ id: number; itemName: string; quantity: number; description: string; unitOfMeasure: string }>>([]);
  const [jobCardModalOpen, setJobCardModalOpen] = useState(false);
  const [jobCardForm] = Form.useForm();
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchJob, setDispatchJob] = useState<JobCard | null>(null);
  const [dispatchForm] = Form.useForm();
  const [stageProgressData, setStageProgressData] = useState<any[]>([]);
  const [stageProgressLoading, setStageProgressLoading] = useState(false);
  const [jobCardStages, setJobCardStages] = useState<Record<number, any[]>>({});
  const [stageNotes, setStageNotes] = useState('');
  const [stageDescription, setStageDescription] = useState('');
  const [stageCompletedDate, setStageCompletedDate] = useState<dayjs.Dayjs | null>(null);
  const [childJobCards, setChildJobCards] = useState<JobCard[]>([]);
  const [childJobCardsMap, setChildJobCardsMap] = useState<Record<number, JobCard[]>>({});
  const [issuePartialModal, setIssuePartialModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [issuePartialQty, setIssuePartialQty] = useState<number>(0);

  const { data: stagesData } = useQuery({
    queryKey: ['stage-masters'],
    queryFn: getStageMasters,
    enabled: !!enterpriseId,
  });
  const stageMasters = stagesData?.data?.filter((s: StageMaster) => s.is_active) || [];

  const { data: rawMaterialsData } = useQuery({
    queryKey: ['raw-materials-for-bom'],
    queryFn: () => getBomRawMaterials(),
  });
  const rawMaterials: RawMaterial[] = rawMaterialsData?.data || [];

  const [bomItems, setBomItems] = useState<Array<{
    rawMaterialId?: number;
    itemName: string;
    requiredQuantity: number;
    unitOfMeasure: string;
    availableStock: number;
  }>>([]);


  /* ── Load PO data ── */
  const loadData = useCallback(async (silent = false) => {
    if (!poId) return;
    if (!silent) setLoading(true);
    try {
      const poRes = await getManufacturingPurchaseOrderById(poId);
      const po = poRes?.data;
      if (!po) { message.error('Order not found'); router.push('/manufacturing'); return; }
      setDetailPO(po);

      let bom: Bom | null = null;
      if (po.bom_count > 0) {
        const r = await getBomByPurchaseOrder(poId);
        bom = r.data || null;
      }
      setDetailBom(bom);

      const jcRes = await getJobCardList({ salesOrderId: poId, pageSize: 100 });
      const jcList = jcRes.data || [];
      setDetailJobCards(jcList);

      // Fetch stages and child job cards for each job card.
      // Use getJobCardById (findOne) which always auto-initializes stages, preventing
      // race conditions where getJobCardProcesses returns empty for newly-started job cards.
      const stagesMap: Record<number, any[]> = {};
      const childMap: Record<number, JobCard[]> = {};
      await Promise.all(jcList.map(async (jc: JobCard) => {
        try {
          const detailRes = await getJobCardById(jc.id, enterpriseId!);
          // stage_progress from findOne is always initialized — use it directly
          const stages = (detailRes.data?.stage_progress || []).map((s: any) => ({
            id: s.id,
            process_name: s.stage_name,
            sequence_order: s.sort_order,
            status: s.status || 'pending',
            started_at: s.start_time,
            completed_at: s.end_time,
            completed_by_name: s.completed_by_name,
            description: s.description,
            remarks: s.notes,
          }));
          stagesMap[jc.id] = stages.sort((a: any, b: any) => a.sequence_order - b.sequence_order);
          childMap[jc.id] = detailRes.data?.child_job_cards || [];
        } catch {
          stagesMap[jc.id] = [];
          childMap[jc.id] = [];
        }
      }));
      setJobCardStages(stagesMap);
      setChildJobCardsMap(childMap);

      if (po.material_request_id) {
        try {
          const mrRes = await getMaterialRequestById(po.material_request_id);
          setDetailMR(mrRes.data || null);
        } catch { setDetailMR(null); }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        message.error('Order not found');
        router.push('/manufacturing');
      } else {
        message.error('Failed to load details');
      }
    }
    finally { if (!silent) setLoading(false); }
  }, [poId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Mutations ── */
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['mfg-purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['all-job-cards'] });
  };

  const refreshPage = async () => {
    invalidateAll();
    await loadData(true);  // silent refresh — no loading spinner, no layout jump
  };

  const refreshDetailMR = async () => {
    if (detailPO?.material_request_id) {
      try {
        const mrRes = await getMaterialRequestById(detailPO.material_request_id);
        setDetailMR(mrRes.data || null);
      } catch { /* ignore */ }
    }
  };

  const issueAllMutation = useMutation({
    mutationFn: (mrId: number) => issueMaterials(mrId),
    onSuccess: () => { message.success('All approved materials issued'); refreshDetailMR(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to issue materials'),
  });

  const issueItemMutation = useMutation({
    mutationFn: ({ mrId, itemId }: { mrId: number; itemId: number }) => issueSingleItem(mrId, itemId),
    onSuccess: () => { message.success('Material issued'); refreshDetailMR(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to issue item'),
  });

  const issuePartialMutation = useMutation({
    mutationFn: ({ mrId, itemId, qty }: { mrId: number; itemId: number; qty: number }) => issuePartialItem(mrId, itemId, qty),
    onSuccess: () => { message.success('Partial materials issued'); setIssuePartialModal({ open: false, item: null }); setIssuePartialQty(0); refreshDetailMR(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to issue partial'),
  });

  const confirmReceivedMutation = useMutation({
    mutationFn: (mrId: number) => confirmMaterialsReceived(mrId),
    onSuccess: () => { message.success('Receipt confirmed — materials received by manufacturing'); refreshPage(); refreshDetailMR(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to confirm receipt'),
  });

  const sendForApprovalMutation = useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: any }) => sendForApproval(poId, data),
    onSuccess: () => { message.success('Sent for inventory approval'); setApprovalModalOpen(false); approvalForm.resetFields(); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: ({ poId, data }: { poId: number; data: any }) => updateManufacturingDetails(poId, data),
    onSuccess: () => { message.success('Details updated'); setEditModalOpen(false); editForm.resetFields(); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const createBomMutation = useMutation({
    mutationFn: ({ poId, items }: { poId: number; items?: Array<{ rawMaterialId?: number; itemName: string; requiredQuantity: number; unitOfMeasure?: string }> }) =>
      createBom({ purchaseOrderId: poId, items }),
    onSuccess: (result) => { message.success('BOM created'); setCurrentBom(result.data || null); setBomModalOpen(false); setBomViewModalOpen(true); setBomItems([]); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create BOM'),
  });

  const createJobCardsMutation = useMutation({
    mutationFn: ({ bomId, jobCards }: { bomId: number; jobCards: any[] }) =>
      createJobCardsFromBom(bomId, jobCards),
    onSuccess: () => { message.success('Job cards created'); setJobCardModalOpen(false); setBomViewModalOpen(false); jobCardForm.resetFields(); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const startProductionMutation = useMutation({
    mutationFn: async (job: JobCard) => { await updateJobCardStatus(job.id, 'in_process', enterpriseId!); },
    onSuccess: () => { message.success('Production started'); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const startItemProductionMutation = useMutation({
    mutationFn: ({ poId, itemId, force }: { poId: number; itemId: number; force?: boolean }) => startProductionForItem(poId, itemId, force),
    onSuccess: (_, vars) => { message.success(vars.force ? 'Released for manufacturing (partial materials)' : 'Production started for item'); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to start production'),
  });

  const requestInventoryMutation = useMutation({
    mutationFn: ({ poId, itemId }: { poId: number; itemId: number }) => requestInventoryForItem(poId, itemId),
    onSuccess: () => { message.success('Inventory re-request sent'); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to send request'),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ jobId, action, remarks, dispatchDate }: { jobId: number; action: 'approve' | 'dispatch' | 'hold' | 'unhold' | 'request_modification'; remarks?: string; dispatchDate?: string }) => jobCardDispatchAction(jobId, action, remarks, dispatchDate),
    onSuccess: (_, vars) => {
      message.success({ approve: 'Approved for dispatch', dispatch: 'Dispatched', hold: 'On hold', unhold: 'Hold removed', request_modification: 'Modification requested' }[vars.action]);
      if (vars.action === 'dispatch') { setDispatchModalOpen(false); setDispatchJob(null); dispatchForm.resetFields(); }
      refreshPage();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const completeCurrentStageMutation = useMutation({
    mutationFn: ({ jobId, notes, completedDate, description }: { jobId: number; notes?: string; completedDate?: string; description?: string }) =>
      moveToNextStage(jobId, notes, completedDate, description),
    onSuccess: (response) => {
      const childCards = response?.data?.child_job_cards || [];
      const latestChild = childCards[childCards.length - 1];
      message.success(
        latestChild
          ? `Stage completed → ${latestChild.job_card_number} created`
          : 'Stage completed — next stage activated',
        4,
      );
      setStageNotes('');
      setStageDescription('');
      setStageCompletedDate(dayjs());
      // Update stage data directly from the mutation response (already has fresh data from findOne)
      // This ensures the modal updates synchronously before the button re-enables
      if (response?.data?.stage_progress && Array.isArray(response.data.stage_progress)) {
        const stages = (response.data.stage_progress as any[]).map((s: any) => ({
          id: s.id,
          process_name: s.stage_name,
          sequence_order: s.sort_order,
          status: s.status || 'pending',
          started_at: s.start_time,
          completed_at: s.end_time,
          completed_by_name: s.completed_by_name,
          description: s.description,
          remarks: s.notes,
        })).sort((a: any, b: any) => a.sequence_order - b.sequence_order);
        setStageProgressData(stages);
        // Also update the mini stage pipeline in the job cards list view
        if (selectedJob) {
          setJobCardStages(prev => ({ ...prev, [selectedJob.id]: stages }));
        }
      }
      if (selectedJob) {
        setChildJobCards(childCards);
        setChildJobCardsMap(prev => ({ ...prev, [selectedJob.id]: childCards }));
      }
      refreshPage();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to complete stage'),
  });

  const openStageProgress = async (job: JobCard) => {
    setSelectedJob(job);
    setProgressModalOpen(true);
    setStageProgressLoading(true);
    setStageProgressData([]);   // clear stale data so spinner shows cleanly
    setChildJobCards([]);
    setStageNotes('');
    setStageDescription('');
    setStageCompletedDate(dayjs());
    try {
      // Use getJobCardById (findOne) — always auto-initializes stages, no race condition
      const jobDetailRes = await getJobCardById(job.id, enterpriseId!);
      const stages = (jobDetailRes.data?.stage_progress || []).map((s: any) => ({
        id: s.id,
        process_name: s.stage_name,
        sequence_order: s.sort_order,
        status: s.status || 'pending',
        started_at: s.start_time,
        completed_at: s.end_time,
        completed_by_name: s.completed_by_name,
        description: s.description,
        remarks: s.notes,
      })).sort((a: any, b: any) => a.sequence_order - b.sequence_order);
      setStageProgressData(stages);
      const children = jobDetailRes.data?.child_job_cards || [];
      setChildJobCards(children);
      setChildJobCardsMap(prev => ({ ...prev, [job.id]: children }));
    } catch {
      setStageProgressData([]);
      setChildJobCards([]);
    }
    setStageProgressLoading(false);
  };

  // Silent refresh — updates stage data in place without showing a spinner or clearing content.
  // Uses getJobCardById (findOne) which always auto-initializes stages — no race condition.
  const silentRefreshStageProgress = async (job: JobCard) => {
    try {
      const jobDetailRes = await getJobCardById(job.id, enterpriseId!);
      const stages = (jobDetailRes.data?.stage_progress || []).map((s: any) => ({
        id: s.id,
        process_name: s.stage_name,
        sequence_order: s.sort_order,
        status: s.status || 'pending',
        started_at: s.start_time,
        completed_at: s.end_time,
        completed_by_name: s.completed_by_name,
        description: s.description,
        remarks: s.notes,
      })).sort((a: any, b: any) => a.sequence_order - b.sequence_order);
      setStageProgressData(stages);
      const children = jobDetailRes.data?.child_job_cards || [];
      setChildJobCards(children);
      setChildJobCardsMap(prev => ({ ...prev, [job.id]: children }));
    } catch { /* keep existing data */ }
  };

  /* ── Handlers ── */
  const openSendForApproval = (po: ManufacturingPO) => {
    setSelectedPO(po);
    setEditingItems(po.items.map(item => ({ id: item.id, itemName: item.item_name, quantity: item.quantity, description: '', unitOfMeasure: item.unit_of_measure || 'units' })));
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
    sendForApprovalMutation.mutate({ poId: selectedPO.id, data: {
      priority: values.priority, notes: values.notes,
      expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
      items: editingItems.map(item => ({ itemId: item.id, itemName: item.itemName, quantity: item.quantity, description: item.description, unitOfMeasure: item.unitOfMeasure })),
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
      jobCards: [{
        priority: values.priority || 3,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        expectedCompletion: values.expectedCompletion ? values.expectedCompletion.toISOString() : undefined,
        notes: values.notes || undefined,
      }],
    });
  };

  const getStatusColor = (status: string) => JOB_CARD_STATUS_OPTIONS.find(s => s.value === status)?.color || 'default';
  const getStatusLabel = (status: string) => JOB_CARD_STATUS_OPTIONS.find(s => s.value === status)?.label || status;

  const bomItemColumns = [
    { title: 'Material', key: 'material', render: (_: any, r: BomItem) => <div><div className="font-medium">{r.item_name}</div>{r.product_code && <div className="text-xs text-gray-400">{r.product_code}</div>}</div> },
    { title: 'Required', dataIndex: 'required_quantity', width: 100, align: 'center' as const, render: (qty: number, r: BomItem) => `${qty} ${r.unit_of_measure || ''}` },
  ];

  /* ═══════════════ RENDER ═══════════════ */

  if (loading && !detailPO) return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  if (!detailPO) return <div className="text-center py-16 text-gray-400">Order not found. <Button type="link" onClick={() => router.push('/manufacturing')}>Go back</Button></div>;

  const ws = getWorkflowStatus(detailPO, detailMR?.status);
  const isOnHold = detailPO.status === 'on_hold';
  const holdReason = detailPO.hold_reason;
  const mrIssued = !!(detailMR && ['fulfilled', 'partially_fulfilled'].includes(detailMR.status));
  const canCreateJobCards = (ws === 'approved' || mrIssued) && detailJobCards.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/manufacturing')}>Back</Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Title level={4} className="!mb-0">{detailPO.order_number}</Title>
            <Tag color={WORKFLOW_STATUS_MAP[ws]?.color}>
              {WORKFLOW_STATUS_MAP[ws]?.label}
            </Tag>
            <Tag color={PRIORITY_LABELS[detailPO.manufacturing_priority || 0].color}>
              {PRIORITY_LABELS[detailPO.manufacturing_priority || 0].label} Priority
            </Tag>
          </div>
        </div>
        <Button icon={<SyncOutlined />} onClick={refreshPage}>Refresh</Button>
      </div>

      {/* ON HOLD Banner */}
      {isOnHold && (
        <Alert
          type="warning"
          showIcon
          icon={<PauseCircleOutlined />}
          className="mb-4"
          style={{ border: '2px solid #ffd591', background: '#fff7e6' }}
          message={<strong><PauseCircleOutlined className="mr-1" /> Purchase Order is ON HOLD — All production is paused</strong>}
          description={
            <div>
              <div>No stages can be completed or production started until the PO team resumes this order.</div>
              {holdReason && <div className="mt-1"><strong>Reason:</strong> {holdReason}</div>}
            </div>
          }
        />
      )}

      <div className="space-y-5">

        {/* ── VISUAL WORKFLOW TIMELINE ── */}
        <Card size="small" bodyStyle={{ padding: '16px 20px' }}>
          <Text strong className="block mb-3 text-base">Manufacturing Workflow</Text>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {([
              { key: 'pending_review', label: 'Review', icon: <EditOutlined />, step: 0 },
              { key: 'bom_created', label: 'BOM', icon: <FileTextOutlined />, step: 1 },
              { key: 'pending_approval', label: 'Inventory Approval', icon: <SendOutlined />, step: 2 },
              { key: 'approved', label: 'Approved', icon: <CheckCircleOutlined />, step: 3 },
              { key: 'job_card_created', label: 'Job Cards', icon: <ToolOutlined />, step: 4 },
              { key: 'in_production', label: 'Production', icon: <PlayCircleOutlined />, step: 5 },
              { key: 'ready_for_approval', label: 'Approval', icon: <ClockCircleOutlined />, step: 7 },
              { key: 'dispatched', label: 'Dispatched', icon: <RocketOutlined />, step: 9 },
            ] as const).map((item, idx) => {
              const currentStep = WORKFLOW_STATUS_MAP[ws]?.step || 0;
              const isRejected = ws === 'rejected' && item.step === 2;
              const isCurrent = (ws === item.key) || (ws === 'rejected' && item.key === 'pending_approval') ||
                (['completed'].includes(ws) && item.key === 'in_production') ||
                (ws === 'approved_for_dispatch' && item.key === 'ready_for_approval');
              const isDone = currentStep > item.step && !isRejected;
              const isActive = isCurrent && !isRejected;

              return (
                <div key={item.key} className="flex items-center">
                  <div className={`flex flex-col items-center min-w-[80px] ${
                    isRejected ? 'text-red-500' :
                    isDone ? 'text-green-600' :
                    isActive ? 'text-blue-600' :
                    'text-gray-300'
                  }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 ${
                      isRejected ? 'border-red-400 bg-red-50 text-red-500' :
                      isDone ? 'border-green-500 bg-green-50 text-green-600' :
                      isActive ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' :
                      'border-gray-200 bg-gray-50 text-gray-300'
                    }`}>
                      {isRejected ? <CloseCircleOutlined /> : isDone ? <CheckCircleOutlined /> : item.icon}
                    </div>
                    <span className={`text-[11px] mt-1 text-center leading-tight font-medium ${
                      isRejected ? 'text-red-500' :
                      isDone ? 'text-green-600' :
                      isActive ? 'text-blue-600' :
                      'text-gray-400'
                    }`}>{isRejected ? 'Rejected' : item.label}</span>
                  </div>
                  {idx < 6 && (
                    <div className={`w-6 h-0.5 mt-[-14px] ${
                      isDone ? 'bg-green-400' :
                      isActive ? 'bg-blue-300' :
                      'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── CURRENT STATUS & ACTION SECTION ── */}
        {ws === 'pending_review' && (
          <Card size="small" className="border-blue-200 bg-blue-50">
            <div className="flex items-start gap-3">
              <FileTextOutlined className="text-blue-500 text-xl mt-1" />
              <div className="flex-1">
                <Text strong className="text-base block">Step 1: Create Bill of Materials (BOM)</Text>
                <Text type="secondary" className="text-sm block mt-1">
                  List all raw materials needed to manufacture this product (e.g., sensors, screws, components).
                  After creating the BOM, you can send it for inventory approval.
                </Text>
                <div className="mt-3 flex gap-2">
                  <Button type="primary" size="large" icon={<PlusOutlined />}
                    onClick={() => { setSelectedPO(detailPO); setBomModalOpen(true); }}
                    loading={createBomMutation.isPending}>
                    Create BOM
                  </Button>
                  <Button size="large" icon={<EditOutlined />} onClick={() => openEditDetails(detailPO)}>
                    Edit Details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {ws === 'bom_created' && detailBom && (
          <Card size="small" className="border-cyan-200 bg-cyan-50">
            <div className="flex items-start gap-3">
              <SendOutlined className="text-cyan-600 text-xl mt-1" />
              <div className="flex-1">
                <Text strong className="text-base block">Step 2: Send BOM for Inventory Approval</Text>
                <Text type="secondary" className="text-sm block mt-1">
                  BOM has been created with {detailBom.items.length} material(s).
                  Send it to the Inventory team for material availability check and approval.
                </Text>
                <div className="mt-3 flex gap-2">
                  <Button type="primary" size="large" icon={<SendOutlined />} onClick={() => openSendForApproval(detailPO)}>
                    Send to Inventory for Approval
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {ws === 'pending_approval' && (
          <Card size="small" className="border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <ClockCircleOutlined className="text-orange-500 text-xl mt-1" />
              <div className="flex-1">
                <Text strong className="text-base block">Waiting for Inventory Approval</Text>
                <Text type="secondary" className="text-sm block mt-1">
                  The material request (from your BOM) has been sent to the Inventory team.
                  They are reviewing raw material availability. You will be notified once they respond.
                </Text>
                {detailMR && (
                  <Tag color="processing" className="mt-2">Material Request: {detailMR.request_number}</Tag>
                )}
              </div>
            </div>
          </Card>
        )}

        {ws === 'rejected' && (
          <Card size="small" className="border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <CloseCircleOutlined className="text-red-500 text-xl mt-1" />
              <div className="flex-1">
                <Text strong className="text-base text-red-600 block">Material Request Rejected by Inventory</Text>
                <Text type="secondary" className="text-sm block mt-1">
                  The Inventory team has rejected some or all raw materials. See details below.
                  You can resend for approval after stock is added.
                </Text>
                <div className="mt-3 flex gap-2">
                  <Button type="primary" danger size="large" icon={<SendOutlined />} onClick={() => openSendForApproval(detailPO)}>
                    Resend for Approval
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {canCreateJobCards && (
          <Card size="small" className="border-green-200 bg-green-50">
            <div className="flex items-start gap-3">
              <ToolOutlined className="text-green-600 text-xl mt-1" />
              <div className="flex-1">
                <Text strong className="text-base text-green-700 block">Step 3: Create Job Cards</Text>
                <Text type="secondary" className="text-sm block mt-1">
                  {mrIssued ? 'Raw materials have been issued by Inventory.' : 'All raw materials approved by Inventory.'} Create job cards to start production.
                </Text>
                <div className="mt-3">
                  <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => {
                    setSelectedPO(detailPO);
                    setCurrentBom(detailBom);
                    jobCardForm.resetFields();
                    setJobCardModalOpen(true);
                  }}>
                    Create Job Cards
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── INVENTORY APPROVAL RESPONSE (Material Request Details) ── */}
        {detailMR && detailMR.items && detailMR.items.length > 0 && (
          <Card
            size="small"
            title={
              <div className="flex items-center gap-2 flex-wrap">
                <span>Inventory Approval Response</span>
                <Tag color={detailMR.status === 'approved' ? 'success' : detailMR.status === 'rejected' ? 'error' : detailMR.status === 'partially_approved' ? 'warning' : ['fulfilled', 'partially_fulfilled'].includes(detailMR.status) ? 'green' : 'processing'}>
                  {detailMR.status === 'approved' ? 'All Approved' :
                   detailMR.status === 'rejected' ? 'Rejected' :
                   detailMR.status === 'partially_approved' ? 'Partially Approved' :
                   detailMR.status === 'fulfilled' ? 'Fully Issued' :
                   detailMR.status === 'partially_fulfilled' ? 'Partially Issued' :
                   detailMR.status === 'pending' ? 'Pending Review' : detailMR.status}
                </Tag>
                {(detailPO.manufacturing_priority || 0) > 0 && (
                  <Tag color={PRIORITY_LABELS[detailPO.manufacturing_priority || 0].color}>
                    ⚡ {PRIORITY_LABELS[detailPO.manufacturing_priority || 0].label} Priority
                  </Tag>
                )}
                {detailMR.confirmed_received && (
                  <Tag color="green" icon={<CheckCircleOutlined />}>Receipt Confirmed</Tag>
                )}
              </div>
            }
            extra={
              <Space size="small">
                <Text type="secondary" className="text-xs">{detailMR.request_number}</Text>
                <Button size="small" icon={<SyncOutlined />} onClick={refreshDetailMR}>Refresh</Button>
              </Space>
            }
          >
            {detailMR.items.some(i => i.status === 'rejected') && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                className="mb-3"
                message="Some materials are not available"
                description="Click 'Recheck Inventory' beside unavailable items to notify the Inventory team. Production is blocked until all materials are available."
              />
            )}

            {detailMR.confirmed_received && (
              <Alert type="success" showIcon className="mb-3" icon={<CheckCircleOutlined />}
                message="Manufacturing has confirmed receipt of all issued materials" />
            )}

            {!detailMR.confirmed_received && detailMR.items.every(i => ['issued', 'rejected'].includes(i.status)) && detailMR.items.some(i => i.status === 'issued') && (
              <Alert type="info" showIcon className="mb-3"
                message="All materials issued by Inventory — confirm receipt once you've collected them" />
            )}

            {!detailMR.confirmed_received && detailMR.items.every(i => ['approved', 'issued', 'partially_issued'].includes(i.status)) && !detailMR.items.every(i => ['issued', 'rejected'].includes(i.status)) && detailMR.status !== 'pending' && (
              <Alert type="info" showIcon className="mb-3"
                message="Materials approved — waiting for Inventory to issue all materials before production can start" />
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 font-medium">Material</th>
                    <th className="text-center p-2 font-medium w-20">Qty</th>
                    <th className="text-center p-2 font-medium w-20">Issued</th>
                    <th className="text-center p-2 font-medium w-28">Status</th>
                    <th className="text-left p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {detailMR.items.map(item => {
                    const isFullyIssued = item.status === 'issued' || (Number(item.quantity_issued) >= Number(item.quantity_requested) && Number(item.quantity_requested) > 0);
                    const isPartiallyIssued = !isFullyIssued && (item.status === 'partially_issued' || Number(item.quantity_issued) > 0);
                    const isUnavailable = !isFullyIssued && !isPartiallyIssued && item.status === 'rejected';
                    const isApproved = !isFullyIssued && !isPartiallyIssued && !isUnavailable && (item.status === 'approved');
                    const isPending = !isFullyIssued && !isPartiallyIssued && !isUnavailable && !isApproved;

                    return (
                      <tr key={item.id} className={`border-t ${
                        isFullyIssued ? 'bg-green-50' :
                        isUnavailable ? 'bg-red-50' :
                        isPartiallyIssued ? 'bg-orange-50' :
                        isApproved ? 'bg-blue-50' : ''
                      }`}>
                        <td className="p-2">
                          <div className="font-medium">{item.item_name}</div>
                          {item.product_code && <div className="text-xs text-gray-400">{item.product_code}</div>}
                        </td>
                        <td className="p-2 text-center">{item.quantity_requested} {item.unit_of_measure || ''}</td>
                        <td className="p-2 text-center font-semibold">
                          {Number(item.quantity_issued) > 0 ? (
                            <span className={isFullyIssued ? 'text-green-600' : 'text-orange-600'}>
                              {item.quantity_issued}/{item.quantity_requested}
                            </span>
                          ) : (
                            <span className="text-gray-400">0/{item.quantity_requested}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isFullyIssued && <Tag color="success" className="!m-0">Issued</Tag>}
                          {isPartiallyIssued && <Tag color="orange" className="!m-0">Partially Issued</Tag>}
                          {isApproved && <Tag color="blue" className="!m-0">Approved</Tag>}
                          {isUnavailable && <Tag color="error" className="!m-0">Not Available</Tag>}
                          {isPending && <Tag color="processing" className="!m-0">Waiting for Approval</Tag>}
                        </td>
                        <td className="p-2">
                          <Space size={4} wrap>
                            {(isApproved || isPartiallyIssued) && (
                              <Button
                                size="small"
                                type="primary"
                                icon={<SendOutlined />}
                                loading={issueItemMutation.isPending}
                                onClick={() => {
                                  Modal.confirm({
                                    title: `Issue "${item.item_name}"?`,
                                    content: `Issue all remaining ${Number(item.quantity_requested) - Number(item.quantity_issued)} ${item.unit_of_measure || 'units'} to manufacturing.`,
                                    okText: 'Issue',
                                    onOk: () => issueItemMutation.mutateAsync({ mrId: detailMR.id, itemId: item.id }),
                                  });
                                }}
                              >
                                Issue
                              </Button>
                            )}
                            {(isApproved || isPartiallyIssued) && (
                              <Button
                                size="small"
                                icon={<SendOutlined />}
                                loading={issuePartialMutation.isPending}
                                onClick={() => {
                                  setIssuePartialQty(0);
                                  setIssuePartialModal({ open: true, item });
                                }}
                              >
                                Issue Partial
                              </Button>
                            )}
                            {isUnavailable && (
                              <Button
                                size="small"
                                type="primary"
                                danger
                                icon={<SyncOutlined />}
                                loading={requestInventoryMutation.isPending}
                                onClick={() => {
                                  const poItem = detailPO.items.find(pi => pi.product_id === item.product_id);
                                  if (poItem) {
                                    Modal.confirm({
                                      title: 'Recheck Inventory?',
                                      content: `Request Inventory team to recheck stock for "${item.item_name}". They will verify if materials are now available.`,
                                      okText: 'Recheck Inventory',
                                      onOk: () => requestInventoryMutation.mutateAsync({ poId: detailPO.id, itemId: poItem.id }),
                                    });
                                  }
                                }}
                              >
                                Recheck
                              </Button>
                            )}
                            {isPartiallyIssued && !isApproved && (
                              <span className="text-xs text-orange-500">Partially issued</span>
                            )}
                            {isFullyIssued && <span className="text-xs text-green-600">Ready</span>}
                            {isPending && <span className="text-xs text-gray-400">Under review</span>}
                          </Space>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Issue All button */}
            {detailMR.items.some(i => i.status === 'approved') && (
              <div className="mt-3 flex justify-end">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={issueAllMutation.isPending}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Issue All Approved Materials?',
                      content: 'This will issue all approved materials to the manufacturing team.',
                      okText: 'Issue All',
                      onOk: () => issueAllMutation.mutateAsync(detailMR.id),
                    });
                  }}
                >
                  Issue All
                </Button>
              </div>
            )}

            {/* Confirm Received button */}
            {!detailMR.confirmed_received && detailMR.items.some(i => ['issued', 'partially_issued'].includes(i.status)) && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <Text strong className="text-green-800 block">Materials received?</Text>
                  <Text type="secondary" className="text-xs">Tap below once your team has collected the issued materials from inventory.</Text>
                </div>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={confirmReceivedMutation.isPending}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Confirm Materials Received?',
                      content: 'Confirm that your manufacturing team has received all issued materials from inventory.',
                      okText: 'Yes, Received',
                      okType: 'primary',
                      onOk: () => confirmReceivedMutation.mutateAsync(detailMR.id),
                    });
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Confirm Received
                </Button>
              </div>
            )}

            {detailMR.notes && (
              <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200 text-sm">
                <Text type="secondary" className="text-xs block">Notes:</Text>
                {detailMR.notes}
              </div>
            )}
          </Card>
        )}

        {/* Issue Partial Modal */}
        <Modal
          title={`Issue Partial: ${issuePartialModal.item?.item_name}`}
          open={issuePartialModal.open}
          onCancel={() => { setIssuePartialModal({ open: false, item: null }); setIssuePartialQty(0); }}
          onOk={() => {
            if (!issuePartialModal.item || issuePartialQty <= 0) return;
            issuePartialMutation.mutate({ mrId: detailMR!.id, itemId: issuePartialModal.item.id, qty: issuePartialQty });
          }}
          okText="Issue Partial"
          confirmLoading={issuePartialMutation.isPending}
        >
          {issuePartialModal.item && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Requested: <strong>{issuePartialModal.item.quantity_requested} {issuePartialModal.item.unit_of_measure || ''}</strong>
                {' · '}Already issued: <strong>{issuePartialModal.item.quantity_issued} {issuePartialModal.item.unit_of_measure || ''}</strong>
                {' · '}Remaining: <strong>{Number(issuePartialModal.item.quantity_requested) - Number(issuePartialModal.item.quantity_issued)} {issuePartialModal.item.unit_of_measure || ''}</strong>
              </div>
              <div>
                <Text className="text-sm">Quantity to issue now:</Text>
                <InputNumber
                  min={1}
                  max={Number(issuePartialModal.item.quantity_requested) - Number(issuePartialModal.item.quantity_issued)}
                  value={issuePartialQty}
                  onChange={v => setIssuePartialQty(Number(v) || 0)}
                  className="w-full mt-1"
                />
              </div>
            </div>
          )}
        </Modal>

        {/* ── PURCHASE ORDER DETAILS ── */}
        <Card size="small" title="Purchase Order Details" extra={
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditDetails(detailPO)}>Edit</Button>
        }>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Customer">{detailPO.customer_name}</Descriptions.Item>
            <Descriptions.Item label="Order Date">{detailPO.order_date ? dayjs(detailPO.order_date).format('DD MMM YYYY') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Expected Delivery">{detailPO.expected_delivery ? dayjs(detailPO.expected_delivery).format('DD MMM YYYY') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Grand Total"><Text strong>{fmt(detailPO.grand_total)}</Text></Descriptions.Item>
            <Descriptions.Item label="Approval Status">
              <Tag color={
                detailPO.material_approval_status === 'approved' ? 'success' :
                detailPO.material_approval_status === 'rejected' ? 'error' :
                detailPO.material_approval_status === 'pending_approval' ? 'processing' : 'default'
              }>
                {detailPO.material_approval_status === 'none' ? 'Not Sent' :
                 detailPO.material_approval_status === 'pending_approval' ? 'Pending' :
                 detailPO.material_approval_status === 'approved' ? 'Approved' :
                 detailPO.material_approval_status === 'rejected' ? 'Rejected' : detailPO.material_approval_status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Priority">
              <Tag color={PRIORITY_LABELS[detailPO.manufacturing_priority || 0].color}>
                {PRIORITY_LABELS[detailPO.manufacturing_priority || 0].label}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {detailPO.manufacturing_notes && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Text type="secondary" className="text-xs">Manufacturing Notes:</Text>
              <div className="text-sm mt-1">{detailPO.manufacturing_notes}</div>
            </div>
          )}

          <Divider className="!my-3" />
          <Text strong className="text-sm block mb-2">Product Lines ({detailPO.items.length}):</Text>
          {/* ── OVERALL MATERIAL STATUS ── */}
          {(() => {
            const mrItems = detailMR?.items || [];
            const noMR = !detailMR || detailPO.material_approval_status === 'none';
            const totalItems = mrItems.length;
            const fullyIssuedItems = mrItems.filter(mi => Number(mi.quantity_issued) >= Number(mi.quantity_requested) && Number(mi.quantity_requested) > 0);
            const partiallyIssuedItems = mrItems.filter(mi => Number(mi.quantity_issued) > 0 && Number(mi.quantity_issued) < Number(mi.quantity_requested));
            const rejectedItems = mrItems.filter(mi => mi.status === 'rejected');

            let overallStatus: 'NOT_SENT' | 'PENDING_INVENTORY' | 'PARTIALLY_ISSUED' | 'FULLY_ISSUED' | 'REQUESTED_AGAIN' = 'NOT_SENT';
            if (noMR) {
              overallStatus = 'NOT_SENT';
            } else if (totalItems > 0 && fullyIssuedItems.length === totalItems) {
              overallStatus = 'FULLY_ISSUED';
            } else if (partiallyIssuedItems.length > 0 || fullyIssuedItems.length > 0) {
              overallStatus = 'PARTIALLY_ISSUED';
            } else if (rejectedItems.length > 0) {
              overallStatus = 'REQUESTED_AGAIN';
            } else {
              overallStatus = 'PENDING_INVENTORY';
            }

            const canStartProduction = overallStatus === 'FULLY_ISSUED';

            return (
              <>
                {overallStatus === 'FULLY_ISSUED' && !detailJobCards.some(jc => jc.status !== 'pending') && (
                  <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="!mb-0"
                    message="All materials have been issued by Inventory. Production can begin." />
                )}
                {overallStatus === 'PARTIALLY_ISSUED' && (
                  <Alert type="warning" showIcon icon={<ExclamationCircleOutlined />} className="!mb-0"
                    message="Waiting for remaining materials from Inventory"
                    description={`${fullyIssuedItems.length + partiallyIssuedItems.length} of ${totalItems} items partially/fully issued. Production cannot start until all materials are fully issued.`} />
                )}
                {overallStatus === 'PENDING_INVENTORY' && (
                  <Alert type="info" showIcon icon={<ClockCircleOutlined />} className="!mb-0"
                    message="Materials pending from Inventory"
                    description="Inventory has not yet issued the required materials. Production cannot start." />
                )}

                <div className="space-y-3 mt-3">
                  {detailPO.items.map((item, i) => {
                    const mrItem = detailMR?.items?.find(mi =>
                      (item.product_id && mi.product_id === item.product_id) ||
                      (!item.product_id && mi.item_name?.toLowerCase() === item.item_name?.toLowerCase())
                    );

                    let itemMaterialStatus: 'NOT_SENT' | 'PENDING' | 'PARTIALLY_ISSUED' | 'FULLY_ISSUED' | 'REJECTED' = 'NOT_SENT';
                    if (!mrItem) {
                      itemMaterialStatus = 'NOT_SENT';
                    } else if (mrItem.status === 'issued' || (Number(mrItem.quantity_issued) >= Number(mrItem.quantity_requested) && Number(mrItem.quantity_requested) > 0)) {
                      itemMaterialStatus = 'FULLY_ISSUED';
                    } else if (mrItem.status === 'partially_issued' || Number(mrItem.quantity_issued) > 0) {
                      itemMaterialStatus = 'PARTIALLY_ISSUED';
                    } else if (mrItem.status === 'rejected') {
                      itemMaterialStatus = 'REJECTED';
                    } else {
                      itemMaterialStatus = 'PENDING';
                    }

                    const itemJobCard = detailJobCards.find(jc =>
                      (item.product_id && jc.product_id === item.product_id) ||
                      (!item.product_id && jc.product_name?.toLowerCase() === item.item_name?.toLowerCase())
                    );
                    const inProduction = itemJobCard && ['in_process', 'partially_completed'].includes(itemJobCard.status);
                    const productionComplete = itemJobCard && ['completed_production', 'ready_for_approval', 'approved_for_dispatch', 'dispatched'].includes(itemJobCard.status);
                    const hasPendingJobCard = itemJobCard && itemJobCard.status === 'pending';

                    return (
                      <div key={i} className={`border rounded-lg p-3 ${
                        productionComplete ? 'bg-green-50 border-green-200' :
                        inProduction ? 'bg-blue-50 border-blue-200' :
                        itemMaterialStatus === 'FULLY_ISSUED' ? 'bg-emerald-50 border-emerald-200' :
                        itemMaterialStatus === 'PARTIALLY_ISSUED' ? 'bg-orange-50 border-orange-200' :
                        itemMaterialStatus === 'REJECTED' ? 'bg-red-50 border-red-200' :
                        'border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{item.item_name}</span>
                              {item.product_code && <span className="text-xs text-gray-400">({item.product_code})</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              Qty: <strong>{item.quantity}</strong> {item.unit_of_measure || 'units'}
                            </div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-400">Material:</span>
                              {itemMaterialStatus === 'NOT_SENT' && <Tag color="default">Not Requested</Tag>}
                              {itemMaterialStatus === 'PENDING' && <Tag color="processing">Pending Inventory</Tag>}
                              {itemMaterialStatus === 'PARTIALLY_ISSUED' && (
                                <Tag color="orange">Partially Issued ({mrItem?.quantity_issued}/{mrItem?.quantity_requested})</Tag>
                              )}
                              {itemMaterialStatus === 'FULLY_ISSUED' && <Tag color="success">Fully Issued</Tag>}
                              {itemMaterialStatus === 'REJECTED' && <Tag color="error">Not Available</Tag>}
                            </div>
                            {mrItem && itemMaterialStatus === 'PARTIALLY_ISSUED' && (
                              <div className="mt-1">
                                <Progress
                                  percent={Math.round((Number(mrItem.quantity_issued) / Number(mrItem.quantity_requested)) * 100)}
                                  size="small" showInfo={false} strokeColor="#fa8c16"
                                />
                                <span className="text-xs text-gray-400">Issued: {mrItem.quantity_issued} / {mrItem.quantity_requested}</span>
                              </div>
                            )}
                            {itemJobCard && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs text-gray-400">Production:</span>
                                <Tag color={getStatusColor(itemJobCard.status)}>{getStatusLabel(itemJobCard.status)}</Tag>
                                {itemJobCard.job_card_number && (
                                  <Button type="link" size="small" className="!p-0 !h-auto text-xs"
                                    onClick={() => router.push(`/manufacturing/${itemJobCard.id}`)}>
                                    {itemJobCard.job_card_number}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 items-end">
                            {canStartProduction && itemMaterialStatus === 'FULLY_ISSUED' && !itemJobCard && (
                              isOnHold ? (
                                <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD</Tag>
                              ) : (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<PlayCircleOutlined />}
                                  loading={startItemProductionMutation.isPending}
                                  onClick={() => Modal.confirm({
                                    title: 'Start Production?',
                                    content: `Create a job card and start production for "${item.item_name}" (Qty: ${item.quantity})?`,
                                    okText: 'Start Production',
                                    onOk: () => startItemProductionMutation.mutateAsync({ poId: detailPO.id, itemId: item.id }),
                                  })}
                                >
                                  Start Production
                                </Button>
                              )
                            )}

                            {itemMaterialStatus === 'PARTIALLY_ISSUED' && !itemJobCard && (
                              <>
                                <Button
                                  size="small"
                                  icon={<SendOutlined />}
                                  loading={requestInventoryMutation.isPending}
                                  onClick={() => Modal.confirm({
                                    title: 'Request Remaining Materials?',
                                    content: `Send a reminder to Inventory for the remaining materials for "${item.item_name}" (${Number(mrItem?.quantity_requested || 0) - Number(mrItem?.quantity_issued || 0)} remaining)?`,
                                    okText: 'Request Remaining',
                                    onOk: () => requestInventoryMutation.mutateAsync({ poId: detailPO.id, itemId: item.id }),
                                  })}
                                >
                                  Request Remaining
                                </Button>
                                {!isOnHold && (
                                  <Button
                                    size="small"
                                    icon={<UnlockOutlined />}
                                    style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                    loading={startItemProductionMutation.isPending}
                                    onClick={() => Modal.confirm({
                                      title: 'Release for Manufacturing?',
                                      icon: <UnlockOutlined style={{ color: '#52c41a' }} />,
                                      content: `Start production for "${item.item_name}" with the materials already issued? Remaining materials can be arranged separately.`,
                                      okText: 'Release for Manufacturing',
                                      okButtonProps: { style: { backgroundColor: '#52c41a' } },
                                      onOk: () => startItemProductionMutation.mutateAsync({ poId: detailPO.id, itemId: item.id, force: true }),
                                    })}
                                  >
                                    Release for Mfg
                                  </Button>
                                )}
                              </>
                            )}

                            {itemMaterialStatus === 'REJECTED' && !itemJobCard && (
                              <>
                                <Button
                                  size="small"
                                  icon={<SendOutlined />}
                                  loading={requestInventoryMutation.isPending}
                                  onClick={() => Modal.confirm({
                                    title: 'Request Inventory Check?',
                                    content: `Re-request inventory check for "${item.item_name}"? This will notify the Inventory team.`,
                                    okText: 'Request Inventory Check',
                                    onOk: () => requestInventoryMutation.mutateAsync({ poId: detailPO.id, itemId: item.id }),
                                  })}
                                >
                                  Request Inventory Check
                                </Button>
                                {!isOnHold && (
                                  <Button
                                    size="small"
                                    icon={<UnlockOutlined />}
                                    style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                    loading={startItemProductionMutation.isPending}
                                    onClick={() => Modal.confirm({
                                      title: 'Release for Manufacturing?',
                                      icon: <UnlockOutlined style={{ color: '#52c41a' }} />,
                                      content: `Start production for "${item.item_name}" even though inventory flagged materials as unavailable?`,
                                      okText: 'Release for Manufacturing',
                                      okButtonProps: { style: { backgroundColor: '#52c41a' } },
                                      onOk: () => startItemProductionMutation.mutateAsync({ poId: detailPO.id, itemId: item.id, force: true }),
                                    })}
                                  >
                                    Release for Mfg
                                  </Button>
                                )}
                              </>
                            )}

                            {itemMaterialStatus === 'PENDING' && !itemJobCard && (
                              <>
                                <Tag color="processing" icon={<ClockCircleOutlined />}>Awaiting Inventory</Tag>
                                {!isOnHold && (
                                  <Button
                                    size="small"
                                    icon={<UnlockOutlined />}
                                    style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                    loading={startItemProductionMutation.isPending}
                                    onClick={() => Modal.confirm({
                                      title: 'Release for Manufacturing?',
                                      icon: <UnlockOutlined style={{ color: '#52c41a' }} />,
                                      content: `Start production for "${item.item_name}" without waiting for inventory approval?`,
                                      okText: 'Release for Manufacturing',
                                      okButtonProps: { style: { backgroundColor: '#52c41a' } },
                                      onOk: () => startItemProductionMutation.mutateAsync({ poId: detailPO.id, itemId: item.id, force: true }),
                                    })}
                                  >
                                    Release for Mfg
                                  </Button>
                                )}
                              </>
                            )}

                            {itemMaterialStatus === 'NOT_SENT' && (
                              <Tag color="default" icon={<ExclamationCircleOutlined />}>Send for Approval</Tag>
                            )}

                            {hasPendingJobCard && canStartProduction && (
                              isOnHold ? (
                                <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD</Tag>
                              ) : (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<PlayCircleOutlined />}
                                  loading={startProductionMutation.isPending}
                                  onClick={() => Modal.confirm({
                                    title: 'Start Production?',
                                    content: `Start production for ${itemJobCard.product_name}`,
                                    onOk: () => startProductionMutation.mutateAsync(itemJobCard),
                                  })}
                                >
                                  Start Production
                                </Button>
                              )
                            )}
                            {hasPendingJobCard && !canStartProduction && !isOnHold && (
                              <Button
                                size="small"
                                icon={<UnlockOutlined />}
                                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                loading={startProductionMutation.isPending}
                                onClick={() => Modal.confirm({
                                  title: 'Release for Manufacturing?',
                                  icon: <UnlockOutlined style={{ color: '#52c41a' }} />,
                                  content: `Start production for "${itemJobCard.product_name}" with materials already available? Remaining items can be arranged separately.`,
                                  okText: 'Release for Manufacturing',
                                  okButtonProps: { style: { backgroundColor: '#52c41a' } },
                                  onOk: () => startProductionMutation.mutateAsync(itemJobCard),
                                })}
                              >
                                Release for Mfg
                              </Button>
                            )}

                            {inProduction && (
                              isOnHold ? (
                                <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD</Tag>
                              ) : (
                                <Button size="small" icon={<EditOutlined />}
                                  onClick={() => openStageProgress(itemJobCard)}>
                                  Update Progress
                                </Button>
                              )
                            )}

                            {productionComplete && <Tag color={itemJobCard.status === 'dispatched' ? 'success' : itemJobCard.status === 'approved_for_dispatch' ? 'purple' : itemJobCard.status === 'ready_for_approval' ? 'gold' : 'cyan'} icon={<CheckCircleOutlined />}>
                              {itemJobCard.status === 'dispatched' ? 'Dispatched' : itemJobCard.status === 'approved_for_dispatch' ? 'Approved for Dispatch' : itemJobCard.status === 'ready_for_approval' ? 'Waiting for Approval' : 'Production Complete'}
                            </Tag>}
                          </div>
                        </div>

                        {itemJobCard && ['in_process', 'partially_completed', 'completed_production'].includes(itemJobCard.status) && (() => {
                          const itemStages = jobCardStages[itemJobCard.id] || [];
                          if (itemStages.length > 0) {
                            const completedCount = itemStages.filter((s: any) => s.status === 'completed').length;
                            const stagePct = Math.round((completedCount / itemStages.length) * 100);
                            return (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>Stages</span>
                                  <span>{completedCount}/{itemStages.length} ({stagePct}%)</span>
                                </div>
                                <Progress
                                  percent={stagePct}
                                  size="small"
                                  showInfo={false}
                                  strokeColor={itemJobCard.status === 'completed_production' ? '#52c41a' : '#1677ff'}
                                />
                              </div>
                            );
                          }
                          const qtyPct = Math.min(100, Math.round((Number(itemJobCard.quantity_completed) / Number(itemJobCard.quantity || 1)) * 100));
                          return (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>{itemJobCard.quantity_completed}/{itemJobCard.quantity} ({qtyPct}%)</span>
                              </div>
                              <Progress
                                percent={qtyPct}
                                size="small"
                                showInfo={false}
                                strokeColor={itemJobCard.status === 'completed_production' ? '#52c41a' : '#1677ff'}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </Card>

        {/* ── BOM SECTION ── */}
        {(detailPO || detailBom) && (
          <Card size="small" title={
            <span className="flex items-center gap-2">
              Bill of Materials
            </span>
          } extra={
            !detailBom && (
              <Button size="small" type="primary" icon={<PlusOutlined />}
                onClick={() => { setSelectedPO(detailPO); setBomModalOpen(true); }}
                loading={createBomMutation.isPending}
              >Create BOM</Button>
            )
          }>
            {detailBom ? (
              <>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium">Material</th>
                      <th className="text-center p-2 font-medium w-24">Required</th>
                      <th className="text-center p-2 font-medium w-20">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailBom.items.map((r: BomItem) => (
                      <tr key={r.id} className={`border-t ${r.is_custom ? 'bg-blue-50' : ''}`}>
                        <td className="p-2">
                          <div className="font-medium">{r.item_name}</div>
                          {r.raw_material_code && <div className="text-xs text-gray-400 font-mono">{r.raw_material_code}</div>}
                          {!r.raw_material_code && r.product_code && <div className="text-xs text-gray-400">{r.product_code}</div>}
                        </td>
                        <td className="p-2 text-center">{r.required_quantity} {r.unit_of_measure || ''}</td>
                        <td className="p-2 text-center">
                          {r.is_custom ? <Tag color="blue" className="!m-0">Custom</Tag> : <Tag color="default" className="!m-0"><LockOutlined className="mr-1" />BOM</Tag>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="text-center py-6 text-gray-400">No BOM created yet.</div>
            )}
          </Card>
        )}

        {/* ── JOB CARDS SECTION ── */}
        {(() => {
          const jcMrItems = detailMR?.items || [];
          const jcNoMR = !detailMR || detailPO.material_approval_status === 'none';
          const jcTotalItems = jcMrItems.length;
          const jcFullyIssuedItems = jcMrItems.filter(mi => Number(mi.quantity_issued) >= Number(mi.quantity_requested) && Number(mi.quantity_requested) > 0);
          const jcCanStartProduction = !jcNoMR && jcTotalItems > 0 && jcFullyIssuedItems.length === jcTotalItems;
          return (detailBom || detailJobCards.length > 0) && (
          <Card size="small" title={
            <span className="flex items-center gap-2">
              Job Cards
              <Badge count={detailJobCards.length} showZero color={detailJobCards.length > 0 ? 'blue' : 'default'} />
            </span>
          } extra={
            detailBom && canCreateJobCards && (
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => {
                setSelectedPO(detailPO);
                setCurrentBom(detailBom);
                jobCardForm.resetFields();
                setJobCardModalOpen(true);
              }}>Create Job Cards</Button>
            )
          }>
            {detailJobCards.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No job cards yet.</div>
            ) : (
              <div className="space-y-3">
                {detailJobCards.map(jc => {
                  const done = Number(jc.quantity_completed || 0);
                  const total = Number(jc.quantity || 1);
                  const pct = Math.min(100, Math.round((done / total) * 100));
                  const isReadyForApproval = ['ready_for_approval', 'completed_production'].includes(jc.status);
                  const isApprovedForDispatch = jc.status === 'approved_for_dispatch';
                  const isDispatched = jc.status === 'dispatched';
                  return (
                    <div key={jc.id} className={`border rounded-lg p-4 ${
                      isDispatched ? 'bg-green-50 border-green-200' :
                      isApprovedForDispatch ? 'bg-purple-50 border-purple-200' :
                      isReadyForApproval ? 'bg-yellow-50 border-yellow-200' :
                      'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Button type="link" className="!p-0 font-semibold text-base" onClick={() => router.push(`/manufacturing/${jc.id}`)}>
                            {jc.job_card_number}
                          </Button>
                          <div className="text-sm text-gray-600 mt-1">{jc.product_name}</div>
                          <div className="text-xs text-gray-400 mt-1">Qty: {jc.quantity} {jc.unit || 'units'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag color={getStatusColor(jc.status)}>{getStatusLabel(jc.status)}</Tag>
                          {jc.dispatch_on_hold && <Tag color="red" icon={<StopOutlined />}>Hold</Tag>}
                        </div>
                      </div>
                      {/* Stage Pipeline */}
                      {(() => {
                        const stages = jobCardStages[jc.id] || [];
                        if (stages.length === 0) return (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progress</span>
                              <span>{done}/{total} ({pct}%)</span>
                            </div>
                            <Progress percent={pct} size="small" showInfo={false}
                              strokeColor={isDispatched ? '#52c41a' : pct === 100 ? '#52c41a' : '#1677ff'} />
                          </div>
                        );
                        const completedStages = stages.filter((s: any) => s.status === 'completed').length;
                        const stagePct = Math.round((completedStages / stages.length) * 100);
                        return (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                              <span>Stages</span>
                              <span>{completedStages}/{stages.length} completed ({stagePct}%)</span>
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                              {stages.map((stage: any, sIdx: number) => {
                                const sDone = stage.status === 'completed';
                                const sActive = stage.status === 'in_progress';
                                return (
                                  <div key={stage.id} className="flex items-center">
                                    <div className={`flex flex-col items-center min-w-[60px]`}>
                                      <div style={{ transition: 'background 0.3s, border-color 0.3s, color 0.3s' }} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                        sDone ? 'border-green-500 bg-green-100 text-green-600' :
                                        sActive ? 'border-blue-500 bg-blue-100 text-blue-600' :
                                        'border-gray-300 bg-gray-50 text-gray-400'
                                      }`}>
                                        {sDone ? <CheckCircleOutlined /> : sActive ? <span>{sIdx + 1}</span> : <LockOutlined className="text-[9px]" />}
                                      </div>
                                      <span style={{ transition: 'color 0.3s' }} className={`text-[10px] mt-0.5 text-center leading-tight max-w-[70px] truncate ${
                                        sDone ? 'text-green-600 font-medium' :
                                        sActive ? 'text-blue-600 font-medium' :
                                        'text-gray-400'
                                      }`} title={`#${sIdx + 1} ${stage.process_name}`}>#{sIdx + 1} {stage.process_name}</span>
                                    </div>
                                    {sIdx < stages.length - 1 && (
                                      <div style={{ transition: 'background 0.3s' }} className={`w-4 h-0.5 mt-[-12px] ${sDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Child Job Cards (created per completed stage) */}
                      {(childJobCardsMap[jc.id] || []).length > 0 && (
                        <div className="mb-3 space-y-1.5">
                          <Text className="text-xs text-gray-500 font-medium block mb-1">Stage Job Cards:</Text>
                          {(childJobCardsMap[jc.id] || []).map((child) => (
                            <div key={child.id} className="flex items-center justify-between border rounded px-3 py-2 bg-green-50 border-green-200">
                              <div className="flex items-center gap-2">
                                <CheckCircleOutlined className="text-green-500" />
                                <Button type="link" className="!p-0 font-semibold text-sm" onClick={() => router.push(`/manufacturing/${child.id}`)}>
                                  {child.job_card_number}
                                </Button>
                                <Text className="text-sm">{child.job_name}</Text>
                                <Tag color="success" className="text-xs">Completed</Tag>
                              </div>
                              <Text className="text-xs text-gray-500">
                                {child.completed_date ? dayjs(child.completed_date).format('DD MMM YYYY') : ''}
                              </Text>
                            </div>
                          ))}
                        </div>
                      )}
                      <Space wrap size={8}>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/${jc.id}`)}>Details</Button>
                        {jc.status === 'pending' && jcCanStartProduction && !isOnHold && (
                          <Button size="small" type="primary" icon={<PlayCircleOutlined />}
                            loading={startProductionMutation.isPending}
                            onClick={() => Modal.confirm({ title: 'Start Production?', content: `Start production for ${jc.product_name}`, onOk: () => startProductionMutation.mutateAsync(jc) })}>
                            Start Production
                          </Button>
                        )}
                        {jc.status === 'pending' && !jcCanStartProduction && !isOnHold && (
                          <Tag color="orange" icon={<ExclamationCircleOutlined />}>On Hold - Waiting for Materials</Tag>
                        )}
                        {jc.status === 'pending' && isOnHold && (
                          <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD</Tag>
                        )}
                        {['in_process', 'partially_completed'].includes(jc.status) && (
                          isOnHold ? (
                            <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD</Tag>
                          ) : (
                            <Button size="small" icon={<EditOutlined />} onClick={() => openStageProgress(jc)}>Update Progress</Button>
                          )
                        )}
                        {jc.status === 'completed_production' && (
                          <Tag color="cyan" icon={<CheckCircleOutlined />}>Production Complete</Tag>
                        )}
                        {jc.status === 'ready_for_approval' && (
                          <Tag color="gold" icon={<ClockCircleOutlined />}>Pending Dispatch Approval</Tag>
                        )}
                        {isApprovedForDispatch && (
                          <>
                            <Tag color="purple" icon={<CheckCircleOutlined />}>Approved for Dispatch</Tag>
                            <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/${jc.id}`)}>
                              Dispatch from Job Card
                            </Button>
                          </>
                        )}
                        {isDispatched && <Tag color="success" icon={<CheckCircleOutlined />}>Dispatched</Tag>}
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
        })()}

        <div className="text-center pt-2">
          <Button type="link" onClick={() => router.push(`/purchase-orders/${detailPO.id}`)}>
            View Full Purchase Order
          </Button>
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* Send for Approval */}
      <Modal title={<span><SendOutlined className="text-blue-500 mr-2" />Send for Inventory Approval — {selectedPO?.order_number}</span>}
        open={approvalModalOpen} onCancel={() => { setApprovalModalOpen(false); setSelectedPO(null); approvalForm.resetFields(); }}
        onOk={() => approvalForm.submit()} okText="Send for Approval" confirmLoading={sendForApprovalMutation.isPending} width={700}>
        <Form form={approvalForm} layout="vertical" onFinish={handleSendForApproval}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="priority" label="Priority"><Select options={[{ value: 0, label: 'Normal' }, { value: 1, label: '⚡ High' }, { value: 2, label: '🔴 Urgent' }]} /></Form.Item></Col>
            <Col span={16}><Form.Item name="expectedDelivery" label="Expected Delivery"><DatePicker className="w-full" format="DD MMM YYYY" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes for Inventory Team"><TextArea rows={2} placeholder="Any special instructions for the inventory team..." /></Form.Item>
        </Form>
        <div className="mb-2 font-semibold text-sm text-gray-600">Raw Materials from BOM:</div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-2">Material</th><th className="text-center p-2 w-28">Qty</th><th className="text-left p-2 w-20">Unit</th></tr></thead>
            <tbody>{editingItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2 font-medium">{item.itemName}</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-gray-500">{item.unitOfMeasure}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Modal>

      {/* Edit Details */}
      <Modal title={<span><EditOutlined className="text-orange-500 mr-2" />Edit — {selectedPO?.order_number}</span>}
        open={editModalOpen} onCancel={() => { setEditModalOpen(false); setSelectedPO(null); editForm.resetFields(); }}
        onOk={() => editForm.submit()} okText="Save" confirmLoading={updateDetailsMutation.isPending} width={700}>
        <Form form={editForm} layout="vertical" onFinish={handleUpdateDetails}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="priority" label="Priority"><Select options={[{ value: 0, label: 'Normal' }, { value: 1, label: '⚡ High' }, { value: 2, label: '🔴 Urgent' }]} /></Form.Item></Col>
            <Col span={16}><Form.Item name="expectedDelivery" label="Expected Delivery"><DatePicker className="w-full" format="DD MMM YYYY" /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes"><TextArea rows={2} /></Form.Item>
        </Form>
        <div className="mb-2 font-semibold text-sm text-gray-600">Products / Raw Materials:</div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-2">Item</th><th className="text-center p-2 w-28">Qty</th><th className="text-left p-2 w-20">Unit</th></tr></thead>
            <tbody>{editItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2 font-medium">{item.itemName}</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-gray-500">{item.unitOfMeasure}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Modal>

      {/* Create BOM */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileTextOutlined className="text-blue-600 text-lg" />
            </div>
            <div>
              <div className="text-base font-semibold">Create Bill of Materials</div>
              <div className="text-xs text-gray-400 font-normal">{selectedPO?.order_number} — {selectedPO?.customer_name}</div>
            </div>
          </div>
        }
        open={bomModalOpen}
        onCancel={() => { setBomModalOpen(false); setSelectedPO(null); setBomItems([]); }}
        onOk={() => {
          if (!selectedPO) return;
          const validItems = bomItems.filter(bi => (bi.rawMaterialId || bi.itemName.trim()) && bi.requiredQuantity > 0);
          if (validItems.length === 0) {
            message.warning('Add at least one material to the BOM');
            return;
          }
          const items = validItems.map(bi => ({
            rawMaterialId: bi.rawMaterialId,
            itemName: bi.rawMaterialId ? bi.itemName : bi.itemName.trim(),
            requiredQuantity: bi.requiredQuantity,
            unitOfMeasure: bi.unitOfMeasure,
          }));
          createBomMutation.mutate({ poId: selectedPO.id, items });
        }}
        okText={<span><CheckCircleOutlined className="mr-1" />Create BOM</span>}
        confirmLoading={createBomMutation.isPending}
        width={800}
        okButtonProps={{
          disabled: bomItems.filter(bi => (bi.rawMaterialId || bi.itemName.trim()) && bi.requiredQuantity > 0).length === 0,
          size: 'large',
        }}
        cancelButtonProps={{ size: 'large' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {selectedPO && <div>
          {/* Order products summary */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <Text className="text-xs text-gray-500 block mb-2 font-medium uppercase tracking-wide">Products in this order</Text>
            <div className="flex flex-wrap gap-2">
              {selectedPO.items?.map((item: any, i: number) => (
                <div key={i} className="bg-white border rounded-md px-3 py-1.5 text-sm flex items-center gap-2">
                  <AppstoreOutlined className="text-blue-400" />
                  <span className="font-medium">{item.item_name}</span>
                  <Tag className="!m-0 text-xs">x{item.quantity} {item.unit_of_measure || ''}</Tag>
                </div>
              ))}
            </div>
          </div>

          {/* Materials list header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <Text strong className="text-base">Raw Materials Required</Text>
              {bomItems.length > 0 && (
                <Tag color="blue" className="ml-2">{bomItems.filter(bi => (bi.rawMaterialId || bi.itemName.trim()) && bi.requiredQuantity > 0).length} item(s)</Tag>
              )}
            </div>
            <Button type="primary" icon={<PlusOutlined />} size="middle"
              onClick={() => setBomItems(prev => [...prev, { rawMaterialId: undefined, itemName: '', requiredQuantity: 1, unitOfMeasure: '', availableStock: 0 }])}>
              Add Material
            </Button>
          </div>

          {bomItems.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ToolOutlined className="text-2xl text-gray-400" />
              </div>
              <Text strong className="text-base block mb-1">No materials added yet</Text>
              <Text type="secondary" className="text-sm block mb-4">
                Add raw materials from inventory or enter custom materials manually
              </Text>
              <Button type="primary" icon={<PlusOutlined />}
                onClick={() => setBomItems(prev => [...prev, { rawMaterialId: undefined, itemName: '', requiredQuantity: 1, unitOfMeasure: '', availableStock: 0 }])}>
                Add First Material
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bomItems.map((bi, idx) => (
                <div key={idx} className={`rounded-lg border transition-all ${
                  bi.rawMaterialId ? 'bg-green-50 border-green-200' :
                  bi.itemName.trim() ? 'bg-blue-50 border-blue-200' :
                  'bg-white border-gray-200 shadow-sm'
                }`}>
                  {/* Header row */}
                  <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Material {idx + 1}</Text>
                    <div className="flex-1" />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                      onClick={() => setBomItems(prev => prev.filter((_, i) => i !== idx))}
                    />
                  </div>

                  {/* Inputs grid */}
                  <div className="px-3 pb-3 grid grid-cols-1 gap-2">
                    {/* Material dropdown */}
                    <div>
                      <Text className="text-xs text-gray-500 block mb-1">Select from Inventory</Text>
                      <Select
                        showSearch
                        allowClear
                        placeholder="Search by name or code..."
                        size="large"
                        className="w-full"
                        value={bi.rawMaterialId ? `rm_${bi.rawMaterialId}` : undefined}
                        filterOption={(input, option) =>
                          String(option?.searchtext || '').toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={(val) => {
                          if (!val) {
                            setBomItems(prev => prev.map((item, i) => i === idx ? {
                              ...item,
                              rawMaterialId: undefined,
                              unitOfMeasure: item.itemName.trim() ? item.unitOfMeasure : '',
                              availableStock: 0,
                            } : item));
                            return;
                          }
                          const rmId = Number(String(val).replace('rm_', ''));
                          const rm = rawMaterials.find(r => r.id === rmId);
                          if (rm) {
                            setBomItems(prev => prev.map((item, i) => i === idx ? {
                              ...item,
                              rawMaterialId: rm.id,
                              itemName: rm.material_name,
                              unitOfMeasure: rm.unit_of_measure || '',
                              availableStock: rm.available_stock || 0,
                            } : item));
                          }
                        }}
                        options={rawMaterials
                          .filter(r => r.status === 'active')
                          .map(r => ({
                            value: `rm_${r.id}`,
                            searchtext: `${r.material_name} ${r.material_code || ''}`,
                            label: (
                              <div className="flex justify-between items-center py-0.5">
                                <div>
                                  <div className="font-medium text-sm">{r.material_name}</div>
                                  {r.material_code && <div className="text-xs text-gray-400">{r.material_code}</div>}
                                </div>
                                <Tag color={Number(r.available_stock) > 0 ? 'green' : 'red'} className="!m-0 text-xs">
                                  {r.available_stock} {r.unit_of_measure || ''}
                                </Tag>
                              </div>
                            ),
                          }))}
                      />
                      {bi.rawMaterialId && (
                        <div className="flex items-center gap-2 mt-1">
                          <Tag color="green" className="!m-0 text-xs" icon={<CheckCircleOutlined />}>Inventory Item</Tag>
                          <Text className="text-xs text-gray-500">Stock available: <strong>{bi.availableStock} {bi.unitOfMeasure}</strong></Text>
                        </div>
                      )}
                    </div>

                    {/* Custom name (shown when no inventory item selected) */}
                    {!bi.rawMaterialId && (
                      <div>
                        <Text className="text-xs text-gray-500 block mb-1">— Or enter custom material name</Text>
                        <Input
                          placeholder="e.g. Steel Rod, Copper Wire..."
                          size="large"
                          value={bi.itemName}
                          onChange={(e) => setBomItems(prev => prev.map((item, i) => i === idx ? { ...item, itemName: e.target.value } : item))}
                        />
                        {bi.itemName.trim() && (
                          <Tag color="blue" className="!m-0 text-xs mt-1">Custom Material</Tag>
                        )}
                      </div>
                    )}

                    {/* Quantity + Unit row */}
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Text className="text-xs text-gray-500 block mb-1">Required Quantity *</Text>
                        <InputNumber
                          min={0.01}
                          step={1}
                          value={bi.requiredQuantity}
                          onChange={(val) => setBomItems(prev => prev.map((item, i) => i === idx ? { ...item, requiredQuantity: val || 0 } : item))}
                          style={{ width: '100%' }}
                          size="large"
                          placeholder="Enter quantity"
                        />
                      </div>
                      <div style={{ width: 140 }}>
                        <Text className="text-xs text-gray-500 block mb-1">Unit of Measure</Text>
                        {bi.rawMaterialId ? (
                          <Input size="large" value={bi.unitOfMeasure} disabled />
                        ) : (
                          <Input
                            placeholder="kg, pcs, m..."
                            size="large"
                            value={bi.unitOfMeasure}
                            onChange={(e) => setBomItems(prev => prev.map((item, i) => i === idx ? { ...item, unitOfMeasure: e.target.value } : item))}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add more button at bottom */}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                className="!h-12 !border-gray-300 hover:!border-blue-400"
                onClick={() => setBomItems(prev => [...prev, { rawMaterialId: undefined, itemName: '', requiredQuantity: 1, unitOfMeasure: '', availableStock: 0 }])}
              >
                Add Another Material
              </Button>
            </div>
          )}

          {/* Summary */}
          {bomItems.filter(bi => (bi.rawMaterialId || bi.itemName.trim()) && bi.requiredQuantity > 0).length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircleOutlined className="text-blue-500" />
                <Text className="text-sm">
                  <strong>{bomItems.filter(bi => bi.rawMaterialId && bi.requiredQuantity > 0).length}</strong> inventory item(s)
                  {bomItems.filter(bi => !bi.rawMaterialId && bi.itemName.trim() && bi.requiredQuantity > 0).length > 0 && (
                    <>, <strong>{bomItems.filter(bi => !bi.rawMaterialId && bi.itemName.trim() && bi.requiredQuantity > 0).length}</strong> custom material(s)</>
                  )}
                </Text>
              </div>
              <Text type="secondary" className="text-xs">Ready to create BOM</Text>
            </div>
          )}
        </div>}
      </Modal>

      {/* BOM View */}
      <Modal title={<div className="flex items-center gap-2">BOM — {currentBom?.bom_number || ''}</div>}
        open={bomViewModalOpen} onCancel={() => { setBomViewModalOpen(false); setCurrentBom(null); setSelectedPO(null); }} width={700}
        footer={<Space>
          <Button onClick={() => { setBomViewModalOpen(false); setCurrentBom(null); }}>Close</Button>
        </Space>}>
        {currentBom && <div>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50"><tr><th className="text-left p-2">Material</th><th className="text-center p-2 w-24">Required</th></tr></thead>
            <tbody>{currentBom.items.map((r: BomItem) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{r.item_name}</div>
                  {r.raw_material_code && <div className="text-xs text-gray-400 font-mono">{r.raw_material_code}</div>}
                  {!r.raw_material_code && r.product_code && <div className="text-xs text-gray-400">{r.product_code}</div>}
                </td>
                <td className="p-2 text-center">{r.required_quantity} {r.unit_of_measure || ''}</td>
              </tr>
            ))}</tbody>
          </table>
          {currentBom.job_cards && currentBom.job_cards.length > 0 && <div className="mt-4"><Text strong className="block mb-2">Linked Job Cards</Text>
            {currentBom.job_cards.map((jc: any) => <div key={jc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded mb-1"><Text strong className="text-sm">{jc.jobNumber}</Text><Tag color={getStatusColor(jc.status)}>{getStatusLabel(jc.status)}</Tag><Button size="small" type="link" onClick={() => router.push(`/manufacturing/${jc.id}`)}>View</Button></div>)}
          </div>}
        </div>}
      </Modal>

      {/* Create Job Cards */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ToolOutlined className="text-purple-600 text-lg" />
            </div>
            <div>
              <div className="text-base font-semibold">Create Job Card</div>
              <div className="text-xs text-gray-400 font-normal">{detailPO?.order_number} — {detailPO?.customer_name}</div>
            </div>
          </div>
        }
        open={jobCardModalOpen}
        onCancel={() => { setJobCardModalOpen(false); jobCardForm.resetFields(); }}
        onOk={() => jobCardForm.submit()}
        okText={<span><CheckCircleOutlined className="mr-1" />Create Job Card</span>}
        confirmLoading={createJobCardsMutation.isPending}
        width={800}
        okButtonProps={{ size: 'large' }}
        cancelButtonProps={{ size: 'large' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {/* Product being manufactured */}
        <div className="mb-4 p-3 rounded-lg border border-purple-200 bg-purple-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center flex-shrink-0">
            <RocketOutlined className="text-purple-700 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-purple-500 font-medium uppercase tracking-wide mb-0.5">Product to Manufacture</div>
            <div className="font-semibold text-gray-800 truncate">
              {currentBom?.product_name || detailPO?.items?.[0]?.item_name || detailPO?.order_number || 'Product'}
            </div>
            <div className="text-xs text-gray-500">
              Qty: <strong>{currentBom?.quantity ?? detailPO?.items?.[0]?.quantity ?? '—'}</strong>
              {detailPO?.customer_name && <span className="ml-3">Customer: <strong>{detailPO.customer_name}</strong></span>}
            </div>
          </div>
          {currentBom && (
            <Tag color="purple" className="flex-shrink-0">{currentBom.bom_number}</Tag>
          )}
        </div>

        {/* Job Card Settings */}
        <Form form={jobCardForm} layout="vertical" onFinish={handleCreateJobCards} className="!mb-0">
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="priority" label="Priority" initialValue={3}>
                <Select size="large" options={[{ value: 1, label: '🔴 Urgent' }, { value: 2, label: '⚡ High' }, { value: 3, label: 'Medium' }, { value: 4, label: 'Low' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker className="w-full" size="large" format="DD MMM YYYY" placeholder="Select start date" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="expectedCompletion" label="Expected Completion">
                <DatePicker className="w-full" size="large" format="DD MMM YYYY" placeholder="Select deadline" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes" className="!mb-0">
            <Input.TextArea rows={2} placeholder="Any special instructions for the production team..." />
          </Form.Item>
        </Form>

        {/* BOM Materials summary — collapsed */}
        {currentBom && currentBom.items.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleOutlined className="text-green-600 text-xs" />
              <Text className="text-xs text-gray-500">
                <strong>{currentBom.items.filter((i: BomItem) => !i.is_custom).length} raw material(s)</strong> from BOM already approved & issued to production
              </Text>
            </div>
          </div>
        )}

      </Modal>

      {/* Production Stages Modal */}
      <Modal title={`Production Stages — ${selectedJob?.job_card_number}`} open={progressModalOpen}
        onCancel={() => { setProgressModalOpen(false); setSelectedJob(null); setStageProgressData([]); }}
        footer={null} destroyOnClose width={640}>
        {selectedJob && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Text strong>{selectedJob.product_name || selectedJob.job_card_number}</Text>
            <div className="text-sm text-gray-500 mt-1">Qty: <strong>{selectedJob.quantity}</strong> {selectedJob.unit || 'units'}</div>
          </div>
        )}
        {stageProgressLoading ? (
          <div className="text-center py-8"><Spin /></div>
        ) : stageProgressData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No stages defined. Configure in Settings &gt; Stage Master.</div>
        ) : (
          <div className="space-y-4">
            {stageProgressData.map((stage: any, idx: number) => {
              const isDone = stage.status === 'completed';
              const isActive = stage.status === 'in_progress';
              const isPending = stage.status === 'pending';
              const durationHours = stage.started_at && stage.completed_at
                ? Math.round((new Date(stage.completed_at).getTime() - new Date(stage.started_at).getTime()) / 3600000)
                : null;
              // Find the child job card created for this completed stage
              const childJC = childJobCards.find(c => c.stage_number === idx + 1);

              return (
                <div key={stage.id} className="flex items-stretch gap-3">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div style={{ transition: 'background 0.35s, border-color 0.35s, color 0.35s' }} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      isDone ? 'border-green-500 bg-green-100 text-green-600' :
                      isActive ? 'border-blue-500 bg-blue-100 text-blue-600 ring-3 ring-blue-100' :
                      'border-gray-300 bg-gray-50 text-gray-400'
                    }`}>
                      {isDone ? <CheckCircleOutlined /> : isActive ? <span>{idx + 1}</span> : <LockOutlined className="text-[10px]" />}
                    </div>
                    {idx < stageProgressData.length - 1 && (
                      <div style={{ transition: 'background 0.35s' }} className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>

                  {/* Stage card */}
                  <div style={{ transition: 'background 0.35s, border-color 0.35s, opacity 0.35s' }} className={`flex-1 border rounded-lg p-3 mb-0 ${
                    isDone ? 'border-green-300 bg-green-50' :
                    isActive ? 'border-blue-400 bg-blue-50 shadow-sm' :
                    'border-gray-200 bg-gray-50 opacity-60'
                  }`}>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {childJC ? (
                          <Button type="link" className="!p-0 !h-auto font-bold text-blue-600 text-xs" onClick={() => router.push(`/manufacturing/${childJC.id}`)}>
                            {childJC.job_card_number}
                          </Button>
                        ) : (
                          <Tag color="blue" className="text-xs font-bold">Job Card #{idx + 1}</Tag>
                        )}
                        <Text strong className={`text-sm ${isPending ? 'text-gray-400' : ''}`}>{stage.process_name}</Text>
                        <Tag color={isDone ? 'success' : isActive ? 'processing' : 'default'} className="text-xs">
                          {isDone ? 'Completed' : isActive ? 'In Progress' : 'Locked'}
                        </Tag>
                      </div>
                    </div>

                    {/* Completed stage details */}
                    {isDone && (
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex flex-wrap gap-4">
                          {stage.started_at && (
                            <span><ClockCircleOutlined className="mr-1" />Started: {dayjs(stage.started_at).format('DD MMM YYYY, hh:mm A')}</span>
                          )}
                          {stage.completed_at && (
                            <span className="text-green-600 font-medium"><CheckCircleOutlined className="mr-1" />Completed: {dayjs(stage.completed_at).format('DD MMM YYYY, hh:mm A')}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {durationHours != null && (
                            <span><ClockCircleOutlined className="mr-1" />Duration: {durationHours > 24 ? `${Math.round(durationHours / 24)} day(s)` : `${durationHours} hour(s)`}</span>
                          )}
                          {stage.completed_by_name && <span><UserOutlined className="mr-1" />By: {stage.completed_by_name}</span>}
                        </div>
                        {stage.description && (
                          <div className="mt-1 p-2 bg-white rounded border border-green-200">
                            <Text strong className="text-xs block mb-0.5"><FileTextOutlined className="mr-1" />Description:</Text>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{stage.description}</div>
                          </div>
                        )}
                        {stage.remarks && (
                          <div className="mt-1"><FileTextOutlined className="mr-1" />Notes: {stage.remarks}</div>
                        )}
                      </div>
                    )}

                    {/* Active stage — inline complete form */}
                    {isActive && (
                      <div className="space-y-3 pt-2">
                        {stage.started_at && (
                          <div className="text-xs text-gray-500">
                            <ClockCircleOutlined className="mr-1" />Started: {dayjs(stage.started_at).format('DD MMM YYYY, hh:mm A')}
                          </div>
                        )}
                        {isOnHold ? (
                          <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD — Production paused</Tag>
                        ) : (
                          <>
                            <div className="bg-white rounded border border-blue-200 p-3 space-y-3">
                              <Text strong className="text-xs text-blue-700 uppercase tracking-wide block">Complete this stage</Text>
                              <div>
                                <Text className="text-xs text-gray-500 block mb-1">Completed Date</Text>
                                <DatePicker
                                  showTime
                                  className="w-full"
                                  value={stageCompletedDate}
                                  onChange={val => setStageCompletedDate(val)}
                                  format="DD MMM YYYY, hh:mm A"
                                  size="small"
                                />
                              </div>
                              <div>
                                <Text className="text-xs text-gray-500 block mb-1">Description / Work Done</Text>
                                <Input.TextArea
                                  placeholder="Describe the work completed in this stage..."
                                  rows={2}
                                  size="small"
                                  value={stageDescription}
                                  onChange={e => setStageDescription(e.target.value)}
                                />
                              </div>
                              <div>
                                <Text className="text-xs text-gray-500 block mb-1">Notes (optional)</Text>
                                <Input.TextArea
                                  placeholder="Any additional notes or observations..."
                                  rows={1}
                                  size="small"
                                  value={stageNotes}
                                  onChange={e => setStageNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <Button
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              style={{ background: '#52c41a', borderColor: '#52c41a' }}
                              loading={completeCurrentStageMutation.isPending}
                              block
                              onClick={() => {
                                if (!selectedJob) return;
                                completeCurrentStageMutation.mutate({
                                  jobId: selectedJob.id,
                                  notes: stageNotes || undefined,
                                  completedDate: stageCompletedDate ? stageCompletedDate.toISOString() : undefined,
                                  description: stageDescription || undefined,
                                });
                              }}
                            >
                              Complete Stage
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Pending stage */}
                    {isPending && (
                      <div className="text-xs text-gray-400">Starts after previous stage is completed.</div>
                    )}
                  </div>
                </div>
              );
            })}
            {(() => {
              const completedCount = stageProgressData.filter((s: any) => s.status === 'completed').length;
              const allDone = completedCount === stageProgressData.length && stageProgressData.length > 0;
              return allDone ? (
                <div className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircleOutlined className="text-green-500 text-2xl mb-2" />
                    <div className="text-green-700 font-semibold text-base">All Stages Complete!</div>
                    <div className="text-green-600 text-sm mt-1">Production is done. This job card will now move to dispatch approval.</div>
                  </div>
                  <Button
                    type="primary"
                    block
                    className="mt-3"
                    onClick={() => { setProgressModalOpen(false); setSelectedJob(null); setStageProgressData([]); }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="text-center pt-2 text-sm text-gray-400">
                  {completedCount}/{stageProgressData.length} stages completed
                </div>
              );
            })()}
          </div>
        )}
      </Modal>


      {/* Dispatch Modal */}
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
    </div>
  );
}

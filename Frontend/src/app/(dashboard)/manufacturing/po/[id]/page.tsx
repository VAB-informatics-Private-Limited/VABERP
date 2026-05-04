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
  PauseCircleOutlined, ToolOutlined, AppstoreOutlined, SaveOutlined,
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
  updateBomItems,
  getBomByPurchaseOrder,
  getBomsByPurchaseOrder,
  createJobCardsFromBom,
  sendForApproval,
  updateManufacturingDetails,
  startProductionForItem,
  requestInventoryForItem,
} from '@/lib/api/bom';
import { getMaterialRequestById, confirmMaterialsReceived } from '@/lib/api/material-requests';
import { getWasteCategories, recordProductionWaste } from '@/lib/api/waste';
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
  const [wasteRawMaterialId, setWasteRawMaterialId] = useState<number | null>(null);
  const [wasteQuantity, setWasteQuantity] = useState<number>(0);
  const [wasteUnit, setWasteUnit] = useState<string>('');
  const [wasteConsumedQty, setWasteConsumedQty] = useState<number>(0);
  const [wasteNotes, setWasteNotes] = useState<string>('');

  const { data: wasteCategoriesData } = useQuery({
    queryKey: ['waste-categories'],
    queryFn: getWasteCategories,
    staleTime: 300000,
  });
  const wasteCategories = wasteCategoriesData || [];
  const [childJobCards, setChildJobCards] = useState<JobCard[]>([]);
  const [childJobCardsMap, setChildJobCardsMap] = useState<Record<number, JobCard[]>>({});

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

  const [bomForProductId, setBomForProductId] = useState<number | null>(null);
  const [editingBomId, setEditingBomId] = useState<number | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [detailBoms, setDetailBoms] = useState<Bom[]>([]);


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
      let bomList: Bom[] = [];
      if (po.bom_count > 0) {
        try {
          const rList = await getBomsByPurchaseOrder(poId);
          bomList = rList.data || [];
          bom = bomList[0] || null;
        } catch {
          const r = await getBomByPurchaseOrder(poId);
          bom = r.data || null;
          bomList = bom ? [bom] : [];
        }
      }
      setDetailBom(bom);
      setDetailBoms(bomList);

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
    mutationFn: ({ poId, productId, items }: { poId: number; productId: number; items?: Array<{ rawMaterialId?: number; itemName: string; requiredQuantity: number; unitOfMeasure?: string }> }) =>
      createBom({ purchaseOrderId: poId, productId, items }),
    onSuccess: (result) => {
      message.success(`BOM saved: ${result.data?.bom_number || ''}`);
      setCurrentBom(result.data || null);
      setBomModalOpen(false);
      setBomForProductId(null);
      setEditingBomId(null);
      setBomItems([]);
      refreshPage();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to save BOM'),
  });

  const updateBomMutation = useMutation({
    mutationFn: ({ bomId, items }: { bomId: number; items: Array<{ rawMaterialId?: number; itemName: string; requiredQuantity: number; unitOfMeasure?: string }> }) =>
      updateBomItems(bomId, items),
    onSuccess: (result) => {
      message.success(`BOM updated: ${result.data?.bom_number || ''}`);
      setCurrentBom(result.data || null);
      setBomModalOpen(false);
      setBomForProductId(null);
      setEditingBomId(null);
      setBomItems([]);
      refreshPage();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update BOM'),
  });

  const openEditBom = (bom: Bom) => {
    setSelectedPO(detailPO);
    setEditingBomId(bom.id);
    setBomForProductId(bom.product_id || null);
    setBomItems(
      (bom.items || []).map((it) => {
        const rm = it.raw_material_id ? rawMaterials.find((r) => r.id === it.raw_material_id) : undefined;
        return {
          rawMaterialId: it.raw_material_id || undefined,
          itemName: it.item_name,
          requiredQuantity: Number(it.required_quantity),
          unitOfMeasure: it.unit_of_measure || rm?.unit_of_measure || '',
          availableStock: rm?.available_stock || 0,
        };
      }),
    );
    setBomModalOpen(true);
  };

  const createJobCardsMutation = useMutation({
    mutationFn: ({ bomId, jobCards }: { bomId: number; jobCards: any[] }) =>
      createJobCardsFromBom(bomId, jobCards),
    onSuccess: () => { message.success('Job cards created'); setJobCardModalOpen(false); setBomViewModalOpen(false); jobCardForm.resetFields(); refreshPage(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const startProductionMutation = useMutation({
    mutationFn: async ({ job, force }: { job: JobCard; force?: boolean }) => {
      await updateJobCardStatus(job.id, 'in_process', enterpriseId!, force);
    },
    onSuccess: (_data, vars) => {
      message.success(vars.force ? 'Production started with partial materials' : 'Production started');
      refreshPage();
    },
    onError: (err: any, vars) => {
      const msg: string = err?.response?.data?.message || 'Failed';
      // Partial-materials override: offer to proceed anyway.
      if (!vars.force && msg.includes('Materials not fully issued')) {
        Modal.confirm({
          title: 'Start with partial materials?',
          content: (
            <div>
              <p className="mb-2 text-sm">{msg}</p>
              <p className="text-xs text-gray-500">You can proceed now and issue the rest later. The job card will be marked in-process.</p>
            </div>
          ),
          okText: 'Start anyway',
          okButtonProps: { danger: true },
          onOk: () => startProductionMutation.mutateAsync({ job: vars.job, force: true }),
        });
      } else {
        message.error(msg);
      }
    },
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
    } else { openBomCreation(po); }
  };

  // Collect distinct products in the PO that still need a BOM.
  const getProductsNeedingBom = (po: ManufacturingPO, existingBoms: Bom[]) => {
    const covered = new Set<number>(existingBoms.map((b) => b.product_id).filter(Boolean) as number[]);
    const seen = new Set<number>();
    const list: Array<{ product_id: number; product_name: string; quantity: number; unit: string }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const it of (po.items || []) as any[]) {
      const pid = it.product_id || it.productId;
      if (!pid || covered.has(pid) || seen.has(pid)) continue;
      seen.add(pid);
      list.push({
        product_id: pid,
        product_name: it.item_name || it.product_name || 'Product',
        quantity: Number(it.quantity || 0),
        unit: it.unit_of_measure || '',
      });
    }
    return list;
  };

  const openBomCreation = (po: ManufacturingPO) => {
    setSelectedPO(po);
    const pending = getProductsNeedingBom(po, detailBoms);
    if (pending.length === 0) {
      message.info('All products in this PO already have a BOM');
      return;
    }
    if (pending.length === 1) {
      setBomForProductId(pending[0].product_id);
      setBomItems([]);
      setBomModalOpen(true);
    } else {
      setProductPickerOpen(true);
    }
  };

  const pickProductForBom = (productId: number) => {
    setProductPickerOpen(false);
    setBomForProductId(productId);
    setBomItems([]);
    setBomModalOpen(true);
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
          <Card size="small" className="border-gray-300">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Text strong className="text-sm block">Step 1 — Create BOMs per product</Text>
                <Text type="secondary" className="text-xs">
                  Add raw materials for each product in this order.
                </Text>
              </div>
              <div className="flex gap-2">
                <Button size="middle" icon={<EditOutlined />} onClick={() => openEditDetails(detailPO)}>
                  Edit Details
                </Button>
                <Button
                  size="middle"
                  icon={<PlusOutlined />}
                  onClick={() => { openBomCreation(detailPO); }}
                  loading={createBomMutation.isPending}
                  style={{ background: '#000', color: '#fff', borderColor: '#000' }}
                >
                  Create BOM
                </Button>
              </div>
            </div>
          </Card>
        )}

        {ws === 'bom_created' && detailBoms.length > 0 && (() => {
          const bomByProduct = new Map<number, Bom>();
          for (const b of detailBoms) if (b.product_id) bomByProduct.set(b.product_id, b);

          // Distinct products in the order (in their PO order)
          const seen = new Set<number>();
          const productList: Array<{ product_id: number; product_name: string }> = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const it of (detailPO.items || []) as any[]) {
            const pid = it.product_id || it.productId;
            if (!pid || seen.has(pid)) continue;
            seen.add(pid);
            productList.push({ product_id: pid, product_name: it.item_name || it.product_name || 'Product' });
          }
          const doneCount = productList.filter((p) => bomByProduct.has(p.product_id)).length;
          const missing = productList.length - doneCount;
          const allDone = missing === 0;

          return (
            <Card size="small" className="border-gray-300">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                <div>
                  <Text strong className="text-sm block">Step 2 — Bill of Materials</Text>
                  <Text type="secondary" className="text-xs">
                    {doneCount} of {productList.length} products have a BOM
                  </Text>
                </div>
                <div className="flex gap-2">
                  {!allDone && (
                    <Button size="middle" icon={<PlusOutlined />} onClick={() => openBomCreation(detailPO)}>
                      Create next BOM
                    </Button>
                  )}
                  <Button
                    size="middle"
                    icon={<SendOutlined />}
                    onClick={() => openSendForApproval(detailPO)}
                    disabled={!allDone}
                    style={allDone ? { background: '#000', color: '#fff', borderColor: '#000' } : undefined}
                  >
                    Send for Approval
                  </Button>
                </div>
              </div>

              {/* Per-product status strip */}
              <div className="flex flex-wrap gap-2">
                {productList.map((p) => {
                  const bom = bomByProduct.get(p.product_id);
                  return (
                    <div
                      key={p.product_id}
                      className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${
                        bom ? 'border-gray-300 bg-white text-gray-700' : 'border-dashed border-gray-400 bg-gray-50 text-gray-500'
                      }`}
                    >
                      {bom ? <CheckCircleOutlined className="text-gray-700" /> : <ClockCircleOutlined className="text-gray-400" />}
                      <span className="font-medium">{p.product_name}</span>
                      {bom ? (
                        <span className="text-gray-500">· {bom.bom_number}</span>
                      ) : (
                        <Button
                          size="small"
                          type="text"
                          className="!px-1 !py-0 !h-auto"
                          onClick={() => pickProductForBom(p.product_id)}
                        >
                          + Create
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}

        {ws === 'pending_approval' && (
          <Card size="small" className="border-gray-300">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Text strong className="text-sm block">Waiting for Inventory Approval</Text>
                <Text type="secondary" className="text-xs block mt-1">
                  Material request sent{detailMR ? `: ${detailMR.request_number}` : ''}. If you changed a BOM, refresh the request.
                </Text>
              </div>
              {detailMR && detailMR.status === 'pending' && (
                <Button
                  size="middle"
                  icon={<SyncOutlined />}
                  onClick={() => sendForApprovalMutation.mutate({
                    poId: detailPO.id,
                    data: {
                      priority: detailPO.manufacturing_priority || 0,
                      notes: detailPO.manufacturing_notes || '',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      items: (detailPO.items || []).map((it: any) => ({
                        itemId: it.id,
                        itemName: it.item_name,
                        quantity: it.quantity,
                        unitOfMeasure: it.unit_of_measure,
                      })),
                    },
                  })}
                  loading={sendForApprovalMutation.isPending}
                >
                  Refresh materials list
                </Button>
              )}
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

        {/* Step 3 — Per-product job cards status */}
        {(ws === 'approved' || mrIssued || detailJobCards.length > 0) && detailBoms.length > 0 && (() => {
          const jcByProduct = new Map<number, JobCard>();
          for (const jc of detailJobCards) {
            if (jc.parent_job_card_id) continue; // skip children
            if (jc.product_id && !jcByProduct.has(jc.product_id)) {
              jcByProduct.set(jc.product_id, jc);
            }
          }
          const rows = detailBoms
            .filter((b) => b.product_id != null)
            .map((b) => ({
              bom: b,
              product_name: b.product_name || 'Product',
              jc: jcByProduct.get(b.product_id as number) || null,
            }));
          const doneCount = rows.filter((r) => r.jc).length;
          const allDone = rows.length > 0 && doneCount === rows.length;
          const canCreateAny = (ws === 'approved' || mrIssued) && !allDone;

          return (
            <Card size="small" className="border-gray-300">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <Text strong className="text-sm block">Step 3 — Job Cards</Text>
                  <Text type="secondary" className="text-xs">
                    {doneCount} of {rows.length} product(s) have a job card
                  </Text>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rows.map(({ bom, product_name, jc }) => (
                  <div
                    key={bom.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${
                      jc ? 'border-gray-300 bg-white text-gray-700' : 'border-dashed border-gray-400 bg-gray-50 text-gray-500'
                    }`}
                  >
                    {jc ? <CheckCircleOutlined className="text-gray-700" /> : <ClockCircleOutlined className="text-gray-400" />}
                    <span className="font-medium">{product_name}</span>
                    {jc ? (
                      <>
                        <span className="text-gray-500">· {jc.job_card_number}</span>
                        <Button
                          size="small"
                          type="text"
                          className="!px-1 !py-0 !h-auto"
                          onClick={() => router.push(`/manufacturing/${jc.id}`)}
                        >
                          view
                        </Button>
                      </>
                    ) : (
                      canCreateAny && (
                        <Button
                          size="small"
                          type="text"
                          className="!px-1 !py-0 !h-auto"
                          onClick={() => {
                            setSelectedPO(detailPO);
                            setCurrentBom(bom);
                            jobCardForm.resetFields();
                            setJobCardModalOpen(true);
                          }}
                        >
                          + Create
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

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
                            {isUnavailable && (
                              <Button
                                size="small"
                                icon={<SyncOutlined />}
                                loading={requestInventoryMutation.isPending}
                                onClick={() => {
                                  const poItem = detailPO.items.find(pi => pi.product_id === item.product_id);
                                  if (poItem) {
                                    Modal.confirm({
                                      title: 'Ask Inventory to recheck?',
                                      content: `Request Inventory team to recheck stock for "${item.item_name}".`,
                                      okText: 'Recheck',
                                      onOk: () => requestInventoryMutation.mutateAsync({ poId: detailPO.id, itemId: poItem.id }),
                                    });
                                  }
                                }}
                              >
                                Recheck
                              </Button>
                            )}
                            {(isApproved || isPartiallyIssued) && (
                              <span className="text-xs text-gray-500">Waiting for Inventory to issue</span>
                            )}
                            {isFullyIssued && <span className="text-xs text-green-600">Issued · confirm receipt below</span>}
                            {isPending && <span className="text-xs text-gray-400">Under review</span>}
                          </Space>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                                    onOk: () => startProductionMutation.mutateAsync({ job: itemJobCard }),
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
                                  onOk: () => startProductionMutation.mutateAsync({ job: itemJobCard }),
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
                                  strokeColor={itemJobCard.status === 'completed_production' ? '#52c41a' : 'var(--color-primary)'}
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
                                strokeColor={itemJobCard.status === 'completed_production' ? '#52c41a' : 'var(--color-primary)'}
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

        {/* ── BOM SECTION (per product) ── */}
        {detailPO && (() => {
          // Distinct products in the PO, each row showing its BOM status.
          const seen = new Set<number>();
          const productRows: Array<{ product_id: number; product_name: string; quantity: number; unit: string; bom?: Bom }> = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const it of (detailPO.items || []) as any[]) {
            const pid = it.product_id || it.productId;
            if (!pid || seen.has(pid)) continue;
            seen.add(pid);
            productRows.push({
              product_id: pid,
              product_name: it.item_name || it.product_name || 'Product',
              quantity: Number(it.quantity || 0),
              unit: it.unit_of_measure || '',
              bom: detailBoms.find((b) => b.product_id === pid),
            });
          }
          const createdCount = productRows.filter((r) => !!r.bom).length;

          return (
            <Card size="small" title={
              <span className="flex items-center gap-2">
                Bill of Materials (per product)
                <Badge count={`${createdCount} / ${productRows.length}`} showZero
                  color={createdCount === productRows.length && productRows.length > 0 ? 'green' : createdCount > 0 ? 'blue' : 'default'} />
              </span>
            }>
              {productRows.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No products on this order.</div>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-3">
                    Each product needs its own BOM. Add the raw materials manually for each product below.
                  </div>
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium">Product</th>
                        <th className="text-center p-2 font-medium w-24">Qty</th>
                        <th className="text-left p-2 font-medium w-48">BOM</th>
                        <th className="text-right p-2 font-medium w-40">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row) => (
                        <tr key={row.product_id} className="border-t">
                          <td className="p-2">
                            <div className="font-medium">{row.product_name}</div>
                          </td>
                          <td className="p-2 text-center">{row.quantity} {row.unit}</td>
                          <td className="p-2">
                            {row.bom ? (
                              <div>
                                <Tag color="green" icon={<CheckCircleOutlined />} className="!m-0">
                                  {row.bom.bom_number}
                                </Tag>
                                <span className="text-xs text-gray-400 ml-2">
                                  {row.bom.items.length} material(s)
                                </span>
                              </div>
                            ) : (
                              <Tag color="default" className="!m-0">
                                Not created
                              </Tag>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {row.bom ? (
                              <Space>
                                <Button size="small" icon={<EyeOutlined />}
                                  onClick={() => { setCurrentBom(row.bom!); setBomViewModalOpen(true); }}
                                >
                                  View
                                </Button>
                                <Button size="small" icon={<EditOutlined />}
                                  onClick={() => openEditBom(row.bom!)}
                                >
                                  Edit
                                </Button>
                              </Space>
                            ) : (
                              <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => pickProductForBom(row.product_id)}
                                loading={createBomMutation.isPending && bomForProductId === row.product_id}
                                style={{ background: '#000', color: '#fff', borderColor: '#000' }}
                              >
                                Create BOM
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </Card>
          );
        })()}

        {/* ── JOB CARDS SECTION ── */}
        {(() => {
          const jcMrItems = detailMR?.items || [];

          // Per-product material availability, computed from each product's own BOM
          // vs the aggregated MR's issued quantities.
          const materialStatusForProduct = (productId?: number): {
            status: 'fully' | 'partial' | 'none' | 'no_bom';
            shortItems: string[];
          } => {
            if (!productId) return { status: 'no_bom', shortItems: [] };
            const bom = detailBoms.find((b) => b.product_id === productId);
            if (!bom || !bom.items || bom.items.length === 0) return { status: 'no_bom', shortItems: [] };

            let fully = 0;
            let partial = 0;
            let totalNeeded = 0;
            const shortItems: string[] = [];

            for (const bi of bom.items) {
              const needed = Number(bi.required_quantity || 0);
              if (needed <= 0) continue;
              totalNeeded += 1;
              let issued = 0;
              if (bi.raw_material_id) {
                const mi = jcMrItems.find((m) => m.raw_material_id === bi.raw_material_id);
                issued = mi ? Number(mi.quantity_issued || 0) : 0;
              } else {
                const mi = jcMrItems.find((m) => !m.raw_material_id && m.item_name === bi.item_name);
                issued = mi ? Number(mi.quantity_issued || 0) : 0;
              }
              if (issued >= needed) fully += 1;
              else if (issued > 0) partial += 1;
              else shortItems.push(bi.item_name);
            }

            if (totalNeeded === 0) return { status: 'no_bom', shortItems: [] };
            if (fully === totalNeeded) return { status: 'fully', shortItems };
            if (fully + partial > 0) return { status: 'partial', shortItems };
            return { status: 'none', shortItems };
          };

          return (detailBom || detailJobCards.length > 0) && (
          <Card size="small" title={
            <span className="flex items-center gap-2">
              Job Cards
              <Badge count={detailJobCards.length} showZero color={detailJobCards.length > 0 ? 'blue' : 'default'} />
            </span>
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
                              strokeColor={isDispatched ? '#52c41a' : pct === 100 ? '#52c41a' : 'var(--color-primary)'} />
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
                      {/* Per-product material status indicator */}
                      {(() => {
                        const { status, shortItems } = materialStatusForProduct(jc.product_id);
                        if (status === 'no_bom') return null;
                        const label =
                          status === 'fully' ? 'Fully Issued' :
                          status === 'partial' ? 'Partially Issued' : 'Not Issued';
                        const tone =
                          status === 'fully' ? { border: '#d9f7be', dot: '#52c41a' } :
                          status === 'partial' ? { border: '#ffe7ba', dot: '#fa8c16' } :
                          { border: '#ffccc7', dot: '#ff4d4f' };
                        return (
                          <div
                            className="mb-3 flex items-center gap-2 px-2 py-1 rounded border text-xs"
                            style={{ borderColor: tone.border, background: '#fff' }}
                          >
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: tone.dot }} />
                            <span className="text-gray-700 font-medium">Materials: {label}</span>
                            {shortItems.length > 0 && status !== 'fully' && (
                              <span className="text-gray-500">· missing: {shortItems.slice(0, 3).join(', ')}{shortItems.length > 3 ? ` (+${shortItems.length - 3})` : ''}</span>
                            )}
                          </div>
                        );
                      })()}

                      <Space wrap size={8}>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/${jc.id}`)}>Details</Button>
                        {(() => {
                          if (jc.status !== 'pending' || isOnHold) return null;
                          const { status } = materialStatusForProduct(jc.product_id);
                          // Allow click whenever there's something to work with. If materials
                          // are only partial, the backend rejects and the mutation opens a
                          // confirmation modal to "Start anyway" via force=true.
                          const canStart = status === 'fully' || status === 'partial';
                          return (
                            <>
                              <Button
                                size="small"
                                icon={<PlayCircleOutlined />}
                                disabled={!canStart}
                                loading={startProductionMutation.isPending}
                                onClick={() => Modal.confirm({
                                  title: 'Start Production?',
                                  content: `Start production for ${jc.product_name}`,
                                  onOk: () => startProductionMutation.mutateAsync({ job: jc }),
                                })}
                                style={canStart ? { background: '#000', color: '#fff', borderColor: '#000' } : undefined}
                              >
                                Start Production
                              </Button>
                              {status === 'partial' && (
                                <span className="text-xs text-orange-600">Partial materials</span>
                              )}
                              {status === 'none' && (
                                <span className="text-xs text-gray-500">Waiting for materials</span>
                              )}
                            </>
                          );
                        })()}
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
      <Modal title={<span><SendOutlined className="text-brand mr-2" />Send for Inventory Approval — {selectedPO?.order_number}</span>}
        open={approvalModalOpen} onCancel={() => { setApprovalModalOpen(false); setSelectedPO(null); approvalForm.resetFields(); }}
        onOk={() => approvalForm.submit()} okText="Send for Approval" confirmLoading={sendForApprovalMutation.isPending} width={700}>
        <Form form={approvalForm} layout="vertical" onFinish={handleSendForApproval}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="priority" label="Priority"><Select options={[{ value: 0, label: 'Normal' }, { value: 1, label: '⚡ High' }, { value: 2, label: '🔴 Urgent' }]} /></Form.Item></Col>
            <Col span={16}><Form.Item name="expectedDelivery" label="Expected Delivery"><DatePicker className="w-full" format="DD MMM YYYY" disabledDate={(d) => !!d && d.isBefore(dayjs().startOf('day'))} /></Form.Item></Col>
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

      {/* Product picker — choose which product to create a BOM for */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center">
              <AppstoreOutlined className="text-brand text-lg" />
            </div>
            <div>
              <div className="text-base font-semibold">Select a Product</div>
              <div className="text-xs text-gray-400 font-normal">
                {selectedPO?.order_number} — each product needs its own BOM
              </div>
            </div>
          </div>
        }
        open={productPickerOpen}
        onCancel={() => setProductPickerOpen(false)}
        footer={null}
        width={640}
      >
        {selectedPO && (() => {
          const pending = getProductsNeedingBom(selectedPO, detailBoms);
          const coveredCount = (selectedPO.items || []).length - pending.length;
          return (
            <div>
              <div className="text-xs text-gray-500 mb-3">
                {coveredCount > 0 && <span>{coveredCount} already has a BOM. </span>}
                Pick a product to create its BOM. Items pre-fill from the product&apos;s master BOM when one exists.
              </div>
              <div className="space-y-2">
                {pending.map((p) => (
                  <button
                    key={p.product_id}
                    onClick={() => pickProductForBom(p.product_id)}
                    className="w-full text-left p-3 bg-white hover:bg-brand-soft border border-gray-200 hover:border-brand rounded-lg transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{p.product_name}</div>
                      <div className="text-xs text-gray-400">Qty: {p.quantity} {p.unit}</div>
                    </div>
                    <PlusOutlined className="text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Create BOM */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center">
              <FileTextOutlined className="text-brand text-lg" />
            </div>
            <div>
              <div className="text-base font-semibold">
                {editingBomId ? 'Edit BOM' : 'Create BOM'}{bomForProductId && selectedPO ? ` — ${
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  selectedPO.items.find((it: any) => (it.product_id || it.productId) === bomForProductId)?.item_name || 'Product'
                }` : ''}
              </div>
              <div className="text-xs text-gray-400 font-normal">{selectedPO?.order_number} — {selectedPO?.customer_name}</div>
            </div>
          </div>
        }
        open={bomModalOpen}
        onCancel={() => { setBomModalOpen(false); setBomForProductId(null); setEditingBomId(null); setBomItems([]); }}
        onOk={() => {
          if (!selectedPO || !bomForProductId) {
            message.warning('Select a product first');
            return;
          }
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
          if (editingBomId) {
            updateBomMutation.mutate({ bomId: editingBomId, items });
          } else {
            createBomMutation.mutate({ poId: selectedPO.id, productId: bomForProductId, items });
          }
        }}
        okText={<span><SaveOutlined className="mr-1" />{editingBomId ? 'Save Changes' : 'Save BOM'}</span>}
        cancelText="Cancel"
        confirmLoading={createBomMutation.isPending || updateBomMutation.isPending}
        width={760}
        okButtonProps={{
          disabled: bomItems.filter(bi => (bi.rawMaterialId || bi.itemName.trim()) && bi.requiredQuantity > 0).length === 0,
          size: 'middle',
          style: { background: '#000', color: '#fff', borderColor: '#000' },
        }}
        cancelButtonProps={{ size: 'middle' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {selectedPO && <div>
          {/* Selected product summary */}
          {bomForProductId && (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const item: any = selectedPO.items?.find((it: any) => (it.product_id || it.productId) === bomForProductId);
            if (!item) return null;
            return (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center">
                  <AppstoreOutlined className="text-brand text-lg" />
                </div>
                <div className="flex-1">
                  <Text className="text-xs text-gray-500 block uppercase tracking-wide">Building BOM for</Text>
                  <Text strong className="text-base">{item.item_name}</Text>
                </div>
                <Tag color="blue" className="!m-0">Qty: {item.quantity} {item.unit_of_measure || ''}</Tag>
              </div>
            );
          })()}

          {/* Simple flat table: Material | Qty | Unit | × */}
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 font-medium" style={{ width: '55%' }}>Material</th>
                <th className="text-left p-2 font-medium" style={{ width: '20%' }}>Qty</th>
                <th className="text-left p-2 font-medium" style={{ width: '15%' }}>Unit</th>
                <th className="p-2" style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {bomItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    No materials added yet. Click <strong>+ Add Material</strong> below to start.
                  </td>
                </tr>
              ) : (
                bomItems.map((bi, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <Select
                        showSearch
                        allowClear
                        placeholder="Search material or type custom name..."
                        className="w-full"
                        value={bi.rawMaterialId ? `rm_${bi.rawMaterialId}` : (bi.itemName ? `custom_${idx}` : undefined)}
                        filterOption={(input, option) =>
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          String((option as any)?.searchtext || '').toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={(val) => {
                          if (!val) {
                            setBomItems(prev => prev.map((item, i) => i === idx ? {
                              ...item, rawMaterialId: undefined, itemName: '', unitOfMeasure: '', availableStock: 0,
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
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <div className="border-t p-2">
                              <Input
                                size="small"
                                placeholder="Or type a custom name and press Enter"
                                onPressEnter={(e) => {
                                  const name = (e.target as HTMLInputElement).value.trim();
                                  if (!name) return;
                                  setBomItems(prev => prev.map((item, i) => i === idx ? {
                                    ...item, rawMaterialId: undefined, itemName: name,
                                  } : item));
                                  (e.target as HTMLInputElement).value = '';
                                }}
                              />
                            </div>
                          </>
                        )}
                        options={rawMaterials
                          .filter(r => r.status === 'active')
                          .map(r => ({
                            value: `rm_${r.id}`,
                            searchtext: `${r.material_name} ${r.material_code || ''}`,
                            label: (
                              <div className="flex justify-between items-center">
                                <span>{r.material_name}</span>
                                <Tag color={Number(r.available_stock) > 0 ? 'green' : 'red'} className="!m-0 text-xs">
                                  {r.available_stock} {r.unit_of_measure || ''}
                                </Tag>
                              </div>
                            ),
                          }))}
                      />
                      {!bi.rawMaterialId && bi.itemName && (
                        <Tag color="blue" className="!m-0 text-xs mt-1">Custom: {bi.itemName}</Tag>
                      )}
                    </td>
                    <td className="p-2">
                      <InputNumber
                        min={0.01}
                        step={1}
                        value={bi.requiredQuantity}
                        onChange={(val) => setBomItems(prev => prev.map((item, i) => i === idx ? { ...item, requiredQuantity: Number(val) || 0 } : item))}
                        style={{ width: '100%' }}
                        placeholder="Qty"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="kg, pcs..."
                        value={bi.unitOfMeasure}
                        disabled={!!bi.rawMaterialId}
                        onChange={(e) => setBomItems(prev => prev.map((item, i) => i === idx ? { ...item, unitOfMeasure: e.target.value } : item))}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        type="text"
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => setBomItems(prev => prev.filter((_, i) => i !== idx))}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            className="!mt-3"
            onClick={() => setBomItems(prev => [...prev, { rawMaterialId: undefined, itemName: '', requiredQuantity: 1, unitOfMeasure: '', availableStock: 0 }])}
          >
            + Add Material
          </Button>
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
            <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center">
              <ToolOutlined className="text-brand text-lg" />
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
        maskClosable={false}
        keyboard={false}
        okButtonProps={{ size: 'large' }}
        cancelButtonProps={{ size: 'large' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {/* Product being manufactured */}
        <div className="mb-4 p-3 rounded-lg border border-brand-soft bg-brand-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
            <RocketOutlined className="text-brand text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-brand font-medium uppercase tracking-wide mb-0.5">Product to Manufacture</div>
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
                <DatePicker
                  className="w-full"
                  size="large"
                  format="DD MMM YYYY"
                  placeholder="Select start date"
                  disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="expectedCompletion"
                label="Expected Completion"
                dependencies={['startDate']}
              >
                <DatePicker
                  className="w-full"
                  size="large"
                  format="DD MMM YYYY"
                  placeholder="Select deadline"
                  disabledDate={(current) => {
                    if (!current) return false;
                    const start = jobCardForm.getFieldValue('startDate') as dayjs.Dayjs | undefined;
                    const minDate = start && start.isAfter(dayjs(), 'day') ? start : dayjs().startOf('day');
                    return current.isBefore(minDate, 'day');
                  }}
                />
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
                          <Button type="link" className="!p-0 !h-auto font-bold text-brand text-xs" onClick={() => router.push(`/manufacturing/${childJC.id}`)}>
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
                            <div className="bg-white rounded border border-gray-200 p-3 space-y-3">
                              <div>
                                <Text className="text-xs text-gray-500 block mb-1">What was done</Text>
                                <Input.TextArea
                                  placeholder="Short note on the work completed (optional)"
                                  rows={2}
                                  value={stageDescription}
                                  onChange={e => setStageDescription(e.target.value)}
                                />
                              </div>

                              {/* Waste recording — restricted to materials ACTUALLY ISSUED for this product */}
                              {(() => {
                                // Issued materials for this job card = BOM items with matching issued MR items.
                                const jcBom = selectedJob ? detailBoms.find((b) => b.product_id === selectedJob.product_id) : undefined;
                                const mrItems = detailMR?.items || [];
                                const issuedMaterials = (jcBom?.items || [])
                                  .map((bi) => {
                                    if (!bi.raw_material_id) return null;
                                    const mi = mrItems.find((m) => m.raw_material_id === bi.raw_material_id);
                                    if (!mi) return null;
                                    const issued = Number(mi.quantity_issued || 0);
                                    if (issued <= 0) return null;
                                    return {
                                      raw_material_id: bi.raw_material_id,
                                      name: bi.item_name,
                                      issued,
                                      unit: bi.unit_of_measure || mi.unit_of_measure || '',
                                    };
                                  })
                                  .filter((x): x is { raw_material_id: number; name: string; issued: number; unit: string } => !!x);

                                const selected = issuedMaterials.find((m) => m.raw_material_id === wasteRawMaterialId);
                                const maxWaste = selected ? Math.max(0, selected.issued - wasteConsumedQty) : 0;

                                return (
                                  <div className="pt-2 border-t border-gray-100">
                                    <Text className="text-xs text-gray-500 block mb-2">Waste generated (optional — only for issued materials)</Text>
                                    {issuedMaterials.length === 0 ? (
                                      <div className="text-xs text-gray-400 bg-gray-50 rounded p-2 border border-gray-100">
                                        No materials have been issued for this product yet — waste cannot be recorded.
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2 items-start">
                                        <Select
                                          placeholder="Issued material"
                                          allowClear
                                          style={{ minWidth: 200, flex: '1 1 200px' }}
                                          value={wasteRawMaterialId ?? undefined}
                                          onChange={(val) => {
                                            setWasteRawMaterialId(val ?? null);
                                            const m = issuedMaterials.find((x) => x.raw_material_id === val);
                                            setWasteUnit(m?.unit || '');
                                            setWasteConsumedQty(0);
                                            setWasteQuantity(0);
                                          }}
                                          options={issuedMaterials.map((m) => ({
                                            value: m.raw_material_id,
                                            label: `${m.name} · issued ${m.issued} ${m.unit}`,
                                          }))}
                                        />
                                        <InputNumber
                                          placeholder="Consumed"
                                          min={0}
                                          max={selected ? selected.issued : undefined}
                                          value={wasteConsumedQty || undefined}
                                          onChange={(v) => setWasteConsumedQty(Number(v) || 0)}
                                          style={{ width: 110 }}
                                          disabled={!selected}
                                        />
                                        <InputNumber
                                          placeholder="Waste"
                                          min={0}
                                          max={maxWaste || undefined}
                                          value={wasteQuantity || undefined}
                                          onChange={(v) => setWasteQuantity(Number(v) || 0)}
                                          style={{ width: 100 }}
                                          disabled={!selected}
                                        />
                                        <Input
                                          placeholder="Unit"
                                          value={wasteUnit}
                                          disabled
                                          style={{ width: 80 }}
                                        />
                                        <Input
                                          placeholder="Notes (optional)"
                                          value={wasteNotes}
                                          onChange={(e) => setWasteNotes(e.target.value)}
                                          style={{ flex: '1 1 160px', minWidth: 140 }}
                                        />
                                      </div>
                                    )}
                                    {selected && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Consumed + Waste must be ≤ Issued ({selected.issued} {selected.unit}).
                                        Remaining after save: {Math.max(0, selected.issued - wasteConsumedQty - wasteQuantity)} {selected.unit}.
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <Button
                              icon={<CheckCircleOutlined />}
                              loading={completeCurrentStageMutation.isPending}
                              block
                              style={{ background: '#000', color: '#fff', borderColor: '#000' }}
                              onClick={async () => {
                                if (!selectedJob) return;
                                // Record waste only if a real issued material was selected and qty > 0.
                                if (wasteRawMaterialId && wasteQuantity > 0) {
                                  try {
                                    const stagePart = `stage ${idx + 1} (${stage.process_name})`;
                                    // Backend auto-creates a default "Production Waste" category if none exists.
                                    await recordProductionWaste({
                                      jobCardId: selectedJob.id,
                                      rawMaterialId: wasteRawMaterialId,
                                      categoryId: wasteCategories[0]?.id,
                                      quantity: wasteQuantity,
                                      unit: wasteUnit || undefined,
                                      consumedQuantity: wasteConsumedQty || undefined,
                                      notes: [stagePart, wasteNotes].filter(Boolean).join(' · '),
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['waste-inventory'] });
                                    queryClient.invalidateQueries({ queryKey: ['waste-dashboard'] });
                                    queryClient.invalidateQueries({ queryKey: ['waste-categories'] });
                                  } catch (e: any) {
                                    message.warning(e?.response?.data?.message || 'Could not record waste — continuing with stage completion');
                                  }
                                }
                                completeCurrentStageMutation.mutate({
                                  jobId: selectedJob.id,
                                  notes: stageNotes || undefined,
                                  completedDate: stageCompletedDate ? stageCompletedDate.toISOString() : undefined,
                                  description: stageDescription || undefined,
                                });
                                setWasteRawMaterialId(null);
                                setWasteQuantity(0);
                                setWasteUnit('');
                                setWasteConsumedQty(0);
                                setWasteNotes('');
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

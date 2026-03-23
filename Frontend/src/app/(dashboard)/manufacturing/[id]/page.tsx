'use client';

import {
  Typography, Card, Descriptions, Tag, Button, Space, Spin, Row, Col,
  Progress, message, Alert, Steps, Form, InputNumber, Input,
  Modal, Tooltip, DatePicker, Divider, Timeline, Badge, Statistic,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, PrinterOutlined, MailOutlined,
  CarOutlined, ExclamationCircleOutlined,
  AuditOutlined, StopOutlined, SyncOutlined,
  HistoryOutlined, SendOutlined,
  ClockCircleOutlined, PlayCircleOutlined, UserOutlined,
  LockOutlined, FileTextOutlined, CalendarOutlined,
  PauseCircleOutlined, AppstoreOutlined, NumberOutlined, TeamOutlined,
  TrophyOutlined, RocketOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { SendEmailModal } from '@/components/common/SendEmailModal';
import {
  getJobCardById,
  updateJobCardStatus,
  setJobCardEstimate,
  getJobCardProcesses,
  moveToNextStage,
  getStageHistory,
  sendJobCardForApproval,
  jobCardDispatchAction,
} from '@/lib/api/manufacturing';
import { getSalesOrderById } from '@/lib/api/sales-orders';
import { useAuthStore } from '@/stores/authStore';
import { JOB_CARD_STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/types/manufacturing';
import type { JobCardProcess, JobCardStageHistory } from '@/types/manufacturing';

const { Title, Text } = Typography;

const STATUS_STEP_MAP: Record<string, number> = {
  pending: 0,
  in_process: 1,
  partially_completed: 1,
  completed_production: 2,
  ready_for_approval: 3,
  approved_for_dispatch: 3,
  dispatched: 4,
};

const WORKFLOW_STEPS = [
  { title: 'Pending', icon: <AuditOutlined /> },
  { title: 'In Production', icon: <SyncOutlined /> },
  { title: 'Completed', icon: <CheckCircleOutlined /> },
  { title: 'Ready for Dispatch', icon: <CarOutlined /> },
  { title: 'Dispatched', icon: <SendOutlined /> },
];

export default function ViewJobCardPage() {
  const router = useRouter();
  const params = useParams();
  const jobCardId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [estimateValue, setEstimateValue] = useState<number | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [stageNotes, setStageNotes] = useState('');
  const [stageDescription, setStageDescription] = useState('');
  const [stageCompletedDate, setStageCompletedDate] = useState<dayjs.Dayjs | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingStageName, setCompletingStageName] = useState('');
  const [dispatchDate, setDispatchDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [dispatchRemarks, setDispatchRemarks] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());

  // ── Queries ──
  const { data: jobCardData, isLoading } = useQuery({
    queryKey: ['job-card', jobCardId],
    queryFn: () => getJobCardById(jobCardId, enterpriseId!),
    enabled: !!enterpriseId && !!jobCardId,
  });

  const parentPOId = jobCardData?.data?.sales_order_id;
  const { data: parentPOData } = useQuery({
    queryKey: ['parent-po-for-job', parentPOId],
    queryFn: () => getSalesOrderById(parentPOId!),
    enabled: !!parentPOId,
  });
  const parentPO = parentPOData?.data;
  const isOnHold = parentPO?.status === 'on_hold';
  const holdReason = parentPO?.hold_reason;

  const { data: stagesData } = useQuery({
    queryKey: ['job-card-stages', jobCardId],
    queryFn: () => getJobCardProcesses(jobCardId),
    enabled: !!jobCardId,
  });

  const { data: historyData } = useQuery({
    queryKey: ['job-card-stage-history', jobCardId],
    queryFn: () => getStageHistory(jobCardId),
    enabled: !!jobCardId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['job-card', jobCardId] });
    queryClient.invalidateQueries({ queryKey: ['job-card-stages', jobCardId] });
    queryClient.invalidateQueries({ queryKey: ['job-card-stage-history', jobCardId] });
    queryClient.invalidateQueries({ queryKey: ['job-cards'] });
  };

  // ── Mutations ──
  const statusMutation = useMutation({
    mutationFn: (status: string) => updateJobCardStatus(jobCardId, status, enterpriseId!),
    onSuccess: () => { message.success('Status updated'); invalidateAll(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update status'),
  });

  const estimateMutation = useMutation({
    mutationFn: (days: number) => setJobCardEstimate(jobCardId, days),
    onSuccess: () => { message.success('Estimated production days saved'); invalidateAll(); },
    onError: () => message.error('Failed to save estimate'),
  });

  const dispatchMutation = useMutation({
    mutationFn: (data: { remarks?: string; dispatchDate?: string }) =>
      jobCardDispatchAction(jobCardId, 'dispatch', data.remarks, data.dispatchDate),
    onSuccess: () => { message.success('Job card dispatched successfully'); invalidateAll(); },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to dispatch'),
  });

  const sendForApprovalMutation = useMutation({
    mutationFn: () => sendJobCardForApproval(jobCardId),
    onSuccess: () => {
      message.success('Material request sent to inventory team for approval');
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to send for approval'),
  });

  const completeCurrentStageMutation = useMutation({
    mutationFn: (data: { notes?: string; completedDate?: string; description?: string }) =>
      moveToNextStage(jobCardId, data.notes, data.completedDate, data.description),
    onSuccess: (response) => {
      const childCards = (response?.data as any)?.child_job_cards || [];
      const latestChild = childCards[childCards.length - 1];
      message.success(
        latestChild
          ? `Stage completed → ${latestChild.job_card_number} created`
          : 'Stage completed — next stage activated',
        4,
      );
      setStageNotes('');
      setStageDescription('');
      setStageCompletedDate(null);
      setCompleteModalOpen(false);
      invalidateAll();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to complete stage'),
  });

  // ── Derived ──
  const jobCard = jobCardData?.data;
  const stages: JobCardProcess[] = ((stagesData?.data || []) as JobCardProcess[]).sort((a, b) => a.sequence_order - b.sequence_order);
  const stageHistory: JobCardStageHistory[] = historyData?.data || [];

  const getStatusColor = (status: string) => JOB_CARD_STATUS_OPTIONS.find((s) => s.value === status)?.color || 'default';
  const getStatusLabel = (status: string) => JOB_CARD_STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  const getPriorityColor = (priority: string) => PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || 'default';
  const getPriorityLabel = (priority: string) => PRIORITY_OPTIONS.find((p) => p.value === priority)?.label || priority;

  const currentStep = jobCard ? (STATUS_STEP_MAP[jobCard.status] ?? 0) : 0;

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = stages.length;
  const stagePercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  const currentStage = stages.find(s => s.status === 'in_progress');

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;

  if (!jobCard) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Job Card not found</Title>
        <Button onClick={() => router.push('/manufacturing')}>Back</Button>
      </div>
    );
  }

  const isInProduction = ['in_process', 'partially_completed'].includes(jobCard.status);
  const isChildJobCard = !!jobCard.parent_job_card_id;
  const isOverdue = jobCard.due_date && new Date(jobCard.due_date) < new Date() &&
    !['completed_production', 'ready_for_approval', 'approved_for_dispatch', 'dispatched'].includes(jobCard.status);

  // ── Child Job Card View ──
  if (isChildJobCard) {
    return (
      <div className="print:p-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-3 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/manufacturing/${jobCard.parent_job_card_id}`)}>
              Parent Job Card
            </Button>
            <Title level={4} className="!mb-0">{jobCard.job_card_number}</Title>
            <Tag color="green" icon={<CheckCircleOutlined />}>Stage Job Card</Tag>
            <Tag color={getStatusColor(jobCard.status)}>{getStatusLabel(jobCard.status)}</Tag>
          </div>
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
            <Button icon={<MailOutlined />} onClick={() => setEmailModalOpen(true)}>Email</Button>
          </Space>
        </div>

        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          className="mb-4"
          message={`Stage ${jobCard.stage_number ? `#${jobCard.stage_number}` : ''} — ${jobCard.job_name || 'Completed'}`}
          description={jobCard.completed_date ? `Completed on ${dayjs(jobCard.completed_date).format('DD MMM YYYY, hh:mm A')}` : 'This stage has been completed.'}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              title={<span className="flex items-center gap-2"><FileTextOutlined className="text-blue-500" />Stage Details</span>}
              className="card-shadow mb-4"
            >
              <Row gutter={[24, 16]}>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Job Card #</div>
                  <div className="font-semibold text-sm">{jobCard.job_card_number}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Stage</div>
                  <Tag color="blue" className="font-bold">Stage #{jobCard.stage_number || '-'}</Tag>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Stage Name</div>
                  <div className="font-semibold text-sm">{jobCard.job_name || '-'}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Status</div>
                  <Tag color={getStatusColor(jobCard.status)}>{getStatusLabel(jobCard.status)}</Tag>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Product</div>
                  <div className="font-semibold text-sm">{jobCard.product_name || '-'}</div>
                  {jobCard.product_code && <div className="text-xs text-gray-400">SKU: {jobCard.product_code}</div>}
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Quantity</div>
                  <div className="font-semibold text-sm">{Number(jobCard.quantity || 0)} {jobCard.unit || 'units'}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Priority</div>
                  <Tag color={getPriorityColor(jobCard.priority)}>{getPriorityLabel(jobCard.priority)}</Tag>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Assigned To</div>
                  <div className="font-semibold text-sm">{jobCard.assigned_to_name || '-'}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Customer</div>
                  <div className="font-semibold text-sm">{jobCard.customer_name || '-'}</div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Start Date</div>
                  <div className="font-semibold text-sm">{jobCard.start_date ? dayjs(jobCard.start_date).format('DD MMM YYYY') : '-'}</div>
                </Col>
                <Col xs={24} md={12}>
                  <div className="text-xs text-gray-400 mb-1">Completed Date</div>
                  <div className="font-semibold text-sm text-green-600">
                    {jobCard.completed_date ? dayjs(jobCard.completed_date).format('DD MMM YYYY, hh:mm A') : '-'}
                  </div>
                </Col>
                {jobCard.remarks && (
                  <Col xs={24}>
                    <div className="text-xs text-gray-400 mb-1">Notes</div>
                    <div className="text-sm bg-gray-50 p-2 rounded">{jobCard.remarks}</div>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              title={<span className="flex items-center gap-2"><AppstoreOutlined className="text-purple-500" />Parent Job Card</span>}
              className="card-shadow mb-4"
            >
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileTextOutlined className="text-2xl text-purple-500" />
                </div>
                <Text strong className="text-base block mb-1">Stage Completion Record</Text>
                <Text type="secondary" className="text-sm block mb-4">
                  Created when Stage #{jobCard.stage_number || '?'} was completed on the parent job card.
                </Text>
                <Button type="primary" icon={<ArrowLeftOutlined />}
                  onClick={() => router.push(`/manufacturing/${jobCard.parent_job_card_id}`)}>
                  View Parent Job Card
                </Button>
              </div>
            </Card>

            {jobCard.created_date && (
              <Card
                title={<span className="flex items-center gap-2"><HistoryOutlined className="text-green-500" />Timeline</span>}
                className="card-shadow"
                size="small"
              >
                <Timeline
                  items={[
                    {
                      color: 'blue',
                      dot: <PlayCircleOutlined />,
                      children: (
                        <div>
                          <div className="font-medium text-sm">Created</div>
                          <div className="text-xs text-gray-400">{dayjs(jobCard.created_date).format('DD MMM YYYY, hh:mm A')}</div>
                        </div>
                      ),
                    },
                    ...(jobCard.start_date ? [{
                      color: 'blue',
                      dot: <SyncOutlined />,
                      children: (
                        <div>
                          <div className="font-medium text-sm">Started</div>
                          <div className="text-xs text-gray-400">{dayjs(jobCard.start_date).format('DD MMM YYYY, hh:mm A')}</div>
                        </div>
                      ),
                    }] : []),
                    ...(jobCard.completed_date ? [{
                      color: 'green',
                      dot: <CheckCircleOutlined />,
                      children: (
                        <div>
                          <div className="font-medium text-sm text-green-600">Completed</div>
                          <div className="text-xs text-gray-400">{dayjs(jobCard.completed_date).format('DD MMM YYYY, hh:mm A')}</div>
                        </div>
                      ),
                    }] : []),
                  ]}
                />
              </Card>
            )}
          </Col>
        </Row>

        <SendEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          defaultSubject={`Stage Job Card ${jobCard.job_card_number}`}
          defaultBody={`Stage Job Card: ${jobCard.job_card_number}\nStage: ${jobCard.job_name || '-'}\nProduct: ${jobCard.product_name || '-'}\nStatus: ${getStatusLabel(jobCard.status)}`}
        />
      </div>
    );
  }

  // ── Main Job Card View ──
  return (
    <div className="print:p-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/manufacturing')}>Back</Button>
          <Title level={4} className="!mb-0">{jobCard.job_name || jobCard.job_card_number}</Title>
          {jobCard.job_name && <Text type="secondary" className="text-sm">({jobCard.job_card_number})</Text>}
          <Tag color={getStatusColor(jobCard.status)}>{getStatusLabel(jobCard.status)}</Tag>
          {jobCard.dispatch_on_hold && <Tag color="red" icon={<StopOutlined />}>Dispatch On Hold</Tag>}
          {isOverdue && <Tag color="red" icon={<ExclamationCircleOutlined />}>Overdue</Tag>}
        </div>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
          <Button icon={<MailOutlined />} onClick={() => setEmailModalOpen(true)}>Email</Button>
        </Space>
      </div>

      {/* Summary Bar */}
      <Card className="card-shadow mb-4" bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <AppstoreOutlined className="text-blue-500 text-lg" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-400">Product</div>
                <div className="font-semibold text-sm truncate">{jobCard.product_name || '-'}</div>
                {jobCard.product_code && <div className="text-xs text-gray-400">SKU: {jobCard.product_code}</div>}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div className="flex items-center gap-2">
              <NumberOutlined className="text-green-500" />
              <div>
                <div className="text-xs text-gray-400">Quantity</div>
                <div className="font-semibold text-sm">{Number(jobCard.quantity || 0)} {jobCard.unit || 'units'}</div>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div className="flex items-center gap-2">
              <UserOutlined className="text-purple-500" />
              <div>
                <div className="text-xs text-gray-400">Customer</div>
                <div className="font-semibold text-sm truncate">{jobCard.customer_name || '-'}</div>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div className="flex items-center gap-2">
              <CalendarOutlined className={isOverdue ? 'text-red-500' : 'text-orange-400'} />
              <div>
                <div className="text-xs text-gray-400">Due Date</div>
                <div className={`font-semibold text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                  {jobCard.due_date ? dayjs(jobCard.due_date).format('DD MMM YYYY') : '-'}
                </div>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div className="flex items-center gap-2">
              <TeamOutlined className="text-blue-400" />
              <div>
                <div className="text-xs text-gray-400">Assigned To</div>
                <div className="font-semibold text-sm truncate">{jobCard.assigned_to_name || '-'}</div>
              </div>
            </div>
          </Col>
          {totalStages > 0 && (
            <Col xs={24} sm={6} md={2}>
              <div className="text-center">
                <Progress
                  type="circle"
                  percent={stagePercent}
                  size={50}
                  strokeColor={stagePercent === 100 ? '#52c41a' : '#1677ff'}
                  format={() => <span className="text-xs font-bold">{completedStages}/{totalStages}</span>}
                />
                <div className="text-xs text-gray-400 mt-1">Stages</div>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* ON HOLD Banner */}
      {isOnHold && (
        <Alert
          type="warning"
          showIcon
          icon={<PauseCircleOutlined />}
          className="mb-4 print:hidden"
          style={{ border: '2px solid #ffd591', background: '#fff7e6' }}
          message={<strong>Purchase Order is ON HOLD — All production is paused</strong>}
          description={
            <div>
              <div>You cannot complete stages or change status until the Purchase Order team resumes this order.</div>
              {holdReason && <div className="mt-1"><strong>Reason:</strong> {holdReason}</div>}
            </div>
          }
        />
      )}

      {/* Workflow Steps */}
      <Card className="mb-4 print:hidden" bodyStyle={{ padding: '20px 24px' }}>
        <Steps current={currentStep} status={isOnHold ? 'error' : 'process'} items={WORKFLOW_STEPS} size="small" />
      </Card>

      {/* Status-specific Action Panel */}
      <div className="mb-4 print:hidden">
        {jobCard.status === 'pending' && (
          <Card
            title={<span className="flex items-center gap-2"><RocketOutlined className="text-blue-500" />Start Manufacturing</span>}
            className="card-shadow"
          >
            {jobCard.material_status === 'FULLY_ISSUED' ? (
              <>
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="mb-4"
                  message="All materials approved and issued. Ready to start manufacturing." />
                <Row gutter={[24, 16]} align="middle">
                  <Col xs={24} md={12}>
                    <Text strong className="block mb-2">Production Estimate (optional)</Text>
                    <Space>
                      <InputNumber min={1} max={365} placeholder="Days" style={{ width: 110 }} value={estimateValue}
                        onChange={v => setEstimateValue(v)} addonAfter="days" />
                      <Button onClick={() => estimateValue != null && estimateMutation.mutate(estimateValue)}
                        loading={estimateMutation.isPending} disabled={estimateValue == null}>Save</Button>
                    </Space>
                    {jobCard.estimated_production_days != null && (
                      <Text type="secondary" className="mt-1 block text-sm">Current: {jobCard.estimated_production_days} days</Text>
                    )}
                  </Col>
                  <Col xs={24} md={12}>
                    {isOnHold ? (
                      <Button size="large" icon={<PauseCircleOutlined />} disabled>ON HOLD — Cannot Start</Button>
                    ) : (
                      <Button type="primary" size="large" icon={<PlayCircleOutlined />}
                        onClick={() => statusMutation.mutate('in_process')}
                        loading={statusMutation.isPending}>
                        Start Manufacturing
                      </Button>
                    )}
                  </Col>
                </Row>
              </>
            ) : jobCard.material_status === 'REQUESTED_RECHECK' ? (
              <>
                <Alert type="warning" showIcon icon={<ExclamationCircleOutlined />} className="mb-4"
                  message="Materials pending inventory review"
                  description="Procurement may have fulfilled shortage items. The inventory team needs to review, approve, and issue the materials." />
                <Space wrap>
                  <Button icon={<SyncOutlined />} size="large" onClick={invalidateAll}>Recheck Material Status</Button>
                  {jobCard.material_request_id && (
                    <Button icon={<FileTextOutlined />} size="large"
                      onClick={() => router.push(`/material-requests/${jobCard.material_request_id}`)}
                      className="border-blue-400 text-blue-600">
                      View Material Request {jobCard.material_request_number ? `(${jobCard.material_request_number})` : ''}
                    </Button>
                  )}
                </Space>
              </>
            ) : jobCard.material_status === 'PARTIALLY_ISSUED' ? (
              <>
                <Alert type="warning" showIcon className="mb-4"
                  message="Materials partially issued"
                  description="Some materials have been issued but not all. Manufacturing cannot start until all materials are approved and issued." />
                <Space wrap>
                  <Button icon={<SyncOutlined />} size="large" onClick={invalidateAll}>Recheck Material Status</Button>
                  {jobCard.material_request_id && (
                    <Button icon={<FileTextOutlined />} size="large"
                      onClick={() => router.push(`/material-requests/${jobCard.material_request_id}`)}
                      className="border-blue-400 text-blue-600">
                      View Material Request {jobCard.material_request_number ? `(${jobCard.material_request_number})` : ''}
                    </Button>
                  )}
                </Space>
              </>
            ) : jobCard.material_status === 'PENDING_INVENTORY' && jobCard.production_stage === 'WAITING_FOR_MATERIALS' ? (
              <>
                <Alert type="info" showIcon icon={<ClockCircleOutlined />} className="mb-4"
                  message="Waiting for inventory approval"
                  description="A material request has been sent to the inventory team. Manufacturing will start once all materials are approved and issued." />
                <Space wrap>
                  <Button icon={<SyncOutlined />} size="large" onClick={invalidateAll}>Recheck Material Status</Button>
                  {jobCard.material_request_id && (
                    <Button icon={<FileTextOutlined />} size="large"
                      onClick={() => router.push(`/material-requests/${jobCard.material_request_id}`)}
                      className="border-blue-400 text-blue-600">
                      View Material Request {jobCard.material_request_number ? `(${jobCard.material_request_number})` : ''}
                    </Button>
                  )}
                </Space>
              </>
            ) : jobCard.selected_materials && jobCard.selected_materials.length > 0 && jobCard.production_stage !== 'WAITING_FOR_MATERIALS' ? (
              <>
                <Alert type="info" showIcon icon={<AuditOutlined />} className="mb-4"
                  message={`Materials added — Ready to send for approval (${jobCard.selected_materials.length} material${jobCard.selected_materials.length > 1 ? 's' : ''})`}
                  description="Click below to send a material request to the inventory team for approval." />
                <div className="mb-4 flex flex-wrap gap-1">
                  {jobCard.selected_materials.map((m, i) => (
                    <Tag key={i} color="blue">{m.itemName} — {m.requiredQuantity} {m.unitOfMeasure || 'units'}</Tag>
                  ))}
                </div>
                <Button type="primary" size="large" icon={<SendOutlined />}
                  onClick={() => Modal.confirm({
                    title: 'Send for Inventory Approval?',
                    content: 'This will create a material request and send it to the inventory team.',
                    okText: 'Send for Approval',
                    onOk: () => sendForApprovalMutation.mutate(),
                  })}
                  loading={sendForApprovalMutation.isPending}>
                  Send for Inventory Approval
                </Button>
              </>
            ) : (
              <>
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="mb-4"
                  message="No materials required. Ready to start manufacturing." />
                <Row gutter={[24, 16]} align="middle">
                  <Col xs={24} md={12}>
                    <Text strong className="block mb-2">Production Estimate (optional)</Text>
                    <Space>
                      <InputNumber min={1} max={365} placeholder="Days" style={{ width: 110 }} value={estimateValue}
                        onChange={v => setEstimateValue(v)} addonAfter="days" />
                      <Button onClick={() => estimateValue != null && estimateMutation.mutate(estimateValue)}
                        loading={estimateMutation.isPending} disabled={estimateValue == null}>Save</Button>
                    </Space>
                  </Col>
                  <Col xs={24} md={12}>
                    {isOnHold ? (
                      <Button size="large" icon={<PauseCircleOutlined />} disabled>ON HOLD — Cannot Start</Button>
                    ) : (
                      <Button type="primary" size="large" icon={<PlayCircleOutlined />}
                        onClick={() => statusMutation.mutate('in_process')}
                        loading={statusMutation.isPending}>
                        Start Manufacturing
                      </Button>
                    )}
                  </Col>
                </Row>
              </>
            )}
          </Card>
        )}

        {jobCard.status === 'completed_production' && (
          <Card
            title={<span className="flex items-center gap-2"><TrophyOutlined className="text-green-500" />Production Complete</span>}
            className="card-shadow"
          >
            {isOnHold ? (
              <Alert type="warning" showIcon icon={<PauseCircleOutlined />}
                message="Order ON HOLD — Cannot proceed"
                description={holdReason ? `Reason: ${holdReason}` : 'Waiting for Purchase Order team to resume.'} />
            ) : (
              <>
                <Alert type="success" showIcon className="mb-4"
                  message="All production stages are complete. You can now mark this as Ready for Dispatch." />
                <Button type="primary" icon={<CarOutlined />}
                  onClick={() => statusMutation.mutate('ready_for_approval')}
                  loading={statusMutation.isPending}>
                  Mark Ready for Approval
                </Button>
              </>
            )}
          </Card>
        )}

        {['ready_for_approval'].includes(jobCard.status) && (
          <Card
            title={<span className="flex items-center gap-2"><ClockCircleOutlined className="text-orange-400" />Awaiting Approval</span>}
            className="card-shadow"
          >
            {isOnHold || jobCard.dispatch_on_hold ? (
              <Alert type="warning" showIcon icon={<PauseCircleOutlined />}
                message="Order ON HOLD — Dispatch paused"
                description={holdReason ? `Reason: ${holdReason}` : 'The Purchase Order team has placed this order on hold.'} />
            ) : (
              <Alert type="info" showIcon icon={<ClockCircleOutlined />}
                message="Sent for dispatch approval"
                description="Waiting for approval from the manufacturing/PO page." />
            )}
          </Card>
        )}

        {jobCard.status === 'approved_for_dispatch' && (
          <Card
            title={<span className="flex items-center gap-2"><CarOutlined className="text-purple-500" />Dispatch</span>}
            className="card-shadow"
          >
            {jobCard.dispatch_on_hold ? (
              <Alert type="warning" showIcon icon={<StopOutlined />}
                message="Dispatch on hold"
                description="Admin has placed this on hold." />
            ) : (
              <>
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} className="mb-4"
                  message="Approved for Dispatch"
                  description="Fill in the dispatch details below and confirm dispatch." />
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Text strong className="block mb-1">Dispatch Date</Text>
                    <DatePicker className="w-full" value={dispatchDate} onChange={v => setDispatchDate(v)} format="DD MMM YYYY" />
                  </Col>
                  <Col xs={24} md={14}>
                    <Text strong className="block mb-1">Dispatch Notes</Text>
                    <Input.TextArea placeholder="Vehicle number, courier details, delivery notes..."
                      rows={2} value={dispatchRemarks} onChange={e => setDispatchRemarks(e.target.value)} />
                  </Col>
                </Row>
                <div className="mt-4">
                  <Button type="primary" size="large" icon={<CarOutlined />}
                    style={{ backgroundColor: '#722ed1' }}
                    loading={dispatchMutation.isPending}
                    onClick={() => Modal.confirm({
                      title: 'Confirm Dispatch',
                      content: `Dispatch ${jobCard.job_card_number}${dispatchDate ? ` on ${dispatchDate.format('DD MMM YYYY')}` : ''}?`,
                      okText: 'Dispatch Now',
                      okButtonProps: { style: { backgroundColor: '#722ed1' } },
                      onOk: () => dispatchMutation.mutateAsync({
                        remarks: dispatchRemarks || undefined,
                        dispatchDate: dispatchDate ? dispatchDate.toISOString() : undefined,
                      }),
                    })}>
                    Dispatch Now
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {jobCard.status === 'dispatched' && (
          <Card className="card-shadow">
            <Alert type="success" showIcon icon={<CheckCircleOutlined />}
              message="Order Dispatched Successfully"
              description={jobCard.completed_date ? `Dispatched on ${dayjs(jobCard.completed_date).format('DD MMM YYYY')}.` : 'This job has been dispatched.'} />
          </Card>
        )}
      </div>

      {/* Job Card Details + Stage Progress */}
      <Row gutter={[16, 16]} className="mb-4">
        {/* Job Card Details */}
        <Col xs={24} lg={14}>
          <Card
            title={<span className="flex items-center gap-2"><FileTextOutlined className="text-blue-500" />Job Card Details</span>}
            className="card-shadow h-full"
          >
            <Row gutter={[24, 20]}>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Job Card #</div>
                <div className="font-semibold">{jobCard.job_card_number}</div>
              </Col>
              {jobCard.job_name && (
                <Col xs={12} sm={8} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Job Name</div>
                  <div className="font-semibold">{jobCard.job_name}</div>
                </Col>
              )}
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Status</div>
                <Tag color={getStatusColor(jobCard.status)}>{getStatusLabel(jobCard.status)}</Tag>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Priority</div>
                <Tag color={getPriorityColor(jobCard.priority)}>{getPriorityLabel(jobCard.priority)}</Tag>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Product</div>
                <div className="font-semibold text-sm">{jobCard.product_name || '-'}</div>
                {jobCard.product_code && <div className="text-xs text-gray-400">SKU: {jobCard.product_code}</div>}
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Quantity</div>
                <div className="font-semibold">{Number(jobCard.quantity || 0)} {jobCard.unit || 'units'}</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Customer</div>
                <div className="font-semibold text-sm">{jobCard.customer_name || '-'}</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Assigned To</div>
                <div className="font-semibold text-sm">{jobCard.assigned_to_name || '-'}</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Start Date</div>
                <div className="font-semibold text-sm">{jobCard.start_date ? dayjs(jobCard.start_date).format('DD MMM YYYY') : '-'}</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <div className="text-xs text-gray-400 mb-1">Due Date</div>
                <div className={`font-semibold text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                  {jobCard.due_date ? dayjs(jobCard.due_date).format('DD MMM YYYY') : '-'}
                  {isOverdue && <Tag color="red" className="ml-1 text-xs">Overdue</Tag>}
                </div>
              </Col>
              {jobCard.estimated_production_days != null && (
                <Col xs={12} sm={8} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Est. Production</div>
                  <div className="font-semibold text-sm">{jobCard.estimated_production_days} days</div>
                </Col>
              )}
              {jobCard.completed_date && (
                <Col xs={12} sm={8} md={6}>
                  <div className="text-xs text-gray-400 mb-1">Completed</div>
                  <div className="font-semibold text-sm text-green-600">{dayjs(jobCard.completed_date).format('DD MMM YYYY')}</div>
                </Col>
              )}
              {jobCard.remarks && (
                <Col xs={24}>
                  <div className="text-xs text-gray-400 mb-1">Notes</div>
                  <div className="text-sm bg-gray-50 rounded p-2 border border-gray-100">{jobCard.remarks}</div>
                </Col>
              )}
            </Row>
          </Card>
        </Col>

        {/* Stage Progress */}
        <Col xs={24} lg={10}>
          <Card
            title={<span className="flex items-center gap-2"><SyncOutlined className="text-blue-500" />Stage Progress</span>}
            className="card-shadow h-full"
          >
            {totalStages === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ClockCircleOutlined className="text-3xl mb-2" />
                <div className="text-sm">No stages defined</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-6 mb-4">
                  <Progress
                    type="circle"
                    percent={stagePercent}
                    size={88}
                    strokeColor={stagePercent === 100 ? '#52c41a' : '#1677ff'}
                    format={() => (
                      <div className="text-center">
                        <div className="text-lg font-bold">{completedStages}/{totalStages}</div>
                        <div className="text-xs text-gray-400">Stages</div>
                      </div>
                    )}
                  />
                  <div className="flex-1 space-y-1">
                    {stages.slice(0, 5).map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                          s.status === 'completed' ? 'bg-green-100 text-green-600' :
                          s.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {s.status === 'completed' ? '✓' : i + 1}
                        </span>
                        <span className={`truncate text-xs ${
                          s.status === 'completed' ? 'text-green-600 line-through' :
                          s.status === 'in_progress' ? 'text-blue-600 font-medium' :
                          'text-gray-400'
                        }`}>{s.process_name}</span>
                        {s.status === 'in_progress' && <Badge status="processing" />}
                      </div>
                    ))}
                    {stages.length > 5 && <div className="text-xs text-gray-400">+{stages.length - 5} more</div>}
                  </div>
                </div>
                {currentStage && isInProduction && (
                  isOnHold ? (
                    <Alert type="warning" showIcon icon={<PauseCircleOutlined />}
                      message={`"${currentStage.process_name}" paused — ON HOLD`} />
                  ) : (
                    <Alert type="info" showIcon icon={<SyncOutlined spin />}
                      message={`"${currentStage.process_name}" in progress`}
                      description="Complete this stage to unlock the next one." />
                  )
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Production Stages Pipeline */}
      <Card
        title={<span className="flex items-center gap-2"><PlayCircleOutlined className="text-blue-500" />Production Stages</span>}
        className="card-shadow mb-4"
      >
        {stages.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ClockCircleOutlined className="text-4xl mb-3" />
            <div className="text-base">No production stages defined yet.</div>
            <div className="text-sm mt-1 text-gray-300">Stages are configured in Settings &gt; Stage Master</div>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const isActive = stage.status === 'in_progress';
              const isDone = stage.status === 'completed';
              const isPending = stage.status === 'pending';
              const durationHours = stage.started_at && stage.completed_at
                ? Math.round((new Date(stage.completed_at).getTime() - new Date(stage.started_at).getTime()) / 3600000)
                : null;

              return (
                <div key={stage.id} className="flex items-stretch gap-3">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center pt-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 ${
                      isDone ? 'border-green-500 bg-green-500 text-white' :
                      isActive ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-200' :
                      'border-gray-300 bg-white text-gray-400'
                    }`}>
                      {isDone ? <CheckCircleOutlined /> : isActive ? idx + 1 : <LockOutlined className="text-xs" />}
                    </div>
                    {idx < stages.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 min-h-4 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>

                  {/* Stage card */}
                  <div className={`flex-1 mb-2 rounded-lg border p-4 transition-all ${
                    isDone ? 'border-green-200 bg-green-50' :
                    isActive ? 'border-blue-300 bg-blue-50 shadow-sm' :
                    'border-gray-200 bg-gray-50 opacity-70'
                  }`}>
                    {/* Card header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag color="purple" className="!text-xs font-semibold">Stage {idx + 1}</Tag>
                        <span className={`font-semibold text-sm ${isPending ? 'text-gray-400' : isDone ? 'text-green-700' : 'text-blue-700'}`}>
                          {stage.process_name || `Stage ${idx + 1}`}
                        </span>
                        <Tag
                          color={isDone ? 'success' : isActive ? 'processing' : 'default'}
                          className="!text-xs"
                        >
                          {isDone ? '✓ Completed' : isActive ? '⚡ In Progress' : '🔒 Locked'}
                        </Tag>
                      </div>

                      {isActive && isInProduction && (
                        isOnHold ? (
                          <Tag color="warning" icon={<PauseCircleOutlined />}>ON HOLD</Tag>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            onClick={() => {
                              setCompletingStageName(`Stage ${idx + 1} — ${stage.process_name || `Stage ${idx + 1}`}`);
                              setStageNotes('');
                              setStageDescription('');
                              setStageCompletedDate(dayjs());
                              setCompleteModalOpen(true);
                            }}
                          >
                            Complete Stage
                          </Button>
                        )
                      )}

                      {isPending && (
                        <Tooltip title="Complete previous stages first">
                          <Tag icon={<LockOutlined />}>Waiting</Tag>
                        </Tooltip>
                      )}
                    </div>

                    {/* Completed stage details */}
                    {isDone && (
                      <div>
                        <button
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-500 transition-colors cursor-pointer bg-transparent border-0 p-0"
                          onClick={() => setExpandedStages(prev => {
                            const next = new Set(prev);
                            if (next.has(stage.id)) next.delete(stage.id);
                            else next.add(stage.id);
                            return next;
                          })}
                        >
                          <span style={{ transform: expandedStages.has(stage.id) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                          <span className="text-green-600 font-medium">
                            Completed {stage.completed_at ? dayjs(stage.completed_at).format('DD MMM YYYY') : ''}
                            {durationHours != null ? ` · ${durationHours > 24 ? `${Math.round(durationHours / 24)}d` : `${durationHours}h`}` : ''}
                          </span>
                        </button>

                        {expandedStages.has(stage.id) && (
                          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-green-200 pt-3">
                            <div>
                              <span className="text-xs text-gray-400 block">Started</span>
                              <span className="font-medium">{stage.started_at ? dayjs(stage.started_at).format('DD MMM YYYY, HH:mm') : '-'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400 block">Completed</span>
                              <span className="font-medium text-green-600">{stage.completed_at ? dayjs(stage.completed_at).format('DD MMM YYYY, HH:mm') : '-'}</span>
                            </div>
                            {durationHours != null && (
                              <div>
                                <span className="text-xs text-gray-400 block">Duration</span>
                                <span className="font-medium">{durationHours > 24 ? `${Math.round(durationHours / 24)} day(s)` : `${durationHours} hour(s)`}</span>
                              </div>
                            )}
                            {stage.completed_by_name && (
                              <div>
                                <span className="text-xs text-gray-400 block">Completed By</span>
                                <span className="font-medium">{stage.completed_by_name}</span>
                              </div>
                            )}
                            {stage.description && (
                              <div className="col-span-2">
                                <span className="text-xs text-gray-400 block">Description</span>
                                <span className="font-medium whitespace-pre-wrap">{stage.description}</span>
                              </div>
                            )}
                            {stage.remarks && (
                              <div className="col-span-2">
                                <span className="text-xs text-gray-400 block">Notes</span>
                                <span className="font-medium">{stage.remarks}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active stage */}
                    {isActive && (
                      <div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                          {stage.started_at && <span><ClockCircleOutlined className="mr-1" />Started: {dayjs(stage.started_at).format('DD MMM YYYY, HH:mm')}</span>}
                          {stage.assigned_to_name && <span><UserOutlined className="mr-1" />Assigned: {stage.assigned_to_name}</span>}
                        </div>
                        <Alert type="info" showIcon icon={<SyncOutlined spin />} className="!py-1"
                          message={<span className="text-xs">Stage in progress — complete to unlock next stage</span>} />
                      </div>
                    )}

                    {/* Pending stage */}
                    {isPending && (
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <LockOutlined className="text-xs" />
                        Starts automatically when the previous stage is completed.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Child Job Cards */}
      {jobCard.child_job_cards && jobCard.child_job_cards.length > 0 && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileTextOutlined className="text-green-500" />
              Stage Job Cards
              <Tag color="green">{jobCard.child_job_cards.length}</Tag>
            </span>
          }
          className="card-shadow mb-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobCard.child_job_cards.map((child) => (
              <div
                key={child.id}
                className="border border-green-200 rounded-lg p-3 bg-white hover:shadow-sm hover:border-green-400 transition-all cursor-pointer"
                onClick={() => router.push(`/manufacturing/${child.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm text-blue-600">{child.job_card_number}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{child.job_name}</div>
                  </div>
                  <Tag color="success" className="!text-xs">Done</Tag>
                </div>
                {child.completed_date && (
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <CheckCircleOutlined className="text-green-500" />
                    {dayjs(child.completed_date).format('DD MMM YYYY')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stage History */}
      {stageHistory.length > 0 && (
        <Card
          title={<span className="flex items-center gap-2"><HistoryOutlined className="text-purple-500" />Stage Completion History</span>}
          className="card-shadow mb-4"
          size="small"
        >
          <Timeline
            items={stageHistory.map((h) => ({
              color: 'green',
              dot: <CheckCircleOutlined className="text-green-500" />,
              children: (
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Text strong className="text-sm">{h.to_stage}</Text>
                    <Tag color="success" className="!text-xs">Completed</Tag>
                    {h.moved_by_name && (
                      <span className="text-xs text-gray-400">by {h.moved_by_name}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    {h.started_at && <span><CalendarOutlined className="mr-1" />Started: {dayjs(h.started_at).format('DD MMM YYYY HH:mm')}</span>}
                    {h.completed_at && <span><CheckCircleOutlined className="mr-1" />Completed: {dayjs(h.completed_at).format('DD MMM YYYY HH:mm')}</span>}
                  </div>
                  {h.notes && <div className="text-xs text-gray-500 mt-1 italic">"{h.notes}"</div>}
                </div>
              ),
            }))}
          />
        </Card>
      )}

      {/* Complete Stage Modal */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <CheckCircleOutlined className="text-green-500" />
            Complete Stage: {completingStageName}
          </span>
        }
        open={completeModalOpen}
        onCancel={() => setCompleteModalOpen(false)}
        okText="Complete Stage"
        okButtonProps={{
          style: { background: '#52c41a', borderColor: '#52c41a' },
          loading: completeCurrentStageMutation.isPending,
        }}
        onOk={() => {
          completeCurrentStageMutation.mutate({
            notes: stageNotes || undefined,
            completedDate: stageCompletedDate ? stageCompletedDate.toISOString() : undefined,
            description: stageDescription || undefined,
          });
        }}
        width={520}
      >
        <div className="space-y-4 pt-2">
          <div>
            <Text strong className="block mb-1">Completed Date & Time</Text>
            <DatePicker showTime className="w-full" value={stageCompletedDate}
              onChange={(val) => setStageCompletedDate(val)} format="DD MMM YYYY, hh:mm A" />
          </div>
          <div>
            <Text strong className="block mb-1">Description / Work Done</Text>
            <Input.TextArea placeholder="Describe the work completed in this stage..."
              rows={3} value={stageDescription} onChange={e => setStageDescription(e.target.value)} />
          </div>
          <div>
            <Text strong className="block mb-1">Notes (optional)</Text>
            <Input.TextArea placeholder="Any additional notes or observations..."
              rows={2} value={stageNotes} onChange={e => setStageNotes(e.target.value)} />
          </div>
        </div>
      </Modal>

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        defaultSubject={`Job Card ${jobCard.job_card_number}`}
        defaultBody={`Job Card: ${jobCard.job_card_number}\nProduct: ${jobCard.product_name || '-'}\nQuantity: ${jobCard.quantity} ${jobCard.unit || 'units'}\nStatus: ${getStatusLabel(jobCard.status)}\nCustomer: ${jobCard.customer_name || '-'}`}
      />
    </div>
  );
}

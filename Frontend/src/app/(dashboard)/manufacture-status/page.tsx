'use client';

import { useState, useMemo } from 'react';
import {
  Typography, Button, Input, Tag, Card, Table, Spin, Divider,
  Statistic, Row, Col, Progress, Space, message, Descriptions,
  Timeline, Badge, Tabs, Select, Empty,
} from 'antd';
import {
  SearchOutlined, CarOutlined, CheckCircleOutlined,
  SendOutlined, PauseCircleOutlined, SyncOutlined,
  StopOutlined, EyeOutlined, RocketOutlined,
  ToolOutlined, ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined, UserOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJobCardList, jobCardDispatchAction, getJobCardProcesses,
} from '@/lib/api/manufacturing';
import { getManufacturingPurchaseOrders } from '@/lib/api/bom';
import { useAuthStore } from '@/stores/authStore';
import { JobCard, JOB_CARD_STATUS_OPTIONS } from '@/types/manufacturing';
import { ManufacturingPO } from '@/types/bom';
import { SO_STATUS_OPTIONS } from '@/types/sales-order';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const fmt = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

type ViewTab = 'all' | 'in_production' | 'pending_approval' | 'approved_dispatch' | 'dispatched';

// Determine overall manufacturing status for a PO
function getOverallStatus(jcs: JobCard[]): { label: string; color: string; key: string } {
  if (jcs.length === 0) return { label: 'No Job Cards', color: 'default', key: 'none' };
  const allDispatched = jcs.every(j => j.status === 'dispatched');
  if (allDispatched) return { label: 'Fully Dispatched', color: 'green', key: 'dispatched' };

  // Count statuses
  const dispatchedCount = jcs.filter(j => j.status === 'dispatched').length;
  const approvedCount = jcs.filter(j => j.status === 'approved_for_dispatch').length;
  const pendingCount = jcs.filter(j => ['ready_for_approval', 'completed_production', 'ready_for_dispatch'].includes(j.status)).length;
  const inProcessCount = jcs.filter(j => ['in_process', 'partially_completed'].includes(j.status)).length;

  // Partially dispatched
  if (dispatchedCount > 0) {
    const remaining = jcs.length - dispatchedCount;
    return { label: `${dispatchedCount}/${jcs.length} Dispatched`, color: 'green', key: 'dispatched' };
  }
  if (approvedCount > 0) return { label: 'Approved for Dispatch', color: 'purple', key: 'approved_dispatch' };
  if (pendingCount > 0) return { label: 'Pending Approval', color: 'gold', key: 'pending_approval' };
  if (inProcessCount > 0) return { label: 'In Production', color: 'blue', key: 'in_production' };
  return { label: 'Pending', color: 'default', key: 'pending' };
}

// Stage timeline colors
const STAGE_COLORS: Record<string, string> = {
  pending: 'gray',
  in_progress: 'blue',
  completed: 'green',
  skipped: 'orange',
};

interface ExpandedOrderData {
  jobCards: JobCard[];
  stages: Record<number, any[]>;
  loading: boolean;
}

export default function ManufactureStatusPage() {
  const router = useRouter();
  const { getEnterpriseId, user } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [expandedData, setExpandedData] = useState<Record<number, ExpandedOrderData>>({});
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [myTeam, setMyTeam] = useState(false);

  const isReportingHead = !!(user as any)?.is_reporting_head;
  const currentEmployeeId = (user as any)?.id;

  // ── Queries ──
  const { data: poData, isLoading } = useQuery({
    queryKey: ['mfg-purchase-orders', enterpriseId],
    queryFn: () => getManufacturingPurchaseOrders({ pageSize: 500 }),
    enabled: !!enterpriseId,
    refetchInterval: 30000,
  });

  const { data: jobData } = useQuery({
    queryKey: ['all-job-cards', enterpriseId, myTeam],
    queryFn: () => getJobCardList({ enterpriseId: enterpriseId!, pageSize: 500, myTeam: myTeam || undefined }),
    enabled: !!enterpriseId,
    refetchInterval: 30000,
  });

  const allJobs: JobCard[] = jobData?.data || [];
  const allPOs: ManufacturingPO[] = poData?.data || [];

  // Filter POs that have job cards (active manufacturing)
  // Only consider parent job cards (exclude child/stage job cards) for status
  const activePOs = useMemo(() => {
    return allPOs.filter(po => {
      const jcs = allJobs.filter(j => j.sales_order_id === po.id && !j.parent_job_card_id);
      return jcs.length > 0;
    }).map(po => {
      const jcs = allJobs.filter(j => j.sales_order_id === po.id && !j.parent_job_card_id);
      return { ...po, _jobCards: jcs, _status: getOverallStatus(jcs) };
    });
  }, [allPOs, allJobs]);

  const filteredPOs = useMemo(() => {
    let list = activePOs;

    // Tab filter
    if (activeTab !== 'all') {
      list = list.filter(po => po._status.key === activeTab);
    }

    // Search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(po =>
        po.order_number?.toLowerCase().includes(q) ||
        po.customer_name?.toLowerCase().includes(q) ||
        po.items?.some(i => i.item_name?.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activePOs, activeTab, searchText]);

  // Stats
  const stats = useMemo(() => {
    const inProd = activePOs.filter(po => po._status.key === 'in_production').length;
    const pendingApproval = activePOs.filter(po => po._status.key === 'pending_approval').length;
    const approvedDispatch = activePOs.filter(po => po._status.key === 'approved_dispatch').length;
    const dispatched = activePOs.filter(po => po._status.key === 'dispatched').length;
    return { inProd, pendingApproval, approvedDispatch, dispatched, total: activePOs.length };
  }, [activePOs]);

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: ({ jobId, action }: { jobId: number; action: 'approve' | 'dispatch' | 'hold' | 'unhold' }) =>
      jobCardDispatchAction(jobId, action),
    onSuccess: (_, vars) => {
      const msgs: Record<string, string> = { approve: 'Approved for Dispatch', dispatch: 'Dispatched', hold: 'On hold', unhold: 'Hold removed' };
      message.success(msgs[vars.action]);
      // Clear expanded data cache so it refreshes
      setExpandedData({});
      queryClient.invalidateQueries({ queryKey: ['all-job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-purchase-orders'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const getStatusColor = (status: string) =>
    JOB_CARD_STATUS_OPTIONS.find(s => s.value === status)?.color || 'default';
  const getStatusLabel = (status: string) =>
    JOB_CARD_STATUS_OPTIONS.find(s => s.value === status)?.label || status;

  // Load expanded data for a PO
  const loadExpandedData = async (po: ManufacturingPO & { _jobCards: JobCard[] }) => {
    if (expandedData[po.id] && !expandedData[po.id].loading) return;

    setExpandedData(prev => ({ ...prev, [po.id]: { jobCards: po._jobCards, stages: {}, loading: true } }));

    try {
      // Load stages for each job card
      const stages: Record<number, any[]> = {};
      for (const jc of po._jobCards) {
        try {
          const stageRes = await getJobCardProcesses(jc.id);
          stages[jc.id] = stageRes.data || [];
        } catch { stages[jc.id] = []; }
      }

      setExpandedData(prev => ({
        ...prev,
        [po.id]: { jobCards: po._jobCards, stages, loading: false },
      }));
    } catch {
      setExpandedData(prev => ({
        ...prev,
        [po.id]: { ...prev[po.id], loading: false },
      }));
    }
  };

  const handleExpand = (expanded: boolean, record: any) => {
    if (expanded) {
      setExpandedKeys(prev => [...prev, record.id]);
      loadExpandedData(record);
    } else {
      setExpandedKeys(prev => prev.filter(k => k !== record.id));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <Title level={4} className="!mb-0">
          <CarOutlined className="mr-2 text-brand" />
          Manufacturing Status
        </Title>
        <Space>
          {isReportingHead && (
            <Button
              type={myTeam ? 'primary' : 'default'}
              icon={<TeamOutlined />}
              onClick={() => setMyTeam(v => !v)}
            >
              {myTeam ? 'My Team' : 'My Team'}
            </Button>
          )}
          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => router.push('/manufacture-status/dispatched')}
            className="border-green-400 text-green-600"
          >
            Dispatched Orders ({stats.dispatched})
          </Button>
          <Input
            placeholder="Search PO, customer, product..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 300 }}
          />
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={[12, 12]} className="mb-4">
        {[
          { label: 'Total Active', value: stats.total, color: '#1677ff', icon: <ToolOutlined />, tab: 'all' as ViewTab },
          { label: 'In Production', value: stats.inProd, color: '#1677ff', icon: <SyncOutlined />, tab: 'in_production' as ViewTab },
          { label: 'Pending Approval', value: stats.pendingApproval, color: '#faad14', icon: <ClockCircleOutlined />, tab: 'pending_approval' as ViewTab },
          { label: 'Approved for Dispatch', value: stats.approvedDispatch, color: '#722ed1', icon: <RocketOutlined />, tab: 'approved_dispatch' as ViewTab },
          { label: 'Dispatched', value: stats.dispatched, color: '#52c41a', icon: <CheckCircleOutlined />, tab: 'dispatched' as ViewTab },
        ].map((s, i) => (
          <Col xs={12} sm={6} lg={4} key={i}>
            <Card size="small" className={`card-shadow cursor-pointer ${activeTab === s.tab ? 'border-brand border-2' : ''}`}
              onClick={() => setActiveTab(activeTab === s.tab ? 'all' : s.tab)} bodyStyle={{ padding: '12px 8px' }}>
              <Statistic title={<span className="text-xs">{s.label}</span>} value={s.value}
                prefix={s.icon} valueStyle={{ color: s.color, fontSize: 22 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Orders */}
      <Card className="card-shadow">
        {filteredPOs.length === 0 ? (
          <Empty description={searchText ? 'No matching orders.' : 'No active manufacturing orders.'} />
        ) : (
          <Table
            dataSource={filteredPOs}
            rowKey="id"
            size="small"
            onRow={(record) => ({
              onClick: () => router.push(`/purchase-orders/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpand: handleExpand,
              expandedRowRender: (record) => {
                const data = expandedData[record.id];
                if (!data || data.loading) return <div className="py-8 text-center"><Spin /></div>;

                const jcs = data.jobCards;
                const allDispatched = jcs.every(j => j.status === 'dispatched');

                return (
                  <div className="p-4 space-y-4">

                    {/* ── Order Details ── */}
                    <Card size="small" title={<span><FileTextOutlined className="mr-2" />Order Details</span>}>
                      <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
                        <Descriptions.Item label="PO Number"><Text strong>{record.order_number}</Text></Descriptions.Item>
                        <Descriptions.Item label="Customer"><Text strong>{record.customer_name}</Text></Descriptions.Item>
                        <Descriptions.Item label="Order Date">{record.order_date ? dayjs(record.order_date).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="Expected Delivery">
                          {record.expected_delivery ? (
                            <Text type={dayjs(record.expected_delivery).isBefore(dayjs()) ? 'danger' : undefined} strong>
                              {dayjs(record.expected_delivery).format('DD MMM YYYY')}
                            </Text>
                          ) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Value"><Text strong>{fmt(record.grand_total)}</Text></Descriptions.Item>
                        <Descriptions.Item label="PO Status">
                          {(() => { const opt = SO_STATUS_OPTIONS.find((o: any) => o.value === record.status); return <Tag color={opt?.color || 'default'}>{opt?.label || record.status}</Tag>; })()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Invoiced">
                          <Text strong className="text-orange-500">{fmt(Number(record.invoiced_amount || 0))}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Remaining">
                          <Text strong className={Number(record.remaining_amount) > 0 ? 'text-red-500' : 'text-green-600'}>
                            {fmt(Number(record.remaining_amount ?? (record.grand_total - (record.invoiced_amount || 0))))}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Priority">
                          <Tag color={record.manufacturing_priority === 2 ? 'red' : record.manufacturing_priority === 1 ? 'orange' : 'default'}>
                            {record.manufacturing_priority === 2 ? 'Urgent' : record.manufacturing_priority === 1 ? 'High' : 'Normal'}
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                      <div className="mt-3">
                        <Text strong className="text-sm block mb-1">Products:</Text>
                        {record.items.map((item: any, i: number) => (
                          <Tag key={i} className="mb-1">{item.item_name} x{item.quantity} {item.unit_of_measure || ''}</Tag>
                        ))}
                      </div>
                    </Card>

                    {/* ── Manufacturing Progress (per Job Card) ── */}
                    <Card size="small" title={<span><ToolOutlined className="mr-2" />Manufacturing Progress</span>}>
                      {jcs.length === 0 ? (
                        <Text type="secondary">No job cards</Text>
                      ) : (
                        <div className="space-y-4">
                          {jcs.map(jc => {
                            const done = Number(jc.quantity_completed || 0);
                            const total = Number(jc.quantity || 1);
                            const pct = Math.min(100, Math.round((done / total) * 100));
                            const isDispatched = jc.status === 'dispatched';
                            const isApprovedForDispatch = jc.status === 'approved_for_dispatch';
                            const isReadyForApproval = ['ready_for_approval', 'completed_production', 'ready_for_dispatch'].includes(jc.status);
                            const stages = (data.stages[jc.id] || []).sort((a: any, b: any) => a.sequence_order - b.sequence_order);

                            return (
                              <div key={jc.id} className={`border rounded-lg overflow-hidden ${
                                isDispatched ? 'border-green-300 bg-green-50 ring-2 ring-green-200' :
                                isApprovedForDispatch ? 'border-purple-200 bg-purple-50' :
                                isReadyForApproval ? 'border-yellow-200 bg-yellow-50' :
                                'border-gray-200'
                              }`}>
                                {/* Job Card Header */}
                                <div className={`p-3 flex flex-wrap items-center justify-between gap-2 ${
                                  isDispatched ? 'bg-green-100' : isApprovedForDispatch ? 'bg-purple-100' : isReadyForApproval ? 'bg-yellow-100' : 'bg-gray-50'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <Button type="link" className="!p-0 font-bold" onClick={() => router.push(`/manufacturing/${jc.id}`)}>
                                      {jc.job_card_number}
                                    </Button>
                                    <Tag color={getStatusColor(jc.status)}>{getStatusLabel(jc.status)}</Tag>
                                    {jc.dispatch_on_hold && <Tag color="red" icon={<StopOutlined />}>Hold</Tag>}
                                    {isDispatched && <Tag color="green" icon={<CheckCircleOutlined />}>DISPATCHED</Tag>}
                                    {myTeam && jc.assigned_to !== currentEmployeeId && jc.assigned_to_name && (
                                      <Tag color="purple" icon={<TeamOutlined />}>{jc.assigned_to_name}</Tag>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Text className="text-sm">{jc.product_name}</Text>
                                    <Text type="secondary" className="text-xs">{jc.quantity} {jc.unit || 'units'}</Text>
                                  </div>
                                </div>

                                <div className="p-3">
                                  {/* Progress Bar */}
                                  <div className="mb-3">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                      <span>Production Progress</span>
                                      <span>{done}/{total} ({pct}%)</span>
                                    </div>
                                    <Progress
                                      percent={pct}
                                      size="small"
                                      showInfo={false}
                                      strokeColor={isDispatched ? '#52c41a' : pct === 100 ? '#52c41a' : 'var(--color-primary)'}
                                    />
                                  </div>

                                  {/* Stage Timeline */}
                                  {stages.length > 0 && (
                                    <div className="mb-3">
                                      <Text strong className="text-xs block mb-2">
                                        Production Stages: {stages.filter((s: any) => s.status === 'completed').length}/{stages.length} completed
                                      </Text>
                                      <div className="flex flex-wrap gap-1">
                                        {stages.map((stage: any, idx: number) => (
                                          <div key={stage.id || idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                                            stage.status === 'completed' ? 'bg-green-100 border-green-300 text-green-700' :
                                            stage.status === 'in_progress' ? 'bg-blue-100 border-blue-300 text-blue-700' :
                                            'bg-gray-100 border-gray-300 text-gray-500'
                                          }`}>
                                            {stage.status === 'completed' ? <CheckCircleOutlined /> :
                                             stage.status === 'in_progress' ? <SyncOutlined spin /> :
                                             <ClockCircleOutlined />}
                                            <span>{stage.process_name || `Stage ${idx + 1}`}</span>
                                            {stage.completed_at && (
                                              <span className="text-[10px] opacity-70">
                                                {dayjs(stage.completed_at).format('DD/MM HH:mm')}
                                              </span>
                                            )}
                                            {stage.completed_by_name && (
                                              <span className="text-[10px] opacity-70">
                                                ({stage.completed_by_name})
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Dates & Assignment */}
                                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                    {jc.start_date && <span><CalendarOutlined className="mr-1" />Start: {dayjs(jc.start_date).format('DD MMM')}</span>}
                                    {jc.due_date && <span><CalendarOutlined className="mr-1" />Due: {dayjs(jc.due_date).format('DD MMM')}</span>}
                                    {jc.assigned_to_name && <span><UserOutlined className="mr-1" />{jc.assigned_to_name}</span>}
                                    {jc.completed_date && <span><CheckCircleOutlined className="mr-1" />Completed: {dayjs(jc.completed_date).format('DD MMM')}</span>}
                                  </div>

                                  {/* Pending Approval — Approve Dispatch */}
                                  {isReadyForApproval && (
                                    <div className="mt-3 pt-3 border-t border-yellow-200">
                                      <Space>
                                        <Button size="small" type="primary"
                                          style={{ background: '#faad14', borderColor: '#faad14', color: '#000' }}
                                          icon={<CheckCircleOutlined />}
                                          loading={dispatchMutation.isPending}
                                          onClick={() => dispatchMutation.mutate({ jobId: jc.id, action: 'approve' })}>
                                          Approve Dispatch
                                        </Button>
                                        {jc.dispatch_on_hold ? (
                                          <Button size="small" icon={<SyncOutlined />} onClick={() => dispatchMutation.mutate({ jobId: jc.id, action: 'unhold' })}>Unhold</Button>
                                        ) : (
                                          <Button size="small" icon={<PauseCircleOutlined />} onClick={() => dispatchMutation.mutate({ jobId: jc.id, action: 'hold' })}>Hold</Button>
                                        )}
                                        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/manufacturing/${jc.id}`)}>Details</Button>
                                      </Space>
                                    </div>
                                  )}

                                  {/* Approved for Dispatch — Dispatch from Job Card */}
                                  {isApprovedForDispatch && (
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                      <Space>
                                        <Tag color="purple" icon={<CheckCircleOutlined />}>Approved for Dispatch</Tag>
                                        <Button size="small" type="primary" icon={<EyeOutlined />}
                                          style={{ background: '#722ed1', borderColor: '#722ed1' }}
                                          onClick={() => router.push(`/manufacturing/${jc.id}`)}>
                                          Dispatch from Job Card
                                        </Button>
                                      </Space>
                                    </div>
                                  )}

                                  {/* Dispatch Info for dispatched items */}
                                  {isDispatched && (
                                    <div className="mt-3 pt-3 border-t border-green-200">
                                      <div className="flex items-center gap-2">
                                        <CheckCircleOutlined className="text-green-500 text-lg" />
                                        <div>
                                          <Text strong className="text-green-700">Dispatched</Text>
                                          {jc.completed_date && <Text className="text-xs text-green-600 ml-2">on {dayjs(jc.completed_date).format('DD MMM YYYY')}</Text>}
                                          <div className="text-xs text-green-600">Qty: {done}/{total} {jc.unit || 'units'}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              },
            }}
            columns={[
              {
                title: 'PO Number',
                key: 'order',
                width: 160,
                render: (_, record: any) => (
                  <div>
                    <Text strong className="text-brand">{record.order_number}</Text>
                    <div className="text-xs text-gray-500">{record.customer_name}</div>
                  </div>
                ),
              },
              {
                title: 'Products',
                key: 'items',
                render: (_, record: any) => (
                  <div>
                    {record.items.slice(0, 2).map((item: any, i: number) => (
                      <div key={i} className="text-sm">{item.item_name} <Text type="secondary">x{item.quantity}</Text></div>
                    ))}
                    {record.items.length > 2 && <Text type="secondary" className="text-xs">+{record.items.length - 2} more</Text>}
                  </div>
                ),
              },
              {
                title: 'PO Status',
                key: 'po_status',
                width: 130,
                render: (_, record: any) => {
                  const opt = SO_STATUS_OPTIONS.find(o => o.value === record.status);
                  return <Tag color={opt?.color || 'default'}>{opt?.label || record.status}</Tag>;
                },
              },
              {
                title: 'Payment',
                key: 'payment',
                width: 170,
                render: (_, record: any) => {
                  const totalPaid = Number(record.total_paid || 0);
                  const grandTotal = Number(record.grand_total || 0);
                  const balanceDue = grandTotal - totalPaid;
                  const isPaid = balanceDue <= 0.005 && totalPaid > 0;
                  const isPartial = totalPaid > 0 && balanceDue > 0.005;
                  return (
                    <div>
                      <Tag color={isPaid ? 'green' : isPartial ? 'orange' : 'red'} className="mb-1">
                        {isPaid ? 'Fully Paid' : isPartial ? 'Partial' : 'Unpaid'}
                      </Tag>
                      {totalPaid > 0 && (
                        <div className="text-xs text-gray-500">
                          Paid: <span className="text-green-600 font-medium">{fmt(totalPaid)}</span>
                        </div>
                      )}
                      {balanceDue > 0.005 && (
                        <div className="text-xs text-gray-500">
                          Due: <span className="text-red-500 font-medium">{fmt(balanceDue)}</span>
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                title: 'Delivery',
                key: 'delivery',
                width: 110,
                render: (_, record: any) => record.expected_delivery ? (
                  <Text type={dayjs(record.expected_delivery).isBefore(dayjs()) ? 'danger' : undefined}>
                    {dayjs(record.expected_delivery).format('DD MMM YY')}
                  </Text>
                ) : '-',
              },
              {
                title: 'Progress',
                key: 'progress',
                width: 150,
                render: (_, record: any) => {
                  const jcs = record._jobCards as JobCard[];
                  const dispatched = jcs.filter((j: JobCard) => j.status === 'dispatched').length;
                  const pct = jcs.length > 0 ? Math.round((dispatched / jcs.length) * 100) : 0;
                  return (
                    <div>
                      <Progress percent={pct} size="small" showInfo={false}
                        strokeColor={pct === 100 ? '#52c41a' : 'var(--color-primary)'} />
                      <Text className="text-xs text-gray-400">{dispatched}/{jcs.length} done</Text>
                    </div>
                  );
                },
              },
              {
                title: 'Status',
                key: 'status',
                width: 140,
                render: (_, record: any) => (
                  <Tag color={record._status.color} icon={
                    record._status.key === 'dispatched' ? <CheckCircleOutlined /> :
                    record._status.key === 'approved_dispatch' ? <RocketOutlined /> :
                    record._status.key === 'pending_approval' ? <ClockCircleOutlined /> :
                    record._status.key === 'in_production' ? <SyncOutlined /> : undefined
                  }>{record._status.label}</Tag>
                ),
              },
              {
                title: 'Action',
                key: 'actions',
                width: 180,
                render: (_, record: any) => {
                  const pendingJobs = (record._jobCards as JobCard[]).filter(j =>
                    ['ready_for_approval', 'completed_production', 'ready_for_dispatch'].includes(j.status)
                  );
                  const approvedJobs = (record._jobCards as JobCard[]).filter(j => j.status === 'approved_for_dispatch');
                  return (
                    <Space size={4} wrap>
                      {pendingJobs.length > 0 && (
                        <Button size="small" type="primary"
                          style={{ background: '#faad14', borderColor: '#faad14', color: '#000' }}
                          icon={<CheckCircleOutlined />}
                          loading={dispatchMutation.isPending}
                          onClick={() => {
                            pendingJobs.forEach(jc => dispatchMutation.mutate({ jobId: jc.id, action: 'approve' }));
                          }}>
                          Approve ({pendingJobs.length})
                        </Button>
                      )}
                      {approvedJobs.length > 0 && (
                        <Tag color="purple" icon={<CheckCircleOutlined />}>
                          {approvedJobs.length} Approved
                        </Tag>
                      )}
                      <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/purchase-orders/${record.id}`)}>PO</Button>
                    </Space>
                  );
                },
              },
            ]}
            rowClassName={(record: any) => {
              if (record._status.key === 'dispatched') return 'bg-green-50';
              if (record._status.key === 'approved_dispatch') return 'bg-purple-50';
              if (record._status.key === 'pending_approval') return 'bg-yellow-50';
              return '';
            }}
          />
        )}
      </Card>
    </div>
  );
}

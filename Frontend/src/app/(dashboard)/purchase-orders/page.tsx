'use client';

import { useState, useMemo } from 'react';
import {
  Typography, Button, Card, Input, Select, Space, Table, Tag, Tooltip, Popconfirm, message, Alert, Badge, Statistic, Progress, Modal,
} from 'antd';
import {
  SearchOutlined, ClearOutlined, EyeOutlined,
  FileTextOutlined, ShoppingCartOutlined, PauseCircleOutlined,
  PlayCircleOutlined, DeleteOutlined, RocketOutlined, CheckCircleOutlined,
  ToolOutlined, ClockCircleOutlined, DollarOutlined, WalletOutlined,
  ExclamationCircleOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalesOrderList, updateSOStatus, deleteSalesOrder } from '@/lib/api/sales-orders';
import { getJobCardList } from '@/lib/api/manufacturing';
import { SO_STATUS_OPTIONS } from '@/types/sales-order';
import type { SalesOrder } from '@/types/sales-order';
import type { ColumnsType } from 'antd/es/table';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title, Text } = Typography;

const fmt = (v: number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdTarget, setHoldTarget] = useState<{ id: number; orderNumber: string } | null>(null);
  const [holdReason, setHoldReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders-list', page, pageSize, search, status],
    queryFn: () => getSalesOrderList({ page, pageSize, search: search || undefined, status }),
  });

  // Fetch all POs for payment summary (respects status filter)
  const { data: allPOsData } = useQuery({
    queryKey: ['purchase-orders-summary', status],
    queryFn: () => getSalesOrderList({ page: 1, pageSize: 9999, status }),
  });

  // Fetch all job cards to find dispatch-ready ones
  const { data: allJobsData } = useQuery({
    queryKey: ['all-job-cards-for-po'],
    queryFn: () => getJobCardList({ pageSize: 500 }),
    refetchInterval: 15000,
  });

  // Group dispatch-ready/completed jobs by PO
  const { dispatchByPO, inProductionByPO } = useMemo(() => {
    const allJobs = allJobsData?.data || [];
    const dispatchMap: Record<number, { orderNumber: string; customerName: string; products: { name: string; qty: number; unit: string; status: string; jobNumber: string }[] }> = {};
    const productionMap: Record<number, { total: number; completed: number; inProcess: number }> = {};

    allJobs.forEach((job) => {
      if (!job.sales_order_id) return;

      // Manufacturing progress tracking
      if (!productionMap[job.sales_order_id]) {
        productionMap[job.sales_order_id] = { total: 0, completed: 0, inProcess: 0 };
      }
      productionMap[job.sales_order_id].total += 1;
      if (['completed_production', 'ready_for_dispatch', 'dispatched'].includes(job.status)) {
        productionMap[job.sales_order_id].completed += 1;
      }
      if (['in_process', 'partially_completed'].includes(job.status)) {
        productionMap[job.sales_order_id].inProcess += 1;
      }

      // Dispatch-ready items
      if (job.status === 'ready_for_dispatch' || job.status === 'completed_production') {
        if (!dispatchMap[job.sales_order_id]) {
          dispatchMap[job.sales_order_id] = {
            orderNumber: job.order_number || `PO #${job.sales_order_id}`,
            customerName: job.customer_name || '',
            products: [],
          };
        }
        dispatchMap[job.sales_order_id].products.push({
          name: job.product_name || 'Unknown Product',
          qty: job.quantity,
          unit: job.unit || 'units',
          status: job.status,
          jobNumber: job.job_card_number,
        });
      }
    });

    return { dispatchByPO: dispatchMap, inProductionByPO: productionMap };
  }, [allJobsData?.data]);

  const dispatchReadyPOIds = Object.keys(dispatchByPO).map(Number);

  // Payment summary
  const paymentSummary = useMemo(() => {
    const allPOs = allPOsData?.data || [];
    const totalPOValue = allPOs.reduce((sum, po) => sum + (po.grand_total || 0), 0);
    const totalReceived = allPOs.reduce((sum, po) => sum + (po.invoiced_amount || 0), 0);
    const totalPending = allPOs.reduce((sum, po) => sum + (po.remaining_amount || 0), 0);
    const totalOrders = allPOs.length;
    const fullyPaid = allPOs.filter((po) => (po.remaining_amount || 0) <= 0 && (po.invoiced_amount || 0) > 0).length;
    const partiallyPaid = allPOs.filter((po) => (po.invoiced_amount || 0) > 0 && (po.remaining_amount || 0) > 0).length;
    const unpaid = allPOs.filter((po) => (po.invoiced_amount || 0) === 0).length;
    const collectionRate = totalPOValue > 0 ? Math.round((totalReceived / totalPOValue) * 100) : 0;
    return { totalPOValue, totalReceived, totalPending, totalOrders, fullyPaid, partiallyPaid, unpaid, collectionRate };
  }, [allPOsData?.data]);

  const holdMutation = useMutation({
    mutationFn: ({ id, currentStatus, reason }: { id: number; currentStatus: string; reason?: string }) =>
      updateSOStatus(id, currentStatus === 'on_hold' ? 'confirmed' : 'on_hold', reason),
    onSuccess: (_, vars) => {
      const isHolding = vars.currentStatus !== 'on_hold';
      message.success(isHolding ? 'Purchase order placed on hold — production stopped' : 'Purchase order resumed — production can continue');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-summary'] });
      setHoldModalOpen(false);
      setHoldTarget(null);
      setHoldReason('');
    },
    onError: () => message.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSalesOrder(id),
    onSuccess: () => {
      message.success('Purchase order deleted');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
    },
    onError: () => message.error('Failed to delete purchase order'),
  });

  const getStatusColor = (s: string) =>
    SO_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) =>
    SO_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  const columns: ColumnsType<SalesOrder> = [
    {
      title: 'PO Number',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (v, record) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-brand flex items-center gap-1">
            <ShoppingCartOutlined />
            {v}
          </span>
          {dispatchReadyPOIds.includes(record.id) && (
            <Badge status="processing" />
          )}
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Manufacturing',
      key: 'mfg_status',
      width: 160,
      render: (_, record) => {
        const mfg = inProductionByPO[record.id];
        if (!mfg) {
          if (record.sent_to_manufacturing) return <Tag color="processing"><ClockCircleOutlined /> Pending</Tag>;
          return <Text type="secondary" className="text-xs">—</Text>;
        }
        const pct = Math.round((mfg.completed / mfg.total) * 100);
        const isReady = dispatchReadyPOIds.includes(record.id);
        return (
          <div>
            {isReady ? (
              <Tag color="purple"><RocketOutlined /> Dispatch Ready</Tag>
            ) : mfg.inProcess > 0 ? (
              <Tag color="blue"><ToolOutlined /> In Production</Tag>
            ) : pct === 100 ? (
              <Tag color="success"><CheckCircleOutlined /> Complete</Tag>
            ) : (
              <Tag color="default"><ClockCircleOutlined /> {pct}% Done</Tag>
            )}
            <div className="text-xs text-gray-400 mt-0.5">{mfg.completed}/{mfg.total} jobs done</div>
          </div>
        );
      },
    },
    {
      title: 'Date',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 100,
    },
    {
      title: 'PO Total',
      dataIndex: 'grand_total',
      key: 'grand_total',
      render: (v) => <span className="font-semibold">{fmt(v)}</span>,
    },
    {
      title: 'Invoiced',
      dataIndex: 'invoiced_amount',
      key: 'invoiced_amount',
      render: (v) => (
        <span className="text-orange-500 font-medium">{fmt(v ?? 0)}</span>
      ),
    },
    {
      title: 'Paid',
      dataIndex: 'total_paid',
      key: 'total_paid',
      render: (v) => (
        <span className="text-green-600 font-semibold">{fmt(v ?? 0)}</span>
      ),
    },
    {
      title: 'Balance Due',
      key: 'balance_due',
      render: (_, record) => {
        const due = Number(record.grand_total) - Number(record.total_paid ?? 0);
        return (
          <span className={due > 0.005 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
            {fmt(due)}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button
              type={dispatchReadyPOIds.includes(record.id) ? 'primary' : 'text'}
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${record.id}`); }}
            />
          </Tooltip>
          <Tooltip title={record.status === 'on_hold' ? 'Resume Order' : 'Hold Order'}>
            <Button
              type="text"
              icon={record.status === 'on_hold' ? <PlayCircleOutlined className="text-green-600" /> : <PauseCircleOutlined className="text-yellow-500" />}
              loading={holdMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                if (record.status === 'on_hold') {
                  holdMutation.mutate({ id: record.id, currentStatus: 'on_hold' });
                } else {
                  setHoldTarget({ id: record.id, orderNumber: record.order_number });
                  setHoldReason('');
                  setHoldModalOpen(true);
                }
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Purchase Order"
            description="This will permanently delete the PO and its items. Are you sure?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} onClick={(e) => e.stopPropagation()} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Purchase Orders</Title>
        <ExportDropdown
          data={data?.data || []}
          disabled={!data?.data?.length}
          filename="purchase-orders"
          title="Purchase Orders"
          columns={[{ key: 'order_number', title: 'PO Number' }, { key: 'customer_name', title: 'Customer' }, { key: 'order_date', title: 'Date' }, { key: 'grand_total', title: 'PO Total' }, { key: 'invoiced_amount', title: 'Invoiced' }, { key: 'remaining_amount', title: 'Remaining' }, { key: 'status', title: 'Status' }]}
        />
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="card-shadow" size="small">
          <Statistic
            title={<span className="text-gray-500 font-medium">Total PO Value</span>}
            value={paymentSummary.totalPOValue}
            precision={2}
            prefix={<DollarOutlined className="text-brand" />}
            formatter={(val) => fmt(Number(val))}
          />
          <div className="text-xs text-gray-400 mt-1">{paymentSummary.totalOrders} Purchase Orders</div>
        </Card>
        <Card className="card-shadow" size="small">
          <Statistic
            title={<span className="text-gray-500 font-medium">Payments Received</span>}
            value={paymentSummary.totalReceived}
            precision={2}
            prefix={<CheckCircleOutlined className="text-green-500" />}
            formatter={(val) => fmt(Number(val))}
            valueStyle={{ color: '#52c41a' }}
          />
          <div className="text-xs text-gray-400 mt-1">{paymentSummary.fullyPaid} fully paid</div>
        </Card>
        <Card className="card-shadow" size="small">
          <Statistic
            title={<span className="text-gray-500 font-medium">Payments Pending</span>}
            value={paymentSummary.totalPending}
            precision={2}
            prefix={<ExclamationCircleOutlined className="text-red-500" />}
            formatter={(val) => fmt(Number(val))}
            valueStyle={{ color: '#f5222d' }}
          />
          <div className="text-xs text-gray-400 mt-1">
            {paymentSummary.partiallyPaid} partial &bull; {paymentSummary.unpaid} unpaid
          </div>
        </Card>
        <Card className="card-shadow" size="small">
          <div className="mb-1">
            <span className="text-gray-500 font-medium text-sm">Collection Rate</span>
          </div>
          <Progress
            type="dashboard"
            percent={paymentSummary.collectionRate}
            size={80}
            strokeColor={paymentSummary.collectionRate >= 75 ? '#52c41a' : paymentSummary.collectionRate >= 50 ? '#faad14' : '#f5222d'}
          />
          <div className="text-xs text-gray-400 mt-1 text-center">
            {fmt(paymentSummary.totalReceived)} of {fmt(paymentSummary.totalPOValue)}
          </div>
        </Card>
      </div>

      {/* Dispatch Ready Notification */}
      {dispatchReadyPOIds.length > 0 && (
        <Alert
          type="success"
          showIcon
          icon={<RocketOutlined />}
          className="mb-4"
          style={{ border: '2px solid #b7eb8f', background: '#f6ffed' }}
          message={
            <strong>
              <CheckCircleOutlined className="mr-1" />
              {dispatchReadyPOIds.length} Purchase Order{dispatchReadyPOIds.length > 1 ? 's' : ''} — Products Ready for Dispatch
            </strong>
          }
          description={
            <div className="mt-2">
              {Object.entries(dispatchByPO).map(([poId, info]) => (
                <div
                  key={poId}
                  className="flex items-center gap-3 py-2 px-3 mb-2 bg-white rounded-lg border border-green-200 cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => router.push(`/purchase-orders/${poId}`)}
                >
                  <div className="flex-1">
                    <Text strong className="text-green-700">{info.orderNumber}</Text>
                    {info.customerName && <Text type="secondary" className="ml-2">{info.customerName}</Text>}
                    <div className="mt-1">
                      {info.products.map((p, i) => (
                        <Tag key={i} color={p.status === 'ready_for_dispatch' ? 'purple' : 'cyan'} className="mb-1">
                          {p.name} — {p.qty} {p.unit} ({p.jobNumber})
                        </Tag>
                      ))}
                    </div>
                  </div>
                  <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${poId}`); }}>
                    Review & Dispatch
                  </Button>
                </div>
              ))}
            </div>
          }
        />
      )}

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search by customer or PO number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="Filter by status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 180 }}
            allowClear
          >
            {SO_STATUS_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
            ))}
          </Select>
          <Button
            icon={<ClearOutlined />}
            onClick={() => { setSearch(''); setStatus(undefined); setPage(1); }}
          >
            Clear
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => router.push(`/purchase-orders/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} purchase orders`,
          }}
          scroll={{ x: 900 }}
          rowClassName={(record) =>
            dispatchReadyPOIds.includes(record.id) ? 'bg-green-50' : ''
          }
        />
      </Card>

      {/* Hold Reason Modal */}
      <Modal
        title={
          <span>
            <PauseCircleOutlined className="text-yellow-500 mr-2" />
            Hold Purchase Order {holdTarget?.orderNumber ? `— ${holdTarget.orderNumber}` : ''}
          </span>
        }
        open={holdModalOpen}
        onCancel={() => { setHoldModalOpen(false); setHoldTarget(null); setHoldReason(''); }}
        onOk={() => {
          if (holdTarget) {
            holdMutation.mutate({ id: holdTarget.id, currentStatus: 'confirmed', reason: holdReason || undefined });
          }
        }}
        okText="Hold Order"
        okButtonProps={{ danger: true, loading: holdMutation.isPending }}
        cancelText="Cancel"
      >
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Production will be stopped"
          description="Placing this order on hold will immediately stop all manufacturing progress for this order. No stages can be completed until the order is resumed."
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for hold (optional)</label>
          <Input.TextArea
            rows={3}
            placeholder="e.g. Customer requested changes, Payment pending, Material shortage..."
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

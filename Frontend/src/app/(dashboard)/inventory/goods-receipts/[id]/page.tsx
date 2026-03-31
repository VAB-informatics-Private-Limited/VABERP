'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Select, Space, Typography, Descriptions,
  InputNumber, Alert, Spin, message, Divider, Progress, Result, Statistic, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LinkOutlined, FileDoneOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getGoodsReceiptById, confirmGoodsReceipt, rejectGoodsReceipt, markGrnItemReturned } from '@/lib/api/goods-receipts';
import { reorderRejectedIndentItems } from '@/lib/api/indents';
import { getEmployees } from '@/lib/api/employees';
import { GoodsReceiptItem, GRN_STATUS_OPTIONS, REJECTION_REASONS } from '@/types/goods-receipt';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function GoodsReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const [confirmData, setConfirmData] = useState<Record<number, {
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    rejectionReason?: string;
    notes: string;
  }>>({});
  const [receivedBy, setReceivedBy] = useState<number | undefined>(undefined);
  const [overallNotes, setOverallNotes] = useState('');

  const { data: grnRes, isLoading } = useQuery({
    queryKey: ['grn', id],
    queryFn: () => getGoodsReceiptById(id),
    enabled: !!id,
  });

  const { data: employeesRes } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => getEmployees(undefined, 1, 200),
    staleTime: 1000 * 60 * 5,
  });

  const grn = grnRes?.data;

  useEffect(() => {
    if (grn?.items) {
      const initial: typeof confirmData = {};
      grn.items.forEach((item) => {
        const sentQty = item.shortage_qty ?? item.expected_qty;
        const recv = item.status === 'pending' ? sentQty : item.confirmed_qty;
        const acc  = item.status === 'pending' ? sentQty : item.accepted_qty;
        initial[item.id] = {
          receivedQty: recv,
          acceptedQty: acc,
          rejectedQty: recv - acc,
          rejectionReason: item.rejection_reason,
          notes: item.notes || '',
        };
      });
      setConfirmData(initial);
    }
  }, [grn]);

  const confirmMutation = useMutation({
    mutationFn: () => {
      // Validate: if rejectedQty > 0, rejectionReason is required
      for (const item of grn?.items || []) {
        const d = confirmData[item.id];
        if (d && d.rejectedQty > 0 && !d.rejectionReason) {
          throw new Error(`Please select a rejection reason for "${item.item_name}"`);
        }
      }
      return confirmGoodsReceipt(id, {
        receivedBy: receivedBy!,
        items: (grn?.items || []).map((item) => {
          const d = confirmData[item.id] || { receivedQty: 0, acceptedQty: 0, rejectedQty: 0 };
          return {
            grnItemId: item.id,
            confirmedQty: d.receivedQty,
            acceptedQty: d.acceptedQty,
            rejectedQty: d.rejectedQty,
            rejectionReason: d.rejectedQty > 0 ? d.rejectionReason : undefined,
            notes: d.notes || undefined,
          };
        }),
        notes: overallNotes || undefined,
      });
    },
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['indents'] });
    },
    onError: (err: any) => message.error(err?.message || err?.response?.data?.message || 'Failed to confirm receipt'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectGoodsReceipt(id, overallNotes || undefined),
    onSuccess: () => {
      message.success('GRN rejected. Procurement team has been notified to re-release.');
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['indents-grn-rejected-count'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to reject'),
  });

  const reorderMutation = useMutation({
    mutationFn: () => reorderRejectedIndentItems(grn!.indent_id!),
    onSuccess: (res) => {
      message.success(res.message || 'Items reset for re-ordering. Procurement team has been notified.');
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      queryClient.invalidateQueries({ queryKey: ['indents-grn-rejected-count'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to reset items for re-order'),
  });

  const markReturnedMutation = useMutation({
    mutationFn: (itemId: number) => markGrnItemReturned(id, itemId),
    onSuccess: (res) => {
      message.success(res.message || 'Item marked as returned to vendor.');
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      queryClient.invalidateQueries({ queryKey: ['indents'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to mark item as returned'),
  });

  if (isLoading) return <div className="p-6 flex justify-center"><Spin size="large" /></div>;
  if (!grn) return <div className="p-6"><Alert type="error" message="GRN not found" /></div>;

  const statusOpt = GRN_STATUS_OPTIONS.find((o) => o.value === grn.status);
  const isPending = grn.status === 'pending';
  const isConfirmed = grn.status === 'confirmed' || grn.status === 'partially_confirmed';
  const isRejected = grn.status === 'rejected';

  const employees = (employeesRes?.data || []).map((e) => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name || ''}`.trim(),
  }));

  const totalExpected  = (grn.items || []).reduce((s, i) => s + (i.shortage_qty ?? i.expected_qty), 0);
  // Always use actual DB values for summary stats — confirmData is only for the form inputs
  const totalReceived  = (grn.items || []).reduce((s, i) => s + i.confirmed_qty, 0);
  const totalAccepted  = (grn.items || []).reduce((s, i) => s + i.accepted_qty, 0);
  const totalRejected  = (grn.items || []).reduce((s, i) => s + i.rejected_qty, 0);
  const totalConfirmed = totalAccepted; // alias for backward-compat display
  const receiptPercent = totalExpected > 0 ? Math.round((totalAccepted / totalExpected) * 100) : 0;

  const confirmedItems = (grn.items || []).filter((i) => i.status === 'confirmed' || i.status === 'partial');
  const rejectedItems = (grn.items || []).filter((i) => i.status === 'rejected');
  const partialGrnItems = (grn.items || []).filter((i) => i.status === 'partial');
  // Items with any rejection (full or partial) that need re-ordering
  const itemsWithRejection = (grn.items || []).filter((i) => i.rejected_qty > 0);
  const hasRejectedStock = isConfirmed && itemsWithRejection.length > 0 && !!grn.indent_id;
  // RTV: items with damaged/rejected qty pending physical return
  const rtvPendingItems = (grn.items || []).filter((i) => i.rtv_status === 'pending');
  const rtvReturnedItems = (grn.items || []).filter((i) => i.rtv_status === 'returned');

  const updateItem = (id: number, patch: Partial<typeof confirmData[number]>) =>
    setConfirmData((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const columns = [
    {
      title: 'Material',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (val: string, record: GoodsReceiptItem) => (
        <div>
          <Text strong>{val}</Text>
          {record.unit_of_measure && (
            <Text type="secondary" style={{ fontSize: 12 }}> ({record.unit_of_measure})</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Sent Qty',
      key: 'sent_qty',
      align: 'center' as const,
      render: (_: unknown, record: GoodsReceiptItem) => {
        const qty = record.shortage_qty ?? record.expected_qty;
        return `${qty} ${record.unit_of_measure || ''}`.trim();
      },
    },
    {
      title: 'Received Qty',
      key: 'received_qty',
      align: 'center' as const,
      render: (_: unknown, record: GoodsReceiptItem) => {
        if (isPending) {
          const val = confirmData[record.id]?.receivedQty ?? (record.shortage_qty ?? record.expected_qty);
          return (
            <InputNumber
              min={0}
              value={val}
              onChange={(v) => {
                const recv = Number(v) || 0;
                const acc  = Math.min(confirmData[record.id]?.acceptedQty ?? recv, recv);
                updateItem(record.id, { receivedQty: recv, acceptedQty: acc, rejectedQty: recv - acc });
              }}
              style={{ width: 100 }}
            />
          );
        }
        return `${record.confirmed_qty} ${record.unit_of_measure || ''}`.trim();
      },
    },
    {
      title: 'Accepted Qty',
      key: 'accepted_qty',
      align: 'center' as const,
      render: (_: unknown, record: GoodsReceiptItem) => {
        if (isPending) {
          const d = confirmData[record.id];
          const recv = d?.receivedQty ?? record.expected_qty;
          const acc  = d?.acceptedQty ?? recv;
          return (
            <InputNumber
              min={0}
              max={recv}
              value={acc}
              onChange={(v) => {
                const newAcc = Math.min(Number(v) || 0, recv);
                updateItem(record.id, { acceptedQty: newAcc, rejectedQty: recv - newAcc });
              }}
              style={{ width: 100, borderColor: acc < recv ? '#faad14' : undefined }}
            />
          );
        }
        return (
          <Text type={record.accepted_qty >= (record.shortage_qty ?? record.expected_qty) ? 'success' : record.accepted_qty > 0 ? 'warning' : 'danger'}>
            {record.accepted_qty} {record.unit_of_measure || ''}
          </Text>
        );
      },
    },
    {
      title: 'Rejected Qty',
      key: 'rejected_qty',
      align: 'center' as const,
      render: (_: unknown, record: GoodsReceiptItem) => {
        const rej = isPending
          ? (confirmData[record.id]?.rejectedQty ?? 0)
          : record.rejected_qty;
        if (rej <= 0) return <Text type="secondary">—</Text>;
        return <Text type="danger" strong>{rej} {record.unit_of_measure || ''}</Text>;
      },
    },
    {
      title: 'Rejection Reason',
      key: 'rejection_reason',
      render: (_: unknown, record: GoodsReceiptItem) => {
        if (isPending) {
          const rej = confirmData[record.id]?.rejectedQty ?? 0;
          if (rej <= 0) return <Text type="secondary" className="text-xs">—</Text>;
          return (
            <Select
              size="small"
              placeholder="Select reason *"
              style={{ width: 160, borderColor: !confirmData[record.id]?.rejectionReason ? '#ff4d4f' : undefined }}
              value={confirmData[record.id]?.rejectionReason}
              onChange={(val) => updateItem(record.id, { rejectionReason: val })}
              options={REJECTION_REASONS}
            />
          );
        }
        if (!record.rejection_reason) return <Text type="secondary">—</Text>;
        const label = REJECTION_REASONS.find((r) => r.value === record.rejection_reason)?.label || record.rejection_reason;
        return <Tag color="red">{label}</Tag>;
      },
    },
    {
      title: 'Notes',
      key: 'notes',
      render: (_: unknown, record: GoodsReceiptItem) => {
        if (isPending) {
          return (
            <input
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              placeholder="Optional..."
              value={confirmData[record.id]?.notes || ''}
              onChange={(e) => updateItem(record.id, { notes: e.target.value })}
            />
          );
        }
        return record.notes || '—';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        const colors: Record<string, string> = {
          pending: 'orange', confirmed: 'green', partial: 'gold', rejected: 'red',
        };
        const labels: Record<string, string> = {
          pending: 'Pending', confirmed: 'Confirmed', partial: 'Short Delivery', rejected: 'Rejected',
        };
        return <Tag color={colors[val] || 'default'}>{labels[val] || val}</Tag>;
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/inventory/goods-receipts')}>
          Back
        </Button>
        <div>
          <Title level={4} className="!mb-0">{grn.grn_number}</Title>
          <Tag color={statusOpt?.color || 'default'}>{statusOpt?.label || grn.status}</Tag>
        </div>
      </div>

      {/* Pending banner — shown before user confirms */}
      {isPending && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Awaiting Confirmation"
          description="This goods receipt has not been confirmed yet. The quantities below are pre-filled with the amounts sent by procurement — update them if what arrived is different, then click Confirm Receipt."
        />
      )}

      {/* Post-confirmation summary — shown after GRN is confirmed */}
      {isConfirmed && (
        <Card
          className="mb-4"
          style={{ borderColor: '#52c41a', backgroundColor: '#f6ffed' }}
        >
          <div className="flex items-start gap-4">
            <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginTop: 4 }} />
            <div className="flex-1">
              <Text strong style={{ fontSize: 16, color: '#389e0d' }}>
                {grn.status === 'confirmed' ? 'GRN Fully Confirmed' : 'GRN Partially Confirmed'}
              </Text>
              <br />
              <Text type="secondary">
                Confirmed by {grn.received_by_name || '—'} on{' '}
                {grn.received_date ? dayjs(grn.received_date).format('DD MMM YYYY') : '—'}
              </Text>

              <Row gutter={24} className="mt-4">
                <Col>
                  <Statistic
                    title="Items Accepted"
                    value={confirmedItems.length}
                    suffix={`/ ${(grn.items || []).length}`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col>
                  <Statistic
                    title="Qty Accepted"
                    value={totalAccepted}
                    suffix={`/ ${totalExpected}`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                {totalRejected > 0 && (
                  <Col>
                    <Statistic
                      title="Qty Rejected / Damaged"
                      value={totalRejected}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                )}
                {rejectedItems.length > 0 && (
                  <Col>
                    <Statistic
                      title="Items Fully Rejected"
                      value={rejectedItems.length}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                )}
              </Row>

              <Divider className="my-3" />

              <Space wrap>
                <Tag icon={<FileDoneOutlined />} color="green">
                  Stock updated in inventory
                </Tag>
                <Tag color="blue">
                  Materials issued to manufacturing
                </Tag>
                {grn.indent_number && (
                  <Tag
                    color="purple"
                    icon={<LinkOutlined />}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/procurement/indents/${grn.indent_id}`)}
                  >
                    View Indent {grn.indent_number}
                  </Tag>
                )}
              </Space>
            </div>
          </div>
        </Card>
      )}

      {/* Re-order alert — shown when GRN is confirmed but some items were rejected/damaged */}
      {hasRejectedStock && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          className="mb-4"
          message={`${itemsWithRejection.length} item(s) have rejected / damaged stock that needs to be re-ordered`}
          description={
            <div>
              <p className="mb-2">
                The following items had rejected quantities:{' '}
                <strong>{itemsWithRejection.map((i) => `${i.item_name} (rejected: ${i.rejected_qty} ${i.unit_of_measure || ''})`).join(', ')}</strong>
              </p>
              <p className="mb-2">
                Click <strong>"Re-order Rejected Items"</strong> to reset these items to pending in the indent. Procurement will then contact the supplier to arrange re-delivery under the existing purchase order.
              </p>
              <Space>
                <Button
                  type="primary"
                  danger
                  loading={reorderMutation.isPending}
                  onClick={() => reorderMutation.mutate()}
                >
                  Re-order Rejected Items
                </Button>
                <Button
                  icon={<LinkOutlined />}
                  onClick={() => router.push(`/procurement/indents/${grn.indent_id}`)}
                >
                  View Indent {grn.indent_number}
                </Button>
              </Space>
            </div>
          }
        />
      )}

      {/* Short delivery notice — shown when GRN is confirmed but some items had partial delivery */}
      {isConfirmed && partialGrnItems.length > 0 && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`${partialGrnItems.length} item(s) had a short delivery — supplier will re-deliver on the existing order`}
          description={
            <div>
              <p className="mb-2">
                The following were received in smaller quantity than ordered:{' '}
                <strong>{partialGrnItems.map((i) => `${i.item_name} (accepted: ${i.accepted_qty} ${i.unit_of_measure || ''})`).join(', ')}</strong>
              </p>
              <p className="mb-2">
                The remaining quantity has been reset in the indent. Procurement will contact the supplier to arrange
                re-delivery under the existing purchase order — no new PO is needed.
              </p>
              {grn.indent_id && (
                <Button icon={<LinkOutlined />} onClick={() => router.push(`/procurement/indents/${grn.indent_id}`)}>
                  View Indent
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* RTV card — items with rejected/damaged stock pending physical return */}
      {isConfirmed && rtvPendingItems.length > 0 && (
        <Card
          className="mb-4"
          style={{ borderColor: '#faad14', backgroundColor: '#fffbe6' }}
          title={
            <Space>
              <WarningOutlined style={{ color: '#d48806' }} />
              <Text strong style={{ color: '#d48806' }}>Items to Return to Vendor ({rtvPendingItems.length})</Text>
            </Space>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            These items were rejected due to damage or defects. Physically return them to the vendor, then click "Mark as Returned".
            Procurement will automatically be able to re-order replacements.
          </p>
          <Space direction="vertical" style={{ width: '100%' }}>
            {rtvPendingItems.map((item) => {
              const reasonLabel = REJECTION_REASONS.find((r) => r.value === item.rejection_reason)?.label || item.rejection_reason || 'Rejected';
              return (
                <div key={item.id} className="flex items-center justify-between p-2 rounded bg-orange-50 border border-orange-200">
                  <div>
                    <Text strong>{item.item_name}</Text>
                    <Text type="secondary" className="ml-2 text-sm">
                      × {item.rejected_qty} {item.unit_of_measure || ''} — {reasonLabel}
                    </Text>
                  </div>
                  <Button
                    size="small"
                    type="primary"
                    danger
                    loading={markReturnedMutation.isPending}
                    onClick={() => markReturnedMutation.mutate(item.id)}
                  >
                    Mark as Returned
                  </Button>
                </div>
              );
            })}
          </Space>
        </Card>
      )}

      {/* Already returned items — collapsed summary */}
      {isConfirmed && rtvReturnedItems.length > 0 && rtvPendingItems.length === 0 && (
        <Alert
          type="success"
          showIcon
          className="mb-4"
          message={`${rtvReturnedItems.length} item(s) returned to vendor`}
          description="All rejected items have been physically returned. Procurement will contact the supplier to arrange replacement delivery under the existing purchase order."
        />
      )}

      {/* Rejected notice */}
      {isRejected && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          className="mb-4"
          message="GRN Rejected"
          description="This GRN was rejected. The procurement team has been notified and needs to re-release the items to create a new GRN."
          action={
            grn.indent_id ? (
              <Button
                size="small"
                danger
                onClick={() => router.push(`/procurement/indents/${grn.indent_id}`)}
              >
                View Indent
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Summary card */}
      <Card className="card-shadow mb-4" title="Receipt Details">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="GRN Number">
            <Text strong>{grn.grn_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusOpt?.color || 'default'}>{statusOpt?.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            <Text strong>{grn.supplier_name || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Purchase Order">
            {grn.po_number ? (
              <Text strong>{grn.po_number}</Text>
            ) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Linked Indent">
            {grn.indent_number ? (
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                icon={<LinkOutlined />}
                onClick={() => router.push(`/procurement/indents/${grn.indent_id}`)}
              >
                {grn.indent_number}
              </Button>
            ) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="GRN Date">
            {grn.created_date ? dayjs(grn.created_date).format('DD MMM YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Released By (Procurement)">
            <Text strong>{grn.released_by_name || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Confirmed By (Inventory)">
            {grn.received_by_name
              ? <Text strong style={{ color: '#52c41a' }}>{grn.received_by_name}</Text>
              : <Text type="secondary">Not yet confirmed</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Confirmed Date">
            {grn.received_date ? dayjs(grn.received_date).format('DD MMM YYYY') : '—'}
          </Descriptions.Item>
          {grn.notes && (
            <Descriptions.Item label="Notes" span={3}>{grn.notes}</Descriptions.Item>
          )}
        </Descriptions>

        {!isPending && (
          <>
            <Divider className="my-3" />
            <Row gutter={[24, 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#888' }}>Total Sent</span>}
                  value={totalExpected}
                  valueStyle={{ fontSize: 20, fontWeight: 700, color: '#555' }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#888' }}>Accepted into Stock</span>}
                  value={totalAccepted}
                  valueStyle={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}
                  prefix={<CheckCircleOutlined style={{ fontSize: 16 }} />}
                />
              </Col>
              {totalRejected > 0 && (
                <Col xs={12} sm={6}>
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#888' }}>Rejected / Damaged</span>}
                    value={totalRejected}
                    valueStyle={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}
                    prefix={<CloseCircleOutlined style={{ fontSize: 16 }} />}
                  />
                </Col>
              )}
              <Col xs={12} sm={6}>
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#888' }}>Acceptance Rate</span>}
                  value={receiptPercent}
                  suffix="%"
                  valueStyle={{ fontSize: 20, fontWeight: 700, color: receiptPercent >= 100 ? '#52c41a' : receiptPercent >= 50 ? '#faad14' : '#ff4d4f' }}
                />
              </Col>
            </Row>
          </>
        )}

        {isPending && (
          <>
            <Divider className="my-3" />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {totalExpected} unit(s) dispatched by procurement — <strong>awaiting your confirmation below</strong>
            </Text>
          </>
        )}
      </Card>

      {/* Items table */}
      <Card className="card-shadow mb-4" title="Items">
        {isPending && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Enter actual quantities received — override if different"
            description="'Sent Qty' is the quantity dispatched by procurement. If what arrived is different, enter the correct received quantity. Items with 0 will be marked as not received and stock will be corrected automatically."
          />
        )}

        <Table
          dataSource={grn.items || []}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          rowClassName={(record) =>
            record.status === 'rejected' ? 'bg-red-50' :
            record.status === 'partial' ? 'bg-yellow-50' :
            record.status === 'confirmed' ? 'bg-green-50' : ''
          }
        />
      </Card>

      {/* Confirmation panel — only for pending GRNs */}
      {isPending && (
        <Card className="card-shadow" title="Confirm or Reject Receipt">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong className="block mb-1">Confirmed By (In Charge) *</Text>
              <Select
                placeholder="Select employee who verified the goods"
                style={{ width: '100%', maxWidth: 400 }}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={employees}
                value={receivedBy}
                onChange={setReceivedBy}
              />
            </div>

            <div>
              <Text strong className="block mb-1">Notes (optional)</Text>
              <input
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-lg text-sm"
                placeholder="Any discrepancies, damage notes, delivery remarks..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
              />
            </div>

            <Alert
              type="info"
              showIcon
              message="What happens after confirmation?"
              description={
                <ul className="mt-1 text-sm list-disc list-inside space-y-1">
                  <li><strong>Accepted quantity</strong> will be added to raw material stock</li>
                  <li><strong>Rejected / damaged items</strong> will be logged separately but will NOT affect stock</li>
                  <li>Materials will be issued to manufacturing based on accepted qty</li>
                  <li>The linked indent will be marked as Closed once all items are received</li>
                </ul>
              }
            />

            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="large"
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                loading={confirmMutation.isPending}
                disabled={!receivedBy}
                onClick={() => confirmMutation.mutate()}
              >
                Confirm Receipt
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                size="large"
                loading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                Reject GRN
              </Button>
            </Space>

            {!receivedBy && (
              <Text type="warning" style={{ fontSize: 12 }}>
                Please select the employee in charge before confirming.
              </Text>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
}

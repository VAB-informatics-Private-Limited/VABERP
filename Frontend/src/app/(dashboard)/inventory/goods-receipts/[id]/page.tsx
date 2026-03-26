'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Select, Space, Typography, Descriptions,
  InputNumber, Alert, Spin, message, Divider, Progress,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getGoodsReceiptById, confirmGoodsReceipt, rejectGoodsReceipt } from '@/lib/api/goods-receipts';
import { getEmployees } from '@/lib/api/employees';
import { GoodsReceiptItem, GRN_STATUS_OPTIONS } from '@/types/goods-receipt';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function GoodsReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  // confirmed quantities state: { [grnItemId]: { qty, notes } }
  const [confirmData, setConfirmData] = useState<Record<number, { qty: number; notes: string }>>({});
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

  // Pre-fill confirmed quantities with expected quantities
  useEffect(() => {
    if (grn?.items) {
      const initial: Record<number, { qty: number; notes: string }> = {};
      grn.items.forEach((item) => {
        initial[item.id] = {
          qty: item.status === 'pending' ? item.expected_qty : item.confirmed_qty,
          notes: item.notes || '',
        };
      });
      setConfirmData(initial);
    }
  }, [grn]);

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmGoodsReceipt(id, {
        receivedBy: receivedBy!,
        items: (grn?.items || []).map((item) => ({
          grnItemId: item.id,
          confirmedQty: confirmData[item.id]?.qty ?? 0,
          notes: confirmData[item.id]?.notes || undefined,
        })),
        notes: overallNotes || undefined,
      }),
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to confirm receipt'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectGoodsReceipt(id, overallNotes || undefined),
    onSuccess: () => {
      message.success('GRN rejected. Items returned to procurement.');
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      router.push('/inventory/goods-receipts');
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to reject'),
  });

  if (isLoading) return <div className="p-6 flex justify-center"><Spin size="large" /></div>;
  if (!grn) return <div className="p-6"><Alert type="error" message="GRN not found" /></div>;

  const statusOpt = GRN_STATUS_OPTIONS.find((o) => o.value === grn.status);
  const isPending = grn.status === 'pending';
  const employees = (employeesRes?.data || []).map((e) => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name || ''}`.trim(),
  }));

  const totalExpected = (grn.items || []).reduce((s, i) => s + i.expected_qty, 0);
  const totalConfirmed = isPending
    ? (grn.items || []).reduce((s, i) => s + (confirmData[i.id]?.qty ?? 0), 0)
    : (grn.items || []).reduce((s, i) => s + i.confirmed_qty, 0);
  const receiptPercent = totalExpected > 0 ? Math.round((totalConfirmed / totalExpected) * 100) : 0;

  const columns = [
    {
      title: 'Material',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (val: string, record: GoodsReceiptItem) => (
        <div>
          <Text strong>{val}</Text>
          {record.raw_material_name && record.raw_material_name !== val && (
            <br />
          )}
          {record.unit_of_measure && (
            <Text type="secondary" style={{ fontSize: 12 }}> ({record.unit_of_measure})</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Expected Qty',
      dataIndex: 'expected_qty',
      key: 'expected_qty',
      align: 'right' as const,
      render: (val: number, record: GoodsReceiptItem) =>
        `${val} ${record.unit_of_measure || ''}`.trim(),
    },
    {
      title: isPending ? 'Actual Qty Received' : 'Confirmed Qty',
      key: 'confirmed_qty',
      align: 'right' as const,
      render: (_: unknown, record: GoodsReceiptItem) => {
        if (isPending) {
          const entered = confirmData[record.id]?.qty ?? record.expected_qty;
          const isDifferent = entered !== record.expected_qty;
          return (
            <Space direction="vertical" size={2}>
              <InputNumber
                min={0}
                value={entered}
                onChange={(val) =>
                  setConfirmData((prev) => ({
                    ...prev,
                    [record.id]: { ...prev[record.id], qty: Number(val) || 0 },
                  }))
                }
                style={{ width: 110, borderColor: isDifferent ? '#faad14' : undefined }}
              />
              {isDifferent && (
                <Text type="warning" style={{ fontSize: 11 }}>
                  Procurement: {record.expected_qty}
                </Text>
              )}
            </Space>
          );
        }
        return (
          <Text type={record.confirmed_qty >= record.expected_qty ? 'success' : 'warning'}>
            {record.confirmed_qty} {record.unit_of_measure || ''}
          </Text>
        );
      },
    },
    {
      title: 'Receipt %',
      key: 'pct',
      align: 'center' as const,
      render: (_: unknown, record: GoodsReceiptItem) => {
        const qty = isPending ? (confirmData[record.id]?.qty ?? record.expected_qty) : record.confirmed_qty;
        const pct = record.expected_qty > 0 ? Math.round((qty / record.expected_qty) * 100) : 0;
        return <Tag color={pct >= 100 ? 'green' : pct >= 50 ? 'orange' : 'red'}>{pct}%</Tag>;
      },
    },
    {
      title: 'Item Notes',
      key: 'notes',
      render: (_: unknown, record: GoodsReceiptItem) => {
        if (isPending) {
          return (
            <input
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              placeholder="Optional note..."
              value={confirmData[record.id]?.notes || ''}
              onChange={(e) =>
                setConfirmData((prev) => ({
                  ...prev,
                  [record.id]: { ...prev[record.id], notes: e.target.value },
                }))
              }
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
          pending: 'orange', confirmed: 'green', partial: 'blue', rejected: 'red',
        };
        return <Tag color={colors[val] || 'default'}>{val}</Tag>;
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

      {/* Summary card */}
      <Card className="card-shadow mb-4">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="GRN Number">
            <Text strong>{grn.grn_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="From Indent">{grn.indent_number || '—'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusOpt?.color || 'default'}>{statusOpt?.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Released By">{grn.released_by_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Received By">
            {grn.received_by_name || <Text type="secondary">Not yet confirmed</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Received Date">
            {grn.received_date ? dayjs(grn.received_date).format('DD-MM-YYYY') : '—'}
          </Descriptions.Item>
          {grn.notes && (
            <Descriptions.Item label="Notes" span={3}>{grn.notes}</Descriptions.Item>
          )}
        </Descriptions>

        <Divider className="my-3" />

        <div className="flex items-center gap-4">
          <Text type="secondary">Overall Receipt:</Text>
          <Progress
            percent={receiptPercent}
            strokeColor={receiptPercent >= 100 ? '#52c41a' : receiptPercent >= 50 ? '#faad14' : '#ff4d4f'}
            style={{ flex: 1, maxWidth: 300 }}
          />
          <Text strong>{totalConfirmed} / {totalExpected} units</Text>
        </div>
      </Card>

      {/* Items table */}
      <Card className="card-shadow mb-4" title="Items">
        {isPending && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Enter actual quantities received — override procurement if wrong"
            description="The 'Expected Qty' was set by procurement. If the actual delivery is different (less, more, or zero), enter the correct quantity. Items with 0 will be marked as not received and stock will be corrected automatically."
          />
        )}

        <Table
          dataSource={grn.items || []}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Confirmation panel — only for pending GRNs */}
      {isPending && (
        <Card className="card-shadow" title="Confirm Receipt">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong className="block mb-1">Received By (In Charge) *</Text>
              <Select
                placeholder="Select employee who received the goods"
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
              <Text strong className="block mb-1">Overall Notes (optional)</Text>
              <input
                className="border border-gray-300 rounded px-3 py-2 w-full max-w-lg text-sm"
                placeholder="Any discrepancies, damage notes, delivery remarks..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
              />
            </div>

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

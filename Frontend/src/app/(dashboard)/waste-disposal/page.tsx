'use client';
import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, InputNumber,
  DatePicker, Space, Card, Row, Col, Statistic, Tooltip, Descriptions, Steps, Result,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, CloseOutlined, CarOutlined, DollarOutlined, LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import {
  getDisposalTransactions, getDisposalDashboard, createDisposalTransaction,
  confirmDisposal, completeDisposal, cancelDisposal,
  getWasteInventory, getWasteParties,
  WasteDisposalTransaction, WasteParty,
} from '@/lib/api/waste';
import { message } from 'antd';

const { Option } = Select;

const STATUS_STEPS: Record<string, number> = { draft: 0, confirmed: 1, in_transit: 2, completed: 3, cancelled: 0 };
const STATUS_COLOR: Record<string, string> = { draft: 'default', confirmed: 'blue', in_transit: 'orange', completed: 'green', cancelled: 'red' };
const TYPE_COLOR: Record<string, string> = { disposal: 'red', sale: 'green', internal_reuse: 'blue' };

export default function WasteDisposalPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('waste_management', 'waste_disposal', 'view');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [typeFilter, setTypeFilter] = useState<string>();
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<WasteDisposalTransaction | null>(null);
  const [createForm] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [lineCount, setLineCount] = useState(1);

  const { data: stats } = useQuery({ queryKey: ['disposal-dashboard'], queryFn: getDisposalDashboard });
  const { data, isFetching } = useQuery({
    queryKey: ['disposals', page, statusFilter, typeFilter],
    queryFn: () => getDisposalTransactions({ page, limit: 20, status: statusFilter, transactionType: typeFilter }),
  });
  const { data: partiesData } = useQuery({ queryKey: ['waste-parties-all'], queryFn: () => getWasteParties() });
  const { data: inventoryData } = useQuery({
    queryKey: ['waste-inv-available'],
    queryFn: () => getWasteInventory({ status: 'available', limit: 200 }),
    enabled: createModal,
  });

  const createMut = useMutation({
    mutationFn: createDisposalTransaction,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disposals'] }); qc.invalidateQueries({ queryKey: ['disposal-dashboard'] }); setCreateModal(false); createForm.resetFields(); message.success('Disposal transaction created'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const confirmMut = useMutation({
    mutationFn: confirmDisposal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disposals'] }); message.success('Confirmed'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Confirm failed'),
  });

  const completeMut = useMutation({
    mutationFn: ({ id, dto }: any) => completeDisposal(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disposals'] }); qc.invalidateQueries({ queryKey: ['disposal-dashboard'] }); qc.invalidateQueries({ queryKey: ['waste-inventory'] }); qc.invalidateQueries({ queryKey: ['waste-dashboard'] }); setCompleteModal(false); completeForm.resetFields(); message.success('Disposal completed'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const cancelMut = useMutation({
    mutationFn: cancelDisposal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disposals'] }); qc.invalidateQueries({ queryKey: ['waste-inventory'] }); message.success('Cancelled'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const onCreateSubmit = (v: any) => {
    const lines = Array.from({ length: lineCount }, (_, i) => ({
      inventoryId: v[`inv_${i}`],
      quantityRequested: v[`qty_${i}`],
      rate: v[`rate_${i}`],
    })).filter(l => l.inventoryId);

    createMut.mutate({
      partyId: v.party_id,
      transactionType: v.transaction_type,
      disposalMethod: v.disposal_method,
      scheduledDate: v.scheduled_date.format('YYYY-MM-DD'),
      manifestNumber: v.manifest_number,
      vehicleNumber: v.vehicle_number,
      notes: v.notes,
      lines,
    });
  };

  const onCompleteSubmit = (v: any) => {
    const lines = selectedTxn?.lines?.map(l => ({
      id: l.id,
      quantityActual: v[`actual_${l.id}`] ?? l.quantity_requested,
      rate: v[`rate_${l.id}`] ?? l.rate,
    })) ?? [];
    completeMut.mutate({ id: selectedTxn!.id, dto: { lines } });
  };

  const columns = [
    { title: 'Txn #', dataIndex: 'transaction_no', render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
    { title: 'Party', render: (_: any, r: WasteDisposalTransaction) => <div><div className="font-medium">{r.party?.company_name ?? `#${r.party_id}`}</div><Tag color={r.party?.party_type === 'customer' ? 'green' : 'orange'}>{r.party?.party_type}</Tag></div> },
    { title: 'Type', dataIndex: 'transaction_type', render: (v: string) => <Tag color={TYPE_COLOR[v]}>{v?.replace('_',' ').toUpperCase()}</Tag> },
    { title: 'Method', dataIndex: 'disposal_method', render: (v?: string) => v ? v.replace('_',' ').toUpperCase() : '—' },
    { title: 'Scheduled', dataIndex: 'scheduled_date', render: (v: string) => dayjs(v).format('DD MMM YYYY') },
    { title: 'Qty', render: (_: any, r: WasteDisposalTransaction) => `${Number(r.total_quantity).toLocaleString()} kg` },
    {
      title: 'Revenue / Cost',
      render: (_: any, r: WasteDisposalTransaction) => (
        <div>
          {r.total_revenue > 0 && <div className="text-green-600 text-xs">+₹{Number(r.total_revenue).toLocaleString()}</div>}
          {r.total_cost > 0 && <div className="text-red-500 text-xs">-₹{Number(r.total_cost).toLocaleString()}</div>}
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v?.toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 150,
      render: (_: any, r: WasteDisposalTransaction) => (
        <Space size="small">
          <Button size="small" onClick={() => { setSelectedTxn(r); setDetailModal(true); }}>View</Button>
          {r.status === 'draft' && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => Modal.confirm({ title: 'Confirm this disposal?', onOk: () => confirmMut.mutate(r.id) })}>Confirm</Button>}
          {['confirmed','in_transit'].includes(r.status) && <Button size="small" icon={<DollarOutlined />} onClick={() => { setSelectedTxn(r); completeForm.resetFields(); setCompleteModal(true); }}>Complete</Button>}
          {['draft','confirmed'].includes(r.status) && <Button size="small" danger icon={<CloseOutlined />} onClick={() => Modal.confirm({ title: 'Cancel this disposal?', onOk: () => cancelMut.mutate(r.id) })} />}
        </Space>
      ),
    },
  ];

  const parties = partiesData?.data ?? [];

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Waste Disposal." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wastage Disposal</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setLineCount(1); setCreateModal(true); }}>New Disposal</Button>
      </div>

      <Row gutter={16} className="mb-6">
        {[
          { title: 'Draft', value: stats?.draft ?? 0, color: '#8c8c8c' },
          { title: 'Confirmed', value: stats?.confirmed ?? 0, color: '#1677ff' },
          { title: 'Completed', value: stats?.completed ?? 0, color: '#52c41a' },
          { title: 'Total Revenue', value: `₹${(stats?.totalRevenue ?? 0).toLocaleString()}`, color: '#52c41a' },
          { title: 'Total Cost', value: `₹${(stats?.totalCost ?? 0).toLocaleString()}`, color: '#ff4d4f' },
          { title: 'Net Value', value: `₹${((stats?.netValue ?? 0)).toLocaleString()}`, color: (stats?.netValue ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' },
        ].map(s => (
          <Col key={s.title} xs={12} md={4}>
            <Card size="small"><Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontSize: 16 }} /></Card>
          </Col>
        ))}
      </Row>

      <div className="flex gap-3 mb-4">
        <Select placeholder="Status" allowClear style={{ width: 150 }} onChange={v => { setStatusFilter(v); setPage(1); }}>
          {['draft','confirmed','in_transit','completed','cancelled'].map(s => <Option key={s} value={s}>{s.toUpperCase()}</Option>)}
        </Select>
        <Select placeholder="Type" allowClear style={{ width: 150 }} onChange={v => { setTypeFilter(v); setPage(1); }}>
          <Option value="disposal">Disposal</Option><Option value="sale">Sale</Option><Option value="internal_reuse">Internal Reuse</Option>
        </Select>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isFetching}
        pagination={{ total: data?.total ?? 0, current: page, pageSize: 20, onChange: setPage }} />

      {/* Create Modal */}
      <Modal title="New Disposal Transaction" open={createModal} width={700}
        onCancel={() => { setCreateModal(false); createForm.resetFields(); setLineCount(1); }}
        onOk={() => createForm.submit()} confirmLoading={createMut.isPending}>
        <Form form={createForm} layout="vertical" onFinish={onCreateSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="party_id" label="Party (Vendor/Customer)" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children">
                  {parties.map((p: WasteParty) => <Option key={p.id} value={p.id}>{p.company_name} <Tag>{p.party_type}</Tag></Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transaction_type" label="Type" initialValue="disposal">
                <Select><Option value="disposal">Disposal</Option><Option value="sale">Sale (Scrap Revenue)</Option><Option value="internal_reuse">Internal Reuse</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="disposal_method" label="Disposal Method">
                <Select allowClear>
                  {['landfill','incineration','recycling','composting','sale','reuse','auction'].map(m => <Option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduled_date" label="Scheduled Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="vehicle_number" label="Vehicle Number"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="manifest_number" label="Manifest Number"><Input /></Form.Item></Col>
          </Row>

          <div className="font-medium mb-2 mt-2">Waste Items</div>
          {Array.from({ length: lineCount }, (_, i) => (
            <Row gutter={8} key={i} className="mb-2">
              <Col span={12}>
                <Form.Item name={`inv_${i}`} label={i === 0 ? 'Batch' : ''} rules={i === 0 ? [{ required: true }] : []}>
                  <Select showSearch optionFilterProp="children" placeholder="Select batch">
                    {(inventoryData?.data ?? []).map((inv: any) => (
                      <Option key={inv.id} value={inv.id}>{inv.batch_no} — {inv.category?.name} ({inv.quantity_available} {inv.unit})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={`qty_${i}`} label={i === 0 ? 'Qty' : ''} rules={i === 0 ? [{ required: true }] : []}>
                  <InputNumber style={{ width: '100%' }} min={0.001} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={`rate_${i}`} label={i === 0 ? 'Rate (₹/unit)' : ''}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          ))}
          <Button size="small" onClick={() => setLineCount(c => c + 1)}>+ Add Batch</Button>
          <Form.Item name="notes" label="Notes" className="mt-3"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={`Transaction: ${selectedTxn?.transaction_no}`} open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={700}>
        {selectedTxn && (
          <div>
            <Steps size="small" current={STATUS_STEPS[selectedTxn.status]} className="mb-6"
              items={['Draft','Confirmed','In Transit','Completed'].map(t => ({ title: t }))} />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Party">{selectedTxn.party?.company_name}</Descriptions.Item>
              <Descriptions.Item label="Type"><Tag color={TYPE_COLOR[selectedTxn.transaction_type]}>{selectedTxn.transaction_type}</Tag></Descriptions.Item>
              <Descriptions.Item label="Method">{selectedTxn.disposal_method ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Scheduled">{dayjs(selectedTxn.scheduled_date).format('DD MMM YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Vehicle">{selectedTxn.vehicle_number ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Manifest">{selectedTxn.manifest_number ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Revenue">₹{Number(selectedTxn.total_revenue).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Cost">₹{Number(selectedTxn.total_cost).toLocaleString()}</Descriptions.Item>
            </Descriptions>
            <div className="mt-4 font-medium mb-2">Line Items</div>
            <Table size="small" dataSource={selectedTxn.lines ?? []} rowKey="id" pagination={false} columns={[
              { title: 'Batch', render: (_: any, l: any) => l.inventory?.batch_no ?? `#${l.inventory_id}` },
              { title: 'Category', render: (_: any, l: any) => l.category?.name },
              { title: 'Requested', render: (_: any, l: any) => `${l.quantity_requested} ${l.unit}` },
              { title: 'Actual', render: (_: any, l: any) => l.quantity_actual != null ? `${l.quantity_actual} ${l.unit}` : '—' },
              { title: 'Rate', render: (_: any, l: any) => l.rate ? `₹${l.rate}` : '—' },
              { title: 'Revenue', render: (_: any, l: any) => l.revenue > 0 ? <span className="text-green-600">₹{Number(l.revenue).toLocaleString()}</span> : '—' },
              { title: 'Cost', render: (_: any, l: any) => l.cost > 0 ? <span className="text-red-500">₹{Number(l.cost).toLocaleString()}</span> : '—' },
            ]} />
          </div>
        )}
      </Modal>

      {/* Complete Modal */}
      <Modal title="Complete Disposal — Enter Actual Quantities" open={completeModal} width={680}
        onCancel={() => { setCompleteModal(false); completeForm.resetFields(); }}
        onOk={() => completeForm.submit()} confirmLoading={completeMut.isPending}>
        <Form form={completeForm} layout="vertical" onFinish={onCompleteSubmit}>
          {selectedTxn?.lines?.map(l => (
            <Row gutter={12} key={l.id}>
              <Col span={8}><div className="text-sm font-medium mb-2">{l.inventory?.batch_no ?? `Batch #${l.inventory_id}`}</div></Col>
              <Col span={8}>
                <Form.Item name={`actual_${l.id}`} label="Actual Qty" initialValue={l.quantity_requested}>
                  <InputNumber style={{ width: '100%' }} min={0} max={l.quantity_requested} step={0.1} addonAfter={l.unit} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={`rate_${l.id}`} label="Rate (₹/unit)" initialValue={l.rate}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          ))}
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Card, Descriptions, Tag, Button, Table, Modal, Form, Input, Select,
  Space, Timeline, Statistic, Row, Col, InputNumber, Divider, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, CheckCircleOutlined,
  PlayCircleOutlined, PauseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import dayjs from 'dayjs';
import {
  getWorkOrder, changeWorkOrderStatus, closeWorkOrder,
  addWorkOrderPart, reservePart, consumePart, removeWorkOrderPart,
  WorkOrderPart,
} from '@/lib/api/machinery';
import { getRawMaterialList } from '@/lib/api/raw-materials';
import { message } from 'antd';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  created: 'default', assigned: 'blue', in_progress: 'processing',
  on_hold: 'warning', completed: 'success', closed: 'green', cancelled: 'error',
};

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const woId = parseInt(id);
  const [partModal, setPartModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [consumeModal, setConsumeModal] = useState<WorkOrderPart | null>(null);
  const [partForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [consumeForm] = Form.useForm();

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-order', woId],
    queryFn: () => getWorkOrder(woId),
    enabled: !!woId,
  });

  const { data: rawMats } = useQuery({
    queryKey: ['raw-materials-dropdown'],
    queryFn: () => getRawMaterialList({ pageSize: 500 }),
    enabled: partModal,
    select: (res) => res.data ?? [],
  });

  const statusMut = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) => changeWorkOrderStatus(woId, status, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', woId] }); setStatusModal(false); statusForm.resetFields(); message.success('Status updated'); },
    onError: () => message.error('Failed to update status'),
  });

  const closeMut = useMutation({
    mutationFn: () => closeWorkOrder(woId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', woId] }); message.success('Work order closed'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to close'),
  });

  const addPartMut = useMutation({
    mutationFn: (dto: any) => addWorkOrderPart(woId, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', woId] }); setPartModal(false); partForm.resetFields(); message.success('Part added'); },
    onError: () => message.error('Failed to add part'),
  });

  const reserveMut = useMutation({
    mutationFn: (partId: number) => reservePart(partId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', woId] }); message.success('Part reserved'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to reserve'),
  });

  const consumeMut = useMutation({
    mutationFn: ({ partId, qty }: { partId: number; qty: number }) => consumePart(partId, qty),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', woId] }); setConsumeModal(null); consumeForm.resetFields(); message.success('Part consumed'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to consume'),
  });

  const removeMut = useMutation({
    mutationFn: (partId: number) => removeWorkOrderPart(partId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-order', woId] }); message.success('Part removed'); },
    onError: () => message.error('Failed to remove part'),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!wo) return <div className="p-6">Work order not found.</div>;

  const isClosed = ['completed', 'closed', 'cancelled'].includes(wo.status);

  const partColumns = [
    { title: 'Material', render: (_: any, r: WorkOrderPart) => r.raw_material?.name ?? `RM #${r.raw_material_id}` },
    { title: 'Required', dataIndex: 'quantity_required', render: (v: number, r: WorkOrderPart) => `${v} ${r.unit ?? ''}` },
    { title: 'Reserved', dataIndex: 'quantity_reserved', render: (v: number, r: WorkOrderPart) => `${v} ${r.unit ?? ''}` },
    { title: 'Consumed', dataIndex: 'quantity_consumed', render: (v: number, r: WorkOrderPart) => `${v} ${r.unit ?? ''}` },
    { title: 'Source', dataIndex: 'source', render: (v: string) => <Tag color={v === 'bom_auto' ? 'blue' : 'green'}>{v === 'bom_auto' ? 'BOM' : 'Manual'}</Tag> },
    {
      title: 'Status', dataIndex: 'status',
      render: (v: string) => <Tag color={v === 'consumed' ? 'green' : v === 'reserved' ? 'blue' : v === 'cancelled' ? 'red' : 'default'}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      render: (_: any, r: WorkOrderPart) => (
        <Space size="small">
          {r.status === 'pending' && <Button size="small" onClick={() => reserveMut.mutate(r.id)}>Reserve</Button>}
          {['reserved', 'partial', 'pending'].includes(r.status) && <Button size="small" type="primary" onClick={() => { setConsumeModal(r); consumeForm.setFieldsValue({ qty: r.quantity_required }); }}>Consume</Button>}
          {!isClosed && r.status === 'pending' && (
            <Popconfirm title="Remove this part?" onConfirm={() => removeMut.mutate(r.id)}>
              <Button size="small" danger>Remove</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const statusActions = [
    { label: 'Start', status: 'in_progress', disabled: wo.status !== 'created' && wo.status !== 'assigned', icon: <PlayCircleOutlined /> },
    { label: 'Put On Hold', status: 'on_hold', disabled: wo.status !== 'in_progress', icon: <PauseCircleOutlined />, needsReason: true },
    { label: 'Resume', status: 'in_progress', disabled: wo.status !== 'on_hold', icon: <PlayCircleOutlined /> },
    { label: 'Complete', status: 'completed', disabled: wo.status !== 'in_progress', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/maintenance-work-orders')}>Back</Button>
          <h1 className="text-xl font-bold">{wo.work_order_no} — {wo.title}</h1>
          <Tag color={STATUS_COLORS[wo.status]}>{wo.status?.replace('_', ' ').toUpperCase()}</Tag>
        </div>
        <Space>
          {statusActions.map(a => (
            <Button key={a.label} icon={a.icon} disabled={a.disabled}
              onClick={() => {
                if (a.needsReason) { setTargetStatus(a.status); setStatusModal(true); }
                else statusMut.mutate({ status: a.status });
              }}>
              {a.label}
            </Button>
          ))}
          {wo.status === 'completed' && (
            <Popconfirm title="Close and verify this work order?" onConfirm={() => closeMut.mutate()}>
              <Button type="primary">Close & Verify</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={16} className="mb-4">
        <Col span={16}>
          <Card title="Details">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Machine">{wo.machine?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Service Type"><Tag>{wo.service_type?.replace('_', ' ').toUpperCase()}</Tag></Descriptions.Item>
              <Descriptions.Item label="Priority"><Tag color={wo.priority === 'critical' ? 'red' : wo.priority === 'high' ? 'orange' : 'blue'}>{wo.priority?.toUpperCase()}</Tag></Descriptions.Item>
              <Descriptions.Item label="Assigned Type">{wo.assigned_type?.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="Technician">{wo.assigned_technician ? `${wo.assigned_technician.first_name} ${wo.assigned_technician.last_name}` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Scheduled Start">{wo.scheduled_start ? dayjs(wo.scheduled_start).format('DD MMM YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Scheduled End">{wo.scheduled_end ? dayjs(wo.scheduled_end).format('DD MMM YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Actual Start">{wo.actual_start ? dayjs(wo.actual_start).format('DD MMM YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Actual End">{wo.actual_end ? dayjs(wo.actual_end).format('DD MMM YYYY HH:mm') : '—'}</Descriptions.Item>
              {wo.description && <Descriptions.Item label="Description" span={2}>{wo.description}</Descriptions.Item>}
              {wo.completion_notes && <Descriptions.Item label="Completion Notes" span={2}>{wo.completion_notes}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Costs">
            <Statistic title="Estimated" value={wo.estimated_cost ?? 0} prefix="₹" precision={2} className="mb-2" />
            <Statistic title="Actual" value={wo.actual_cost ?? 0} prefix="₹" precision={2} className="mb-2" />
            <Statistic title="Labor" value={wo.labor_cost ?? 0} prefix="₹" precision={2} className="mb-2" />
            <Statistic title="Vendor" value={wo.vendor_cost ?? 0} prefix="₹" precision={2} />
          </Card>
        </Col>
      </Row>

      {/* Parts */}
      <Card
        title="Parts / Materials"
        className="mb-4"
        extra={!isClosed && <Button icon={<PlusOutlined />} size="small" onClick={() => setPartModal(true)}>Add Part</Button>}
      >
        <Table dataSource={wo.parts ?? []} columns={partColumns} rowKey="id" pagination={false} size="small" />
      </Card>

      {/* Status Timeline */}
      <Card title="Status History">
        <Timeline
          items={(wo.status_logs ?? []).map(l => ({
            color: ['completed', 'closed'].includes(l.to_status) ? 'green' : l.to_status === 'cancelled' ? 'red' : 'blue',
            children: (
              <div>
                <span className="font-medium">{l.from_status ? `${l.from_status} → ` : ''}{l.to_status}</span>
                {l.reason && <div className="text-gray-500 text-sm">{l.reason}</div>}
                <div className="text-xs text-gray-400">
                  {l.changed_by_employee ? `${l.changed_by_employee.first_name} ${l.changed_by_employee.last_name} · ` : ''}
                  {dayjs(l.created_date).format('DD MMM YYYY HH:mm')}
                </div>
              </div>
            ),
          }))}
        />
      </Card>

      {/* Add Part Modal */}
      <Modal title="Add Part" open={partModal} onCancel={() => { setPartModal(false); partForm.resetFields(); }} onOk={() => partForm.submit()} confirmLoading={addPartMut.isPending}>
        <Form form={partForm} layout="vertical" onFinish={v => addPartMut.mutate({ rawMaterialId: v.rm_id, quantityRequired: v.qty, unit: v.unit, notes: v.notes })}>
          <Form.Item name="rm_id" label="Raw Material" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {(rawMats ?? []).map((m: any) => <Option key={m.id} value={m.id}>{m.name} (Avail: {m.available_stock} {m.unit})</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="qty" label="Quantity Required" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0.001} /></Form.Item></Col>
            <Col span={12}><Form.Item name="unit" label="Unit"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Status Reason Modal */}
      <Modal title="Hold Reason" open={statusModal} onCancel={() => { setStatusModal(false); statusForm.resetFields(); }} onOk={() => statusForm.submit()} confirmLoading={statusMut.isPending}>
        <Form form={statusForm} layout="vertical" onFinish={v => statusMut.mutate({ status: targetStatus, reason: v.reason })}>
          <Form.Item name="reason" label="Reason for hold" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* Consume Modal */}
      <Modal title="Consume Part" open={!!consumeModal} onCancel={() => { setConsumeModal(null); consumeForm.resetFields(); }} onOk={() => consumeForm.submit()} confirmLoading={consumeMut.isPending}>
        <Form form={consumeForm} layout="vertical" onFinish={v => consumeMut.mutate({ partId: consumeModal!.id, qty: v.qty })}>
          <p className="mb-3 text-gray-600">Material: <strong>{consumeModal?.raw_material?.name}</strong></p>
          <Form.Item name="qty" label="Quantity Consumed" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0.001} max={consumeModal?.quantity_required} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

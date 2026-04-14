'use client';

import React, { useState } from 'react';
import {
  Table, Button, Select, Tag, Modal, Form, Input, DatePicker,
  Space, Statistic, Row, Col, Card, InputNumber, Tooltip,
} from 'antd';
import { PlusOutlined, EyeOutlined, AlertOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import {
  getWorkOrders, getWorkOrdersDashboard, createWorkOrder,
  getMachines, getBomTemplates, MaintenanceWorkOrder,
} from '@/lib/api/machinery';
import { message } from 'antd';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  created: 'default',
  assigned: 'blue',
  in_progress: 'processing',
  on_hold: 'warning',
  completed: 'success',
  closed: 'green',
  cancelled: 'error',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

export default function MaintenanceWorkOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string | undefined>();
  const [machineIdFilter] = useState<number | undefined>(
    searchParams.get('machineId') ? parseInt(searchParams.get('machineId')!) : undefined,
  );
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();

  const { data: stats } = useQuery({ queryKey: ['wo-dashboard'], queryFn: getWorkOrdersDashboard });
  const { data, isFetching } = useQuery({
    queryKey: ['work-orders-list', page, statusFilter, serviceTypeFilter, machineIdFilter],
    queryFn: () => getWorkOrders({ page, limit: 20, status: statusFilter, serviceType: serviceTypeFilter, machineId: machineIdFilter }),
  });
  const { data: machinesData } = useQuery({
    queryKey: ['machines-dropdown'],
    queryFn: () => getMachines({ limit: 200 }),
  });
  const { data: bomTemplates = [] } = useQuery({ queryKey: ['bom-templates'], queryFn: () => getBomTemplates() });

  const createMut = useMutation({
    mutationFn: createWorkOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders-list'] });
      qc.invalidateQueries({ queryKey: ['wo-dashboard'] });
      setCreateModal(false);
      form.resetFields();
      message.success('Work order created');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to create work order'),
  });

  const onFinish = (v: any) => {
    createMut.mutate({
      machineId: v.machine_id,
      title: v.title,
      description: v.description,
      serviceType: v.service_type,
      priority: v.priority,
      bomTemplateId: v.bom_template_id,
      scheduledStart: v.scheduled_start ? v.scheduled_start.toISOString() : undefined,
      scheduledEnd: v.scheduled_end ? v.scheduled_end.toISOString() : undefined,
    });
  };

  const columns = [
    { title: 'WO#', dataIndex: 'work_order_no', width: 120, render: (v: string, r: MaintenanceWorkOrder) => <a onClick={() => router.push(`/maintenance-work-orders/${r.id}`)} className="font-mono text-blue-600">{v}</a> },
    { title: 'Title', dataIndex: 'title', render: (v: string, r: MaintenanceWorkOrder) => <div><div className="font-medium">{v}</div><div className="text-xs text-gray-400">{r.machine?.name}</div></div> },
    { title: 'Type', dataIndex: 'service_type', render: (v: string) => <Tag>{v?.replace('_', ' ').toUpperCase()}</Tag> },
    { title: 'Priority', dataIndex: 'priority', render: (v: string) => <Tag color={PRIORITY_COLORS[v]}>{v?.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v?.replace('_', ' ').toUpperCase()}</Tag> },
    {
      title: 'Technician',
      render: (_: any, r: MaintenanceWorkOrder) =>
        r.assigned_technician ? `${r.assigned_technician.first_name} ${r.assigned_technician.last_name}` : '—',
    },
    { title: 'Scheduled', dataIndex: 'scheduled_start', render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
    {
      title: '',
      width: 60,
      render: (_: any, r: MaintenanceWorkOrder) => (
        <Tooltip title="View Details">
          <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/maintenance-work-orders/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maintenance Work Orders</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>Create Work Order</Button>
      </div>

      <Row gutter={16} className="mb-6">
        {[
          { title: 'Total', value: stats?.total ?? 0, color: '#1677ff' },
          { title: 'Open', value: stats?.open ?? 0, color: '#8c8c8c' },
          { title: 'In Progress', value: stats?.inProgress ?? 0, color: '#1677ff' },
          { title: 'Completed', value: stats?.completed ?? 0, color: '#52c41a' },
          { title: 'Overdue', value: stats?.overdue ?? 0, color: '#ff4d4f', icon: <AlertOutlined /> },
        ].map(s => (
          <Col key={s.title} xs={12} md={4}>
            <Card size="small">
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color }} prefix={s.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      <div className="flex gap-3 mb-4">
        <Select placeholder="Status" allowClear style={{ width: 160 }} onChange={v => { setStatusFilter(v); setPage(1); }}>
          {['created', 'assigned', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled'].map(s => (
            <Option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</Option>
          ))}
        </Select>
        <Select placeholder="Service Type" allowClear style={{ width: 160 }} onChange={v => { setServiceTypeFilter(v); setPage(1); }}>
          {['preventive', 'corrective', 'predictive', 'emergency', 'amc'].map(s => (
            <Option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</Option>
          ))}
        </Select>
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        pagination={{ total: data?.total ?? 0, current: page, pageSize: 20, onChange: setPage, showTotal: t => `${t} work orders` }}
        rowClassName={(r) => {
          const isOverdue = r.scheduled_end && !['completed', 'closed', 'cancelled'].includes(r.status) && dayjs(r.scheduled_end).isBefore(dayjs());
          return isOverdue ? 'bg-red-50' : '';
        }}
      />

      <Modal
        title="Create Maintenance Work Order"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="machine_id" label="Machine" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children">
                  {machinesData?.data?.map((m: any) => (
                    <Option key={m.id} value={m.id}>{m.name} ({m.machine_code})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="service_type" label="Service Type" initialValue="preventive">
                <Select>
                  {['preventive', 'corrective', 'predictive', 'emergency', 'amc'].map(s => (
                    <Option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select>
                  <Option value="critical">Critical</Option>
                  <Option value="high">High</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="low">Low</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduled_start" label="Scheduled Start">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduled_end" label="Scheduled End">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="bom_template_id" label="BOM Template (optional)">
                <Select allowClear showSearch optionFilterProp="children">
                  {bomTemplates.map((t: any) => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

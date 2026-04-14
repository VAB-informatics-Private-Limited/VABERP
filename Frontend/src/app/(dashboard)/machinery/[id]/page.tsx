'use client';

import React, { useState } from 'react';
import {
  Card, Descriptions, Tag, Button, Table, Modal, Form, InputNumber,
  DatePicker, Input, Tabs, Space, Statistic, Row, Col, Timeline,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { getMachine, updateMeterReading } from '@/lib/api/machinery';
import { getWorkOrders } from '@/lib/api/machinery';
import { getDowntimeLogs } from '@/lib/api/machinery';
import { OrganizerContextWidget } from '@/components/organizer/OrganizerContextWidget';
import { message } from 'antd';

const STATUS_COLORS: Record<string, string> = {
  active: 'green', under_maintenance: 'orange', decommissioned: 'red', idle: 'default',
};

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const machineId = parseInt(id);
  const [meterModal, setMeterModal] = useState(false);
  const [meterForm] = Form.useForm();

  const { data: machine, isLoading } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => getMachine(machineId),
    enabled: !!machineId,
  });

  const { data: workOrdersData } = useQuery({
    queryKey: ['work-orders', machineId],
    queryFn: () => getWorkOrders({ machineId, limit: 50 }),
    enabled: !!machineId,
  });

  const { data: downtimeLogs = [] } = useQuery({
    queryKey: ['downtime', machineId],
    queryFn: () => getDowntimeLogs({ machineId }),
    enabled: !!machineId,
  });

  const meterMut = useMutation({
    mutationFn: (dto: any) => updateMeterReading(machineId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machine', machineId] });
      setMeterModal(false);
      meterForm.resetFields();
      message.success('Meter reading recorded');
    },
    onError: () => message.error('Failed to record reading'),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!machine) return <div className="p-6">Machine not found.</div>;

  const woColumns = [
    { title: 'WO#', dataIndex: 'work_order_no', render: (v: string, r: any) => <a onClick={() => router.push(`/maintenance-work-orders/${r.id}`)}>{v}</a> },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Type', dataIndex: 'service_type', render: (v: string) => <Tag>{v?.replace('_', ' ').toUpperCase()}</Tag> },
    { title: 'Priority', dataIndex: 'priority', render: (v: string) => <Tag color={v === 'critical' ? 'red' : v === 'high' ? 'orange' : 'blue'}>{v?.toUpperCase()}</Tag> },
    {
      title: 'Status', dataIndex: 'status',
      render: (v: string) => <Tag color={['completed', 'closed'].includes(v) ? 'green' : v === 'in_progress' ? 'blue' : v === 'cancelled' ? 'red' : 'default'}>{v?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    { title: 'Scheduled', dataIndex: 'scheduled_start', render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
  ];

  const dtColumns = [
    { title: 'Start', dataIndex: 'downtime_start', render: (v: string) => dayjs(v).format('DD MMM YYYY HH:mm') },
    { title: 'End', dataIndex: 'downtime_end', render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY HH:mm') : 'Ongoing' },
    { title: 'Duration', dataIndex: 'duration_minutes', render: (v?: number) => v ? `${Math.floor(v / 60)}h ${v % 60}m` : '—' },
    { title: 'Reason', dataIndex: 'reason_code', render: (v: string) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    { title: 'Impact', dataIndex: 'impact', render: (v: string) => <Tag color={v === 'full_stop' ? 'red' : v === 'partial' ? 'orange' : 'green'}>{v?.replace('_', ' ').toUpperCase()}</Tag> },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/machinery')}>Back</Button>
        <h1 className="text-xl font-bold">{machine.name}</h1>
        <Tag color="blue" className="font-mono">{machine.machine_code}</Tag>
        <Tag color={STATUS_COLORS[machine.status]}>{machine.status?.replace('_', ' ').toUpperCase()}</Tag>
      </div>

      <Row gutter={16} className="mb-6">
        <Col xs={12} md={6}>
          <Card><Statistic title="Current Meter" value={machine.current_meter_reading.toLocaleString()} suffix={machine.meter_unit} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Criticality" value={machine.criticality?.toUpperCase()} valueStyle={{ color: machine.criticality === 'critical' ? 'red' : machine.criticality === 'high' ? 'orange' : 'inherit' }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Work Orders" value={workOrdersData?.total ?? 0} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Total Downtime" value={downtimeLogs.reduce((s: number, d: any) => s + (d.duration_minutes ?? 0), 0)} suffix="min" /></Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'info',
            label: 'Details',
            children: (
              <Card extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setMeterModal(true)}>Log Meter Reading</Button>}>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Machine Code">{machine.machine_code}</Descriptions.Item>
                  <Descriptions.Item label="Category">{machine.category?.name ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Manufacturer">{machine.manufacturer ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Model Number">{machine.model_number ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Serial Number">{machine.serial_number ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Purchase Date">{machine.purchase_date ? dayjs(machine.purchase_date).format('DD MMM YYYY') : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Installation Date">{machine.installation_date ? dayjs(machine.installation_date).format('DD MMM YYYY') : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Warranty Expiry">{machine.warranty_expiry ? dayjs(machine.warranty_expiry).format('DD MMM YYYY') : '—'}</Descriptions.Item>
                  <Descriptions.Item label="Location">{machine.location ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Meter Unit">{machine.meter_unit}</Descriptions.Item>
                  <Descriptions.Item label="Current Reading">{machine.current_meter_reading.toLocaleString()} {machine.meter_unit}</Descriptions.Item>
                  {machine.notes && <Descriptions.Item label="Notes" span={2}>{machine.notes}</Descriptions.Item>}
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'organizer',
            label: 'Organizer',
            children: (
              <OrganizerContextWidget
                entityType="machine"
                entityId={machineId}
                entityLabel={machine.name}
              />
            ),
          },
          {
            key: 'work-orders',
            label: `Work Orders (${workOrdersData?.total ?? 0})`,
            children: (
              <Card extra={<Button type="primary" size="small" onClick={() => router.push(`/maintenance-work-orders?machineId=${machine.id}`)}>View All</Button>}>
                <Table dataSource={workOrdersData?.data ?? []} columns={woColumns} rowKey="id" pagination={false} size="small" />
              </Card>
            ),
          },
          {
            key: 'downtime',
            label: `Downtime (${downtimeLogs.length})`,
            children: (
              <Card>
                <Table dataSource={downtimeLogs} columns={dtColumns} rowKey="id" pagination={false} size="small" />
              </Card>
            ),
          },
        ]}
      />

      {/* Meter Reading Modal */}
      <Modal
        title="Log Meter Reading"
        open={meterModal}
        onCancel={() => { setMeterModal(false); meterForm.resetFields(); }}
        onOk={() => meterForm.submit()}
        confirmLoading={meterMut.isPending}
      >
        <Form form={meterForm} layout="vertical" onFinish={v => meterMut.mutate({
          readingValue: v.reading_value,
          readingDate: v.reading_date.format('YYYY-MM-DD'),
          notes: v.notes,
        })}>
          <Form.Item name="reading_value" label={`Reading Value (${machine.meter_unit})`} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="reading_date" label="Reading Date" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

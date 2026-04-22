'use client';

import React, { useState } from 'react';
import {
  Table, Button, Select, Tag, Modal, Form, Input, DatePicker,
  Space, Card, Row, Col, Statistic, InputNumber, Tabs, Tooltip,
} from 'antd';
import { PlusOutlined, BellOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getReminderRules, getReminders, getRemindersDueCount,
  createReminderRule, updateReminderRule, deleteReminderRule,
  snoozeReminder, cancelReminder,
  getMachines, getBomTemplates, getMaintenanceVendors,
  ReminderRule, MaintenanceReminder,
} from '@/lib/api/machinery';
import { message } from 'antd';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  pending: 'blue',
  overdue: 'red',
  snoozed: 'orange',
  work_order_created: 'green',
  cancelled: 'default',
};

export default function MaintenanceRemindersPage() {
  const qc = useQueryClient();
  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [snoozeModal, setSnoozeModal] = useState<MaintenanceReminder | null>(null);
  const [ruleForm] = Form.useForm();
  const [snoozeForm] = Form.useForm();
  const [triggerType, setTriggerType] = useState('time_based');

  const { data: counts, isLoading: countsLoading } = useQuery({ queryKey: ['reminders-due-count'], queryFn: getRemindersDueCount });
  const { data: rules = [] } = useQuery({ queryKey: ['reminder-rules'], queryFn: () => getReminderRules() });
  const { data: reminders = [] } = useQuery({ queryKey: ['reminders'], queryFn: () => getReminders() });
  const { data: machinesData } = useQuery({ queryKey: ['machines-dropdown'], queryFn: () => getMachines({ limit: 200 }) });
  const { data: bomTemplates = [] } = useQuery({ queryKey: ['bom-templates'], queryFn: () => getBomTemplates() });
  const { data: vendorsData } = useQuery({ queryKey: ['vendors-dropdown'], queryFn: () => getMaintenanceVendors({ limit: 200 }) });

  const createRuleMut = useMutation({
    mutationFn: createReminderRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminder-rules'] }); qc.invalidateQueries({ queryKey: ['reminders'] }); setRuleModal(false); ruleForm.resetFields(); message.success('Reminder rule created'); },
    onError: () => message.error('Failed to create rule'),
  });

  const updateRuleMut = useMutation({
    mutationFn: ({ id, dto }: any) => updateReminderRule(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminder-rules'] }); setRuleModal(false); setEditingRule(null); ruleForm.resetFields(); message.success('Rule updated'); },
    onError: () => message.error('Failed to update rule'),
  });

  const deleteRuleMut = useMutation({
    mutationFn: deleteReminderRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminder-rules'] }); message.success('Rule deleted'); },
    onError: () => message.error('Failed to delete rule'),
  });

  const snoozeMut = useMutation({
    mutationFn: ({ id, until }: { id: number; until: string }) => snoozeReminder(id, until),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); qc.invalidateQueries({ queryKey: ['reminders-due-count'] }); setSnoozeModal(null); snoozeForm.resetFields(); message.success('Reminder snoozed'); },
    onError: () => message.error('Failed to snooze'),
  });

  const cancelMut = useMutation({
    mutationFn: cancelReminder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminders'] }); qc.invalidateQueries({ queryKey: ['reminders-due-count'] }); message.success('Reminder cancelled'); },
    onError: () => message.error('Failed to cancel'),
  });

  const openCreate = () => { setEditingRule(null); ruleForm.resetFields(); setTriggerType('time_based'); setRuleModal(true); };
  const openEdit = (r: ReminderRule) => {
    setEditingRule(r);
    setTriggerType(r.trigger_type);
    ruleForm.setFieldsValue({ ...r, machine_id: r.machine_id, category_id: r.category_id, bom_template_id: r.bom_template_id, preferred_vendor_id: r.preferred_vendor_id });
    setRuleModal(true);
  };

  const onRuleSubmit = (v: any) => {
    const dto = {
      name: v.name, machineId: v.machine_id, categoryId: v.category_id,
      triggerType: v.trigger_type, intervalDays: v.interval_days, intervalUnits: v.interval_units,
      advanceNoticeDays: v.advance_notice_days, priority: v.priority, isRecurring: v.is_recurring,
      bomTemplateId: v.bom_template_id, preferredVendorId: v.preferred_vendor_id,
      overdueNotifyAfterDays: v.overdue_notify_after_days, status: v.status,
    };
    if (editingRule) updateRuleMut.mutate({ id: editingRule.id, dto });
    else createRuleMut.mutate(dto);
  };

  const ruleColumns = [
    { title: 'Name', dataIndex: 'name', render: (v: string, r: ReminderRule) => <div><div className="font-medium">{v}</div><div className="text-xs text-gray-400">{r.machine?.name ?? 'All machines'}</div></div> },
    { title: 'Trigger', dataIndex: 'trigger_type', render: (v: string) => <Tag>{v?.replace('_', ' ').toUpperCase()}</Tag> },
    { title: 'Interval', render: (_: any, r: ReminderRule) => r.interval_days ? `${r.interval_days} days` : r.interval_units ? `${r.interval_units} units` : '—' },
    { title: 'Priority', dataIndex: 'priority', render: (v: string) => <Tag color={v === 'critical' ? 'red' : v === 'high' ? 'orange' : v === 'medium' ? 'blue' : 'default'}>{v?.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : v === 'paused' ? 'orange' : 'default'}>{v?.toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 100,
      render: (_: any, r: ReminderRule) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="small" danger onClick={() => Modal.confirm({ title: 'Delete rule?', onOk: () => deleteRuleMut.mutate(r.id) })}>Del</Button>
        </Space>
      ),
    },
  ];

  const reminderColumns = [
    { title: 'Machine', render: (_: any, r: MaintenanceReminder) => r.machine?.name ?? `Machine #${r.machine_id}` },
    { title: 'Rule', render: (_: any, r: MaintenanceReminder) => r.rule?.name ?? `Rule #${r.rule_id}` },
    { title: 'Due Date', dataIndex: 'due_date', render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
    {
      title: 'Status', dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    { title: 'Snoozed Until', dataIndex: 'snooze_until', render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
    {
      title: 'Actions', width: 160,
      render: (_: any, r: MaintenanceReminder) => r.status === 'pending' || r.status === 'overdue' ? (
        <Space size="small">
          <Button size="small" onClick={() => { setSnoozeModal(r); }}>Snooze</Button>
          <Button size="small" danger onClick={() => cancelMut.mutate(r.id)}>Cancel</Button>
        </Space>
      ) : null,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maintenance Reminders</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Reminder Rule</Button>
      </div>

      <Row gutter={16} className="mb-6">
        <Col xs={12} md={6}>
          <Card><Statistic title="Pending Reminders" value={counts?.due ?? 0} prefix={<BellOutlined />} valueStyle={{ color: '#1677ff' }} loading={countsLoading} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Overdue" value={counts?.overdue ?? 0} prefix={<WarningOutlined />} valueStyle={{ color: '#ff4d4f' }} loading={countsLoading} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Active Rules" value={rules.filter((r: ReminderRule) => r.status === 'active').length} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'reminders',
            label: `Upcoming Reminders (${reminders.length})`,
            children: <Table dataSource={reminders} columns={reminderColumns} rowKey="id" pagination={{ pageSize: 20 }} size="small"
              rowClassName={(r: MaintenanceReminder) => r.status === 'overdue' ? 'bg-red-50' : ''} />,
          },
          {
            key: 'rules',
            label: `Rules (${rules.length})`,
            children: <Table dataSource={rules} columns={ruleColumns} rowKey="id" pagination={false} size="small" />,
          },
        ]}
      />

      {/* Rule Modal */}
      <Modal
        title={editingRule ? 'Edit Reminder Rule' : 'New Reminder Rule'}
        open={ruleModal}
        onCancel={() => { setRuleModal(false); setEditingRule(null); ruleForm.resetFields(); }}
        onOk={() => ruleForm.submit()}
        confirmLoading={createRuleMut.isPending || updateRuleMut.isPending}
        width={620}
      >
        <Form form={ruleForm} layout="vertical" onFinish={onRuleSubmit}>
          <Row gutter={16}>
            <Col span={24}><Form.Item name="name" label="Rule Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="machine_id" label="Machine (leave blank for category or all)">
                <Select allowClear showSearch optionFilterProp="children">
                  {machinesData?.data?.map((m: any) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trigger_type" label="Trigger Type" initialValue="time_based">
                <Select onChange={v => setTriggerType(v)}>
                  <Option value="time_based">Time Based</Option>
                  <Option value="usage_based">Usage Based</Option>
                  <Option value="both">Both</Option>
                </Select>
              </Form.Item>
            </Col>
            {(triggerType === 'time_based' || triggerType === 'both') && (
              <Col span={12}><Form.Item name="interval_days" label="Interval (days)" rules={[{ required: triggerType === 'time_based' }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            )}
            {(triggerType === 'usage_based' || triggerType === 'both') && (
              <Col span={12}><Form.Item name="interval_units" label="Interval (units)" rules={[{ required: triggerType === 'usage_based' }]}><InputNumber style={{ width: '100%' }} min={0.1} /></Form.Item></Col>
            )}
            <Col span={12}><Form.Item name="advance_notice_days" label="Advance Notice (days)" initialValue={7}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select><Option value="critical">Critical</Option><Option value="high">High</Option><Option value="medium">Medium</Option><Option value="low">Low</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bom_template_id" label="BOM Template">
                <Select allowClear showSearch optionFilterProp="children">
                  {bomTemplates.map((t: any) => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select><Option value="active">Active</Option><Option value="paused">Paused</Option></Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Snooze Modal */}
      <Modal
        title="Snooze Reminder"
        open={!!snoozeModal}
        onCancel={() => { setSnoozeModal(null); snoozeForm.resetFields(); }}
        onOk={() => snoozeForm.submit()}
        confirmLoading={snoozeMut.isPending}
      >
        <Form form={snoozeForm} layout="vertical" onFinish={v => snoozeMut.mutate({ id: snoozeModal!.id, until: v.until.format('YYYY-MM-DD') })}>
          <p className="mb-3 text-gray-600">Snooze until a specific date:</p>
          <Form.Item name="until" label="Snooze Until" rules={[{ required: true }]} initialValue={dayjs().add(7, 'day')}>
            <DatePicker style={{ width: '100%' }} disabledDate={d => d.isBefore(dayjs())} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

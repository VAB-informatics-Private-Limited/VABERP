'use client';

import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, DatePicker,
  Space, Tooltip, Statistic, Row, Col, Card, Tabs, Result,
  ColorPicker, Popconfirm,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, ClockCircleOutlined,
  EditOutlined, DeleteOutlined, CalendarOutlined,
  BellOutlined, SyncOutlined, TeamOutlined, LockOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import {
  getOrganizerItems, getOrganizerDashboard, createOrganizerItem,
  updateOrganizerItem, deleteOrganizerItem, completeOrganizerItem,
  snoozeOrganizerItem, getOrganizerTags, createOrganizerTag, deleteOrganizerTag,
  OrganizerItem, OrganizerTagMaster,
} from '@/lib/api/organizer';
import { message } from 'antd';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TYPE_COLORS: Record<string, string> = {
  task: 'blue',
  reminder: 'purple',
  follow_up: 'orange',
  recurring: 'cyan',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  task: <CheckOutlined />,
  reminder: <BellOutlined />,
  follow_up: <TeamOutlined />,
  recurring: <SyncOutlined />,
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};
const STATUS_COLORS: Record<string, string> = {
  open: 'blue',
  in_progress: 'processing',
  done: 'success',
  snoozed: 'warning',
  cancelled: 'default',
};

const TAG_COLOR_OPTIONS = [
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
  { label: 'Red', value: 'red' },
  { label: 'Purple', value: 'purple' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Gold', value: 'gold' },
  { label: 'Magenta', value: 'magenta' },
  { label: 'Lime', value: 'lime' },
  { label: 'Geekblue', value: 'geekblue' },
];

export default function OrganizerPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canView   = userType === 'enterprise' || hasPermission('organizer', 'items', 'view');
  const canCreate = userType === 'enterprise' || hasPermission('organizer', 'items', 'create');
  const canEdit   = userType === 'enterprise' || hasPermission('organizer', 'items', 'edit');
  const canDelete = userType === 'enterprise' || hasPermission('organizer', 'items', 'delete');

  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Modals
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OrganizerItem | null>(null);
  const [snoozeModal, setSnoozeModal] = useState(false);
  const [snoozingItem, setSnoozingItem] = useState<OrganizerItem | null>(null);
  const [snoozeDate, setSnoozeDate] = useState<dayjs.Dayjs | null>(null);
  const [tagModal, setTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');
  const [form] = Form.useForm();
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [remindMode, setRemindMode] = useState<string>('none');

  const typeFilter = activeTab !== 'all' ? activeTab : undefined;

  const filters = {
    ...(typeFilter && { type: typeFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
    ...(dateRange && { dueAfter: dateRange[0].toISOString(), dueBefore: dateRange[1].toISOString() }),
    page,
    limit: 30,
  };

  const { data, isFetching } = useQuery({
    queryKey: ['organizer-items', filters],
    queryFn: () => getOrganizerItems(filters),
  });

  const { data: dash } = useQuery({
    queryKey: ['organizer-dashboard'],
    queryFn: getOrganizerDashboard,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['organizer-tags'],
    queryFn: getOrganizerTags,
  });

  const createMut = useMutation({
    mutationFn: createOrganizerItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer-items'] });
      qc.invalidateQueries({ queryKey: ['organizer-dashboard'] });
      setItemModal(false); form.resetFields(); setShowRecurrence(false); setRemindMode('none');
      message.success('Item created');
    },
    onError: () => message.error('Failed to create item'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => updateOrganizerItem(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer-items'] });
      setItemModal(false); setEditingItem(null); form.resetFields(); setShowRecurrence(false); setRemindMode('none');
      message.success('Item updated');
    },
    onError: () => message.error('Failed to update item'),
  });

  const completeMut = useMutation({
    mutationFn: completeOrganizerItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-items'] }); qc.invalidateQueries({ queryKey: ['organizer-dashboard'] }); message.success('Marked as done'); },
    onError: () => message.error('Failed to complete'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteOrganizerItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-items'] }); qc.invalidateQueries({ queryKey: ['organizer-dashboard'] }); message.success('Item removed'); },
    onError: () => message.error('Failed to delete'),
  });

  const snoozeMut = useMutation({
    mutationFn: ({ id, snoozeUntil }: { id: number; snoozeUntil: string }) => snoozeOrganizerItem(id, snoozeUntil),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-items'] }); setSnoozeModal(false); setSnoozingItem(null); setSnoozeDate(null); message.success('Snoozed'); },
    onError: () => message.error('Failed to snooze'),
  });

  const createTagMut = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createOrganizerTag(name, color),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-tags'] }); setNewTagName(''); message.success('Tag created'); },
    onError: () => message.error('Failed to create tag'),
  });

  const deleteTagMut = useMutation({
    mutationFn: deleteOrganizerTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizer-tags'] }); message.success('Tag deleted'); },
    onError: () => message.error('Failed to delete tag'),
  });

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldValue('type', activeTab !== 'all' ? activeTab : 'task');
    form.setFieldValue('priority', 'medium');
    setShowRecurrence(false);
    setRemindMode('none');
    setItemModal(true);
  };

  const openEdit = (item: OrganizerItem) => {
    setEditingItem(item);
    // Determine remind mode from existing remindAt vs dueDate
    let mode = 'none';
    if (item.remind_at && item.due_date) {
      const diff = dayjs(item.due_date).diff(dayjs(item.remind_at), 'hour');
      if (diff >= 23 && diff <= 25) mode = '24h';
      else if (diff >= 47 && diff <= 49) mode = '48h';
      else if (diff >= 167 && diff <= 169) mode = '1week';
      else mode = 'custom';
    } else if (item.remind_at) {
      mode = 'custom';
    }
    setRemindMode(mode);
    form.setFieldsValue({
      type: item.type,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: item.status,
      due_date: item.due_date ? dayjs(item.due_date) : undefined,
      remind_at: (mode === 'custom' && item.remind_at) ? dayjs(item.remind_at) : undefined,
      remind_before: mode !== 'custom' ? mode : undefined,
      notes: item.notes,
      tags: item.tags,
    });
    setShowRecurrence(item.type === 'recurring');
    setItemModal(true);
  };

  const onSubmit = (values: any) => {
    // Calculate remindAt from remind_before or custom picker
    let remindAt: string | undefined;
    if (values.remind_before && values.remind_before !== 'none' && values.remind_before !== 'custom') {
      const hoursMap: Record<string, number> = { '24h': 24, '48h': 48, '1week': 168 };
      const h = hoursMap[values.remind_before];
      if (h && values.due_date) {
        remindAt = dayjs(values.due_date).subtract(h, 'hour').toISOString();
      }
    } else if (values.remind_before === 'custom' && values.remind_at) {
      remindAt = values.remind_at.toISOString();
    }

    const dto: any = {
      type: values.type,
      title: values.title,
      description: values.description,
      priority: values.priority,
      dueDate: values.due_date ? values.due_date.toISOString() : undefined,
      remindAt,
      notes: values.notes,
      tags: values.tags ?? [],
    };
    if (values.type === 'recurring' && values.recurrence_frequency) {
      dto.recurrence = {
        frequency: values.recurrence_frequency,
        intervalDays: values.interval_days,
        endDate: values.recurrence_end_date ? values.recurrence_end_date.format('YYYY-MM-DD') : undefined,
        maxOccurrences: values.max_occurrences,
      };
    }
    if (editingItem) {
      updateMut.mutate({ id: editingItem.id, dto });
    } else {
      createMut.mutate(dto);
    }
  };

  const isOverdue = (item: OrganizerItem) =>
    item.due_date && dayjs(item.due_date).isBefore(dayjs()) && !['done', 'cancelled'].includes(item.status);

  const columns = [
    {
      title: '#', dataIndex: 'item_number', width: 130,
      render: (v: string) => <span className="font-mono text-xs text-gray-500">{v}</span>,
    },
    {
      title: 'Title',
      render: (_: any, r: OrganizerItem) => (
        <div>
          <a className="font-medium" onClick={() => router.push(`/organizer/${r.id}`)}>{r.title}</a>
          {r.tags && r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {r.tags.map((t) => {
                const tagDef = tags.find((td: OrganizerTagMaster) => td.name === t);
                return <Tag key={t} color={tagDef?.color ?? 'blue'} className="text-xs">{t}</Tag>;
              })}
            </div>
          )}
          {r.context_links && r.context_links.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {r.context_links.slice(0, 3).map((l) => (
                <Tag key={l.id} className="text-xs" color="geekblue">{l.entity_type}: {l.label || `#${l.entity_id}`}</Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type', dataIndex: 'type', width: 110,
      render: (v: string) => (
        <Tag color={TYPE_COLORS[v] ?? 'default'} icon={TYPE_ICONS[v]}>
          {v?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Priority', dataIndex: 'priority', width: 90,
      render: (v: string) => <Tag color={PRIORITY_COLORS[v]}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: 'Due Date', dataIndex: 'due_date', width: 130,
      render: (v?: string, r?: OrganizerItem) => {
        if (!v) return <span className="text-gray-400">—</span>;
        const overdue = r && isOverdue(r);
        return <span className={overdue ? 'text-red-500 font-medium' : ''}>{dayjs(v).format('DD MMM YYYY')}</span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', width: 110,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', width: 130,
      render: (_: any, r: OrganizerItem) => (
        <Space size={4}>
          {canEdit && !['done', 'cancelled'].includes(r.status) && (
            <Tooltip title="Mark Done">
              <Button size="small" type="primary" ghost icon={<CheckOutlined />}
                onClick={() => Modal.confirm({ title: 'Mark as done?', onOk: () => completeMut.mutate(r.id) })} />
            </Tooltip>
          )}
          {canEdit && !['done', 'cancelled'].includes(r.status) && (
            <Tooltip title="Snooze">
              <Button size="small" icon={<ClockCircleOutlined />}
                onClick={() => { setSnoozingItem(r); setSnoozeDate(dayjs().add(1, 'day')); setSnoozeModal(true); }} />
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />}
                onClick={() => Modal.confirm({ title: 'Remove this item?', onOk: () => deleteMut.mutate(r.id) })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: `All (${data?.total ?? 0})` },
    { key: 'task', label: <span><CheckOutlined /> Tasks</span> },
    { key: 'reminder', label: <span><BellOutlined /> Reminders</span> },
    { key: 'follow_up', label: <span><TeamOutlined /> Follow-ups</span> },
    { key: 'recurring', label: <span><SyncOutlined /> Recurring</span> },
  ];

  if (!canView) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to access the Organizer." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarOutlined /> Organizer
        </h1>
        <Space>
          {canCreate && (
            <Button icon={<TagsOutlined />} onClick={() => setTagModal(true)}>
              Manage Tags
            </Button>
          )}
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Item</Button>}
        </Space>
      </div>

      {/* KPI Bar */}
      <Row gutter={16} className="mb-6">
        {[
          { title: 'Open Tasks', value: dash?.open_tasks ?? 0, color: '#1677ff' },
          { title: 'Due Today', value: dash?.due_today ?? 0, color: '#faad14' },
          { title: 'Overdue', value: dash?.overdue ?? 0, color: '#ff4d4f' },
          { title: 'Follow-ups Pending', value: dash?.follow_ups_pending ?? 0, color: '#fa8c16' },
        ].map((s) => (
          <Col key={s.title} xs={12} md={6}>
            <Card size="small">
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontSize: 24 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Search placeholder="Search title..." allowClear style={{ width: 260 }}
          onSearch={(v) => { setSearch(v); setPage(1); }} />
        <Select placeholder="Status" allowClear style={{ width: 140 }}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <Option value="open">Open</Option>
          <Option value="in_progress">In Progress</Option>
          <Option value="done">Done</Option>
          <Option value="snoozed">Snoozed</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
        <Select placeholder="Priority" allowClear style={{ width: 130 }}
          onChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <Option value="low">Low</Option>
          <Option value="medium">Medium</Option>
          <Option value="high">High</Option>
          <Option value="critical">Critical</Option>
        </Select>
        <RangePicker placeholder={['Due From', 'Due To']}
          onChange={(v) => { setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null); setPage(1); }} />
      </div>

      {/* Tabs + Table */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setPage(1); }}
        items={tabItems}
      />
      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        size="small"
        pagination={{
          total: data?.total ?? 0,
          current: page,
          pageSize: 30,
          onChange: setPage,
          showTotal: (t) => `${t} items`,
        }}
        onRow={(r) => ({
          onClick: (e) => { if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return; router.push(`/organizer/${r.id}`); },
          style: { cursor: 'pointer' },
        })}
      />

      {/* ─── Create / Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        title={editingItem ? 'Edit Item' : 'New Organizer Item'}
        open={itemModal}
        onCancel={() => { setItemModal(false); setEditingItem(null); form.resetFields(); setShowRecurrence(false); setRemindMode('none'); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]} initialValue="task">
                <Select onChange={(v) => setShowRecurrence(v === 'recurring')}>
                  <Option value="task"><CheckOutlined /> Task</Option>
                  <Option value="reminder"><BellOutlined /> Reminder</Option>
                  <Option value="follow_up"><TeamOutlined /> Follow-up</Option>
                  <Option value="recurring"><SyncOutlined /> Recurring</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input placeholder="What needs to be done?" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remind_before" label="Remind Before Due" initialValue="none">
                <Select onChange={(v) => setRemindMode(v)}>
                  <Option value="none">No Reminder</Option>
                  <Option value="24h">24 Hours Before</Option>
                  <Option value="48h">48 Hours Before</Option>
                  <Option value="1week">1 Week Before</Option>
                  <Option value="custom">Custom Date & Time</Option>
                </Select>
              </Form.Item>
            </Col>
            {remindMode === 'custom' && (
              <Col span={12}>
                <Form.Item name="remind_at" label="Reminder Date & Time">
                  <DatePicker showTime style={{ width: '100%' }} placeholder="Pick reminder time" />
                </Form.Item>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="tags" label="Tags">
                <Select
                  mode="tags"
                  placeholder="Select or type tags..."
                  tokenSeparators={[',']}
                >
                  {tags.map((t: OrganizerTagMaster) => (
                    <Option key={t.name} value={t.name}>
                      <Tag color={t.color}>{t.name}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>

            {/* Recurrence section */}
            {showRecurrence && (
              <>
                <Col span={24}><div className="text-sm font-medium text-gray-600 mb-2 mt-1">Recurrence Settings</div></Col>
                <Col span={12}>
                  <Form.Item name="recurrence_frequency" label="Frequency">
                    <Select placeholder="Select frequency">
                      <Option value="daily">Daily</Option>
                      <Option value="weekly">Weekly</Option>
                      <Option value="monthly">Monthly</Option>
                      <Option value="custom">Custom (every N days)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="interval_days" label="Interval (days)">
                    <Input type="number" min={1} placeholder="e.g. 14" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="recurrence_end_date" label="End Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="max_occurrences" label="Max Occurrences">
                    <Input type="number" min={1} placeholder="Optional" />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        </Form>
      </Modal>

      {/* ─── Snooze Modal ────────────────────────────────────────────────────── */}
      <Modal
        title={`Snooze: ${snoozingItem?.title ?? ''}`}
        open={snoozeModal}
        onCancel={() => { setSnoozeModal(false); setSnoozingItem(null); setSnoozeDate(null); }}
        onOk={() => {
          if (!snoozingItem || !snoozeDate) return;
          snoozeMut.mutate({ id: snoozingItem.id, snoozeUntil: snoozeDate.toISOString() });
        }}
        confirmLoading={snoozeMut.isPending}
      >
        <p className="mb-3 text-gray-600">Snooze this item until:</p>
        <DatePicker
          showTime
          value={snoozeDate}
          onChange={(v) => setSnoozeDate(v)}
          style={{ width: '100%' }}
          disabledDate={(d) => d.isBefore(dayjs(), 'day')}
        />
      </Modal>

      {/* ─── Manage Tags Modal ───────────────────────────────────────────────── */}
      <Modal
        title={<span><TagsOutlined /> Manage Tags</span>}
        open={tagModal}
        onCancel={() => setTagModal(false)}
        footer={null}
        width={480}
      >
        {/* Existing tags */}
        <div className="mb-4">
          {tags.length === 0 && <p className="text-gray-400 text-sm">No tags yet. Add your first tag below.</p>}
          <div className="flex flex-wrap gap-2">
            {tags.map((t: OrganizerTagMaster) => (
              <div key={t.id} className="flex items-center gap-1">
                <Tag color={t.color} style={{ marginRight: 0 }}>{t.name}</Tag>
                {canDelete && (
                  <Popconfirm title="Delete this tag?" onConfirm={() => deleteTagMut.mutate(t.id)} okText="Yes" cancelText="No">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add new tag */}
        {canCreate && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-3">Add New Tag</div>
            <Row gutter={8} align="middle">
              <Col flex="auto">
                <Input
                  placeholder="Tag name (e.g. Urgent, Sales, Client-A)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onPressEnter={() => {
                    if (newTagName.trim()) createTagMut.mutate({ name: newTagName.trim(), color: newTagColor });
                  }}
                />
              </Col>
              <Col>
                <Select value={newTagColor} onChange={setNewTagColor} style={{ width: 110 }}>
                  {TAG_COLOR_OPTIONS.map((c) => (
                    <Option key={c.value} value={c.value}>
                      <Tag color={c.value}>{c.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={createTagMut.isPending}
                  onClick={() => {
                    if (newTagName.trim()) createTagMut.mutate({ name: newTagName.trim(), color: newTagColor });
                  }}
                >
                  Add
                </Button>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}

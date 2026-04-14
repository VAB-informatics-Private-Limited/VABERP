'use client';
import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, InputNumber,
  DatePicker, Space, Card, Row, Col, Statistic, Tooltip, Tabs, Badge, Result,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined,
  ExclamationCircleOutlined, StopOutlined, LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import {
  getWasteInventory, getWasteCategories, getWasteSources, getWasteDashboard,
  createWasteInventory, updateWasteInventory, quarantineWaste, writeOffWaste,
  createWasteCategory, createWasteSource,
  WasteInventoryItem, WasteCategory,
} from '@/lib/api/waste';
import { message } from 'antd';

const { Search } = Input;
const { Option } = Select;

const STATUS_COLOR: Record<string, string> = {
  available: 'green', partially_disposed: 'blue', fully_disposed: 'default',
  reserved: 'orange', expired: 'red', quarantined: 'purple',
};

const CLASS_COLOR: Record<string, string> = {
  recyclable: 'green', hazardous: 'red', general: 'default', 'e-waste': 'orange', organic: 'cyan',
};

export default function WasteInventoryPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('waste_management', 'waste_inventory', 'view');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [categoryFilter, setCategoryFilter] = useState<number>();
  const [classFilter, setClassFilter] = useState<string>();
  const [inventoryModal, setInventoryModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [sourceModal, setSourceModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WasteInventoryItem | null>(null);
  const [invForm] = Form.useForm();
  const [catForm] = Form.useForm();
  const [srcForm] = Form.useForm();

  const { data: stats } = useQuery({ queryKey: ['waste-dashboard'], queryFn: getWasteDashboard });
  const { data: categories = [] } = useQuery({ queryKey: ['waste-categories'], queryFn: getWasteCategories });
  const { data: sources = [] } = useQuery({ queryKey: ['waste-sources'], queryFn: getWasteSources });
  const { data, isFetching } = useQuery({
    queryKey: ['waste-inventory', page, search, statusFilter, categoryFilter, classFilter],
    queryFn: () => getWasteInventory({ page, limit: 20, search: search || undefined, status: statusFilter, categoryId: categoryFilter, classification: classFilter }),
  });

  const createMut = useMutation({
    mutationFn: createWasteInventory,
    onSuccess: (res) => {
      if (res.duplicate) { message.warning(`Possible duplicate: batch ${res.existing?.batch_no} already exists. Pass force:true to create anyway.`); return; }
      qc.invalidateQueries({ queryKey: ['waste-inventory'] }); qc.invalidateQueries({ queryKey: ['waste-dashboard'] });
      setInventoryModal(false); invForm.resetFields(); message.success('Waste entry created');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => updateWasteInventory(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-inventory'] }); setInventoryModal(false); setEditingItem(null); invForm.resetFields(); message.success('Updated'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to update'),
  });

  const quarantineMut = useMutation({
    mutationFn: ({ id, notes }: any) => quarantineWaste(id, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-inventory'] }); message.success('Batch quarantined'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const writeOffMut = useMutation({
    mutationFn: ({ id, notes }: any) => writeOffWaste(id, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-inventory'] }); qc.invalidateQueries({ queryKey: ['waste-dashboard'] }); message.success('Written off'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const createCatMut = useMutation({
    mutationFn: createWasteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-categories'] }); setCategoryModal(false); catForm.resetFields(); message.success('Category created'); },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed'),
  });

  const createSrcMut = useMutation({
    mutationFn: createWasteSource,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waste-sources'] }); setSourceModal(false); srcForm.resetFields(); message.success('Source created'); },
    onError: () => message.error('Failed'),
  });

  const openCreate = () => { setEditingItem(null); invForm.resetFields(); setInventoryModal(true); };
  const openEdit = (item: WasteInventoryItem) => {
    setEditingItem(item);
    invForm.setFieldsValue({ ...item, storage_date: item.storage_date ? dayjs(item.storage_date) : undefined });
    setInventoryModal(true);
  };

  const onInvSubmit = (v: any) => {
    const dto = {
      categoryId: v.category_id, sourceId: v.source_id,
      quantityGenerated: v.quantity_generated,
      unit: v.unit, storageLocation: v.storage_location,
      storageDate: v.storage_date?.format('YYYY-MM-DD'),
      manifestNumber: v.manifest_number, hazardLevel: v.hazard_level,
      estimatedValue: v.estimated_value, notes: v.notes,
    };
    if (editingItem) updateMut.mutate({ id: editingItem.id, dto });
    else createMut.mutate(dto);
  };

  const columns = [
    { title: 'Batch No', dataIndex: 'batch_no', render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
    {
      title: 'Category',
      render: (_: any, r: WasteInventoryItem) => (
        <div>
          <div className="font-medium">{r.category?.name ?? '—'}</div>
          <Tag color={CLASS_COLOR[r.category?.classification ?? '']} className="text-xs">{r.category?.classification}</Tag>
        </div>
      ),
    },
    { title: 'Source', render: (_: any, r: WasteInventoryItem) => r.source?.name ?? '—' },
    {
      title: 'Quantity',
      render: (_: any, r: WasteInventoryItem) => (
        <div>
          <div className="font-medium">{Number(r.quantity_available).toLocaleString()} {r.unit}</div>
          <div className="text-xs text-gray-400">of {Number(r.quantity_generated).toLocaleString()} generated</div>
        </div>
      ),
    },
    { title: 'Location', dataIndex: 'storage_location', render: (v?: string) => v ?? '—' },
    { title: 'Stored On', dataIndex: 'storage_date', render: (v: string) => dayjs(v).format('DD MMM YYYY') },
    {
      title: 'Expiry', dataIndex: 'expiry_alert_date',
      render: (v?: string) => {
        if (!v) return '—';
        const d = dayjs(v);
        const isNear = d.isBefore(dayjs().add(7, 'day'));
        return <span className={isNear ? 'text-red-500 font-medium' : ''}>{d.format('DD MMM YYYY')}{isNear && <WarningOutlined className="ml-1" />}</span>;
      },
    },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 120,
      render: (_: any, r: WasteInventoryItem) => (
        <Space size="small">
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          {r.status !== 'quarantined' && r.status !== 'fully_disposed' && (
            <Tooltip title="Quarantine">
              <Button size="small" icon={<StopOutlined />} onClick={() => Modal.confirm({
                title: 'Quarantine batch?',
                content: <Input.TextArea placeholder="Reason" id="q-notes" />,
                onOk: () => quarantineMut.mutate({ id: r.id, notes: (document.getElementById('q-notes') as HTMLTextAreaElement)?.value }),
              })} />
            </Tooltip>
          )}
          {r.quantity_available > 0 && (
            <Tooltip title="Write Off">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                title: 'Write off this batch?',
                content: 'This will set quantity to 0.',
                onOk: () => writeOffMut.mutate({ id: r.id, notes: 'Manual write-off' }),
              })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Waste Inventory." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Waste Inventory</h1>
        <Space>
          <Button onClick={() => setSourceModal(true)}>+ Source</Button>
          <Button onClick={() => setCategoryModal(true)}>+ Category</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Log Waste</Button>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={16} className="mb-6">
        {[
          { title: 'Available Batches', value: stats?.available ?? 0, color: '#52c41a' },
          { title: 'Total Available Qty', value: `${(stats?.totalAvailableQty ?? 0).toLocaleString()} kg`, color: '#1677ff' },
          { title: 'Reserved', value: stats?.reserved ?? 0, color: '#fa8c16' },
          { title: 'Expiring Soon', value: stats?.expiringSoon ?? 0, color: '#ff4d4f' },
          { title: 'Quarantined', value: stats?.quarantined ?? 0, color: '#722ed1' },
          { title: 'Expired', value: stats?.expired ?? 0, color: '#8c8c8c' },
        ].map(s => (
          <Col key={s.title} xs={12} md={4}>
            <Card size="small"><Statistic title={s.title} value={s.value} valueStyle={{ color: s.color, fontSize: 18 }} /></Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Search placeholder="Search batch, location..." allowClear style={{ width: 260 }} onSearch={v => { setSearch(v); setPage(1); }} />
        <Select placeholder="Status" allowClear style={{ width: 160 }} onChange={v => { setStatusFilter(v); setPage(1); }}>
          {['available','partially_disposed','reserved','expired','quarantined','fully_disposed'].map(s =>
            <Option key={s} value={s}>{s.replace(/_/g,' ').toUpperCase()}</Option>
          )}
        </Select>
        <Select placeholder="Category" allowClear style={{ width: 180 }} onChange={v => { setCategoryFilter(v); setPage(1); }}>
          {categories.map((c: WasteCategory) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
        <Select placeholder="Classification" allowClear style={{ width: 160 }} onChange={v => { setClassFilter(v); setPage(1); }}>
          {['recyclable','hazardous','general','e-waste','organic'].map(c => <Option key={c} value={c}>{c}</Option>)}
        </Select>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isFetching}
        pagination={{ total: data?.total ?? 0, current: page, pageSize: 20, onChange: setPage, showTotal: t => `${t} batches` }} />

      {/* Inventory Modal */}
      <Modal title={editingItem ? 'Edit Waste Entry' : 'Log Waste Entry'} open={inventoryModal} width={640}
        onCancel={() => { setInventoryModal(false); setEditingItem(null); invForm.resetFields(); }}
        onOk={() => invForm.submit()} confirmLoading={createMut.isPending || updateMut.isPending}>
        <Form form={invForm} layout="vertical" onFinish={onInvSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category_id" label="Waste Category" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children">
                  {categories.map((c: WasteCategory) => <Option key={c.id} value={c.id}>{c.name} <Tag color={CLASS_COLOR[c.classification]}>{c.classification}</Tag></Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source_id" label="Source">
                <Select allowClear showSearch optionFilterProp="children">
                  {sources.map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="quantity_generated" label="Quantity" rules={[{ required: !editingItem }]}>
                <InputNumber style={{ width: '100%' }} min={0.001} step={0.1} disabled={!!editingItem} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Unit" initialValue="kg">
                <Select disabled={!!editingItem}>
                  {['kg','litre','tonne','unit','m3'].map(u => <Option key={u} value={u}>{u}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="storage_date" label="Storage Date" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="storage_location" label="Storage Location"><Input placeholder="e.g. Yard-A, Bay-3" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="hazard_level" label="Hazard Level">
                <Select allowClear><Option value="low">Low</Option><Option value="medium">Medium</Option><Option value="high">High</Option><Option value="critical">Critical</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="manifest_number" label="Manifest Number"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="estimated_value" label="Estimated Value (₹)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={24}><Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Category Modal */}
      <Modal title="Add Waste Category" open={categoryModal}
        onCancel={() => { setCategoryModal(false); catForm.resetFields(); }}
        onOk={() => catForm.submit()} confirmLoading={createCatMut.isPending}>
        <Form form={catForm} layout="vertical" onFinish={v => createCatMut.mutate(v)}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="code" label="Code" rules={[{ required: true }]}><Input placeholder="e.g. MTL-SCR" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="classification" label="Classification" initialValue="general">
                <Select>{['recyclable','hazardous','general','e-waste','organic'].map(c => <Option key={c} value={c}>{c}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Default Unit" initialValue="kg">
                <Select>{['kg','litre','tonne','unit','m3'].map(u => <Option key={u} value={u}>{u}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="max_storage_days" label="Max Storage Days"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="requires_manifest" label="Requires Manifest?" initialValue={false}>
                <Select><Option value={false}>No</Option><Option value={true}>Yes (Hazardous)</Option></Select>
              </Form.Item>
            </Col>
            <Col span={24}><Form.Item name="handling_notes" label="Handling Notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Source Modal */}
      <Modal title="Add Waste Source" open={sourceModal}
        onCancel={() => { setSourceModal(false); srcForm.resetFields(); }}
        onOk={() => srcForm.submit()} confirmLoading={createSrcMut.isPending}>
        <Form form={srcForm} layout="vertical" onFinish={v => createSrcMut.mutate(v)}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="name" label="Source Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="source_type" label="Type" initialValue="department">
                <Select><Option value="machine">Machine</Option><Option value="department">Department</Option><Option value="process">Process</Option><Option value="external">External</Option></Select>
              </Form.Item>
            </Col>
            <Col span={24}><Form.Item name="location" label="Location"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

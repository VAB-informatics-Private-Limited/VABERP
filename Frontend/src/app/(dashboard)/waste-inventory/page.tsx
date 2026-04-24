'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, InputNumber,
  DatePicker, Space, Card, Row, Col, Statistic, Tooltip, Tabs, Badge, Result,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined,
  ExclamationCircleOutlined, StopOutlined, LockOutlined,
  SearchOutlined, ClearOutlined,
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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [categoryFilter, setCategoryFilter] = useState<number>();
  const [classFilter, setClassFilter] = useState<string>();
  const [logsModal, setLogsModal] = useState<{ open: boolean; item: WasteInventoryItem | null }>({ open: false, item: null });

  // Debounce search input so typing doesn't fire a request every keystroke
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchInput]);

  const handleClearAll = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter(undefined);
    setCategoryFilter(undefined);
    setClassFilter(undefined);
    setPage(1);
  };
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
    {
      title: 'Material',
      render: (_: any, r: WasteInventoryItem) => (
        <Button
          type="link"
          className="!p-0 !h-auto text-left"
          onClick={() => setLogsModal({ open: true, item: r })}
        >
          <div>
            <div className="font-medium">{r.raw_material_name || '—'}</div>
            {r.raw_material_code && <div className="text-xs text-gray-400 font-mono">{r.raw_material_code}</div>}
          </div>
        </Button>
      ),
    },
    {
      title: 'Category',
      render: (_: any, r: WasteInventoryItem) => (
        <div>
          <div>{r.category?.name ?? '—'}</div>
          {r.category?.classification && (
            <Tag color={CLASS_COLOR[r.category.classification]} className="text-xs !m-0 mt-1">
              {r.category.classification}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Total Waste',
      render: (_: any, r: WasteInventoryItem) => (
        <div>
          <div className="font-medium">{Number(r.quantity_available).toLocaleString()} {r.unit}</div>
          <div className="text-xs text-gray-400">generated {Number(r.quantity_generated).toLocaleString()} {r.unit}</div>
        </div>
      ),
    },
    {
      title: 'Entries',
      render: (_: any, r: WasteInventoryItem) => {
        const count = (r.logs || []).filter((l) => l.action === 'generated').length;
        return <Tag className="!m-0">{count} log{count === 1 ? '' : 's'}</Tag>;
      },
    },
    { title: 'Batch', dataIndex: 'batch_no', render: (v: string) => <span className="font-mono text-xs text-gray-500">{v}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]} className="!m-0">{v?.replace(/_/g, ' ').toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 110,
      render: (_: any, r: WasteInventoryItem) => (
        <Space size="small">
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
        <div>
          <h1 className="text-2xl font-bold">Waste Inventory</h1>
          <div className="text-xs text-gray-500">
            Only waste generated during production is stored here. Expand a row to see the per-job-card log.
          </div>
        </div>
        <Space>
          <Button onClick={() => setSourceModal(true)}>+ Source</Button>
          <Button onClick={() => setCategoryModal(true)}>+ Category</Button>
        </Space>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Input
          placeholder="Search batch, location, category, source..."
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 300 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select placeholder="Status" allowClear style={{ width: 160 }} value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }}>
          {['available','partially_disposed','reserved','expired','quarantined','fully_disposed'].map(s =>
            <Option key={s} value={s}>{s.replace(/_/g,' ').toUpperCase()}</Option>
          )}
        </Select>
        <Select placeholder="Category" allowClear style={{ width: 180 }} value={categoryFilter} onChange={v => { setCategoryFilter(v); setPage(1); }}>
          {categories.map((c: WasteCategory) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
        <Select placeholder="Classification" allowClear style={{ width: 160 }} value={classFilter} onChange={v => { setClassFilter(v); setPage(1); }}>
          {['recyclable','hazardous','general','e-waste','organic'].map(c => <Option key={c} value={c}>{c}</Option>)}
        </Select>
        <Button icon={<ClearOutlined />} onClick={handleClearAll}>Clear</Button>
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        pagination={{ total: data?.total ?? 0, current: page, pageSize: 20, onChange: setPage, showTotal: t => `${t} entries` }}
      />

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

      {/* Logs modal — shows how the waste total was built up per job card */}
      <Modal
        title={
          <div>
            <div className="text-base font-semibold">
              {logsModal.item?.raw_material_name || '—'} · Waste log
            </div>
            <div className="text-xs text-gray-500 font-normal">
              {logsModal.item && (
                <>
                  Total {Number(logsModal.item.quantity_available).toLocaleString()} {logsModal.item.unit}
                  {' · '}
                  {logsModal.item.category?.name}
                  {logsModal.item.batch_no && <> · batch {logsModal.item.batch_no}</>}
                </>
              )}
            </div>
          </div>
        }
        open={logsModal.open}
        onCancel={() => setLogsModal({ open: false, item: null })}
        footer={<Button onClick={() => setLogsModal({ open: false, item: null })}>Close</Button>}
        width={760}
      >
        {logsModal.item && (() => {
          const logs = (logsModal.item.logs || []).filter((l) => l.action === 'generated');
          if (logs.length === 0) {
            return <div className="text-sm text-gray-400 text-center py-6">No log entries yet.</div>;
          }
          return (
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2">Date &amp; Time</th>
                  <th className="text-left py-2">Job Card</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Running total</th>
                  <th className="text-left py-2 pl-3">User</th>
                  <th className="text-left py-2 pl-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="py-2">{dayjs(l.created_date).format('DD MMM YYYY, HH:mm')}</td>
                    <td className="py-2">
                      {l.reference_type === 'job_card' && l.reference_id ? (
                        <span className="font-medium">JC #{l.reference_id}</span>
                      ) : '—'}
                    </td>
                    <td className="py-2 text-right">+{Number(l.quantity_delta)} {logsModal.item?.unit}</td>
                    <td className="py-2 text-right text-gray-500">{Number(l.quantity_after)} {logsModal.item?.unit}</td>
                    <td className="py-2 pl-3 text-gray-500">{l.performed_by_name || '—'}</td>
                    <td className="py-2 pl-3 text-gray-500">{l.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </Modal>
    </div>
  );
}

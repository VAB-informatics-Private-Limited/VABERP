'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Button, Input, InputNumber, Select, Tag, Modal, Form,
  Space, Card, Row, Col, Statistic, Tooltip, Result,
} from 'antd';
import {
  DeleteOutlined,
  StopOutlined, LockOutlined,
  SearchOutlined, ClearOutlined, SettingOutlined,
  HistoryOutlined, RightOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import {
  getWasteInventory, getWasteCategories, getWasteDashboard,
  quarantineWaste, writeOffWaste,
  createWasteCategory,
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
  const [categoryModal, setCategoryModal] = useState(false);
  const [catForm] = Form.useForm();

  const { data: stats } = useQuery({ queryKey: ['waste-dashboard'], queryFn: getWasteDashboard });
  const { data: categories = [] } = useQuery({ queryKey: ['waste-categories'], queryFn: getWasteCategories });
  const { data, isFetching } = useQuery({
    queryKey: ['waste-inventory', page, search, statusFilter, categoryFilter, classFilter],
    queryFn: () => getWasteInventory({ page, limit: 20, search: search || undefined, status: statusFilter, categoryId: categoryFilter, classification: classFilter }),
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

  const columns = [
    {
      title: 'Material (click to view logs)',
      render: (_: any, r: WasteInventoryItem) => (
        <Tooltip title="View the full audit trail for this material">
          <Button
            type="link"
            className="!p-0 !h-auto text-left"
            onClick={() => setLogsModal({ open: true, item: r })}
          >
            <div className="flex items-center gap-1">
              <div>
                <div className="font-medium underline decoration-dotted underline-offset-2">{r.raw_material_name || '—'}</div>
                {r.raw_material_code && <div className="text-xs text-gray-400 font-mono">{r.raw_material_code}</div>}
              </div>
              <RightOutlined className="text-xs text-blue-500" />
            </div>
          </Button>
        </Tooltip>
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
        const total = (r.logs || []).length;
        const generated = (r.logs || []).filter((l) => l.action === 'generated').length;
        return (
          <Tooltip title="Click to open the full audit trail">
            <Tag
              color="blue"
              className="!m-0 cursor-pointer"
              onClick={() => setLogsModal({ open: true, item: r })}
            >
              {generated} source{generated === 1 ? '' : 's'} · {total} log{total === 1 ? '' : 's'}
            </Tag>
          </Tooltip>
        );
      },
    },
    { title: 'Batch', dataIndex: 'batch_no', render: (v: string) => <span className="font-mono text-xs text-gray-500">{v}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v]} className="!m-0">{v?.replace(/_/g, ' ').toUpperCase()}</Tag> },
    {
      title: 'Actions', width: 200,
      render: (_: any, r: WasteInventoryItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => setLogsModal({ open: true, item: r })}
            style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
          >
            View logs
          </Button>
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
            Read-only view of waste captured automatically from production job cards. Tap the <span className="font-medium text-black border border-black px-1 rounded">View logs</span> button on any row (or click the material name) to see exactly where each kilogram came from.
          </div>
        </div>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setCategoryModal(true)}>Manage categories</Button>
        </Space>
      </div>

      {/* Dashboard stats */}
      {stats && (
        <Row gutter={12} className="mb-4">
          <Col xs={12} md={6} lg={4}>
            <Card size="small"><Statistic title="Total batches" value={stats.total ?? 0} /></Card>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Card size="small"><Statistic title="Available" value={stats.available ?? 0} valueStyle={{ color: '#3f8600' }} /></Card>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Card size="small"><Statistic title="Reserved" value={stats.reserved ?? 0} valueStyle={{ color: '#d48806' }} /></Card>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Card size="small"><Statistic title="Quarantined" value={stats.quarantined ?? 0} valueStyle={{ color: '#722ed1' }} /></Card>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Card size="small"><Statistic title="Disposed" value={stats.fullyDisposed ?? 0} valueStyle={{ color: '#8c8c8c' }} /></Card>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Card size="small">
              <Statistic
                title="Expiring ≤7d"
                value={stats.expiringSoon ?? 0}
                valueStyle={{ color: (stats.expiringSoon ?? 0) > 0 ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
        </Row>
      )}

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
          const logs = logsModal.item.logs || [];
          if (logs.length === 0) {
            return <div className="text-sm text-gray-400 text-center py-6">No log entries yet.</div>;
          }
          const ACTION_COLOR: Record<string, string> = {
            generated: 'green',
            disposed: 'red',
            written_off: 'default',
            quarantined: 'purple',
            expired: 'orange',
            reserved: 'gold',
            reservation_released: 'blue',
            adjusted: 'cyan',
          };
          const formatSource = (l: any) => {
            if (l.reference_type === 'job_card' && l.reference_id) {
              const jc = l.jobCardNumber || `#${l.reference_id}`;
              const po = l.purchaseOrderNumber ? ` · PO ${l.purchaseOrderNumber}` : '';
              const cust = l.customerName ? ` · ${l.customerName}` : '';
              const href = l.purchaseOrderId ? `/manufacturing/po/${l.purchaseOrderId}` : null;
              const label = (
                <span>
                  <span className="font-medium">{jc}</span>
                  <span className="text-gray-500">{po}{cust}</span>
                </span>
              );
              return href ? (
                <a href={href} className="text-blue-600 hover:underline">{label}</a>
              ) : label;
            }
            if (l.reference_type === 'manual') return <span className="text-gray-600">Manual entry</span>;
            if (!l.reference_type) return <span className="text-gray-600">Manual / system</span>;
            return <span className="text-gray-600">{l.reference_type}</span>;
          };
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2">Date &amp; Time</th>
                    <th className="text-left py-2 pl-3">Action</th>
                    <th className="text-left py-2 pl-3">Source</th>
                    <th className="text-right py-2 pl-3">Qty change</th>
                    <th className="text-right py-2 pl-3">Running total</th>
                    <th className="text-left py-2 pl-3">User</th>
                    <th className="text-left py-2 pl-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => {
                    const delta = Number(l.quantity_delta);
                    const sign = delta > 0 ? '+' : '';
                    return (
                      <tr key={l.id} className="border-b border-gray-100 align-top">
                        <td className="py-2 whitespace-nowrap">{dayjs(l.created_date).format('DD MMM YYYY, HH:mm')}</td>
                        <td className="py-2 pl-3">
                          <Tag color={ACTION_COLOR[l.action] ?? 'default'} className="!m-0">
                            {l.action?.replace(/_/g, ' ').toUpperCase()}
                          </Tag>
                        </td>
                        <td className="py-2 pl-3">{formatSource(l)}</td>
                        <td className={`py-2 pl-3 text-right whitespace-nowrap ${delta < 0 ? 'text-red-600' : delta > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                          {delta === 0 ? '—' : `${sign}${delta} ${logsModal.item?.unit}`}
                        </td>
                        <td className="py-2 pl-3 text-right text-gray-500 whitespace-nowrap">{Number(l.quantity_after)} {logsModal.item?.unit}</td>
                        <td className="py-2 pl-3 text-gray-500">{l.performed_by_name || '—'}</td>
                        <td className="py-2 pl-3 text-gray-500">{l.notes || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

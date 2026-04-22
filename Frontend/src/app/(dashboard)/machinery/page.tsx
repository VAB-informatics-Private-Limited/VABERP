'use client';

import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, DatePicker, Checkbox,
  Space, Tooltip, Statistic, Row, Col, Card, Result, Steps, Alert, Descriptions,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ToolOutlined, AlertOutlined, CheckCircleOutlined, StopOutlined, LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import dayjs from 'dayjs';
import {
  getMachines, getMachineCategories, getMachinesDashboard,
  createMachine, updateMachine, deleteMachine,
  createMachineCategory, Machine, MachineCategory,
} from '@/lib/api/machinery';
import {
  saveMachineSpares, saveAsTemplate,
} from '@/lib/api/spare-parts';
import { SuggestedSparesStep } from '@/components/machinery/SuggestedSparesStep';
import type { SpareRow } from '@/components/machinery/SparesEditableTable';
import { message } from 'antd';

const { Search } = Input;
const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  under_maintenance: 'orange',
  decommissioned: 'red',
  idle: 'default',
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

export default function MachineryPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('machinery_management', 'machines', 'view');
  const canCreate = userType === 'enterprise' || hasPermission('machinery_management', 'machines', 'create');
  const canEdit   = userType === 'enterprise' || hasPermission('machinery_management', 'machines', 'edit');
  const canDelete = userType === 'enterprise' || hasPermission('machinery_management', 'machines', 'delete');
  const canManageSpares = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'create');

  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [machineModal, setMachineModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [spareRows, setSpareRows] = useState<SpareRow[]>([]);
  const [saveTemplateChecked, setSaveTemplateChecked] = useState(false);
  const [draftDetails, setDraftDetails] = useState<any>(null);
  const [machineForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['machines-dashboard'],
    queryFn: getMachinesDashboard,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['machine-categories'],
    queryFn: getMachineCategories,
  });

  const { data, isFetching } = useQuery({
    queryKey: ['machines', page, search, statusFilter, categoryFilter],
    queryFn: () => getMachines({ page, limit: 20, search: search || undefined, status: statusFilter, categoryId: categoryFilter }),
  });

  const resetWizard = () => {
    setWizardStep(0);
    setSpareRows([]);
    setSaveTemplateChecked(false);
    setDraftDetails(null);
  };

  const closeModal = () => {
    setMachineModal(false);
    setEditingMachine(null);
    machineForm.resetFields();
    resetWizard();
  };

  const createMut = useMutation({
    mutationFn: async (payload: { dto: any; spares: SpareRow[]; saveTemplate: boolean }) => {
      const machine = await createMachine(payload.dto);
      if (payload.spares.length) {
        await saveMachineSpares(
          machine.id,
          payload.spares.map((r) => ({
            sparePartId: r.spare_part_id,
            quantity: r.quantity,
            notes: r.notes,
            source: r.source,
          })),
        );
      }
      if (payload.saveTemplate && payload.spares.length) {
        const scope: 'model' | 'category' | null =
          machine.model_number ? 'model' : (machine.category_id ? 'category' : null);
        if (scope) {
          try { await saveAsTemplate(machine.id, scope); } catch {}
        }
      }
      return machine;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      qc.invalidateQueries({ queryKey: ['machines-dashboard'] });
      closeModal();
      message.success('Machine created with spare parts');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to create machine'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => updateMachine(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      closeModal();
      message.success('Machine updated');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMachine,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      qc.invalidateQueries({ queryKey: ['machines-dashboard'] });
      message.success('Machine deleted');
    },
    onError: () => message.error('Failed to delete machine'),
  });

  const createCatMut = useMutation({
    mutationFn: createMachineCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machine-categories'] });
      setCategoryModal(false);
      categoryForm.resetFields();
      message.success('Category created');
    },
    onError: () => message.error('Failed to create category'),
  });

  const openCreate = () => {
    setEditingMachine(null);
    machineForm.resetFields();
    resetWizard();
    setMachineModal(true);
  };

  const openEdit = (m: Machine) => {
    setEditingMachine(m);
    resetWizard();
    machineForm.setFieldsValue({
      ...m,
      machine_code: m.machine_code,
      category_id: m.category_id,
      purchase_date: m.purchase_date ? dayjs(m.purchase_date) : undefined,
      installation_date: m.installation_date ? dayjs(m.installation_date) : undefined,
    });
    setMachineModal(true);
  };

  const buildDtoFromForm = (values: any) => ({
    ...values,
    machineCode: values.machine_code,
    categoryId: values.category_id,
    modelNumber: values.model_number,
    serialNumber: values.serial_number,
    meterUnit: values.meter_unit,
    purchaseDate: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
    installationDate: values.installation_date ? values.installation_date.format('YYYY-MM-DD') : undefined,
  });

  // Edit flow: single submit
  const onSubmitEdit = (values: any) => {
    const dto = buildDtoFromForm(values);
    if (editingMachine) updateMut.mutate({ id: editingMachine.id, dto });
  };

  // Create flow: step 1 -> validate details; step 2 -> save everything
  const handleNextToSpares = async () => {
    try {
      const values = await machineForm.validateFields();
      setDraftDetails(values);
      setWizardStep(1);
    } catch {
      // form will surface validation errors
    }
  };

  const handleCreateAll = () => {
    if (!draftDetails) return;
    const dto = buildDtoFromForm(draftDetails);
    createMut.mutate({
      dto,
      spares: spareRows,
      saveTemplate: saveTemplateChecked && canManageSpares,
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'machine_code', width: 120, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    {
      title: 'Machine',
      dataIndex: 'name',
      render: (name: string, r: Machine) => (
        <div>
          <div className="font-medium cursor-pointer text-blue-600 hover:underline" onClick={() => router.push(`/machinery/${r.id}`)}>{name}</div>
          {r.category && <div className="text-xs text-gray-400">{r.category.name}</div>}
        </div>
      ),
    },
    { title: 'Make / Model', render: (_: any, r: Machine) => r.manufacturer || r.model_number ? `${r.manufacturer ?? ''} ${r.model_number ?? ''}`.trim() : '—' },
    { title: 'Location', dataIndex: 'location', render: (v?: string) => v ?? '—' },
    {
      title: 'Meter',
      render: (_: any, r: Machine) => `${r.current_meter_reading.toLocaleString()} ${r.meter_unit}`,
    },
    {
      title: 'Criticality',
      dataIndex: 'criticality',
      render: (v: string) => <Tag color={CRITICALITY_COLORS[v]}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      width: 100,
      render: (_: any, r: Machine) => (
        <Space>
          {canEdit && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}
          {canDelete && (
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                title: 'Delete machine?',
                content: 'This cannot be undone.',
                onOk: () => deleteMut.mutate(r.id),
              })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Machinery." />;
  }

  const isCreating = !editingMachine;

  // Footer buttons for the wizard / edit modal
  const modalFooter = (() => {
    if (!isCreating) {
      return [
        <Button key="cancel" onClick={closeModal}>Cancel</Button>,
        <Button key="save" type="primary" loading={updateMut.isPending} onClick={() => machineForm.submit()}>
          Save Changes
        </Button>,
      ];
    }
    if (wizardStep === 0) {
      return [
        <Button key="cancel" onClick={closeModal}>Cancel</Button>,
        <Button key="next" type="primary" onClick={handleNextToSpares}>
          Next: Suggested Parts →
        </Button>,
      ];
    }
    return [
      <Button key="back" onClick={() => setWizardStep(0)}>← Back</Button>,
      <Button key="create" type="primary" loading={createMut.isPending} onClick={handleCreateAll}>
        Create Machine ({spareRows.length} parts)
      </Button>,
    ];
  })();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Machinery</h1>
        <Space>
          {canCreate && <Button onClick={() => setCategoryModal(true)}>+ Category</Button>}
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Machine</Button>}
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={16} className="mb-6">
        {[
          { title: 'Total', value: stats?.total ?? 0, icon: <ToolOutlined />, color: '#1677ff' },
          { title: 'Active', value: stats?.active ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: 'Under Maintenance', value: stats?.underMaintenance ?? 0, icon: <AlertOutlined />, color: '#fa8c16' },
          { title: 'Decommissioned', value: stats?.decommissioned ?? 0, icon: <StopOutlined />, color: '#ff4d4f' },
        ].map((s) => (
          <Col key={s.title} xs={12} md={6}>
            <Card>
              <Statistic title={s.title} value={s.value} valueStyle={{ color: s.color }} prefix={s.icon} loading={statsLoading} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Search placeholder="Search code, name, serial..." allowClear style={{ width: 280 }}
          onSearch={v => { setSearch(v); setPage(1); }} />
        <Select placeholder="Status" allowClear style={{ width: 160 }} onChange={v => { setStatusFilter(v); setPage(1); }}>
          <Option value="active">Active</Option>
          <Option value="under_maintenance">Under Maintenance</Option>
          <Option value="idle">Idle</Option>
          <Option value="decommissioned">Decommissioned</Option>
        </Select>
        <Select placeholder="Category" allowClear style={{ width: 180 }} onChange={v => { setCategoryFilter(v); setPage(1); }}>
          {categories.map((c: MachineCategory) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        pagination={{ total: data?.total ?? 0, current: page, pageSize: 20, onChange: setPage, showTotal: t => `${t} machines` }}
        onRow={(r) => ({ onClick: (e) => { if ((e.target as HTMLElement).closest('button')) return; router.push(`/machinery/${r.id}`); }, style: { cursor: 'pointer' } })}
      />

      {/* Machine Modal (wizard for create, single-form for edit) */}
      <Modal
        title={editingMachine ? 'Edit Machine' : 'Add Machine'}
        open={machineModal}
        onCancel={closeModal}
        footer={modalFooter}
        width={isCreating && wizardStep === 1 ? 880 : 720}
        destroyOnClose
      >
        {isCreating && (
          <Steps
            current={wizardStep}
            size="small"
            className="mb-6"
            items={[
              { title: 'Details' },
              { title: 'Suggested Parts' },
            ]}
          />
        )}

        {/* Step 1 / Edit: details form — kept mounted so field state survives step change */}
        <div style={{ display: isCreating && wizardStep === 1 ? 'none' : 'block' }}>
          <Form form={machineForm} layout="vertical" onFinish={onSubmitEdit}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="machine_code" label="Machine Code" rules={[{ required: true }]}>
                  <Input disabled={!!editingMachine} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="name" label="Machine Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category_id" label="Category">
                  <Select allowClear>
                    {categories.map((c: MachineCategory) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Status" initialValue="active">
                  <Select>
                    <Option value="active">Active</Option>
                    <Option value="under_maintenance">Under Maintenance</Option>
                    <Option value="idle">Idle</Option>
                    <Option value="decommissioned">Decommissioned</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="criticality" label="Criticality" initialValue="medium">
                  <Select>
                    <Option value="critical">Critical</Option>
                    <Option value="high">High</Option>
                    <Option value="medium">Medium</Option>
                    <Option value="low">Low</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="meter_unit" label="Meter Unit" initialValue="hours">
                  <Select>
                    <Option value="hours">Hours</Option>
                    <Option value="cycles">Cycles</Option>
                    <Option value="km">Km</Option>
                    <Option value="units">Units</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}><Form.Item name="manufacturer" label="Manufacturer"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="model_number" label="Model Number"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="serial_number" label="Serial Number"><Input /></Form.Item></Col>
              <Col span={12}>
                <Form.Item name="purchase_date" label="Purchase Date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}><Form.Item name="location" label="Location"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </div>

        {/* Step 2: Suggested parts (only in create flow) */}
        {isCreating && wizardStep === 1 && draftDetails && (
          <>
            {/* Prominent header — no ambiguity about what this step does */}
            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%)',
                border: '1px solid #c7d2fe',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: '#1e40af',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                <ToolOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#7c3aed',
                    marginBottom: 2,
                  }}
                >
                  Step 2 of 2 · Spare Parts Kit
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  Attach Spare Parts to <span style={{ color: '#1e40af' }}>
                    {draftDetails.name || 'new machine'}
                  </span>
                  {draftDetails.machine_code && (
                    <Tag color="blue" className="ml-2 font-mono" style={{ verticalAlign: 'middle' }}>
                      {draftDetails.machine_code}
                    </Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Review the suggested spare parts below, edit quantities, remove or add items — these will be saved with the machine.
                </div>
              </div>
            </div>

            <Card size="small" className="mb-4" bodyStyle={{ padding: '12px 16px' }}>
              <Descriptions
                column={{ xs: 1, sm: 2, md: 3 }}
                size="small"
                colon={false}
                labelStyle={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                contentStyle={{ fontWeight: 500 }}
              >
                <Descriptions.Item label="Machine Code">
                  <span className="font-mono">{draftDetails.machine_code || '—'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Name">{draftDetails.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Category">
                  {categories.find((c) => c.id === draftDetails.category_id)?.name || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Manufacturer">{draftDetails.manufacturer || '—'}</Descriptions.Item>
                <Descriptions.Item label="Model">{draftDetails.model_number || '—'}</Descriptions.Item>
                <Descriptions.Item label="Serial #">{draftDetails.serial_number || '—'}</Descriptions.Item>
                <Descriptions.Item label="Location">{draftDetails.location || '—'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={STATUS_COLORS[draftDetails.status] || 'default'}>
                    {(draftDetails.status || 'active').replace('_', ' ').toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Criticality">
                  <Tag color={CRITICALITY_COLORS[draftDetails.criticality] || 'default'}>
                    {(draftDetails.criticality || 'medium').toUpperCase()}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <SuggestedSparesStep
              modelNumber={draftDetails?.model_number}
              categoryId={draftDetails?.category_id}
              rows={spareRows}
              onChange={setSpareRows}
            />
            {canManageSpares && spareRows.length > 0 && (draftDetails?.model_number || draftDetails?.category_id) && (
              <div className="mt-4 pt-4 border-t">
                <Checkbox
                  checked={saveTemplateChecked}
                  onChange={(e) => setSaveTemplateChecked(e.target.checked)}
                >
                  Also save this list as template for{' '}
                  {draftDetails?.model_number
                    ? <>model <b>{draftDetails.model_number}</b></>
                    : <>category <b>{categories.find((c) => c.id === draftDetails?.category_id)?.name}</b></>}
                </Checkbox>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Category Modal */}
      <Modal
        title="Add Machine Category"
        open={categoryModal}
        onCancel={() => { setCategoryModal(false); categoryForm.resetFields(); }}
        onOk={() => categoryForm.submit()}
        confirmLoading={createCatMut.isPending}
      >
        <Form form={categoryForm} layout="vertical" onFinish={v => createCatMut.mutate(v)}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

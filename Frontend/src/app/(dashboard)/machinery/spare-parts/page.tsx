'use client';

import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, InputNumber,
  Space, Tooltip, Result, Row, Col, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import {
  listSpareParts, createSparePart, updateSparePart, deleteSparePart, SparePart,
} from '@/lib/api/spare-parts';

const { Option } = Select;

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  discontinued: 'default',
};

export default function SparePartsCatalogPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'view');
  const canCreate = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'create');
  const canEdit   = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'edit');
  const canDelete = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'delete');

  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form] = Form.useForm();

  const { data, isFetching } = useQuery({
    queryKey: ['spare-parts', page, search, statusFilter],
    queryFn: () => listSpareParts({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });

  const createMut = useMutation({
    mutationFn: (dto: any) => createSparePart(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spare-parts'] });
      setModalOpen(false);
      form.resetFields();
      message.success('Spare part created');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => updateSparePart(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spare-parts'] });
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      message.success('Spare part updated');
    },
    onError: () => message.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSparePart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spare-parts'] });
      message.success('Spare part deleted');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to delete'),
  });

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (p: SparePart) => {
    setEditing(p);
    form.setFieldsValue({
      part_code: p.part_code,
      name: p.name,
      description: p.description,
      oem_part_no: p.oem_part_no,
      alt_part_no: p.alt_part_no,
      manufacturer: p.manufacturer,
      unit: p.unit,
      current_stock: p.current_stock,
      min_stock: p.min_stock,
      unit_price: p.unit_price,
      status: p.status,
    });
    setModalOpen(true);
  };

  const onSubmit = (values: any) => {
    const dto = {
      partCode: values.part_code,
      name: values.name,
      description: values.description,
      oemPartNo: values.oem_part_no,
      altPartNo: values.alt_part_no,
      manufacturer: values.manufacturer,
      unit: values.unit,
      currentStock: values.current_stock,
      minStock: values.min_stock,
      unitPrice: values.unit_price,
      status: values.status,
    };
    if (editing) updateMut.mutate({ id: editing.id, dto });
    else createMut.mutate(dto);
  };

  const columns = [
    { title: 'Code', dataIndex: 'part_code', width: 140, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    {
      title: 'Part',
      dataIndex: 'name',
      render: (name: string, r: SparePart) => (
        <div>
          <div className="font-medium">{name}</div>
          {r.manufacturer && <div className="text-xs text-gray-400">{r.manufacturer}</div>}
        </div>
      ),
    },
    { title: 'OEM #', dataIndex: 'oem_part_no', render: (v?: string) => v ?? '—' },
    { title: 'Unit', dataIndex: 'unit', width: 70 },
    {
      title: 'Stock',
      width: 100,
      render: (_: any, r: SparePart) => (
        <span className={r.current_stock <= r.min_stock ? 'text-red-500 font-medium' : ''}>
          {r.current_stock.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'unit_price',
      width: 100,
      render: (v: number) => `₹${v.toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      width: 100,
      render: (_: any, r: SparePart) => (
        <Space>
          {canEdit && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>}
          {canDelete && (
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                title: 'Delete spare part?',
                content: 'Deletion is blocked if this part is attached to any machine.',
                onOk: () => deleteMut.mutate(r.id),
              })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Spare Parts." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/machinery')}>Back</Button>
          <h1 className="text-2xl font-bold">Spare Parts Catalog</h1>
        </div>
        <Space>
          <Button onClick={() => router.push('/machinery/spare-map')}>Manage Templates</Button>
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Spare Part</Button>}
        </Space>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input.Search
          placeholder="Search by code, name, OEM #, alt #"
          allowClear
          style={{ width: 320 }}
          onSearch={v => { setSearch(v); setPage(1); }}
        />
        <Select placeholder="Status" allowClear style={{ width: 160 }} onChange={v => { setStatusFilter(v); setPage(1); }}>
          <Option value="active">Active</Option>
          <Option value="discontinued">Discontinued</Option>
        </Select>
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        pagination={{
          total: data?.total ?? 0,
          current: page,
          pageSize: 20,
          onChange: setPage,
          showTotal: t => `${t} spare parts`,
        }}
      />

      <Modal
        title={editing ? 'Edit Spare Part' : 'Add Spare Part'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="part_code" label="Part Code" rules={[{ required: true }]}>
                <Input disabled={!!editing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Part Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="manufacturer" label="Manufacturer"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="unit" label="Unit" initialValue="pcs">
                <Select>
                  <Option value="pcs">Pieces</Option>
                  <Option value="set">Set</Option>
                  <Option value="kg">Kg</Option>
                  <Option value="ltr">Litres</Option>
                  <Option value="meter">Meter</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="oem_part_no" label="OEM Part #"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="alt_part_no" label="Alt Part #"><Input /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="current_stock" label="Current Stock" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="min_stock" label="Min Stock" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit_price" label="Unit Price" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select>
                  <Option value="active">Active</Option>
                  <Option value="discontinued">Discontinued</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

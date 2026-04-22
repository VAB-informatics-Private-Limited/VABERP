'use client';

import React, { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Modal, Form, InputNumber, Checkbox,
  Space, Tooltip, Result, Empty, message, Tabs,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, LockOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import {
  listSpareMap, upsertSpareMap, deleteSpareMap, MachineSpareMap,
} from '@/lib/api/spare-parts';
import { getMachineCategories } from '@/lib/api/machinery';
import { SparePartPicker } from '@/components/machinery/SparePartPicker';

const { Option } = Select;

export default function SpareMapPage() {
  const { userType } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canAccess = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'view');
  const canCreate = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'create');
  const canDelete = userType === 'enterprise' || hasPermission('machinery_management', 'spares', 'delete');

  const router = useRouter();
  const qc = useQueryClient();
  const [scope, setScope] = useState<'model' | 'category'>('model');
  const [modelFilter, setModelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedPart, setPickedPart] = useState<{ id: number; name: string; part_code: string } | null>(null);
  const [addForm] = Form.useForm();

  const { data: categories = [] } = useQuery({
    queryKey: ['machine-categories'],
    queryFn: getMachineCategories,
  });

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ['spare-map', scope, modelFilter, categoryFilter],
    queryFn: () =>
      listSpareMap(
        scope === 'model'
          ? (modelFilter ? { modelNumber: modelFilter } : undefined)
          : (categoryFilter ? { categoryId: categoryFilter } : undefined),
      ),
  });

  const upsertMut = useMutation({
    mutationFn: (dto: any) => upsertSpareMap(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spare-map'] });
      setAddModalOpen(false);
      setPickedPart(null);
      addForm.resetFields();
      message.success('Template entry saved');
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSpareMap,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spare-map'] });
      message.success('Template entry removed');
    },
    onError: () => message.error('Failed to remove'),
  });

  const handleAdd = (values: any) => {
    if (!pickedPart) {
      message.error('Please select a spare part');
      return;
    }
    upsertMut.mutate({
      sparePartId: pickedPart.id,
      modelNumber: scope === 'model' ? values.model_number : undefined,
      categoryId: scope === 'category' ? values.category_id : undefined,
      defaultQuantity: values.default_quantity,
      isMandatory: values.is_mandatory,
      priority: values.priority,
      notes: values.notes,
    });
  };

  const rowsFiltered = rows.filter((r) => {
    if (scope === 'model') return !!r.model_number;
    return !!r.category_id;
  });

  const columns = [
    {
      title: scope === 'model' ? 'Model' : 'Category',
      render: (_: any, r: MachineSpareMap) =>
        scope === 'model'
          ? <Tag color="blue" className="font-mono">{r.model_number}</Tag>
          : <Tag color="cyan">{r.category?.name ?? `#${r.category_id}`}</Tag>,
    },
    {
      title: 'Spare Part',
      render: (_: any, r: MachineSpareMap) => (
        <div>
          <div className="font-medium">{r.spare_part?.name ?? '—'}</div>
          <div className="text-xs text-gray-400 font-mono">{r.spare_part?.part_code}</div>
        </div>
      ),
    },
    { title: 'Unit', render: (_: any, r: MachineSpareMap) => r.spare_part?.unit ?? '—' },
    { title: 'Default Qty', dataIndex: 'default_quantity', width: 110 },
    {
      title: 'Mandatory',
      dataIndex: 'is_mandatory',
      width: 100,
      render: (v: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag>,
    },
    { title: 'Priority', dataIndex: 'priority', width: 90 },
    {
      title: 'Actions',
      width: 80,
      render: (_: any, r: MachineSpareMap) => canDelete && (
        <Tooltip title="Remove">
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({
              title: 'Remove template entry?',
              content: 'This will no longer be suggested for future machines.',
              onOk: () => deleteMut.mutate(r.id),
            })}
          />
        </Tooltip>
      ),
    },
  ];

  if (!canAccess) {
    return <Result status="403" icon={<LockOutlined />} title="Access Restricted" subTitle="You don't have permission to view Spare Templates." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/machinery/spare-parts')}>Back</Button>
          <h1 className="text-2xl font-bold">Spare Part Templates</h1>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddModalOpen(true); setPickedPart(null); addForm.resetFields(); }}>
            Add Template Entry
          </Button>
        )}
      </div>

      <Tabs
        activeKey={scope}
        onChange={(k) => setScope(k as 'model' | 'category')}
        items={[
          { key: 'model', label: 'By Model Number' },
          { key: 'category', label: 'By Category' },
        ]}
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        {scope === 'model' ? (
          <Input.Search
            placeholder="Filter by model number (exact match)"
            allowClear
            style={{ width: 320 }}
            onSearch={(v) => setModelFilter(v)}
          />
        ) : (
          <Select
            placeholder="Filter by category"
            allowClear
            style={{ width: 240 }}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v)}
          >
            {categories.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
        )}
      </div>

      <Table
        dataSource={rowsFiltered}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: <Empty description="No template entries — add one to seed future machines" /> }}
      />

      <Modal
        title={`Add Template Entry (${scope === 'model' ? 'by Model' : 'by Category'})`}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setPickedPart(null); addForm.resetFields(); }}
        onOk={() => addForm.submit()}
        confirmLoading={upsertMut.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          {scope === 'model' ? (
            <Form.Item name="model_number" label="Model Number" rules={[{ required: true }]}>
              <Input placeholder="e.g. CNC-X200" />
            </Form.Item>
          ) : (
            <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
              <Select placeholder="Choose category">
                {categories.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Spare Part" required>
            {pickedPart ? (
              <Space>
                <Tag color="blue" className="font-mono">{pickedPart.part_code}</Tag>
                <span>{pickedPart.name}</span>
                <Button size="small" onClick={() => setPickerOpen(true)}>Change</Button>
              </Space>
            ) : (
              <Button onClick={() => setPickerOpen(true)}>Select Spare Part</Button>
            )}
          </Form.Item>

          <Form.Item name="default_quantity" label="Default Quantity" initialValue={1} rules={[{ required: true }]}>
            <InputNumber min={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="priority" label="Priority (lower = higher)" initialValue={100}>
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="is_mandatory" valuePropName="checked">
            <Checkbox>Mark as mandatory</Checkbox>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <SparePartPicker
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onSelect={(p) => {
          setPickedPart({ id: p.id, name: p.name, part_code: p.part_code });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

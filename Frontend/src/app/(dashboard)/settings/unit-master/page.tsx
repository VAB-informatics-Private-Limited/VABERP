'use client';

import { useState } from 'react';
import {
  Typography, Button, Table, Tag, Modal, Form, Input, InputNumber, Switch,
  Space, message, Popconfirm, Card,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnitMasters, createUnitMaster, updateUnitMaster, deleteUnitMaster,
  seedDefaultUnits,
} from '@/lib/api/unit-masters';
import { UnitMaster } from '@/types/unit-master';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function UnitMasterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitMaster | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['unit-masters'],
    queryFn: getUnitMasters,
  });

  const units = data?.data || [];

  const addMutation = useMutation({
    mutationFn: createUnitMaster,
    onSuccess: () => {
      message.success('Unit created successfully');
      queryClient.invalidateQueries({ queryKey: ['unit-masters'] });
      closeModal();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to create unit');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateUnitMaster(id, data),
    onSuccess: () => {
      message.success('Unit updated successfully');
      queryClient.invalidateQueries({ queryKey: ['unit-masters'] });
      closeModal();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to update unit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUnitMaster,
    onSuccess: () => {
      message.success('Unit deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['unit-masters'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to delete unit');
    },
  });

  const seedMutation = useMutation({
    mutationFn: seedDefaultUnits,
    onSuccess: () => {
      message.success('Default units seeded successfully');
      queryClient.invalidateQueries({ queryKey: ['unit-masters'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to seed defaults');
    },
  });

  const openModal = (unit?: UnitMaster) => {
    if (unit) {
      setEditingUnit(unit);
      form.setFieldsValue({
        unit_name: unit.unit_name,
        short_name: unit.short_name,
        description: unit.description,
        sort_order: unit.sort_order,
        is_active: unit.is_active,
      });
    } else {
      setEditingUnit(null);
      form.resetFields();
      form.setFieldsValue({ is_active: true, sort_order: units.length + 1 });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUnit(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: values });
    } else {
      addMutation.mutate(values);
    }
  };

  const columns: ColumnsType<UnitMaster> = [
    {
      title: '#',
      dataIndex: 'sort_order',
      width: 60,
      sorter: (a, b) => a.sort_order - b.sort_order,
    },
    {
      title: 'Unit Name',
      dataIndex: 'unit_name',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Short Name',
      dataIndex: 'short_name',
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this unit?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings')} />
          <Title level={4} className="!mb-0">Unit Master</Title>
        </div>
        <Space>
          {units.length === 0 && (
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => seedMutation.mutate()}
              loading={seedMutation.isPending}
            >
              Seed Defaults
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            Add Unit
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={units}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingUnit ? 'Update' : 'Create'}
        confirmLoading={addMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="unit_name"
            label="Unit Name"
            rules={[{ required: true, message: 'Enter unit name' }]}
          >
            <Input placeholder="e.g. Pieces" />
          </Form.Item>
          <Form.Item name="short_name" label="Short Name">
            <Input placeholder="e.g. Pcs" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

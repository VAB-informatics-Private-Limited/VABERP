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
  getStageMasters, createStageMaster, updateStageMaster, deleteStageMaster,
  seedDefaultStages,
} from '@/lib/api/stage-masters';
import { StageMaster } from '@/types/stage-master';
import type { ColumnsType } from 'antd/es/table';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function StageMasterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<StageMaster | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['stage-masters'],
    queryFn: getStageMasters,
  });

  const stages = data?.data || [];

  const addMutation = useMutation({
    mutationFn: createStageMaster,
    onSuccess: () => {
      message.success('Stage created successfully');
      queryClient.invalidateQueries({ queryKey: ['stage-masters'] });
      closeModal();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to create stage');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateStageMaster(id, data),
    onSuccess: () => {
      message.success('Stage updated successfully');
      queryClient.invalidateQueries({ queryKey: ['stage-masters'] });
      closeModal();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to update stage');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStageMaster,
    onSuccess: () => {
      message.success('Stage deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['stage-masters'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to delete stage');
    },
  });

  const seedMutation = useMutation({
    mutationFn: seedDefaultStages,
    onSuccess: () => {
      message.success('Default stages seeded successfully');
      queryClient.invalidateQueries({ queryKey: ['stage-masters'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to seed defaults');
    },
  });

  const openModal = (stage?: StageMaster) => {
    if (stage) {
      setEditingStage(stage);
      form.setFieldsValue({
        stage_name: stage.stage_name,
        description: stage.description,
        sort_order: stage.sort_order,
        is_active: stage.is_active,
      });
    } else {
      setEditingStage(null);
      form.resetFields();
      form.setFieldsValue({ is_active: true, sort_order: stages.length + 1 });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingStage(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    if (editingStage) {
      updateMutation.mutate({ id: editingStage.id, data: values });
    } else {
      addMutation.mutate(values);
    }
  };

  const columns: ColumnsType<StageMaster> = [
    {
      title: '#',
      dataIndex: 'sort_order',
      width: 60,
      sorter: (a, b) => a.sort_order - b.sort_order,
    },
    {
      title: 'Stage Name',
      dataIndex: 'stage_name',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
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
            title="Delete this stage?"
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
          <Title level={4} className="!mb-0">Stage Master</Title>
        </div>
        <Space>
          <ExportDropdown
            data={stages}
            disabled={!stages.length}
            filename="stages"
            title="Manufacturing Stages"
            columns={[{ key: 'sort_order', title: '#' }, { key: 'stage_name', title: 'Stage Name' }, { key: 'description', title: 'Description' }, { key: 'is_active', title: 'Active' }]}
          />
          {stages.length === 0 && (
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => seedMutation.mutate()}
              loading={seedMutation.isPending}
            >
              Seed Defaults
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            Add Stage
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={stages}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title={editingStage ? 'Edit Stage' : 'Add Stage'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingStage ? 'Update' : 'Create'}
        confirmLoading={addMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="stage_name"
            label="Stage Name"
            rules={[{ required: true, message: 'Enter stage name' }]}
          >
            <Input placeholder="e.g. Manufacturing Started" />
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

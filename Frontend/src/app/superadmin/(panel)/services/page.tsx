'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Space,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServices, createService, updateService, deleteService } from '@/lib/api/super-admin';

const { Title } = Typography;
const { Option } = Select;

interface ServiceItem {
  id: number;
  serviceName: string;
  status: string;
  createdDate: string;
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
  });

  const services: ServiceItem[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      message.success('Service created');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to create service'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => updateService(id, body),
    onSuccess: () => {
      message.success('Service updated');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Failed to update service'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      message.success('Service deleted');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Cannot delete service'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: ServiceItem) => {
      setEditing(item);
      form.setFieldsValue({ serviceName: item.serviceName, status: item.status });
      setModalOpen(true);
    },
    [form],
  );

  const handleSubmit = (values: { serviceName: string; status: string }) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Service Name',
      dataIndex: 'serviceName',
      key: 'serviceName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ServiceItem) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this service?"
            description="This cannot be undone."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AppstoreOutlined className="text-2xl text-slate-600" />
          <Title level={3} className="!mb-0">
            Services Master
          </Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Service
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={services}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Service' : 'Add Service'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <Form.Item
            name="serviceName"
            label="Service Name"
            rules={[{ required: true, message: 'Enter service name' }]}
          >
            <Input placeholder="e.g. Invoicing, Manufacturing..." />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="active">
            <Select>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

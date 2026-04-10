'use client';

import { useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Space,
  Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductTypes,
  createProductType,
  updateProductType,
  deleteProductType,
} from '@/lib/api/product-types';
import { useAuthStore, usePermissions } from '@/stores/authStore';
import type { ProductType, ServiceRule } from '@/types/product-type';

const { Title } = Typography;

const EVENT_TYPE_OPTIONS = [
  { value: 'free_service', label: 'Free Service' },
  { value: 'paid_service', label: 'Paid Service' },
  { value: 'amc_reminder', label: 'AMC Reminder' },
  { value: 'warranty_expiry', label: 'Warranty Expiry' },
];

export default function ProductTypesSettingsPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPt, setEditingPt] = useState<ProductType | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
    enabled: !!enterpriseId,
  });

  const createMutation = useMutation({
    mutationFn: createProductType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      setModalOpen(false);
      form.resetFields();
      message.success('Product type created');
    },
    onError: () => message.error('Failed to create product type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateProductType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      setModalOpen(false);
      setEditingPt(null);
      form.resetFields();
      message.success('Product type updated');
    },
    onError: () => message.error('Failed to update product type'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      message.success('Deleted');
    },
  });

  const openCreate = () => {
    setEditingPt(null);
    form.resetFields();
    form.setFieldsValue({ warrantyMonths: 12, serviceRules: [] });
    setModalOpen(true);
  };

  const openEdit = (pt: ProductType) => {
    setEditingPt(pt);
    form.setFieldsValue({
      name: pt.name,
      warrantyMonths: pt.warranty_months,
      description: pt.description,
      serviceRules: pt.service_rules.map((r) => ({
        dayOffset: r.day_offset,
        eventType: r.event_type,
        title: r.title,
        description: r.description,
        price: r.price,
        isActive: r.is_active,
      })),
    });
    setModalOpen(true);
  };

  const onFinish = (values: any) => {
    if (editingPt) {
      updateMutation.mutate({ id: editingPt.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Warranty',
      dataIndex: 'warranty_months',
      key: 'warranty_months',
      render: (v: number) => `${v} months`,
    },
    {
      title: 'Service Rules',
      key: 'rules',
      render: (_: any, pt: ProductType) => (
        <span>{pt.service_rules?.length ?? 0} rules</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, pt: ProductType) => (
        <Space>
          {hasPermission('service_management', 'product_types', 'edit') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(pt)}>
              Edit
            </Button>
          )}
          {hasPermission('service_management', 'product_types', 'delete') && (
            <Popconfirm title="Delete this product type?" onConfirm={() => deleteMutation.mutate(pt.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={4} className="!mb-0">Product Types & Service Rules</Title>
        {hasPermission('service_management', 'product_types', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Product Type
          </Button>
        )}
      </div>

      <Card>
        <Table
          dataSource={data?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          expandable={{
            expandedRowRender: (pt: ProductType) => (
              <Table
                dataSource={pt.service_rules ?? []}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Day Offset', dataIndex: 'day_offset', key: 'day_offset', render: (v: number) => `Day ${v}` },
                  { title: 'Event', dataIndex: 'event_type', key: 'event_type', render: (v: string) => <Tag>{v.replace('_', ' ')}</Tag> },
                  { title: 'Title', dataIndex: 'title', key: 'title' },
                  { title: 'Price', dataIndex: 'price', key: 'price', render: (v: number | null) => (v != null ? `₹${v}` : 'Free') },
                  { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
                ]}
              />
            ),
          }}
        />
      </Card>

      <Modal
        title={editingPt ? 'Edit Product Type' : 'Add Product Type'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingPt(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
        okText={editingPt ? 'Save' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. AC, RO Water Purifier, Laptop" />
          </Form.Item>
          <Form.Item label="Warranty Duration (months)" name="warrantyMonths" initialValue={12}>
            <InputNumber min={1} max={120} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Service Rules</Divider>
          <p className="text-xs text-gray-400 mb-3">
            Rules define when lifecycle events are auto-generated after dispatch (e.g. Day 30 → Free Service).
          </p>

          <Form.List name="serviceRules">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Card
                    key={key}
                    size="small"
                    className="mb-2"
                    extra={<Button type="link" danger size="small" onClick={() => remove(name)}>Remove</Button>}
                  >
                    <div className="grid grid-cols-2 gap-x-3">
                      <Form.Item label="Day Offset" name={[name, 'dayOffset']} rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 30, 90, 365" />
                      </Form.Item>
                      <Form.Item label="Event Type" name={[name, 'eventType']} rules={[{ required: true }]}>
                        <Select options={EVENT_TYPE_OPTIONS} />
                      </Form.Item>
                      <Form.Item label="Title" name={[name, 'title']} rules={[{ required: true }]} className="col-span-2">
                        <Input placeholder="e.g. 30-Day Free Service" />
                      </Form.Item>
                      <Form.Item label="Price (₹)" name={[name, 'price']}>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="0 for free" />
                      </Form.Item>
                      <Form.Item label="Active" name={[name, 'isActive']} initialValue={true}>
                        <Select
                          options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
                        />
                      </Form.Item>
                    </div>
                  </Card>
                ))}
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => add({ dayOffset: undefined, eventType: 'free_service', title: '', isActive: true })}
                >
                  Add Rule
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

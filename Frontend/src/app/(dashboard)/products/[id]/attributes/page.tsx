'use client';

import { useState } from 'react';
import { Typography, Button, Card, Table, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductAttributes,
  addProductAttribute,
  updateProductAttribute,
  deleteProductAttribute,
} from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { ProductAttribute } from '@/types/product';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function ProductAttributesPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Number(params.id);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['product-attributes', productId],
    queryFn: () => getProductAttributes(productId, enterpriseId!),
    enabled: !!enterpriseId && !!productId,
  });

  const addMutation = useMutation({
    mutationFn: (values: { attribute_name: string; attribute_value: string }) =>
      addProductAttribute({
        ...values,
        product_id: productId,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Attribute added successfully');
      queryClient.invalidateQueries({ queryKey: ['product-attributes', productId] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add attribute');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: { attribute_name: string; attribute_value: string }) =>
      updateProductAttribute({
        ...values,
        id: editingAttribute!.id,
        enterprise_id: enterpriseId!,
      }),
    onSuccess: () => {
      message.success('Attribute updated successfully');
      queryClient.invalidateQueries({ queryKey: ['product-attributes', productId] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update attribute');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProductAttribute(id, enterpriseId!),
    onSuccess: () => {
      message.success('Attribute deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['product-attributes', productId] });
    },
    onError: () => {
      message.error('Failed to delete attribute');
    },
  });

  const handleOpenModal = (attribute?: ProductAttribute) => {
    if (attribute) {
      setEditingAttribute(attribute);
      form.setFieldsValue(attribute);
    } else {
      setEditingAttribute(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingAttribute(null);
    form.resetFields();
  };

  const handleSubmit = (values: { attribute_name: string; attribute_value: string }) => {
    if (editingAttribute) {
      updateMutation.mutate(values);
    } else {
      addMutation.mutate(values);
    }
  };

  const columns: ColumnsType<ProductAttribute> = [
    {
      title: 'Attribute Name',
      dataIndex: 'attribute_name',
      key: 'attribute_name',
    },
    {
      title: 'Attribute Value',
      dataIndex: 'attribute_value',
      key: 'attribute_value',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Delete Attribute"
            description="Are you sure you want to delete this attribute?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/products')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            Product Attributes
          </Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Add Attribute
        </Button>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingAttribute ? 'Edit Attribute' : 'Add Attribute'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="attribute_name"
            label="Attribute Name"
            rules={[{ required: true, message: 'Please enter attribute name' }]}
          >
            <Input placeholder="e.g., Color, Size, Weight" />
          </Form.Item>

          <Form.Item
            name="attribute_value"
            label="Attribute Value"
            rules={[{ required: true, message: 'Please enter attribute value' }]}
          >
            <Input placeholder="e.g., Red, Large, 500g" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={addMutation.isPending || updateMutation.isPending}
            >
              {editingAttribute ? 'Update' : 'Add'} Attribute
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

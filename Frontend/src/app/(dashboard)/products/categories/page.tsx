'use client';

import { useState, useMemo } from 'react';
import { Typography, Button, Card, Modal, Form, Input, Select, message, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryTable } from '@/components/products/CategoryTable';
import { getCategoryList, addCategory, updateCategory } from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { Category, CategoryFormData } from '@/types/product';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function CategoriesPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['categories', enterpriseId],
    queryFn: () => getCategoryList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const filteredData = useMemo(() => {
    if (!data?.data || !searchText) return data?.data || [];
    const search = searchText.toLowerCase();
    return data.data.filter(
      (cat) =>
        cat.category_name?.toLowerCase().includes(search) ||
        cat.hsn_code?.toLowerCase().includes(search) ||
        cat.description?.toLowerCase().includes(search)
    );
  }, [data?.data, searchText]);

  const addMutation = useMutation({
    mutationFn: (formData: CategoryFormData) =>
      addCategory({ ...formData, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Category added successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (formData: CategoryFormData) =>
      updateCategory({ ...formData, id: editingCategory!.id, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update category');
    },
  });

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue(category);
    } else {
      setEditingCategory(null);
      form.resetFields();
      form.setFieldsValue({ status: 'active' });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleSubmit = (values: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate(values);
    } else {
      addMutation.mutate(values);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">
          Categories
        </Title>
        <div className="flex flex-wrap gap-2">
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'category_name', title: 'Name' },
              { key: 'description', title: 'Description' },
              { key: 'status', title: 'Status' },
            ]}
            filename="categories"
            title="Product Categories"
            disabled={!data?.data?.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Category
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Input
          placeholder="Search categories..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
      </div>

      <Card className="card-shadow">
        <CategoryTable
          data={filteredData}
          loading={isLoading}
          onEdit={handleOpenModal}
        />
      </Card>

      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="category_name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item name="hsn_code" label="HSN Code">
            <Input placeholder="Enter HSN code" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter description" rows={3} />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={addMutation.isPending || updateMutation.isPending}
            >
              {editingCategory ? 'Update' : 'Add'} Category
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

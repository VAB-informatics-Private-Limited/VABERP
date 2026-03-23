'use client';

import { useState, useMemo } from 'react';
import { Typography, Button, Card, Modal, Form, Input, Select, message, Space, Table, Tag, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { getSubCategoryList, getCategoryList, addSubCategory, updateSubCategory, deleteSubCategory } from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { SubCategory, SubCategoryFormData } from '@/types/product';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;

export default function SubcategoriesPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<SubCategory | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['subcategories', enterpriseId, categoryFilter],
    queryFn: () => getSubCategoryList(enterpriseId!, categoryFilter),
    enabled: !!enterpriseId,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', enterpriseId],
    queryFn: () => getCategoryList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const filteredData = useMemo(() => {
    let result = data?.data || [];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.subcategory_name?.toLowerCase().includes(search) ||
          sub.category_name?.toLowerCase().includes(search) ||
          sub.description?.toLowerCase().includes(search)
      );
    }

    if (sortField && sortOrder) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField as keyof SubCategory];
        const bVal = b[sortField as keyof SubCategory];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'ascend' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return result;
  }, [data?.data, searchText, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const addMutation = useMutation({
    mutationFn: (formData: SubCategoryFormData) =>
      addSubCategory({ ...formData, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Subcategory added successfully');
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to add subcategory');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (formData: SubCategoryFormData) =>
      updateSubCategory({ ...formData, id: editingSubcategory!.id, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Subcategory updated successfully');
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update subcategory');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubCategory(id, enterpriseId!),
    onSuccess: () => {
      message.success('Subcategory deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
    onError: () => {
      message.error('Failed to delete subcategory');
    },
  });

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SubCategory> | SorterResult<SubCategory>[]
  ) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setPageSize(pagination.pageSize);

    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (singleSorter.field) {
      setSortField(singleSorter.field as string);
      setSortOrder(singleSorter.order || undefined);
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  const handleOpenModal = (subcategory?: SubCategory) => {
    if (subcategory) {
      setEditingSubcategory(subcategory);
      form.setFieldsValue(subcategory);
    } else {
      setEditingSubcategory(null);
      form.resetFields();
      form.setFieldsValue({ status: 'active' });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSubcategory(null);
    form.resetFields();
  };

  const handleSubmit = (values: SubCategoryFormData) => {
    if (editingSubcategory) {
      updateMutation.mutate(values);
    } else {
      addMutation.mutate(values);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setCategoryFilter(undefined);
    setPage(1);
    setSortField(undefined);
    setSortOrder(undefined);
  };

  const columns: ColumnsType<SubCategory> = [
    {
      title: 'Subcategory Name',
      dataIndex: 'subcategory_name',
      key: 'subcategory_name',
      sorter: true,
      sortOrder: sortField === 'subcategory_name' ? sortOrder : undefined,
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
      sorter: true,
      sortOrder: sortField === 'category_name' ? sortOrder : undefined,
      render: (name) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      responsive: ['lg'],
      render: (desc) => desc || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Delete Subcategory"
            description="Are you sure you want to delete this subcategory?"
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
        <Title level={4} className="!mb-0">
          Subcategories
        </Title>
        <div className="flex gap-2">
          <ExportDropdown
            data={filteredData}
            columns={[
              { key: 'subcategory_name', title: 'Subcategory' },
              { key: 'category_name', title: 'Category' },
              { key: 'description', title: 'Description' },
              { key: 'status', title: 'Status' },
            ]}
            filename="subcategories"
            title="Product Subcategories"
            disabled={!filteredData.length}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Subcategory
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search subcategories..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
            style={{ width: 180 }}
            allowClear
          >
            {categoriesData?.data?.map((cat) => (
              <Select.Option key={cat.id} value={cat.id}>
                {cat.category_name}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<ClearOutlined />} onClick={handleClear}>
            Clear
          </Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={paginatedData}
          rowKey="id"
          loading={isLoading}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        title={editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="category_id"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category">
              {categoriesData?.data?.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.category_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subcategory_name"
            label="Subcategory Name"
            rules={[{ required: true, message: 'Please enter subcategory name' }]}
          >
            <Input placeholder="Enter subcategory name" />
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
              {editingSubcategory ? 'Update' : 'Add'} Subcategory
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

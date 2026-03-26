'use client';

import { useState } from 'react';
import {
  Table, Tag, Card, Button, Modal, Form, Input, Select, Space, Typography, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupplierList, createSupplier, updateSupplier, deleteSupplier, addSupplierCategory, removeSupplierCategory } from '@/lib/api/suppliers';
import { getRawMaterialCategories, getRawMaterialSubcategories } from '@/lib/api/raw-materials';
import { SUPPLIER_STATUS_OPTIONS } from '@/types/supplier';
import type { Supplier, SupplierCategoryMapping } from '@/types/supplier';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';
import { usePermissions } from '@/stores/authStore';

const { Title } = Typography;

export default function SuppliersPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [categoryModalSupplier, setCategoryModalSupplier] = useState<Supplier | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  const { data: categoriesRes } = useQuery({
    queryKey: ['raw-material-categories'],
    queryFn: getRawMaterialCategories,
    enabled: !!categoryModalSupplier,
    staleTime: 1000 * 60 * 5,
  });

  const { data: subcategoriesRes } = useQuery({
    queryKey: ['raw-material-subcategories', newCategory],
    queryFn: () => getRawMaterialSubcategories(newCategory),
    enabled: !!categoryModalSupplier && !!newCategory,
    staleTime: 1000 * 60 * 5,
  });

  const categoryOptions = (categoriesRes?.data || []).map((c) => ({ value: c, label: c }));
  const subcategoryOptions = (subcategoriesRes?.data || []).map((s) => ({ value: s, label: s }));
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () => getSupplierList({ page, pageSize: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => createSupplier(values),
    onSuccess: () => {
      message.success('Supplier created');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: any }) => updateSupplier(id, values),
    onSuccess: () => {
      message.success('Supplier updated');
      setModalOpen(false);
      setEditingSupplier(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      message.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const addCategoryMutation = useMutation({
    mutationFn: ({ supplierId, category, subcategory }: { supplierId: number; category: string; subcategory?: string }) =>
      addSupplierCategory(supplierId, { category, subcategory }),
    onSuccess: () => {
      message.success('Category added');
      setNewCategory('');
      setNewSubcategory('');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const removeCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => removeSupplierCategory(categoryId),
    onSuccess: () => {
      message.success('Category removed');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed'),
  });

  const columns = [
    {
      title: 'Code',
      dataIndex: 'supplier_code',
      key: 'code',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Supplier Name',
      dataIndex: 'supplier_name',
      key: 'name',
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Contact Person',
      dataIndex: 'contact_person',
      key: 'contact',
      render: (text: string) => text || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => text || '-',
    },
    {
      title: 'GST',
      dataIndex: 'gst_number',
      key: 'gst',
      render: (text: string) => text || '-',
    },
    {
      title: 'Categories',
      key: 'categories',
      render: (_: unknown, record: Supplier) => {
        const cats = record.categories || [];
        if (cats.length === 0) return <Typography.Text type="secondary" style={{ fontSize: 12 }}>None</Typography.Text>;
        return (
          <Space size={4} wrap>
            {cats.slice(0, 3).map((c) => (
              <Tag key={c.id} style={{ fontSize: 11 }}>
                {c.category}{c.subcategory ? ` / ${c.subcategory}` : ''}
              </Tag>
            ))}
            {cats.length > 3 && <Tag style={{ fontSize: 11 }}>+{cats.length - 3}</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const opt = SUPPLIER_STATUS_OPTIONS.find((o) => o.value === status);
        return <Tag color={opt?.color || 'default'}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_date',
      key: 'created',
      render: (text: string) => text ? dayjs(text).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Supplier) => (
        <Space>
          <Button
            type="link"
            icon={<TagsOutlined />}
            title="Manage Categories"
            onClick={() => { setCategoryModalSupplier(record); setNewCategory(''); setNewSubcategory(''); }}
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSupplier(record);
              form.setFieldsValue({
                supplierName: record.supplier_name,
                contactPerson: record.contact_person,
                phone: record.phone,
                email: record.email,
                address: record.address,
                gstNumber: record.gst_number,
                paymentTerms: record.payment_terms,
                status: record.status,
                notes: record.notes,
              });
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title="Delete this supplier?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Suppliers</Title>
        <Space>
          <ExportDropdown
            data={data?.data || []}
            disabled={!data?.data?.length}
            filename="suppliers"
            title="Suppliers"
            columns={[{ key: 'supplier_code', title: 'Code' }, { key: 'supplier_name', title: 'Supplier Name' }, { key: 'contact_person', title: 'Contact' }, { key: 'phone', title: 'Phone' }, { key: 'email', title: 'Email' }, { key: 'gst_number', title: 'GST' }, { key: 'status', title: 'Status' }]}
          />
          {hasPermission('procurement', 'create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingSupplier(null); form.resetFields(); setModalOpen(true); }}
            >
              Add Supplier
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.totalRecords || 0,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      {/* Category Management Modal */}
      <Modal
        title={`Manage Categories — ${categoryModalSupplier?.supplier_name}`}
        open={!!categoryModalSupplier}
        onCancel={() => setCategoryModalSupplier(null)}
        footer={null}
        width={520}
      >
        {categoryModalSupplier && (
          <>
            <div className="mb-4">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Categories control which vendors appear when creating a Purchase Order for items of that category.
              </Typography.Text>
            </div>
            <Table
              dataSource={
                // Use latest data from the query cache for this supplier
                (data?.data?.find((s) => s.id === categoryModalSupplier.id)?.categories || categoryModalSupplier.categories || []) as SupplierCategoryMapping[]
              }
              rowKey="id"
              pagination={false}
              size="small"
              className="mb-4"
              locale={{ emptyText: 'No categories mapped yet' }}
              columns={[
                { title: 'Category', dataIndex: 'category' },
                { title: 'Subcategory', dataIndex: 'subcategory', render: (v: string) => v || '—' },
                {
                  title: '',
                  key: 'remove',
                  width: 60,
                  render: (_: unknown, rec: SupplierCategoryMapping) => (
                    <Popconfirm title="Remove this category?" onConfirm={() => removeCategoryMutation.mutate(rec.id)}>
                      <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Category *</div>
                <Select
                  placeholder="Select or type category"
                  options={categoryOptions}
                  value={newCategory || undefined}
                  onChange={(v) => { setNewCategory(v || ''); setNewSubcategory(''); }}
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Subcategory (optional)</div>
                {subcategoryOptions.length > 0 ? (
                  <Select
                    placeholder="Select subcategory"
                    options={subcategoryOptions}
                    value={newSubcategory || undefined}
                    onChange={(v) => setNewSubcategory(v || '')}
                    showSearch
                    allowClear
                    disabled={!newCategory}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <Input
                    placeholder="e.g. Steel"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    disabled={!newCategory}
                  />
                )}
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={addCategoryMutation.isPending}
                disabled={!newCategory.trim()}
                onClick={() => {
                  addCategoryMutation.mutate({
                    supplierId: categoryModalSupplier.id,
                    category: newCategory.trim(),
                    subcategory: newSubcategory.trim() || undefined,
                  });
                }}
              >
                Add
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingSupplier(null); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="supplierName" label="Supplier Name" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPerson" label="Contact Person">
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gstNumber" label="GST Number">
              <Input />
            </Form.Item>
            <Form.Item name="paymentTerms" label="Payment Terms">
              <Input placeholder="e.g. Net 30" />
            </Form.Item>
          </div>
          {editingSupplier && (
            <Form.Item name="status" label="Status">
              <Select options={SUPPLIER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

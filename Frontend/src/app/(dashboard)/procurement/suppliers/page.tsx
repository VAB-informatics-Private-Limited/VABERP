'use client';

import { useState, useEffect } from 'react';
import {
  Table, Tag, Card, Button, Modal, Form, Input, Select, Space, Typography,
  message, Popconfirm, Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSupplierList, createSupplier, updateSupplier, deleteSupplier,
  addSupplierCategory, removeSupplierCategory,
} from '@/lib/api/suppliers';
import { getRawMaterialCategories, getRawMaterialSubcategories } from '@/lib/api/raw-materials';
import { SUPPLIER_STATUS_OPTIONS } from '@/types/supplier';
import type { Supplier, SupplierCategoryMapping } from '@/types/supplier';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';
import { usePermissions } from '@/stores/authStore';

const { Title, Text } = Typography;

// Local type for category rows in the form (may or may not be saved yet)
interface CategoryRow {
  id?: number;       // present if already persisted (edit mode)
  category: string;
  subcategory?: string;
}

export default function VendorsPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  // Category picker state (inside the modal)
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerSubcategory, setPickerSubcategory] = useState('');

  // For CREATE mode: queued category rows (not yet saved)
  const [pendingCategories, setPendingCategories] = useState<CategoryRow[]>([]);

  // For EDIT mode: live category list (mirrors server state)
  const [editCategories, setEditCategories] = useState<CategoryRow[]>([]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () => getSupplierList({ page, pageSize: 20 }),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['raw-material-categories'],
    queryFn: getRawMaterialCategories,
    enabled: modalOpen,
    staleTime: 1000 * 60 * 5,
  });

  const { data: subcategoriesRes } = useQuery({
    queryKey: ['raw-material-subcategories', pickerCategory],
    queryFn: () => getRawMaterialSubcategories(pickerCategory),
    enabled: modalOpen && !!pickerCategory,
    staleTime: 1000 * 60 * 5,
  });

  const categoryOptions = (categoriesRes?.data || []).map((c) => ({ value: c, label: c }));
  const subcategoryOptions = (subcategoriesRes?.data || []).map((s) => ({ value: s, label: s }));

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (values: any) => createSupplier(values),
    onSuccess: async (res: any) => {
      const supplierId = res?.data?.id;
      if (supplierId && pendingCategories.length > 0) {
        for (const row of pendingCategories) {
          try {
            await addSupplierCategory(supplierId, { category: row.category, subcategory: row.subcategory });
          } catch {}
        }
      }
      message.success('Vendor created');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: any }) => updateSupplier(id, values),
    onSuccess: () => {
      message.success('Vendor updated');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update vendor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      message.success('Vendor deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to delete vendor'),
  });

  const addCategoryMutation = useMutation({
    mutationFn: ({ supplierId, category, subcategory }: { supplierId: number; category: string; subcategory?: string }) =>
      addSupplierCategory(supplierId, { category, subcategory }),
    onSuccess: (res: any) => {
      const saved = res?.data;
      if (saved) {
        setEditCategories((prev) => [...prev, { id: saved.id, category: saved.category, subcategory: saved.subcategory }]);
      }
      setPickerCategory('');
      setPickerSubcategory('');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to add category'),
  });

  const removeCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => removeSupplierCategory(categoryId),
    onSuccess: (_, categoryId) => {
      setEditCategories((prev) => prev.filter((c) => c.id !== categoryId));
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to remove category'),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const closeModal = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    setPendingCategories([]);
    setEditCategories([]);
    setPickerCategory('');
    setPickerSubcategory('');
    form.resetFields();
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setPendingCategories([]);
    setEditCategories([]);
    setPickerCategory('');
    setPickerSubcategory('');
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Supplier) => {
    setEditingSupplier(record);
    setEditCategories((record.categories || []).map((c) => ({
      id: c.id,
      category: c.category,
      subcategory: c.subcategory,
    })));
    setPendingCategories([]);
    setPickerCategory('');
    setPickerSubcategory('');
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
  };

  const handleAddCategoryRow = () => {
    if (!pickerCategory.trim()) return;
    if (editingSupplier) {
      // Edit mode → save to server immediately
      addCategoryMutation.mutate({
        supplierId: editingSupplier.id,
        category: pickerCategory.trim(),
        subcategory: pickerSubcategory.trim() || undefined,
      });
    } else {
      // Create mode → queue locally
      setPendingCategories((prev) => [
        ...prev,
        { category: pickerCategory.trim(), subcategory: pickerSubcategory.trim() || undefined },
      ]);
      setPickerCategory('');
      setPickerSubcategory('');
    }
  };

  const handleRemovePending = (idx: number) => {
    setPendingCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    // Require at least one category when creating a vendor — procurement flows
    // depend on category mapping for filtering/suggesting suppliers.
    if (!editingSupplier && pendingCategories.length === 0) {
      message.error('Please add at least one category before saving the vendor');
      return;
    }

    // Before creating a NEW vendor with a mobile number, check if it is already in use.
    if (!editingSupplier && values.phone) {
      try {
        const all = await getSupplierList({ page: 1, pageSize: 500 });
        const match = (all?.data || []).find(
          (s) => (s.phone || '').replace(/\D/g, '') === String(values.phone).replace(/\D/g, ''),
        );
        if (match) {
          Modal.confirm({
            title: 'Mobile number already exists',
            content: (
              <div>
                This mobile number <strong>{values.phone}</strong> is already registered with vendor{' '}
                <strong>{match.supplier_name}</strong> ({match.supplier_code}).
                <br />
                Do you still want to create a new vendor with the same number?
              </div>
            ),
            okText: 'Create Anyway',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk: () => createMutation.mutate(values),
          });
          return;
        }
      } catch {
        // If the duplicate check fails for any reason, fall through to create.
      }
    }

    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Active category list (edit uses live state, create uses pending)
  const activeCategoryRows: CategoryRow[] = editingSupplier ? editCategories : pendingCategories;

  // ── Table Columns ──────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Code',
      dataIndex: 'supplier_code',
      key: 'code',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Vendor Name',
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
      title: 'GST',
      dataIndex: 'gst_number',
      key: 'gst',
      render: (text: string) => text || '-',
    },
    {
      title: 'Supply Categories',
      key: 'categories',
      render: (_: unknown, record: Supplier) => {
        const cats = record.categories || [];
        if (cats.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>None</Text>;
        return (
          <Space size={4} wrap>
            {cats.slice(0, 3).map((c) => (
              <Tag key={c.id} color="blue" style={{ fontSize: 11 }}>
                {c.category}{c.subcategory ? ` › ${c.subcategory}` : ''}
              </Tag>
            ))}
            {cats.length > 3 && <Tag style={{ fontSize: 11 }}>+{cats.length - 3} more</Tag>}
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
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this vendor?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Vendors</Title>
        <Space>
          <ExportDropdown
            data={data?.data || []}
            disabled={!data?.data?.length}
            filename="vendors"
            title="Vendors"
            columns={[
              { key: 'supplier_code', title: 'Code' },
              { key: 'supplier_name', title: 'Vendor Name' },
              { key: 'contact_person', title: 'Contact' },
              { key: 'phone', title: 'Phone' },
              { key: 'email', title: 'Email' },
              { key: 'gst_number', title: 'GST' },
              { key: 'status', title: 'Status' },
            ]}
          />
          {hasPermission('procurement', 'suppliers', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Vendor
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

      {/* ── Add / Edit Vendor Modal ── */}
      <Modal
        title={
          <div>
            <div className="text-base font-semibold">{editingSupplier ? 'Edit Vendor' : 'Add Vendor'}</div>
            {editingSupplier && (
              <div className="text-xs text-gray-400 font-normal mt-0.5">{editingSupplier.supplier_code}</div>
            )}
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={680}
        okText={editingSupplier ? 'Save Changes' : 'Create Vendor'}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
      >
        <Form form={form} layout="vertical" className="mt-2">

          {/* ── Basic Info ── */}
          <Form.Item name="supplierName" label="Vendor Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g. ABC Metals Pvt. Ltd." size="large" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="contactPerson" label="Contact Person">
              <Input placeholder="Full name" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Phone"
              rules={[
                { required: true, message: 'Mobile number is required' },
                { pattern: /^\d{10}$/, message: 'Mobile number must be exactly 10 digits' },
              ]}
            >
              <Input placeholder="10-digit mobile" maxLength={10} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="email" label="Email">
              <Input type="email" placeholder="vendor@company.com" />
            </Form.Item>
            <Form.Item name="gstNumber" label="GST Number">
              <Input placeholder="27AABCU9603R1ZX" />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Street, City, State, PIN" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="paymentTerms" label="Payment Terms">
              <Input placeholder="e.g. Net 30, Advance" />
            </Form.Item>
            {editingSupplier && (
              <Form.Item name="status" label="Status">
                <Select options={SUPPLIER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
              </Form.Item>
            )}
          </div>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Any additional notes..." />
          </Form.Item>

          {/* ── Supply Categories ── */}
          <Divider orientation="left" orientationMargin={0}>
            <span className="text-sm font-semibold text-gray-700">
              Supply Categories <span className="text-red-500">*</span>
            </span>
          </Divider>

          <div className="text-xs text-gray-400 mb-3">
            Map this vendor to the material categories they supply. At least one category is required — these mappings control which vendors appear when creating a Purchase Order.
          </div>

          {/* Existing / queued category rows */}
          {activeCategoryRows.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {activeCategoryRows.map((row, idx) => (
                <div
                  key={row.id ?? `pending-${idx}`}
                  className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Tag color="blue" className="m-0 font-medium">{row.category}</Tag>
                    {row.subcategory && (
                      <>
                        <span className="text-gray-400 text-sm">›</span>
                        <Tag color="geekblue" className="m-0">{row.subcategory}</Tag>
                      </>
                    )}
                    {!row.id && (
                      <span className="text-xs text-orange-400 italic">pending save</span>
                    )}
                  </div>
                  {row.id ? (
                    <Popconfirm
                      title="Remove this category mapping?"
                      onConfirm={() => removeCategoryMutation.mutate(row.id!)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        loading={removeCategoryMutation.isPending}
                      />
                    </Popconfirm>
                  ) : (
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRemovePending(idx)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {activeCategoryRows.length === 0 && (
            <div className="mb-3 py-3 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              No categories mapped yet — add one below
            </div>
          )}

          {/* Add category row */}
          <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1 font-medium">Category <span className="text-red-400">*</span></div>
              <Select
                placeholder="Select category"
                options={categoryOptions}
                value={pickerCategory || undefined}
                onChange={(v) => { setPickerCategory(v || ''); setPickerSubcategory(''); }}
                showSearch
                allowClear
                style={{ width: '100%' }}
                notFoundContent={<span className="text-xs text-gray-400">No categories found — add raw materials first</span>}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1 font-medium">Subcategory <span className="text-gray-400">(optional)</span></div>
              {/* Combined Select that lets the user pick an existing subcategory or type a new one.
                  Existing ones come from raw_materials; typing is always available so the form
                  doesn't feel broken when no data is there yet. */}
              <Select
                mode="tags"
                placeholder={pickerCategory ? 'Select or type subcategory' : 'Select category first'}
                options={subcategoryOptions}
                value={pickerSubcategory ? [pickerSubcategory] : []}
                onChange={(values) => {
                  // mode="tags" returns an array; keep only the last entered value as the picker is single-select.
                  const latest = Array.isArray(values) && values.length ? values[values.length - 1] : '';
                  setPickerSubcategory(latest || '');
                }}
                showSearch
                allowClear
                disabled={!pickerCategory}
                style={{ width: '100%' }}
                maxTagCount={1}
                notFoundContent={<span className="text-xs text-gray-400">Type to add a new subcategory</span>}
              />
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!pickerCategory.trim()}
              loading={addCategoryMutation.isPending}
              onClick={handleAddCategoryRow}
              style={{ marginBottom: 0 }}
            >
              Add
            </Button>
          </div>

        </Form>
      </Modal>
    </div>
  );
}

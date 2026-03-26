'use client';

import { useState } from 'react';
import { Typography, Button, Card, Modal, Form, Input, InputNumber, Select, message, Table, Tag, Space, Tooltip, Segmented } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined, EditOutlined, DeleteOutlined, SwapOutlined, WarningOutlined, ShoppingCartOutlined, MinusCircleOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRawMaterialList, createRawMaterial, bulkCreateRawMaterials, updateRawMaterial, deleteRawMaterial, adjustStock, getRawMaterialCategories } from '@/lib/api/raw-materials';
import { createIndentFromInventory } from '@/lib/api/indents';
import { RawMaterial, CATEGORY_OPTIONS } from '@/types/raw-material';
import ExportDropdown from '@/components/common/ExportDropdown';
import { usePermissions } from '@/stores/authStore';

const { Title } = Typography;

export default function InventoryPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; material: RawMaterial | null }>({ open: false, material: null });
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; material: RawMaterial | null }>({ open: false, material: null });
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [orderMode, setOrderMode] = useState<'single' | 'bulk'>('single');
  const [bulkOrderSelected, setBulkOrderSelected] = useState<Record<number, number>>({});
  const [createForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [orderForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', page, pageSize, searchText, categoryFilter],
    queryFn: () => getRawMaterialList({ page, pageSize, search: searchText || undefined, category: categoryFilter }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['raw-material-categories'],
    queryFn: getRawMaterialCategories,
  });

  const createMutation = useMutation({
    mutationFn: (values: { material_name: string; description?: string; category?: string; unit_of_measure?: string; current_stock?: number; min_stock_level?: number; cost_per_unit?: number }) =>
      createRawMaterial(values),
    onSuccess: () => {
      message.success('Raw material created');
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['raw-material-categories'] });
      setCreateModalOpen(false);
      createForm.resetFields();
    },
    onError: () => message.error('Failed to create raw material'),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (items: { material_name: string; description?: string; category?: string; unit_of_measure?: string; current_stock?: number; min_stock_level?: number; cost_per_unit?: number }[]) =>
      bulkCreateRawMaterials(items),
    onSuccess: (res) => {
      message.success(res.message || 'Raw materials created');
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['raw-material-categories'] });
      setCreateModalOpen(false);
      bulkForm.resetFields();
    },
    onError: () => message.error('Failed to create raw materials'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: { id: number; material_name?: string; description?: string; category?: string; unit_of_measure?: string; min_stock_level?: number; cost_per_unit?: number }) =>
      updateRawMaterial(id, values),
    onSuccess: () => {
      message.success('Raw material updated');
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['raw-material-categories'] });
      setEditModal({ open: false, material: null });
    },
    onError: () => message.error('Failed to update raw material'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRawMaterial(id),
    onSuccess: () => {
      message.success('Raw material deactivated');
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
    },
    onError: () => message.error('Failed to delete raw material'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; type: string; quantity: number; remarks?: string }) =>
      adjustStock(id, data),
    onSuccess: () => {
      message.success('Stock adjusted');
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setAdjustModal({ open: false, material: null });
      adjustForm.resetFields();
    },
    onError: () => message.error('Failed to adjust stock'),
  });

  const orderMutation = useMutation({
    mutationFn: (values: { items: { rawMaterialId: number; quantity: number; notes?: string }[]; notes?: string }) =>
      createIndentFromInventory(values),
    onSuccess: () => {
      message.success('Individual Order from Inventory created and sent to Procurement');
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setOrderModalOpen(false);
      orderForm.resetFields();
      setBulkOrderSelected({});
    },
    onError: () => message.error('Failed to create order request'),
  });

  const openEditModal = (material: RawMaterial) => {
    setEditModal({ open: true, material });
    editForm.setFieldsValue({
      material_name: material.material_name,
      description: material.description,
      category: material.category,
      subcategory: material.subcategory,
      unit_of_measure: material.unit_of_measure,
      min_stock_level: material.min_stock_level,
      cost_per_unit: material.cost_per_unit,
    });
  };

  const hasActiveFilters = searchText || categoryFilter;

  const columns = [
    {
      title: 'Code',
      dataIndex: 'material_code',
      key: 'material_code',
      width: 100,
      render: (code: string) => <span className="font-mono text-xs">{code}</span>,
    },
    {
      title: 'Material Name',
      dataIndex: 'material_name',
      key: 'material_name',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: string) => cat ? <Tag>{cat}</Tag> : '-',
    },
    {
      title: 'Unit',
      dataIndex: 'unit_of_measure',
      key: 'unit_of_measure',
      width: 80,
      render: (u: string) => u || '-',
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      width: 110,
      align: 'right' as const,
      render: (val: number, record: RawMaterial) => {
        const isLow = record.min_stock_level > 0 && val < record.min_stock_level;
        return (
          <span className={isLow ? 'text-red-500 font-semibold' : ''}>
            {val}
            {isLow && <Tooltip title="Below minimum stock level"><WarningOutlined className="ml-1 text-orange-500" /></Tooltip>}
          </span>
        );
      },
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved_stock',
      key: 'reserved_stock',
      width: 90,
      align: 'right' as const,
    },
    {
      title: 'Available',
      dataIndex: 'available_stock',
      key: 'available_stock',
      width: 90,
      align: 'right' as const,
      render: (val: number) => <span className="font-semibold">{val}</span>,
    },
    {
      title: 'Min Level',
      dataIndex: 'min_stock_level',
      key: 'min_stock_level',
      width: 80,
      align: 'right' as const,
    },
    {
      title: 'Cost/Unit',
      dataIndex: 'cost_per_unit',
      key: 'cost_per_unit',
      width: 90,
      align: 'right' as const,
      render: (val: number | null) => val != null ? `₹${val}` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: RawMaterial) => (
        <Space size="small">
          <Tooltip title="Adjust Stock">
            <Button size="small" icon={<SwapOutlined />} onClick={() => { setAdjustModal({ open: true, material: record }); adjustForm.resetFields(); }} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="Deactivate">
            <Button size="small" icon={<DeleteOutlined />} danger onClick={() => {
              Modal.confirm({
                title: 'Deactivate raw material?',
                content: `This will set "${record.material_name}" as inactive.`,
                onOk: () => deleteMutation.mutate(record.id),
              });
            }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const allCategories = Array.from(new Set([
    ...(categoriesData?.data || []),
    ...CATEGORY_OPTIONS,
  ])).sort();

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Raw Materials</Title>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/inventory/ledger')}>Stock Ledger</Button>
          <ExportDropdown
            data={data?.data || []}
            columns={[
              { key: 'material_code', title: 'Code' },
              { key: 'material_name', title: 'Name' },
              { key: 'category', title: 'Category' },
              { key: 'unit_of_measure', title: 'Unit' },
              { key: 'current_stock', title: 'Current Stock' },
              { key: 'reserved_stock', title: 'Reserved' },
              { key: 'available_stock', title: 'Available' },
              { key: 'min_stock_level', title: 'Min Level' },
              { key: 'cost_per_unit', title: 'Cost/Unit' },
              { key: 'status', title: 'Status' },
            ]}
            filename="raw-materials"
            title="Raw Materials Inventory"
            disabled={!data?.data?.length}
          />
          {hasPermission('inventory', 'create') && (
            <Button icon={<ShoppingCartOutlined />} onClick={() => { setOrderModalOpen(true); orderForm.resetFields(); setOrderMode('single'); setBulkOrderSelected({}); }}>Order Material</Button>
          )}
          {hasPermission('inventory', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalOpen(true); createForm.resetFields(); bulkForm.resetFields(); setAddMode('single'); }}>Add Raw Material</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search by name or code..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Category"
            value={categoryFilter}
            onChange={(val) => { setCategoryFilter(val); setPage(1); }}
            style={{ width: 180 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {allCategories.map((cat) => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
          {hasActiveFilters && (
            <Button icon={<ClearOutlined />} onClick={() => { setSearchText(''); setCategoryFilter(undefined); setPage(1); }} type="link">
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) { setPageSize(newPageSize); setPage(1); }
            },
          }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="Add Raw Material"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); setAddMode('single'); }}
        footer={null}
        maskClosable={false}
        width={addMode === 'bulk' ? 900 : 520}
      >
        <div className="mb-4">
          <Segmented
            value={addMode}
            onChange={(val) => setAddMode(val as 'single' | 'bulk')}
            options={[
              { label: 'Single', value: 'single', icon: <PlusOutlined /> },
              { label: 'Bulk Add', value: 'bulk', icon: <UnorderedListOutlined /> },
            ]}
          />
        </div>

        {addMode === 'single' ? (
          <Form form={createForm} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
            <Form.Item name="material_name" label="Material Name" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="e.g., Plastic Body Shell" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea placeholder="Description" rows={2} />
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="category" label="Category">
                <Select placeholder="Select category" allowClear showSearch>
                  {allCategories.map((cat) => (
                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="subcategory" label="Subcategory">
                <Input placeholder="e.g. Steel, Copper Wire..." />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="unit_of_measure" label="Unit of Measure">
                <Select placeholder="Select unit" allowClear showSearch>
                  {['pcs', 'kg', 'grams', 'meters', 'liters', 'sets', 'rolls', 'sheets'].map((u) => (
                    <Select.Option key={u} value={u}>{u}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item name="current_stock" label="Initial Stock">
                <InputNumber min={0} className="w-full" placeholder="0" />
              </Form.Item>
              <Form.Item name="min_stock_level" label="Min Stock Level">
                <InputNumber min={0} className="w-full" placeholder="0" />
              </Form.Item>
              <Form.Item name="cost_per_unit" label="Cost Per Unit">
                <InputNumber min={0} className="w-full" placeholder="0.00" step={0.01} />
              </Form.Item>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Create</Button>
            </div>
          </Form>
        ) : (
          <Form
            form={bulkForm}
            layout="vertical"
            onFinish={(values) => {
              const items = (values.items || []).filter((item: any) => item?.material_name);
              if (items.length === 0) {
                message.warning('Add at least one material');
                return;
              }
              bulkCreateMutation.mutate(items);
            }}
          >
            <div className="mb-3 p-3 bg-blue-50 rounded text-sm text-blue-700">
              Add multiple raw materials at once. Fill in the details for each row and click &quot;Create All&quot;.
            </div>
            <Form.List name="items" initialValue={[{}, {}]}>
              {(fields, { add, remove }) => (
                <>
                  <div className="max-h-[400px] overflow-y-auto pr-1">
                    {fields.map(({ key, name, ...restField }, idx) => (
                      <div key={key} className="p-3 mb-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-gray-500">Material #{idx + 1}</span>
                          {fields.length > 1 && (
                            <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)}>
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <Form.Item
                            {...restField}
                            name={[name, 'material_name']}
                            rules={[{ required: true, message: 'Name required' }]}
                            className="!mb-1"
                          >
                            <Input placeholder="Material Name *" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'category']} className="!mb-1">
                            <Select placeholder="Category" allowClear showSearch>
                              {allCategories.map((cat) => (
                                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'unit_of_measure']} className="!mb-1">
                            <Select placeholder="Unit" allowClear showSearch>
                              {['pcs', 'kg', 'grams', 'meters', 'liters', 'sets', 'rolls', 'sheets'].map((u) => (
                                <Select.Option key={u} value={u}>{u}</Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-4 gap-3 mt-1">
                          <Form.Item {...restField} name={[name, 'current_stock']} className="!mb-0">
                            <InputNumber min={0} className="w-full" placeholder="Stock" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'min_stock_level']} className="!mb-0">
                            <InputNumber min={0} className="w-full" placeholder="Min Level" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'cost_per_unit']} className="!mb-0">
                            <InputNumber min={0} className="w-full" placeholder="Cost/Unit" step={0.01} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'description']} className="!mb-0">
                            <Input placeholder="Description" />
                          </Form.Item>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="mt-2 mb-4">
                    Add Another Material
                  </Button>
                </>
              )}
            </Form.List>
            <div className="flex justify-end gap-2">
              <Button onClick={() => { setCreateModalOpen(false); setAddMode('single'); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={bulkCreateMutation.isPending} icon={<PlusOutlined />}>
                Create All
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit - ${editModal.material?.material_name}`}
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, material: null })}
        footer={null}
        maskClosable={false}
      >
        <Form form={editForm} layout="vertical" onFinish={(values) => updateMutation.mutate({ id: editModal.material!.id, ...values })}>
          <Form.Item name="material_name" label="Material Name" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="category" label="Category">
              <Select placeholder="Select category" allowClear showSearch>
                {allCategories.map((cat) => (
                  <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="subcategory" label="Subcategory">
              <Input placeholder="e.g. Steel, Copper Wire..." />
            </Form.Item>
          </div>
          <Form.Item name="unit_of_measure" label="Unit of Measure">
            <Select placeholder="Select unit" allowClear showSearch>
              {['pcs', 'kg', 'grams', 'meters', 'liters', 'sets', 'rolls', 'sheets'].map((u) => (
                <Select.Option key={u} value={u}>{u}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="min_stock_level" label="Min Stock Level">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="cost_per_unit" label="Cost Per Unit">
              <InputNumber min={0} className="w-full" step={0.01} />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditModal({ open: false, material: null })}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Update</Button>
          </div>
        </Form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        title={`Stock Adjustment - ${adjustModal.material?.material_name}`}
        open={adjustModal.open}
        onCancel={() => setAdjustModal({ open: false, material: null })}
        footer={null}
        maskClosable={false}
      >
        {adjustModal.material && (
          <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
            <div>Current Stock: <strong>{adjustModal.material.current_stock}</strong> {adjustModal.material.unit_of_measure}</div>
            <div>Available: <strong>{adjustModal.material.available_stock}</strong> | Reserved: <strong>{adjustModal.material.reserved_stock}</strong></div>
          </div>
        )}
        <Form form={adjustForm} layout="vertical" onFinish={(values) => adjustMutation.mutate({ id: adjustModal.material!.id, ...values })}>
          <Form.Item name="type" label="Adjustment Type" rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="Select type">
              <Select.Option value="purchase">Purchase (Stock In)</Select.Option>
              <Select.Option value="return">Return (Stock In)</Select.Option>
              <Select.Option value="issue">Issue (Stock Out)</Select.Option>
              <Select.Option value="adjustment">Adjustment</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true, message: 'Required' }]}>
            <InputNumber min={0.01} step={0.01} className="w-full" placeholder="Enter quantity" />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} placeholder="Reason for adjustment" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setAdjustModal({ open: false, material: null })}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={adjustMutation.isPending}>Submit</Button>
          </div>
        </Form>
      </Modal>

      {/* Order Material Modal */}
      <Modal
        title="Individual Order from Inventory"
        open={orderModalOpen}
        onCancel={() => { setOrderModalOpen(false); setOrderMode('single'); }}
        footer={null}
        maskClosable={false}
        width={orderMode === 'bulk' ? 850 : 700}
      >
        <div className="mb-4">
          <Segmented
            value={orderMode}
            onChange={(val) => setOrderMode(val as 'single' | 'bulk')}
            options={[
              { label: 'Single', value: 'single', icon: <PlusOutlined /> },
              { label: 'Bulk Select', value: 'bulk', icon: <UnorderedListOutlined /> },
            ]}
          />
        </div>
        <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
          {orderMode === 'single'
            ? 'Select the raw materials you need and specify quantities. This request will be sent to the Procurement team for processing.'
            : 'Enter the order quantity for each material you need from the list below, then send to Procurement.'}
        </div>

        {orderMode === 'single' ? (
          <Form
            form={orderForm}
            layout="vertical"
            onFinish={(values) => {
              const items = (values.items || []).map((item: { rawMaterialId: number; quantity: number; notes?: string }) => ({
                rawMaterialId: item.rawMaterialId,
                quantity: item.quantity,
                notes: item.notes,
              }));
              orderMutation.mutate({ items, notes: values.notes });
            }}
          >
            <Form.List name="items" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="flex gap-3 items-start mb-2 p-3 bg-gray-50 rounded">
                      <Form.Item
                        {...restField}
                        name={[name, 'rawMaterialId']}
                        rules={[{ required: true, message: 'Select material' }]}
                        className="flex-1 !mb-0"
                      >
                        <Select
                          placeholder="Select raw material"
                          showSearch
                          optionFilterProp="children"
                        >
                          {(data?.data || []).filter((m) => m.status === 'active').map((m) => (
                            <Select.Option key={m.id} value={m.id}>
                              {m.material_code} - {m.material_name} (Available: {m.available_stock} {m.unit_of_measure || ''})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Qty required' }]}
                        className="!mb-0"
                        style={{ width: 120 }}
                      >
                        <InputNumber min={0.01} step={0.01} placeholder="Qty" className="w-full" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'notes']}
                        className="!mb-0"
                        style={{ width: 150 }}
                      >
                        <Input placeholder="Notes (optional)" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="mb-4">
                    Add Material
                  </Button>
                </>
              )}
            </Form.List>
            <Form.Item name="notes" label="Order Notes">
              <Input.TextArea rows={2} placeholder="Any additional notes for the procurement team..." />
            </Form.Item>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOrderModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={orderMutation.isPending} icon={<ShoppingCartOutlined />}>
                Send to Procurement
              </Button>
            </div>
          </Form>
        ) : (
          <div>
            <div className="max-h-[400px] overflow-y-auto">
              <Table
                dataSource={(data?.data || []).filter((m) => m.status === 'active')}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Code',
                    dataIndex: 'material_code',
                    key: 'material_code',
                    width: 80,
                    render: (code: string) => <span className="font-mono text-xs">{code}</span>,
                  },
                  {
                    title: 'Material Name',
                    dataIndex: 'material_name',
                    key: 'material_name',
                    ellipsis: true,
                  },
                  {
                    title: 'Available',
                    dataIndex: 'available_stock',
                    key: 'available_stock',
                    width: 90,
                    align: 'right' as const,
                    render: (val: number, record: RawMaterial) => (
                      <span>{val} {record.unit_of_measure || ''}</span>
                    ),
                  },
                  {
                    title: 'Order Qty',
                    key: 'order_qty',
                    width: 120,
                    render: (_: unknown, record: RawMaterial) => (
                      <InputNumber
                        min={0}
                        step={1}
                        placeholder="0"
                        className="w-full"
                        size="small"
                        value={bulkOrderSelected[record.id] || undefined}
                        onChange={(val) => {
                          setBulkOrderSelected((prev) => {
                            const next = { ...prev };
                            if (val && Number(val) > 0) {
                              next[record.id] = Number(val);
                            } else {
                              delete next[record.id];
                            }
                            return next;
                          });
                        }}
                      />
                    ),
                  },
                ]}
              />
            </div>
            <div className="mt-3 mb-3 text-sm text-gray-500">
              {Object.keys(bulkOrderSelected).length > 0
                ? <Tag color="blue">{Object.keys(bulkOrderSelected).length} material(s) selected</Tag>
                : 'Enter quantity for the materials you want to order'}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => { setOrderModalOpen(false); setOrderMode('single'); }}>Cancel</Button>
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                loading={orderMutation.isPending}
                disabled={Object.keys(bulkOrderSelected).length === 0}
                onClick={() => {
                  const items = Object.entries(bulkOrderSelected).map(([rawMaterialId, quantity]) => ({
                    rawMaterialId: Number(rawMaterialId),
                    quantity,
                  }));
                  orderMutation.mutate({ items, notes: 'Bulk order from Inventory' });
                }}
              >
                Send {Object.keys(bulkOrderSelected).length > 0 ? `(${Object.keys(bulkOrderSelected).length})` : ''} to Procurement
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

'use client';

import { Form, Input, Select, Button, Row, Col, Card, InputNumber, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { productSchema, ProductFormValues } from '@/lib/validations/product';
import { getDropdownCategoryList, getDropdownSubCategoryList } from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { Product, DiscountTier } from '@/types/product';
import { useUnits } from '@/hooks/useUnits';
import { useState, useEffect } from 'react';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductFormValues) => void;
  loading?: boolean;
  submitText?: string;
}

export function ProductForm({ initialData, onSubmit, loading, submitText = 'Save Product' }: ProductFormProps) {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const { units } = useUnits();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(initialData?.category_id);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>(initialData?.discount_tiers || []);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: initialData?.category_id,
      subcategory_id: initialData?.subcategory_id,
      product_name: initialData?.product_name || '',
      product_code: initialData?.product_code || '',
      hsn_code: initialData?.hsn_code || '',
      description: initialData?.description || '',
      unit: initialData?.unit || '',
      price: initialData?.price != null ? Number(initialData.price) : undefined,
      gst_rate: initialData?.gst_rate != null ? Number(initialData.gst_rate) : undefined,
      max_discount_percent: initialData?.max_discount_percent != null ? Number(initialData.max_discount_percent) : undefined,
      discount_tiers: (initialData?.discount_tiers || []).map((t) => ({ minQty: Number(t.minQty), discountPercent: Number(t.discountPercent) })),
      status: initialData?.status || 'active',
    },
  });

  const watchCategoryId = watch('category_id');

  useEffect(() => {
    if (watchCategoryId !== selectedCategory) {
      setSelectedCategory(watchCategoryId);
      setValue('subcategory_id', undefined);
    }
  }, [watchCategoryId, selectedCategory, setValue]);

  const { data: categories } = useQuery({
    queryKey: ['categories-dropdown', enterpriseId],
    queryFn: () => getDropdownCategoryList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data: subCategories } = useQuery({
    queryKey: ['subcategories-dropdown', enterpriseId, selectedCategory],
    queryFn: () => getDropdownSubCategoryList(enterpriseId!, selectedCategory!),
    enabled: !!enterpriseId && !!selectedCategory,
  });

  const addTier = () => {
    const updated = [...discountTiers, { minQty: 1, discountPercent: 0 }];
    setDiscountTiers(updated);
    setValue('discount_tiers', updated);
  };

  const updateTier = (index: number, field: keyof DiscountTier, value: number) => {
    const updated = discountTiers.map((t, i) => i === index ? { ...t, [field]: value } : t);
    setDiscountTiers(updated);
    setValue('discount_tiers', updated);
  };

  const removeTier = (index: number) => {
    const updated = discountTiers.filter((_, i) => i !== index);
    setDiscountTiers(updated);
    setValue('discount_tiers', updated);
  };

  const handleFormSubmit = (data: ProductFormValues) => {
    onSubmit({ ...data, discount_tiers: discountTiers });
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(handleFormSubmit)}>
      <Card title="Product Information" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Product Name"
              required
              validateStatus={errors.product_name ? 'error' : ''}
              help={errors.product_name?.message}
            >
              <Controller
                name="product_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter product name" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="SKU ID"
              validateStatus={errors.product_code ? 'error' : ''}
              help={errors.product_code?.message}
            >
              <Controller
                name="product_code"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter SKU ID" size="large" />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Category"
              required
              validateStatus={errors.category_id ? 'error' : ''}
              help={errors.category_id?.message}
            >
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="Select category"
                    size="large"
                    showSearch
                    optionFilterProp="children"
                  >
                    {categories?.data?.map((cat) => (
                      <Select.Option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Subcategory"
              validateStatus={errors.subcategory_id ? 'error' : ''}
              help={errors.subcategory_id?.message}
            >
              <Controller
                name="subcategory_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="Select subcategory"
                    size="large"
                    showSearch
                    allowClear
                    optionFilterProp="children"
                    disabled={!selectedCategory}
                  >
                    {subCategories?.data?.map((sub) => (
                      <Select.Option key={sub.id} value={sub.id}>
                        {sub.subcategory_name}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="HSN Code"
              validateStatus={errors.hsn_code ? 'error' : ''}
              help={errors.hsn_code?.message}
            >
              <Controller
                name="hsn_code"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter HSN code" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Unit"
              validateStatus={errors.unit ? 'error' : ''}
              help={errors.unit?.message}
            >
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Select {...field} placeholder="Select unit" size="large" allowClear showSearch optionFilterProp="children">
                    {units.map((u) => (
                      <Select.Option key={u.id} value={u.short_name}>
                        {u.unit_name} ({u.short_name})
                      </Select.Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Price (₹)"
              validateStatus={errors.price ? 'error' : ''}
              help={errors.price?.message}
            >
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="Enter price"
                    size="large"
                    className="w-full"
                    min={0}
                    precision={2}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="GST Rate (%)"
              validateStatus={errors.gst_rate ? 'error' : ''}
              help={errors.gst_rate?.message}
            >
              <Controller
                name="gst_rate"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="e.g. 18"
                    size="large"
                    className="w-full"
                    min={0}
                    max={100}
                    precision={2}
                    addonAfter="%"
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Max Discount (%)"
              validateStatus={errors.max_discount_percent ? 'error' : ''}
              help={errors.max_discount_percent?.message ?? 'Overall cap on any discount'}
            >
              <Controller
                name="max_discount_percent"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    placeholder="e.g. 15"
                    size="large"
                    className="w-full"
                    min={0}
                    max={100}
                    precision={2}
                    addonAfter="%"
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={18}>
            <Form.Item
              label="Description"
              validateStatus={errors.description ? 'error' : ''}
              help={errors.description?.message}
            >
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Input.TextArea {...field} placeholder="Enter description" rows={3} />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label="Status"
              validateStatus={errors.status ? 'error' : ''}
              help={errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select {...field} size="large">
                    <Select.Option value="active">Active</Select.Option>
                    <Select.Option value="inactive">Inactive</Select.Option>
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Volume Discount Tiers */}
      <Card
        title="Volume Discount Tiers"
        className="mb-4"
        extra={
          <Button type="dashed" icon={<PlusOutlined />} onClick={addTier} size="small">
            Add Tier
          </Button>
        }
      >
        <div className="text-gray-500 text-xs mb-3">
          Set automatic discounts based on order quantity. When a customer orders more, a higher discount is applied automatically in the quotation.
        </div>

        {discountTiers.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-4 text-center text-gray-400 text-sm">
            No tiers yet. Click <strong>Add Tier</strong> to set quantity-based discounts.
            <div className="text-xs mt-1 text-gray-400">Example: Qty ≥ 10 → 5% &nbsp;|&nbsp; Qty ≥ 50 → 8% &nbsp;|&nbsp; Qty ≥ 100 → 12%</div>
          </div>
        ) : (
          <>
            <Table
              dataSource={[...discountTiers].sort((a, b) => a.minQty - b.minQty).map((t, i) => ({ ...t, key: i, _origIndex: discountTiers.indexOf(t) }))}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'When customer orders at least…',
                  dataIndex: 'minQty',
                  render: (val, row: any) => (
                    <InputNumber
                      value={val}
                      min={1}
                      max={999999}
                      precision={0}
                      parser={(v) => v?.replace(/[^\d]/g, '') as any}
                      onChange={(v) => updateTier(row._origIndex, 'minQty', v || 1)}
                      addonAfter="units"
                      style={{ width: 160 }}
                      placeholder="e.g. 10"
                    />
                  ),
                },
                {
                  title: 'Apply this discount',
                  dataIndex: 'discountPercent',
                  render: (val, row: any) => (
                    <InputNumber
                      value={val}
                      min={0}
                      max={100}
                      precision={0}
                      parser={(v) => v?.replace(/[^\d]/g, '') as any}
                      addonAfter="%"
                      onChange={(v) => updateTier(row._origIndex, 'discountPercent', v || 0)}
                      style={{ width: 120 }}
                      placeholder="e.g. 5"
                    />
                  ),
                },
                {
                  title: 'What customer sees',
                  render: (_, row: any) => (
                    <span className="text-green-700 font-medium text-sm">
                      Order {row.minQty}+ units → get {row.discountPercent}% off
                    </span>
                  ),
                },
                {
                  title: '',
                  width: 48,
                  render: (_, row: any) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeTier(row._origIndex)}
                    />
                  ),
                },
              ]}
            />
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
              <strong>How it works in quotations:</strong> When a salesperson selects this product and enters a quantity, the discount field auto-fills based on the above tiers. The salesperson can still manually change the discount, but it cannot exceed the <strong>Max Discount %</strong> set above.
            </div>
          </>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button size="large" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" size="large" loading={loading}>
          {submitText}
        </Button>
      </div>
    </Form>
  );
}

'use client';

import { useState } from 'react';
import { Typography, Card, Form, Select, InputNumber, Input, Button, message, Descriptions, Tag, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addInventory } from '@/lib/api/inventory';
import { getDropdownCategoryList, getSubCategoryList, getDropdownProductsList } from '@/lib/api/products';
import { useAuthStore } from '@/stores/authStore';
import { Product } from '@/types/product';

const { Title, Text } = Typography;

export default function AddInventoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [form] = Form.useForm();

  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories-dropdown', enterpriseId],
    queryFn: () => getDropdownCategoryList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-dropdown', enterpriseId, categoryId],
    queryFn: () => getSubCategoryList(enterpriseId!, categoryId),
    enabled: !!enterpriseId && !!categoryId,
  });

  const { data: products } = useQuery({
    queryKey: ['products-dropdown', enterpriseId, subcategoryId, categoryId],
    queryFn: () => getDropdownProductsList(enterpriseId!, subcategoryId),
    enabled: !!enterpriseId,
  });

  // Filter products by selected category/subcategory client-side for faster UX
  const filteredProducts = products?.data?.filter((p) => {
    if (categoryId && p.category_id !== categoryId) return false;
    if (subcategoryId && p.subcategory_id !== subcategoryId) return false;
    return true;
  }) || [];

  const handleProductSelect = (productId: number) => {
    const product = products?.data?.find((p) => p.id === productId) || null;
    setSelectedProduct(product);
    if (product) {
      form.setFieldsValue({
        product_id: product.id,
        unit: product.unit,
      });
    }
  };

  const handleCategoryChange = (val: number | undefined) => {
    setCategoryId(val);
    setSubcategoryId(undefined);
    setSelectedProduct(null);
    form.setFieldsValue({ subcategory: undefined, product_id: undefined });
  };

  const handleSubcategoryChange = (val: number | undefined) => {
    setSubcategoryId(val);
    setSelectedProduct(null);
    form.setFieldsValue({ product_id: undefined });
  };

  const mutation = useMutation({
    mutationFn: (values: {
      product_id: number;
      quantity: number;
      location?: string;
      min_stock_level?: number;
      max_stock_level?: number;
    }) =>
      addInventory({ ...values, enterprise_id: enterpriseId! }),
    onSuccess: () => {
      message.success('Inventory entry added successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      router.push('/inventory');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to add inventory entry';
      message.error(msg);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/inventory')} type="text" />
        <Title level={4} className="!mb-0">
          Add Stock Entry
        </Title>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2">
          <Card className="card-shadow">
            <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
              <Title level={5} className="!mt-0 !mb-4">Select Product</Title>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                <Form.Item name="category" label="Category">
                  <Select
                    placeholder="Select category"
                    size="large"
                    value={categoryId}
                    onChange={handleCategoryChange}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {categories?.data?.map((cat) => (
                      <Select.Option key={cat.id} value={cat.id}>{cat.category_name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="subcategory" label="Subcategory">
                  <Select
                    placeholder="Select subcategory"
                    size="large"
                    value={subcategoryId}
                    onChange={handleSubcategoryChange}
                    allowClear
                    disabled={!categoryId}
                    showSearch
                    optionFilterProp="children"
                  >
                    {subcategories?.data?.map((sub) => (
                      <Select.Option key={sub.id} value={sub.id}>{sub.subcategory_name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="product_id"
                  label="Product"
                  rules={[{ required: true, message: 'Please select a product' }]}
                >
                  <Select
                    placeholder="Select product"
                    size="large"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleProductSelect}
                  >
                    {filteredProducts.map((product) => (
                      <Select.Option key={product.id} value={product.id}>
                        {product.product_name} {product.product_code ? `[${product.product_code}]` : ''}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <Divider />
              <Title level={5} className="!mt-0 !mb-4">Stock Details</Title>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Form.Item
                  name="quantity"
                  label="Quantity"
                  rules={[{ required: true, message: 'Please enter quantity' }]}
                >
                  <InputNumber
                    min={0}
                    className="w-full"
                    size="large"
                    placeholder="Enter quantity"
                    addonAfter={selectedProduct?.unit || 'units'}
                  />
                </Form.Item>

                <Form.Item name="location" label="Storage Location">
                  <Input placeholder="e.g., Warehouse A, Shelf B2" size="large" />
                </Form.Item>

                <Form.Item name="min_stock_level" label="Minimum Stock Level">
                  <InputNumber min={0} className="w-full" size="large" placeholder="Low stock alert threshold" />
                </Form.Item>

                <Form.Item name="max_stock_level" label="Maximum Stock Level">
                  <InputNumber min={0} className="w-full" size="large" placeholder="Overstock alert threshold" />
                </Form.Item>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button size="large" onClick={() => router.push('/inventory')}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" size="large" loading={mutation.isPending} disabled={!selectedProduct}>
                  Add Stock Entry
                </Button>
              </div>
            </Form>
          </Card>
        </div>

        {/* Right: Product Info Card */}
        <div>
          <Card className="card-shadow" title="Product Information">
            {selectedProduct ? (
              <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500, color: '#666' }}>
                <Descriptions.Item label="Product Name">{selectedProduct.product_name}</Descriptions.Item>
                {selectedProduct.product_code && (
                  <Descriptions.Item label="SKU ID">
                    <Tag color="blue">{selectedProduct.product_code}</Tag>
                  </Descriptions.Item>
                )}
                {selectedProduct.category_name && (
                  <Descriptions.Item label="Category">{selectedProduct.category_name}</Descriptions.Item>
                )}
                {selectedProduct.subcategory_name && (
                  <Descriptions.Item label="Subcategory">{selectedProduct.subcategory_name}</Descriptions.Item>
                )}
                {selectedProduct.hsn_code && (
                  <Descriptions.Item label="HSN Code">
                    <Tag>{selectedProduct.hsn_code}</Tag>
                  </Descriptions.Item>
                )}
                {selectedProduct.unit && (
                  <Descriptions.Item label="Unit">{selectedProduct.unit}</Descriptions.Item>
                )}
                {selectedProduct.price !== undefined && selectedProduct.price !== null && (
                  <Descriptions.Item label="Price">
                    {Number(selectedProduct.price).toFixed(2)}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <div className="text-center py-8">
                <Text type="secondary">Select a product to view its details</Text>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

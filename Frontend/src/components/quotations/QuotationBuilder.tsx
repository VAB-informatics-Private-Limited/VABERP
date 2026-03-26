'use client';

import { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Button, Card, Table, InputNumber, Select, Row, Col, Divider, message, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { QuotationFormData, QuotationItem, Quotation } from '@/types/quotation';
import { getDropdownProductsList } from '@/lib/api/products';
import { getCustomerList } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

interface QuotationBuilderProps {
  initialData?: Quotation;
  onSubmit: (data: QuotationFormData) => void;
  loading: boolean;
  submitText: string;
  isEdit?: boolean;
}

export function QuotationBuilder({ initialData, onSubmit, loading, submitText, isEdit }: QuotationBuilderProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const [items, setItems] = useState<QuotationItem[]>(initialData?.items || []);
  const [selectedProduct, setSelectedProduct] = useState<number | undefined>();

  const { data: products } = useQuery({
    queryKey: ['products-dropdown', enterpriseId],
    queryFn: () => getDropdownProductsList(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-dropdown', enterpriseId],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, pageSize: 1000 }),
    enabled: !!enterpriseId,
  });

  const calculateItemTotal = (item: QuotationItem): number => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = item.discount_percent ? (subtotal * item.discount_percent) / 100 : (item.discount_amount || 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = item.tax_percent ? (afterDiscount * item.tax_percent) / 100 : 0;
    return afterDiscount + taxAmount;
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      message.warning('Please select a product');
      return;
    }

    const product = products?.data?.find((p) => p.id === selectedProduct);
    if (!product) return;

    const existingItem = items.find((i) => i.product_id === selectedProduct);
    if (existingItem) {
      message.warning('Product already added. Update quantity instead.');
      return;
    }

    const newItem: QuotationItem = {
      product_id: product.id,
      product_name: product.product_name,
      product_code: product.product_code,
      hsn_code: product.hsn_code,
      unit: product.unit,
      quantity: 1,
      unit_price: Number(product.price) || 0,
      discount_percent: 0,
      tax_percent: 18, // Default GST
      total_amount: Number(product.price) || 0,
    };

    newItem.total_amount = calculateItemTotal(newItem);
    setItems([...items, newItem]);
    setSelectedProduct(undefined);
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    updatedItems[index].total_amount = calculateItemTotal(updatedItems[index]);
    setItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    const discountAmount = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      return sum + (item.discount_percent ? (itemSubtotal * Number(item.discount_percent)) / 100 : Number(item.discount_amount || 0));
    }, 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      const itemDiscount = item.discount_percent ? (itemSubtotal * Number(item.discount_percent)) / 100 : Number(item.discount_amount || 0);
      const afterDiscount = itemSubtotal - itemDiscount;
      return sum + (item.tax_percent ? (afterDiscount * Number(item.tax_percent)) / 100 : 0);
    }, 0);
    const totalAmount = subtotal - discountAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  const totals = calculateTotals();

  const handleFinish = (values: QuotationFormData & { quotation_date?: dayjs.Dayjs; valid_until?: dayjs.Dayjs }) => {
    if (items.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    const formData: QuotationFormData = {
      ...values,
      quotation_date: values.quotation_date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
      valid_until: values.valid_until?.format('YYYY-MM-DD'),
      items,
    };
    onSubmit(formData);
  };

  const handleCustomerSelect = (customerId: number) => {
    const customer = customers?.data?.find((c) => c.id === customerId);
    if (customer) {
      form.setFieldsValue({
        customer_name: customer.customer_name,
        customer_mobile: customer.mobile,
        customer_email: customer.email,
        business_name: customer.business_name,
        billing_address: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
      });
    }
  };

  const itemColumns: ColumnsType<QuotationItem> = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          {record.product_code && <div className="text-gray-500 text-sm">SKU: {record.product_code}</div>}
        </div>
      ),
    },
    {
      title: 'HSN',
      dataIndex: 'hsn_code',
      key: 'hsn_code',
      render: (text) => text || '-',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (_, record, index) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => handleUpdateItem(index, 'quantity', value || 1)}
          size="small"
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (_, record, index) => (
        <InputNumber
          min={0}
          value={record.unit_price}
          onChange={(value) => handleUpdateItem(index, 'unit_price', value || 0)}
          prefix="₹"
          size="small"
        />
      ),
    },
    {
      title: 'Disc %',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      width: 80,
      render: (_, record, index) => (
        <InputNumber
          min={0}
          max={100}
          value={record.discount_percent}
          onChange={(value) => handleUpdateItem(index, 'discount_percent', value || 0)}
          size="small"
        />
      ),
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_percent',
      key: 'tax_percent',
      width: 80,
      render: (_, record, index) => (
        <InputNumber
          min={0}
          max={100}
          value={record.tax_percent}
          onChange={(value) => handleUpdateItem(index, 'tax_percent', value || 0)}
          size="small"
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `₹${Number(amount).toLocaleString('en-IN')}`,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, __, index) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        />
      ),
    },
  ];

  const initialValues = initialData
    ? {
        ...initialData,
        quotation_date: initialData.quotation_date ? dayjs(initialData.quotation_date) : dayjs(),
        valid_until: initialData.valid_until ? dayjs(initialData.valid_until) : undefined,
      }
    : {
        quotation_date: dayjs(),
        valid_until: dayjs().add(30, 'day'),
        status: 'draft',
      };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={initialValues}>
      <div className="mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/quotations')}>
          Back to Quotations
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title="Customer Details" className="card-shadow mb-4">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Select Existing Customer">
                  <Select
                    placeholder="Select customer"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleCustomerSelect}
                    allowClear
                  >
                    {customers?.data?.map((customer) => (
                      <Select.Option key={customer.id} value={customer.id}>
                        {customer.customer_name} - {customer.mobile}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_name"
                  label="Customer Name"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="Enter customer name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_mobile"
                  label="Mobile"
                  rules={[
                    { required: true, message: 'Required' },
                    { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
                  ]}
                >
                  <Input placeholder="Enter mobile" maxLength={10} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="customer_email" label="Email">
                  <Input placeholder="Enter email" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="business_name" label="Business Name">
                  <Input placeholder="Enter business name" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="billing_address" label="Billing Address">
              <Input.TextArea rows={2} placeholder="Enter billing address" />
            </Form.Item>

            <Form.Item name="shipping_address" label="Shipping Address">
              <Input.TextArea rows={2} placeholder="Enter shipping address (if different)" />
            </Form.Item>
          </Card>

          <Card title="Items" className="card-shadow mb-4">
            <div className="flex gap-2 mb-4">
              <Select
                placeholder="Select product to add"
                showSearch
                optionFilterProp="children"
                value={selectedProduct}
                onChange={setSelectedProduct}
                style={{ flex: 1 }}
              >
                {products?.data?.map((product) => (
                  <Select.Option key={product.id} value={product.id}>
                    {product.product_name} {product.product_code && `[${product.product_code}]`} - ₹{product.price}
                  </Select.Option>
                ))}
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>
                Add
              </Button>
            </div>

            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey={(record, index) => `${record.product_id}-${index}`}
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />

            <Divider />

            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 text-red-600">
                  <span>Discount:</span>
                  <span>-₹{totals.discountAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tax:</span>
                  <span>₹{totals.taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between py-1 font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{totals.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Quotation Details" className="card-shadow mb-4">
            <Form.Item
              name="quotation_date"
              label="Quotation Date"
              rules={[{ required: true, message: 'Required' }]}
            >
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>

            <Form.Item name="valid_until" label="Valid Until">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>

            <Form.Item name="status" label="Status">
              <Select>
                <Select.Option value="draft">Draft</Select.Option>
                <Select.Option value="sent">Sent</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} placeholder="Additional notes" />
            </Form.Item>

            <Form.Item name="terms_conditions" label="Terms & Conditions">
              <Input.TextArea rows={4} placeholder="Terms and conditions" />
            </Form.Item>
          </Card>

          <Space direction="vertical" className="w-full">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              {submitText}
            </Button>
            <Button block onClick={() => router.push('/quotations')}>
              Cancel
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );
}

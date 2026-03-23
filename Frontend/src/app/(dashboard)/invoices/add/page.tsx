'use client';

import { Typography, Card, Form, Input, InputNumber, Select, DatePicker, Button, Row, Col, Table, Space, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { createInvoice } from '@/lib/api/invoices';
import { getCustomerList } from '@/lib/api/customers';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

const fmt = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface LineItem {
  key: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  line_total: number;
}

export default function AddInvoicePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [items, setItems] = useState<LineItem[]>([
    { key: '1', item_name: '', quantity: 1, unit_price: 0, tax_percent: 0, line_total: 0 },
  ]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, pageSize: 500 }),
    enabled: !!enterpriseId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createInvoice(data),
    onSuccess: (result) => {
      message.success('Invoice created successfully');
      router.push(`/invoices/${result.data?.id}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to create invoice');
    },
  });

  const addItem = () => {
    setItems([...items, { key: Date.now().toString(), item_name: '', quantity: 1, unit_price: 0, tax_percent: 0, line_total: 0 }]);
  };

  const removeItem = (key: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.key !== key));
    }
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(items.map((item) => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      const subtotal = updated.quantity * updated.unit_price;
      const tax = (subtotal * (updated.tax_percent || 0)) / 100;
      updated.line_total = subtotal + tax;
      return updated;
    }));
  };

  const subTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxTotal = items.reduce((sum, item) => {
    const sub = item.quantity * item.unit_price;
    return sum + (sub * (item.tax_percent || 0)) / 100;
  }, 0);

  const handleSubmit = (values: any) => {
    const customer = customersData?.data?.find((c) => c.id === values.customer_id);
    createMutation.mutate({
      customer_id: values.customer_id,
      customer_name: customer?.customer_name || values.customer_name,
      billing_address: values.billing_address,
      invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
      due_date: values.due_date?.format('YYYY-MM-DD'),
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      shipping_charges: values.shipping_charges,
      terms_conditions: values.terms_conditions,
      notes: values.notes,
      items: items.filter((i) => i.item_name).map((item, idx) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percent: item.tax_percent,
        sort_order: idx,
      })),
    });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/invoices')}>Back</Button>
        <Title level={4} className="!mb-0">Create Invoice</Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ invoice_date: dayjs() }}>
        <Card title="Customer & Dates" className="card-shadow mb-4">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="customer_id" label="Customer" rules={[{ required: true, message: 'Please select customer' }]}>
                <Select showSearch placeholder="Select customer" optionFilterProp="children"
                  onChange={(val) => {
                    const customer = customersData?.data?.find((c) => c.id === val);
                    if (customer) {
                      form.setFieldsValue({
                        customer_name: customer.customer_name,
                        billing_address: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', '),
                      });
                    }
                  }}
                >
                  {(customersData?.data || []).map((c) => (
                    <Select.Option key={c.id} value={c.id}>{c.customer_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="invoice_date" label="Invoice Date">
                <DatePicker className="w-full" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker className="w-full" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="customer_name" hidden><Input /></Form.Item>
          <Form.Item name="billing_address" label="Billing Address">
            <Input.TextArea rows={2} placeholder="Billing address" />
          </Form.Item>
        </Card>

        <Card title="Line Items" className="card-shadow mb-4" extra={<Button icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>}>
          <Table
            dataSource={items}
            rowKey="key"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Item Name', dataIndex: 'item_name', key: 'item_name',
                render: (_, record) => <Input value={record.item_name} onChange={(e) => updateItem(record.key, 'item_name', e.target.value)} placeholder="Item name" />,
              },
              {
                title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80,
                render: (_, record) => <InputNumber min={1} value={record.quantity} onChange={(v) => updateItem(record.key, 'quantity', v || 1)} />,
              },
              {
                title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', width: 140,
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    precision={2}
                    value={record.unit_price}
                    onChange={(v) => updateItem(record.key, 'unit_price', v || 0)}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    // @ts-ignore
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
                    style={{ width: '100%' }}
                  />
                ),
              },
              {
                title: 'Tax %', dataIndex: 'tax_percent', key: 'tax_percent', width: 80,
                render: (_, record) => <InputNumber min={0} max={100} value={record.tax_percent} onChange={(v) => updateItem(record.key, 'tax_percent', v || 0)} />,
              },
              {
                title: 'Tax Amt', key: 'tax_amount', width: 110, align: 'right' as const,
                render: (_, record) => {
                  const tax = (record.quantity * record.unit_price * (record.tax_percent || 0)) / 100;
                  return `₹${fmt(tax)}`;
                },
              },
              {
                title: 'Amount', key: 'amount', width: 120, align: 'right' as const,
                render: (_, record) => `₹${fmt(record.quantity * record.unit_price)}`,
              },
              {
                title: '', key: 'actions', width: 50,
                render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} />,
              },
            ]}
          />
          <div className="mt-4 text-right space-y-1">
            <div className="text-gray-600">Sub Total: <span className="font-medium text-black">₹{fmt(subTotal)}</span></div>
            <div className="text-gray-600">Tax: <span className="font-medium text-black">₹{fmt(taxTotal)}</span></div>
            <div className="text-lg font-bold border-t pt-2 mt-2">Grand Total: ₹{fmt(subTotal + taxTotal)}</div>
          </div>
        </Card>

        <Card title="Additional Details" className="card-shadow mb-4">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="discount_type" label="Discount Type">
                <Select placeholder="Select" allowClear>
                  <Select.Option value="percentage">Percentage</Select.Option>
                  <Select.Option value="amount">Amount</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="discount_value" label="Discount Value">
                <InputNumber
                  min={0}
                  className="w-full"
                  precision={2}
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  // @ts-ignore
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="shipping_charges" label="Shipping Charges">
                <InputNumber
                  min={0}
                  className="w-full"
                  precision={2}
                  prefix="₹"
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  // @ts-ignore
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="terms_conditions" label="Terms & Conditions">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>

        <div className="flex justify-end gap-2">
          <Button onClick={() => router.push('/invoices')}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Create Invoice</Button>
        </div>
      </Form>
    </div>
  );
}

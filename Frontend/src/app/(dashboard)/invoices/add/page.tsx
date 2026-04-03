'use client';

import { Typography, Card, Form, Input, InputNumber, Select, DatePicker, Button, Row, Col, Table, Space, message, Alert, Spin, Descriptions, Tag } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { createInvoice } from '@/lib/api/invoices';
import { createInvoiceFromSO } from '@/lib/api/sales-orders';
import { getCustomerList } from '@/lib/api/customers';
import { getSalesOrderById } from '@/lib/api/sales-orders';
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
  const searchParams = useSearchParams();
  const salesOrderId = searchParams.get('salesOrderId') ? Number(searchParams.get('salesOrderId')) : null;

  const [form] = Form.useForm();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [items, setItems] = useState<LineItem[]>([
    { key: '1', item_name: '', quantity: 1, unit_price: 0, tax_percent: 0, line_total: 0 },
  ]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, pageSize: 500 }),
    enabled: !!enterpriseId && !salesOrderId,
  });

  // Fetch SO data when salesOrderId is in URL
  const { data: soData, isLoading: soLoading } = useQuery({
    queryKey: ['so-for-invoice', salesOrderId],
    queryFn: () => getSalesOrderById(salesOrderId!),
    enabled: !!salesOrderId,
  });

  const so = soData?.data;

  // ── Standalone form handlers ──
  useEffect(() => {
    if (so) {
      form.setFieldsValue({
        customer_id: so.customer_id,
        customer_name: so.customer_name,
        billing_address: so.billing_address || '',
      });
    }
  }, [so, form]);

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

  // ── SO quick-generate handler ──
  const generateFromSOMutation = useMutation({
    mutationFn: () =>
      createInvoiceFromSO(salesOrderId!, {
        amount: Number(so?.remaining_amount ?? so?.grand_total ?? 0),
        invoiceDate: dayjs().format('YYYY-MM-DD'),
      }),
    onSuccess: (result: any) => {
      message.success('Invoice generated successfully');
      const id = result?.data?.id ?? result?.data?.invoice?.id;
      if (id) {
        router.push(`/invoices/${id}`);
      } else {
        router.push('/invoices');
      }
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to generate invoice');
    },
  });

  const addItem = () => {
    setItems([...items, { key: Date.now().toString(), item_name: '', quantity: 1, unit_price: 0, tax_percent: 0, line_total: 0 }]);
  };

  const removeItem = (key: string) => {
    if (items.length > 1) setItems(items.filter((i) => i.key !== key));
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

  const discountType = Form.useWatch('discount_type', form);
  const discountValue = Form.useWatch('discount_value', form) || 0;
  const shippingCharges = Form.useWatch('shipping_charges', form) || 0;

  const subTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxTotal = items.reduce((sum, item) => {
    const sub = item.quantity * item.unit_price;
    return sum + (sub * (item.tax_percent || 0)) / 100;
  }, 0);

  const discountAmount =
    discountType === 'percentage'
      ? (subTotal * discountValue) / 100
      : discountType === 'amount'
      ? discountValue
      : 0;

  const grandTotal = subTotal - discountAmount + taxTotal + Number(shippingCharges);

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

  // ════════════════════════════════════════════════
  // SALES ORDER MODE — quick generate, no manual form
  // ════════════════════════════════════════════════
  if (salesOrderId) {
    if (soLoading) {
      return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
    }

    if (!so) {
      return (
        <div className="text-center py-8">
          <Title level={4}>Sales Order not found</Title>
          <Button onClick={() => router.push('/invoices')}>Back to Invoices</Button>
        </div>
      );
    }

    const remaining = Number(so.remaining_amount ?? 0);
    const alreadyInvoiced = Number(so.invoiced_amount ?? 0);
    const fullyInvoiced = remaining <= 0;

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/invoices')}>Back</Button>
          <Title level={4} className="!mb-0">Generate Invoice</Title>
        </div>

        <Card className="card-shadow max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileTextOutlined className="text-blue-600 text-lg" />
            </div>
            <div>
              <div className="font-semibold text-base">{so.order_number}</div>
              <div className="text-gray-500 text-sm">{so.customer_name}</div>
            </div>
          </div>

          <Descriptions bordered size="small" column={1} className="mb-6">
            <Descriptions.Item label="PO Number">{so.order_number}</Descriptions.Item>
            <Descriptions.Item label="Customer">{so.customer_name}</Descriptions.Item>
            <Descriptions.Item label="PO Total">
              <span className="font-semibold">₹{fmt(Number(so.grand_total))}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Already Invoiced">
              <span className={alreadyInvoiced > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                ₹{fmt(alreadyInvoiced)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Amount to Invoice">
              {fullyInvoiced ? (
                <Tag color="green">Fully Invoiced</Tag>
              ) : (
                <span className="font-bold text-green-700 text-base">₹{fmt(remaining)}</span>
              )}
            </Descriptions.Item>
          </Descriptions>

          {fullyInvoiced ? (
            <Alert
              type="success"
              message="This PO has been fully invoiced. No remaining amount to invoice."
              showIcon
              className="mb-4"
            />
          ) : (
            <Alert
              type="info"
              message={`An invoice for ₹${fmt(remaining)} will be generated for ${so.customer_name}.`}
              showIcon
              className="mb-4"
            />
          )}

          <div className="flex gap-3 justify-end">
            <Button onClick={() => router.push('/invoices')}>Cancel</Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={generateFromSOMutation.isPending}
              disabled={fullyInvoiced}
              onClick={() => generateFromSOMutation.mutate()}
              size="large"
            >
              Generate Invoice
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // STANDALONE MODE — manual form
  // ════════════════════════════════════════════════
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/invoices')}>Back</Button>
        <Title level={4} className="!mb-0">Create Invoice</Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ invoice_date: dayjs(), due_date: dayjs() }}>
        <Card title="Customer & Dates" className="card-shadow mb-4">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="customer_id" label="Customer" rules={[{ required: true, message: 'Please select customer' }]}>
                <Select
                  showSearch
                  placeholder="Select customer"
                  optionFilterProp="children"
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
                <DatePicker className="w-full" format="DD-MM-YYYY" disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker className="w-full" format="DD-MM-YYYY" disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
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
                render: (_, record) => (
                  <Input value={record.item_name} onChange={(e) => updateItem(record.key, 'item_name', e.target.value)} placeholder="Item name" />
                ),
              },
              {
                title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80,
                render: (_, record) => (
                  <InputNumber min={1} value={record.quantity} onChange={(v) => updateItem(record.key, 'quantity', v || 1)} />
                ),
              },
              {
                title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', width: 140,
                render: (_, record) => (
                  <InputNumber
                    min={0} precision={2} value={record.unit_price}
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
                render: (_, record) => (
                  <InputNumber min={0} max={100} value={record.tax_percent} onChange={(v) => updateItem(record.key, 'tax_percent', v || 0)} />
                ),
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
                render: (_, record) => (
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} />
                ),
              },
            ]}
          />

          <div className="mt-4 flex justify-end">
            <table className="text-sm" style={{ minWidth: 260 }}>
              <tbody>
                <tr>
                  <td className="pr-8 py-1 text-gray-500 text-right">Sub Total</td>
                  <td className="text-right font-medium">₹{fmt(subTotal)}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr>
                    <td className="pr-8 py-1 text-gray-500 text-right">
                      Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}
                    </td>
                    <td className="text-right text-red-500">−₹{fmt(discountAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td className="pr-8 py-1 text-gray-500 text-right">Tax</td>
                  <td className="text-right">₹{fmt(taxTotal)}</td>
                </tr>
                {Number(shippingCharges) > 0 && (
                  <tr>
                    <td className="pr-8 py-1 text-gray-500 text-right">Shipping</td>
                    <td className="text-right">₹{fmt(Number(shippingCharges))}</td>
                  </tr>
                )}
                <tr className="border-t">
                  <td className="pr-8 pt-2 text-right font-bold text-base">Grand Total</td>
                  <td className="pt-2 text-right font-bold text-base text-blue-700">₹{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Additional Details" className="card-shadow mb-4">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="discount_type" label="Discount Type">
                <Select placeholder="Select" allowClear>
                  <Select.Option value="percentage">Percentage</Select.Option>
                  <Select.Option value="amount">Fixed Amount</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="discount_value" label="Discount Value">
                <InputNumber
                  min={0} className="w-full" precision={2}
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  // @ts-ignore
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="shipping_charges" label="Shipping Charges">
                <InputNumber
                  min={0} className="w-full" precision={2} prefix="₹"
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

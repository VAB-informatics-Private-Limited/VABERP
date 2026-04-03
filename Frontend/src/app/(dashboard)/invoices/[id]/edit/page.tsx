'use client';

import { Typography, Card, Form, Input, InputNumber, Select, DatePicker, Button, Row, Col, Table, Space, message, Alert, Spin } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getInvoiceById, updateInvoice } from '@/lib/api/invoices';
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

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);

  const [form] = Form.useForm();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [items, setItems] = useState<LineItem[]>([]);

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomerList({ enterpriseId: enterpriseId!, pageSize: 500 }),
    enabled: !!enterpriseId,
  });

  const invoice = invoiceData?.data;

  // Pre-fill form when invoice loads
  useEffect(() => {
    if (invoice) {
      form.setFieldsValue({
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        billing_address: invoice.billing_address,
        invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
        due_date: invoice.due_date ? dayjs(invoice.due_date) : undefined,
        discount_type: invoice.discount_type,
        discount_value: invoice.discount_value ? Number(invoice.discount_value) : undefined,
        shipping_charges: invoice.shipping_charges ? Number(invoice.shipping_charges) : undefined,
        terms_conditions: invoice.terms_conditions,
        notes: invoice.notes,
      });
      setItems(
        (invoice.items || []).map((item, idx) => ({
          key: String(idx),
          item_name: item.item_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          tax_percent: Number(item.tax_percent || 0),
          line_total: Number(item.line_total || 0),
        }))
      );
    }
  }, [invoice, form]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateInvoice(invoiceId, data),
    onSuccess: () => {
      message.success('Invoice updated successfully');
      router.push(`/invoices/${invoiceId}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to update invoice');
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
    updateMutation.mutate({
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Invoice not found</Title>
        <Button onClick={() => router.push('/invoices')}>Back to Invoices</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/invoices/${invoiceId}`)}>Back</Button>
        <Title level={4} className="!mb-0">Edit Invoice — {invoice.invoice_number}</Title>
      </div>

      <Alert
        className="mb-4"
        type="warning"
        icon={<LockOutlined />}
        showIcon
        message="Editing is only allowed when no payments have been recorded. Once a payment is added, the invoice will be locked."
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card title="Customer & Dates" className="card-shadow mb-4">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="customer_id" label="Customer">
                <Select showSearch placeholder="Select customer" optionFilterProp="children" disabled>
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
          <Button onClick={() => router.push(`/invoices/${invoiceId}`)}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save Changes</Button>
        </div>
      </Form>
    </div>
  );
}

'use client';

import { Typography, Card, Descriptions, Tag, Button, Space, Modal, Form, InputNumber, Select, Input, DatePicker, Table, message, Spin, Row, Col } from 'antd';
import { ArrowLeftOutlined, DollarOutlined, PrinterOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getInvoiceById, recordPayment } from '@/lib/api/invoices';
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/types/invoice';
import type { Payment, PaymentFormData } from '@/types/invoice';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const fmt = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);
  const queryClient = useQueryClient();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(invoiceId, data),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPaymentModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to record payment');
    },
  });

  const invoice = invoiceData?.data;

  const getStatusColor = (s: string) => INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  const handlePaymentSubmit = (values: any) => {
    paymentMutation.mutate({
      amount: values.amount,
      payment_method: values.payment_method,
      payment_date: values.payment_date?.format('YYYY-MM-DD'),
      reference_number: values.reference_number,
      notes: values.notes,
    });
  };

  const paymentColumns: ColumnsType<Payment> = [
    { title: 'Payment #', dataIndex: 'payment_number', key: 'payment_number' },
    { title: 'Date', dataIndex: 'payment_date', key: 'payment_date' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    { title: 'Method', dataIndex: 'payment_method', key: 'payment_method', render: (v) => v?.replace('_', ' ').toUpperCase() },
    { title: 'Reference', dataIndex: 'reference_number', key: 'reference_number', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'completed' ? 'green' : 'orange'}>{s}</Tag> },
  ];

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
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/invoices')}>Back</Button>
          <Title level={4} className="!mb-0">
            {invoice.invoice_number}
          </Title>
          <Tag color={getStatusColor(invoice.status)}>{getStatusLabel(invoice.status)}</Tag>
        </div>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
          {invoice.status !== 'fully_paid' && invoice.status !== 'cancelled' && Number(invoice.balance_due) > 0 && (
            <Button type="primary" icon={<DollarOutlined />} onClick={() => {
              form.setFieldsValue({ payment_date: dayjs() });
              setPaymentModalOpen(true);
            }}>
              Record Payment
            </Button>
          )}
        </Space>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <Title level={3} className="!mb-1">{invoice.invoice_number}</Title>
        <Tag color={getStatusColor(invoice.status)}>{getStatusLabel(invoice.status)}</Tag>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Invoice Details" className="card-shadow mb-4">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Invoice Number">{invoice.invoice_number}</Descriptions.Item>
              <Descriptions.Item label="Invoice Date">{invoice.invoice_date}</Descriptions.Item>
              <Descriptions.Item label="Customer">{invoice.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{invoice.due_date || '-'}</Descriptions.Item>
              {invoice.billing_address && (
                <Descriptions.Item label="Billing Address" span={2}>{invoice.billing_address}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Line Items" className="card-shadow mb-4">
            <Table
              dataSource={invoice.items || []}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
              columns={[
                { title: '#', key: 'index', width: 50, render: (_, __, i) => i + 1 },
                { title: 'Item', dataIndex: 'item_name', key: 'item_name' },
                { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60, align: 'center' as const },
                { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', align: 'right' as const, render: (v) => `₹${fmt(Number(v))}` },
                { title: 'Tax %', dataIndex: 'tax_percent', key: 'tax_percent', width: 70, align: 'center' as const, render: (v) => `${v || 0}%` },
                { title: 'Tax Amt', dataIndex: 'tax_amount', key: 'tax_amount', align: 'right' as const, render: (v) => `₹${fmt(Number(v || 0))}` },
                {
                  title: 'Amount',
                  dataIndex: 'line_total',
                  key: 'line_total',
                  align: 'right' as const,
                  render: (v: any) => `₹${fmt(Number(v || 0))}`,
                },
              ]}
              summary={() => (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} className="text-right font-medium">Sub Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} className="text-right">₹{fmt(Number(invoice.sub_total))}</Table.Summary.Cell>
                  </Table.Summary.Row>
                  {Number(invoice.discount_amount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} className="text-right">Discount</Table.Summary.Cell>
                      <Table.Summary.Cell index={6} className="text-right text-red-500">-₹{fmt(Number(invoice.discount_amount))}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} className="text-right">Tax</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} className="text-right">₹{fmt(Number(invoice.tax_amount))}</Table.Summary.Cell>
                  </Table.Summary.Row>
                  {Number(invoice.shipping_charges) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} className="text-right">Shipping</Table.Summary.Cell>
                      <Table.Summary.Cell index={6} className="text-right">₹{fmt(Number(invoice.shipping_charges))}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} className="text-right font-bold text-base">Grand Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} className="text-right font-bold text-base">₹{fmt(Number(invoice.grand_total))}</Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Payment Summary" className="card-shadow mb-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Grand Total:</span>
                <span className="font-bold">₹{fmt(Number(invoice.grand_total))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paid:</span>
                <span className="font-bold text-green-600">₹{fmt(Number(invoice.total_paid))}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-base">Balance Due:</span>
                <span className={`font-bold text-lg ${Number(invoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{fmt(Number(invoice.balance_due))}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Payment History" className="card-shadow print:hidden">
            {(invoice.payments || []).length === 0 ? (
              <div className="text-center text-gray-400 py-4">No payments recorded yet</div>
            ) : (
              <Table
                dataSource={invoice.payments || []}
                columns={paymentColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Record Payment"
        open={paymentModalOpen}
        onCancel={() => { setPaymentModalOpen(false); form.resetFields(); }}
        footer={null}
        maskClosable={false}
      >
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="text-sm text-gray-600">Balance Due</div>
          <div className="text-xl font-bold text-red-600">₹{fmt(Number(invoice.balance_due))}</div>
        </div>
        <Form form={form} layout="vertical" onFinish={handlePaymentSubmit}>
          <Form.Item
            name="amount"
            label="Payment Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
            ]}
          >
            <InputNumber
              className="w-full"
              prefix="₹"
              precision={2}
              max={Number(invoice.balance_due)}
              placeholder="Enter payment amount"
              formatter={(value) =>
                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
              }
              // @ts-ignore
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
            />
          </Form.Item>
          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select placeholder="Select method">
              {PAYMENT_METHOD_OPTIONS.map((m) => (
                <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="payment_date" label="Payment Date">
            <DatePicker className="w-full" format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference Number">
            <Input placeholder="Cheque No. / Transaction ID" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Payment notes" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setPaymentModalOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={paymentMutation.isPending}>
              Record Payment
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import { Typography, Card, Descriptions, Tag, Button, Space, Modal, Form, InputNumber, Select, Input, DatePicker, Table, message, Spin, Row, Col } from 'antd';
import { ArrowLeftOutlined, DollarOutlined, PrinterOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getInvoiceById, recordPayment, getCustomerBalance, getInvoiceList } from '@/lib/api/invoices';
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/types/invoice';
import type { Invoice, Payment, PaymentFormData } from '@/types/invoice';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores/authStore';
import { Enterprise } from '@/types';

const { Title } = Typography;

const fmt = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return dayjs(d).format('DD-MM-YYYY');
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);
  const queryClient = useQueryClient();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { user } = useAuthStore();
  const businessName = (user as Enterprise)?.business_name || 'Your Company';

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });

  const invoice = invoiceData?.data;

  const { data: customerBalanceData } = useQuery({
    queryKey: ['customerBalance', invoice?.customer_name],
    queryFn: () => getCustomerBalance(invoice!.customer_name),
    enabled: !!invoice?.customer_name,
  });

  // All invoices for this customer
  const { data: customerInvoicesData } = useQuery({
    queryKey: ['customerInvoices', invoice?.customer_name],
    queryFn: () => getInvoiceList({ search: invoice!.customer_name, pageSize: 200 }),
    enabled: !!invoice?.customer_name,
  });

  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(invoiceId, data),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customerInvoices', invoice?.customer_name] });
      queryClient.invalidateQueries({ queryKey: ['customerBalance', invoice?.customer_name] });
      setPaymentModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to record payment');
    },
  });

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
    { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', render: (v) => fmtDate(v) },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    { title: 'Method', dataIndex: 'payment_method', key: 'payment_method', render: (v) => v?.replace(/_/g, ' ').toUpperCase() },
    { title: 'Reference', dataIndex: 'reference_number', key: 'reference_number', render: (v) => v || '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'completed' ? 'green' : 'orange'}>{s}</Tag> },
  ];

  const customerInvoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (v, rec) => (
        <a
          className={`font-medium ${rec.id === invoiceId ? 'text-blue-600 underline' : 'text-gray-800 hover:text-blue-600'}`}
          onClick={() => rec.id !== invoiceId && router.push(`/invoices/${rec.id}`)}
        >
          {v} {rec.id === invoiceId && <span className="text-xs text-blue-500">(current)</span>}
        </a>
      ),
    },
    { title: 'Date', dataIndex: 'invoice_date', key: 'invoice_date', render: (v) => fmtDate(v) },
    {
      title: 'Amount',
      dataIndex: 'grand_total',
      key: 'grand_total',
      align: 'right' as const,
      render: (v) => `₹${fmt(Number(v))}`,
    },
    {
      title: 'Paid',
      dataIndex: 'total_paid',
      key: 'total_paid',
      align: 'right' as const,
      render: (v) => <span className="text-green-600">₹{fmt(Number(v))}</span>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance_due',
      key: 'balance_due',
      align: 'right' as const,
      render: (v) => (
        <span className={Number(v) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
          ₹{fmt(Number(v))}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
    },
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

  const balanceDue = Number(invoice.balance_due);
  const soRemaining = invoice.so_remaining_amount ?? 0;

  return (
    <div>
      {/* ── Screen action bar ── */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/invoices')}>Back</Button>
          <Title level={4} className="!mb-0">{invoice.invoice_number}</Title>
          <Tag color={getStatusColor(invoice.status)}>{getStatusLabel(invoice.status)}</Tag>
        </div>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
          {invoice.status !== 'fully_paid' && invoice.status !== 'cancelled' && balanceDue > 0 && (
            <Button type="primary" icon={<DollarOutlined />} onClick={() => {
              form.setFieldsValue({ payment_date: dayjs() });
              setPaymentModalOpen(true);
            }}>
              Record Payment
            </Button>
          )}
        </Space>
      </div>

      {/* ══════════════════════════════════════════
          PRINT-ONLY INVOICE LAYOUT
      ══════════════════════════════════════════ */}
      <div className="hidden print:block text-black text-sm font-sans">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
          <div>
            <div className="text-2xl font-bold text-gray-900">{businessName}</div>
            <div className="text-xs text-gray-500 mt-1">Tax Invoice</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-800 mb-1">INVOICE</div>
            <div className="text-base font-semibold">{invoice.invoice_number}</div>
            <div className="text-xs text-gray-600 mt-1">Date: {fmtDate(invoice.invoice_date)}</div>
            {invoice.due_date && (
              <div className="text-xs text-gray-600">Due: {fmtDate(invoice.due_date)}</div>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bill To</div>
          <div className="font-bold text-base">{invoice.customer_name}</div>
          {invoice.billing_address && (
            <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{invoice.billing_address}</div>
          )}
        </div>

        {/* Line Items */}
        <table className="w-full border-collapse mb-4 text-xs">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-700 px-2 py-2 text-left w-8">#</th>
              <th className="border border-gray-700 px-2 py-2 text-left">Description</th>
              <th className="border border-gray-700 px-2 py-2 text-center w-12">Qty</th>
              <th className="border border-gray-700 px-2 py-2 text-right w-24">Unit Price</th>
              <th className="border border-gray-700 px-2 py-2 text-center w-12">Tax%</th>
              <th className="border border-gray-700 px-2 py-2 text-right w-24">Tax Amt</th>
              <th className="border border-gray-700 px-2 py-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, i) => (
              <tr key={item.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-300 px-2 py-1">
                  <div className="font-medium">{item.item_name}</div>
                  {item.description && <div className="text-gray-500 text-xs">{item.description}</div>}
                  {item.hsn_code && <div className="text-gray-400 text-xs">HSN: {item.hsn_code}</div>}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity} {item.unit_of_measure || ''}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">₹{fmt(Number(item.unit_price))}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.tax_percent || 0}%</td>
                <td className="border border-gray-300 px-2 py-1 text-right">₹{fmt(Number(item.tax_amount || 0))}</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-medium">₹{fmt(Number(item.line_total || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals + Payment */}
        <div className="flex justify-end mb-6">
          <table className="text-xs border-collapse" style={{ minWidth: 260 }}>
            <tbody>
              <tr>
                <td className="px-4 py-1 text-right text-gray-600 border border-gray-200">Sub Total</td>
                <td className="px-4 py-1 text-right font-medium border border-gray-200 w-32">₹{fmt(Number(invoice.sub_total))}</td>
              </tr>
              {Number(invoice.discount_amount) > 0 && (
                <tr>
                  <td className="px-4 py-1 text-right text-gray-600 border border-gray-200">Discount</td>
                  <td className="px-4 py-1 text-right text-red-600 border border-gray-200">−₹{fmt(Number(invoice.discount_amount))}</td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-1 text-right text-gray-600 border border-gray-200">Tax</td>
                <td className="px-4 py-1 text-right border border-gray-200">₹{fmt(Number(invoice.tax_amount))}</td>
              </tr>
              {Number(invoice.shipping_charges) > 0 && (
                <tr>
                  <td className="px-4 py-1 text-right text-gray-600 border border-gray-200">Shipping</td>
                  <td className="px-4 py-1 text-right border border-gray-200">₹{fmt(Number(invoice.shipping_charges))}</td>
                </tr>
              )}
              <tr className="bg-gray-800 text-white">
                <td className="px-4 py-2 text-right font-bold border border-gray-700">Grand Total</td>
                <td className="px-4 py-2 text-right font-bold border border-gray-700">₹{fmt(Number(invoice.grand_total))}</td>
              </tr>
              <tr>
                <td className="px-4 py-1 text-right text-gray-600 border border-gray-200">Amount Paid</td>
                <td className="px-4 py-1 text-right text-green-700 font-medium border border-gray-200">₹{fmt(Number(invoice.total_paid))}</td>
              </tr>
              <tr className={balanceDue > 0 ? 'bg-red-50' : 'bg-green-50'}>
                <td className={`px-4 py-2 text-right font-bold border ${balanceDue > 0 ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700'}`}>
                  Balance Due
                </td>
                <td className={`px-4 py-2 text-right font-bold border ${balanceDue > 0 ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700'}`}>
                  {balanceDue <= 0 ? '✓ PAID' : `₹${fmt(balanceDue)}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms */}
        {invoice.terms_conditions && (
          <div className="mt-4 pt-3 border-t border-gray-300 text-xs text-gray-600">
            <div className="font-semibold mb-1">Terms & Conditions</div>
            <div className="whitespace-pre-line">{invoice.terms_conditions}</div>
          </div>
        )}
        {invoice.notes && (
          <div className="mt-3 text-xs text-gray-600">
            <span className="font-semibold">Notes: </span>{invoice.notes}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          Thank you for your business
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SCREEN LAYOUT
      ══════════════════════════════════════════ */}
      <Row gutter={[16, 16]} className="print:hidden">
        <Col xs={24} lg={16}>
          <Card title="Invoice Details" className="card-shadow mb-4">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Invoice Number">{invoice.invoice_number}</Descriptions.Item>
              <Descriptions.Item label="Invoice Date">{fmtDate(invoice.invoice_date)}</Descriptions.Item>
              <Descriptions.Item label="Customer">{invoice.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{fmtDate(invoice.due_date)}</Descriptions.Item>
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
                { title: 'Amount', dataIndex: 'line_total', key: 'line_total', align: 'right' as const, render: (v: any) => `₹${fmt(Number(v || 0))}` },
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
                      <Table.Summary.Cell index={6} className="text-right text-red-500">−₹{fmt(Number(invoice.discount_amount))}</Table.Summary.Cell>
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
          {/* Payment Summary */}
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
                <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {balanceDue <= 0 ? '✓ Paid' : `₹${fmt(balanceDue)}`}
                </span>
              </div>
            </div>
          </Card>

          {/* PO Balance */}
          {invoice.sales_order_id && invoice.so_grand_total != null && (
            <Card title="Purchase Order Balance" className="card-shadow mb-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">PO Number</span>
                  <a className="text-blue-600 hover:underline cursor-pointer" onClick={() => router.push(`/sales-orders/${invoice.sales_order_id}`)}>
                    {invoice.so_order_number || `SO-${invoice.sales_order_id}`}
                  </a>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">PO Total</span>
                  <span>₹{fmt(invoice.so_grand_total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Invoiced</span>
                  <span className="text-blue-600">₹{fmt(invoice.so_invoiced_amount ?? 0)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Remaining Balance</span>
                  <span className={`font-bold text-base ${soRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {soRemaining <= 0 ? '✓ Fully Invoiced' : `₹${fmt(soRemaining)}`}
                  </span>
                </div>
                {soRemaining > 0 && (
                  <div className="text-xs text-orange-500">₹{fmt(soRemaining)} of this PO is yet to be invoiced</div>
                )}
              </div>
            </Card>
          )}

          {/* Payment History */}
          <Card title="Payment History" className="card-shadow">
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

      {/* ── All Customer Invoices ── */}
      <Card
        title={`All Invoices — ${invoice.customer_name}`}
        className="card-shadow mt-4 print:hidden"
        extra={
          customerBalanceData?.data && (
            <span className={`text-sm font-semibold ${customerBalanceData.data.totalBalance > 0 ? 'text-red-500' : 'text-green-600'}`}>
              Outstanding: ₹{fmt(customerBalanceData.data.totalBalance)}
            </span>
          )
        }
      >
        <Table
          dataSource={customerInvoicesData?.data || []}
          columns={customerInvoiceColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
          rowClassName={(rec) => rec.id === invoiceId ? 'bg-blue-50' : ''}
          loading={!customerInvoicesData}
          summary={(rows) => {
            const totalAmt = rows.reduce((s, r) => s + Number(r.grand_total), 0);
            const totalPaid = rows.reduce((s, r) => s + Number(r.total_paid), 0);
            const totalBal = rows.reduce((s, r) => s + Number(r.balance_due), 0);
            return (
              <Table.Summary.Row className="font-bold bg-gray-50">
                <Table.Summary.Cell index={0} colSpan={2} className="font-bold">Total ({rows.length} invoices)</Table.Summary.Cell>
                <Table.Summary.Cell index={2} className="text-right font-bold">₹{fmt(totalAmt)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} className="text-right font-bold text-green-600">₹{fmt(totalPaid)}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} className={`text-right font-bold ${totalBal > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{fmt(totalBal)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* ── Record Payment Modal ── */}
      <Modal
        title="Record Payment"
        open={paymentModalOpen}
        onCancel={() => { setPaymentModalOpen(false); form.resetFields(); }}
        footer={null}
        maskClosable={false}
      >
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="text-sm text-gray-600">Balance Due</div>
          <div className="text-xl font-bold text-red-600">₹{fmt(balanceDue)}</div>
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
              max={balanceDue}
              placeholder="Enter payment amount"
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              // @ts-ignore
              parser={(value) => Number((value || '').replace(/,/g, ''))}
            />
          </Form.Item>
          <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true, message: 'Please select payment method' }]}>
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

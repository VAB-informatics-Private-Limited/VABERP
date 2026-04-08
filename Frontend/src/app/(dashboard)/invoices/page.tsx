'use client';

import { Typography, Button, Card, Input, Select, Space, DatePicker, Table, Tag, Modal, Form, InputNumber, message, Tooltip, Row, Col } from 'antd';
import { SearchOutlined, ClearOutlined, FileTextOutlined, DollarOutlined, HistoryOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getInvoiceList, recordPayment, getInvoiceById } from '@/lib/api/invoices';
import { createInvoiceFromSO } from '@/lib/api/sales-orders';
import { INVOICE_STATUS_OPTIONS } from '@/types/invoice';
import type { Invoice, PaymentFormData } from '@/types/invoice';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import ExportDropdown from '@/components/common/ExportDropdown';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface PoGroup {
  key: string;
  type: 'po' | 'standalone';
  sales_order_id?: number;
  so_order_number?: string | null;
  customer_name: string;
  so_grand_total?: number | null;
  so_remaining_amount?: number | null;
  invoiced_total: number;
  invoices: Invoice[];
  invoice?: Invoice;
}

function groupInvoices(invoices: Invoice[]): PoGroup[] {
  const poMap = new Map<number, PoGroup>();
  const standalone: PoGroup[] = [];

  for (const inv of invoices) {
    if (inv.sales_order_id) {
      if (!poMap.has(inv.sales_order_id)) {
        poMap.set(inv.sales_order_id, {
          key: `po-${inv.sales_order_id}`,
          type: 'po',
          sales_order_id: inv.sales_order_id,
          so_order_number: inv.so_order_number,
          customer_name: inv.customer_name,
          so_grand_total: inv.so_grand_total,
          so_remaining_amount: inv.so_remaining_amount,
          invoiced_total: 0,
          invoices: [],
        });
      }
      const group = poMap.get(inv.sales_order_id)!;
      group.invoices.push(inv);
      group.invoiced_total += Number(inv.grand_total);
      group.so_remaining_amount = inv.so_remaining_amount;
    } else {
      standalone.push({
        key: `inv-${inv.id}`,
        type: 'standalone',
        customer_name: inv.customer_name,
        invoiced_total: Number(inv.grand_total),
        invoices: [inv],
        invoice: inv,
      });
    }
  }

  return [...Array.from(poMap.values()), ...standalone];
}

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentForm] = Form.useForm();

  // PO-level payment modal state
  const [poPaymentModalOpen, setPoPaymentModalOpen] = useState(false);
  const [payingPoGroup, setPayingPoGroup] = useState<PoGroup | null>(null);
  const [poPaymentForm] = Form.useForm();
  const [poPaymentMethod, setPoPaymentMethod] = useState<string | undefined>();

  // Payment history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyInvoiceId, setHistoryInvoiceId] = useState<number | null>(null);

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['invoice-history', historyModalOpen, historyInvoiceId],
    queryFn: () => getInvoiceById(historyInvoiceId!),
    enabled: historyModalOpen && !!historyInvoiceId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, pageSize, search, status, dateRange],
    queryFn: () =>
      getInvoiceList({
        page,
        pageSize,
        search: search || undefined,
        status,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: number; data: PaymentFormData }) =>
      recordPayment(invoiceId, data),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      setPaymentModalOpen(false);
      setPayingInvoice(null);
      paymentForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: () => message.error('Failed to record payment'),
  });

  const poPaymentMutation = useMutation({
    mutationFn: ({ soId, amount, paymentDate, paymentMethod, referenceNumber, notes }: { soId: number; amount: number; paymentDate?: string; paymentMethod?: string; referenceNumber?: string; notes?: string }) =>
      createInvoiceFromSO(soId, { amount, invoiceDate: paymentDate, paymentMethod, notes }),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      setPoPaymentModalOpen(false);
      setPayingPoGroup(null);
      poPaymentForm.resetFields();
      setPoPaymentMethod(undefined);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to record payment'),
  });

  const openPoPaymentModal = (group: PoGroup) => {
    setPayingPoGroup(group);
    poPaymentForm.setFieldsValue({
      payment_date: dayjs(),
    });
    setPoPaymentModalOpen(true);
  };

  const handlePoPaymentSubmit = () => {
    poPaymentForm.validateFields().then((values) => {
      if (!payingPoGroup?.sales_order_id) return;
      poPaymentMutation.mutate({
        soId: payingPoGroup.sales_order_id,
        amount: values.amount,
        paymentDate: values.payment_date?.format('YYYY-MM-DD'),
        paymentMethod: values.payment_method,
        referenceNumber: values.reference_number,
        notes: values.notes,
      });
    });
  };

  const openPaymentModal = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    paymentForm.setFieldsValue({
      payment_date: dayjs(),
      amount: Number(invoice.balance_due) > 0 ? Number(invoice.balance_due) : undefined,
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = () => {
    paymentForm.validateFields().then((values) => {
      if (!payingInvoice) return;
      recordPaymentMutation.mutate({
        invoiceId: payingInvoice.id!,
        data: {
          amount: values.amount,
          payment_date: values.payment_date?.format('YYYY-MM-DD'),
          reference_number: values.reference_number,
          notes: values.notes,
        },
      });
    });
  };

  const handleClear = () => {
    setSearch('');
    setStatus(undefined);
    setDateRange(null);
    setPage(1);
  };

  const getStatusColor = (s: string) => INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getStatusLabel = (s: string) => INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  const grouped = groupInvoices(data?.data || []);

  // Parent PO group columns
  const columns: ColumnsType<PoGroup> = [
    {
      title: 'PO Number',
      key: 'po_number',
      render: (_, record) => {
        if (record.type === 'po') {
          return <span className="font-semibold text-blue-700">{record.so_order_number || `PO-${record.sales_order_id}`}</span>;
        }
        return <span className="text-gray-400 text-xs">No PO</span>;
      },
    },
    {
      title: 'Invoice #',
      key: 'invoice_number',
      render: (_, record) => {
        if (record.type === 'po') {
          return <span className="text-gray-500 text-sm">{record.invoices.length} invoice{record.invoices.length !== 1 ? 's' : ''}</span>;
        }
        return <span className="font-medium">{record.invoice?.invoice_number}</span>;
      },
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'PO Total',
      key: 'po_total',
      render: (_, record) => {
        const val = record.type === 'po' ? record.so_grand_total : record.invoice?.grand_total;
        if (val == null) return '—';
        return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
    },
    {
      title: 'Invoiced',
      key: 'invoiced',
      render: (_, record) => (
        <span>₹{Number(record.invoiced_total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      ),
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_, record) => {
        if (record.type === 'standalone') {
          const bal = Number(record.invoice!.balance_due);
          return <span className={bal > 0 ? 'text-orange-500 font-medium' : 'text-green-600'}>₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
        }
        const rem = record.so_remaining_amount;
        if (rem == null) return <span className="text-gray-400">—</span>;
        return <span className={Number(rem) > 0 ? 'text-orange-500 font-medium' : 'text-green-600'}>₹{Number(rem).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.type === 'standalone') {
          return <Tag color={getStatusColor(record.invoice!.status)}>{getStatusLabel(record.invoice!.status)}</Tag>;
        }
        const rem = Number(record.so_remaining_amount ?? 0);
        const total = Number(record.so_grand_total ?? 0);
        let s = 'unpaid', label = 'Unpaid', color = 'red';
        if (rem <= 0) { s = 'paid'; label = 'Paid'; color = 'green'; }
        else if (rem < total) { s = 'partially_paid'; label = 'Partially Paid'; color = 'orange'; }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, record) => {
        if (record.type === 'po') {
          const remaining = Number(record.so_remaining_amount);
          const canPayPo = remaining > 0;
          return (
            <Space size={4} onClick={(e) => e.stopPropagation()}>
              <Tooltip title="View PO"><Button type="text" icon={<FileTextOutlined />} size="small" onClick={() => router.push(`/purchase-orders/${record.sales_order_id}`)} /></Tooltip>
              <Tooltip title={canPayPo ? 'Record Payment' : 'Fully Paid'}>
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  size="small"
                  disabled={!canPayPo}
                  onClick={() => canPayPo && openPoPaymentModal(record)}
                >
                  Record Payment
                </Button>
              </Tooltip>
            </Space>
          );
        }
        // standalone
        const inv = record.invoice!;
        const canPay = inv.status !== 'cancelled' && Number(inv.balance_due) > 0;
        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={canPay ? 'Record Payment' : 'Fully Paid'}>
              <Button type="text" icon={<DollarOutlined />} size="small" disabled={!canPay} onClick={() => canPay && openPaymentModal(inv)} />
            </Tooltip>
            <Tooltip title="View Payments"><Button type="text" icon={<HistoryOutlined />} size="small" onClick={() => { setHistoryInvoiceId(inv.id!); setHistoryModalOpen(true); }} /></Tooltip>
          </Space>
        );
      },
    },
  ];

  // Expanded invoice sub-table columns
  const invoiceColumns: ColumnsType<Invoice> = [
    { title: 'Invoice #', dataIndex: 'invoice_number', key: 'invoice_number', render: (t) => <span className="font-medium">{t}</span> },
    { title: 'Date', dataIndex: 'invoice_date', key: 'invoice_date' },
    {
      title: 'Amount',
      dataIndex: 'grand_total',
      key: 'grand_total',
      render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Paid',
      dataIndex: 'total_paid',
      key: 'total_paid',
      render: (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <Title level={4} className="!mb-0">Invoices</Title>
        <Space>
          <ExportDropdown
            data={data?.data || []}
            disabled={!data?.data?.length}
            filename="invoices"
            title="Invoices"
            columns={[
              { key: 'invoice_number', title: 'Invoice #' },
              { key: 'customer_name', title: 'Customer' },
              { key: 'invoice_date', title: 'Date' },
              { key: 'so_grand_total', title: 'PO Total' },
              { key: 'total_paid', title: 'Paid' },
              { key: 'status', title: 'Status' },
            ]}
          />
        </Space>
      </div>

      <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
        <Space wrap>
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 220 }}
            prefix={<SearchOutlined />}
            allowClear
            onPressEnter={() => setPage(1)}
          />
          <Select
            placeholder="Status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            style={{ width: 160 }}
            allowClear
          >
            {INVOICE_STATUS_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => { setDateRange(dates); setPage(1); }}
            format="DD-MM-YYYY"
          />
          <Button icon={<ClearOutlined />} onClick={handleClear}>Clear</Button>
        </Space>
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={grouped}
          rowKey="key"
          loading={isLoading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalRecords || 0,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showSizeChanger: true,
            pageSizeOptions: ['50', '100', '200'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
          }}
          onRow={(record) => ({
            onClick: () => {
              if (record.type === 'po') {
                router.push(`/purchase-orders/${record.sales_order_id}`);
              } else {
                router.push(`/invoices/${record.invoice!.id}`);
              }
            },
            style: { cursor: 'pointer' },
          })}
          expandable={{
            rowExpandable: (record) => record.type === 'po',
            expandedRowRender: (record) => (
              <div className="bg-gray-50 px-4 py-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <FileTextOutlined className="text-blue-500" />
                  <span className="font-medium text-sm text-gray-700">
                    Invoices for {record.so_order_number || `PO-${record.sales_order_id}`}
                  </span>
                </div>
                <Table
                  columns={invoiceColumns}
                  dataSource={record.invoices}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  className="border border-gray-200 rounded"
                  onRow={(inv) => ({
                    onClick: () => router.push(`/invoices/${inv.id}`),
                    style: { cursor: 'pointer' },
                  })}
                />
              </div>
            ),
          }}
          rowClassName={(record) => record.type === 'po' ? 'bg-blue-50' : ''}
        />
      </Card>

      {/* Payment History Modal */}
      <Modal
        title={
          <div>
            <div className="font-semibold">Payment History</div>
            {historyData?.data && (
              <div className="text-sm text-gray-500 font-normal">
                {historyData.data.invoice_number} — {historyData.data.customer_name}
              </div>
            )}
          </div>
        }
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setHistoryInvoiceId(null); }}
        footer={null}
        width={680}
        destroyOnClose
      >
        {historyLoading ? (
          <div className="text-center py-8"><span>Loading...</span></div>
        ) : (historyData?.data?.payments || []).length === 0 ? (
          <div className="text-center text-gray-400 py-8">No payments recorded yet</div>
        ) : (
          <>
            <div className="mb-4 flex gap-6 text-sm">
              <div>Grand Total: <span className="font-bold">₹{(Number(historyData?.data?.grand_total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div>Total Paid: <span className="font-bold text-green-600">₹{(Number(historyData?.data?.total_paid) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              <div>Balance Due: <span className={`font-bold ${Number(historyData?.data?.balance_due) > 0 ? 'text-red-500' : 'text-green-600'}`}>₹{(Number(historyData?.data?.balance_due) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <Table
              dataSource={historyData?.data?.payments || []}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Payment #', dataIndex: 'payment_number', key: 'payment_number' },
                { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '—' },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (v) => <span className="text-green-600 font-medium">₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
                { title: 'Reference', dataIndex: 'reference_number', key: 'reference_number', render: (v) => v || '—' },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'completed' ? 'green' : 'orange'}>{s}</Tag> },
              ]}
            />
          </>
        )}
      </Modal>

      {/* PO-Level Record Payment Modal */}
      <Modal
        title={
          <div>
            <div className="font-semibold">Record Payment</div>
            {payingPoGroup && (
              <div className="text-sm text-gray-500 font-normal">
                {payingPoGroup.so_order_number} — {payingPoGroup.customer_name}
                {Number(payingPoGroup.so_remaining_amount) > 0 && (
                  <span className="ml-2 text-orange-500">
                    Balance: ₹{Number(payingPoGroup.so_remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}
          </div>
        }
        open={poPaymentModalOpen}
        onCancel={() => { setPoPaymentModalOpen(false); setPayingPoGroup(null); poPaymentForm.resetFields(); setPoPaymentMethod(undefined); }}
        onOk={handlePoPaymentSubmit}
        okText="Record Payment"
        confirmLoading={poPaymentMutation.isPending}
        destroyOnClose
      >
        <Form form={poPaymentForm} layout="vertical" className="mt-4">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter payment amount' }]}>
                <InputNumber
                  className="w-full"
                  min={0.01}
                  max={Number(payingPoGroup?.so_remaining_amount) || undefined}
                  precision={2}
                  placeholder="Enter amount"
                  prefix="₹"
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  // @ts-ignore
                  parser={(value) => Number((value || '').replace(/,/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true, message: 'Select date' }]}>
                <DatePicker className="w-full" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true, message: 'Select payment method' }]}>
            <Select placeholder="Select method" onChange={(val) => { setPoPaymentMethod(val); poPaymentForm.setFieldValue('reference_number', undefined); }}>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="cheque">Cheque</Select.Option>
              <Select.Option value="upi">UPI</Select.Option>
              <Select.Option value="cash">Cash</Select.Option>
            </Select>
          </Form.Item>
          {poPaymentMethod === 'bank_transfer' && (
            <Form.Item name="reference_number" label="Transaction ID" rules={[{ required: true, message: 'Enter transaction ID' }]}>
              <Input placeholder="Enter bank transaction ID" />
            </Form.Item>
          )}
          {poPaymentMethod === 'cheque' && (
            <Form.Item name="reference_number" label="Cheque Number" rules={[{ required: true, message: 'Enter cheque number' }]}>
              <Input placeholder="Enter cheque number" />
            </Form.Item>
          )}
          {poPaymentMethod === 'upi' && (
            <Form.Item name="reference_number" label="UPI Transaction ID" rules={[{ required: true, message: 'Enter UPI transaction ID' }]}>
              <Input placeholder="Enter UPI transaction ID / UTR" />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        title={
          <div>
            <div className="font-semibold">Record Payment</div>
            {payingInvoice && (
              <div className="text-sm text-gray-500 font-normal">
                {payingInvoice.invoice_number} — {payingInvoice.customer_name}
                {Number(payingInvoice.balance_due) > 0 && (
                  <span className="ml-2 text-orange-500">
                    Balance: ₹{Number(payingInvoice.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}
          </div>
        }
        open={paymentModalOpen}
        onCancel={() => { setPaymentModalOpen(false); setPayingInvoice(null); paymentForm.resetFields(); }}
        onOk={handlePaymentSubmit}
        okText="Record Payment"
        confirmLoading={recordPaymentMutation.isPending}
        destroyOnClose
      >
        <Form form={paymentForm} layout="vertical" className="mt-4">
          <Form.Item
            name="amount"
            label="Amount (₹)"
            rules={[{ required: true, message: 'Enter payment amount' }]}
          >
            <InputNumber
              className="w-full"
              min={0.01}
              precision={2}
              placeholder="Enter amount"
              prefix="₹"
            />
          </Form.Item>
          <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true, message: 'Select date' }]}>
            <DatePicker className="w-full" format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference / UTR Number">
            <Input placeholder="Cheque no., UTR, transaction ID..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import {
  Typography, Card, Descriptions, Tag, Button, Space, Table,
  message, Spin, Row, Col, Alert, Divider, Modal, Progress,
  Statistic, Drawer, Form, InputNumber, Select, Input, DatePicker, Popconfirm, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, FileDoneOutlined, FileTextOutlined,
  ShoppingCartOutlined, PlusOutlined, DollarOutlined,
  PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined,
  ToolOutlined, CheckCircleOutlined, PrinterOutlined, ShareAltOutlined,
  CheckOutlined, EditOutlined, CloseOutlined, SaveOutlined,
  MinusCircleOutlined, HistoryOutlined, CarOutlined, WarningOutlined,
  StopOutlined, SyncOutlined, RocketOutlined, SendOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { getSalesOrderById, createInvoiceFromSO, updateSOStatus, deleteSalesOrder, sendToManufacturing, updateSalesOrder, reportSODelay } from '@/lib/api/sales-orders';
import { updatePOExpectedDelivery } from '@/lib/api/purchase-orders';
import { getInvoiceList, getInvoiceById, recordPayment, verifyPayment } from '@/lib/api/invoices';
import { getJobCardList, jobCardDispatchAction } from '@/lib/api/manufacturing';
import apiClient from '@/lib/api/client';
import { SO_STATUS_OPTIONS, SalesOrderItem } from '@/types/sales-order';
import POVersionHistory from '@/components/purchase-orders/POVersionHistory';
import { INVOICE_STATUS_OPTIONS } from '@/types/invoice';
import { JOB_CARD_STATUS_OPTIONS } from '@/types/manufacturing';
import type { Invoice, Payment } from '@/types/invoice';
import type { PaymentFormData } from '@/types/invoice';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const fmt = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const poId = Number(params.id);
  const queryClient = useQueryClient();

  // Invoice drawer state
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<number | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();

  // Share copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Hold modal state
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  // Generate Invoice modal
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [addInvoiceForm] = Form.useForm();
  const [invoiceAmountInput, setInvoiceAmountInput] = useState<number>(0);

  // Per-invoice Record Payment modal
  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState<number | null>(null);
  const [perInvoicePaymentForm] = Form.useForm();
  const [perInvoicePaymentMethod, setPerInvoicePaymentMethod] = useState<string | undefined>();

  // ETA modal state
  const [etaModalOpen, setEtaModalOpen] = useState(false);
  const [etaValue, setEtaValue] = useState<dayjs.Dayjs | null>(null);

  // Delay report modal state
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayNote, setDelayNote] = useState('');

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<SalesOrderItem[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editExpectedDelivery, setEditExpectedDelivery] = useState<string | undefined>();
  const [editBillingAddress, setEditBillingAddress] = useState('');
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [changeNotesModalOpen, setChangeNotesModalOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');

  // ── Fetch PO ──────────────────────────────────────────────────────────────
  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => getSalesOrderById(poId),
    enabled: !!poId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // ── Fetch invoices for this PO ────────────────────────────────────────────
  const { data: invoicesData, isLoading: invLoading } = useQuery({
    queryKey: ['po-invoices', poId],
    queryFn: () => getInvoiceList({ page: 1, pageSize: 100, salesOrderId: poId }),
    enabled: !!poId,
    refetchInterval: 15000, // auto-refresh every 15 seconds so all users see live invoice data
    refetchOnWindowFocus: true,
  });

  // ── Fetch selected invoice detail (for drawer) ────────────────────────────
  const { data: invoiceDetail, isLoading: invDetailLoading } = useQuery({
    queryKey: ['invoice', drawerInvoiceId],
    queryFn: () => getInvoiceById(drawerInvoiceId!),
    enabled: !!drawerInvoiceId,
  });

  // ── Fetch enterprise profile (for GST number in invoice drawer) ───────────
  const { data: enterpriseProfile } = useQuery({
    queryKey: ['enterprise-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/enterprises/profile');
      return res.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const gstNumber: string | undefined = enterpriseProfile?.gstNumber;

  // ── Fetch linked job cards ────────────────────────────────────────────────
  const { data: jobCardsData } = useQuery({
    queryKey: ['po-job-cards', poId],
    queryFn: () => getJobCardList({ salesOrderId: poId, pageSize: 100 }),
    enabled: !!poId,
    refetchInterval: 30000, // poll every 30 seconds for manufacturing updates
  });
  const linkedJobCards = jobCardsData?.data || [];

  // ── Dispatch action (from PO side) ────────────────────────────────────────
  const dispatchMutation = useMutation({
    mutationFn: ({ jobId, action }: { jobId: number; action: 'approve' | 'hold' | 'unhold' | 'request_modification' }) =>
      jobCardDispatchAction(jobId, action),
    onSuccess: (_, vars) => {
      const messages: Record<string, string> = {
        approve: 'Order dispatched successfully',
        hold: 'Dispatch placed on hold',
        unhold: 'Dispatch hold removed',
        request_modification: 'Modification requested — job returned to production',
      };
      message.success(messages[vars.action] || 'Done');
      queryClient.invalidateQueries({ queryKey: ['po-job-cards', poId] });
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to perform dispatch action'),
  });

  // ── Generate Invoice ──────────────────────────────────────────────────────
  const invoiceMutation = useMutation({
    mutationFn: (data: { amount: number; invoiceDate?: string; notes?: string }) =>
      createInvoiceFromSO(poId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-invoices', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setAddInvoiceOpen(false);
      addInvoiceForm.resetFields();
      message.success('Invoice generated successfully');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to generate invoice'),
  });

  // ── Per-invoice Record Payment ────────────────────────────────────────────
  const perInvoicePaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(paymentModalInvoiceId!, data),
    onSuccess: () => {
      message.success('Payment recorded — under processing until verified');
      queryClient.invalidateQueries({ queryKey: ['po-invoices', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', paymentModalInvoiceId] });
      setPaymentModalInvoiceId(null);
      perInvoicePaymentForm.resetFields();
      setPerInvoicePaymentMethod(undefined);
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to record payment'),
  });

  // ── Verify Payment ────────────────────────────────────────────────────────
  const verifyPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, paymentId }: { invoiceId: number; paymentId: number }) =>
      verifyPayment(invoiceId, paymentId),
    onSuccess: (_, vars) => {
      message.success('Payment verified — marked as paid successfully');
      queryClient.invalidateQueries({ queryKey: ['po-invoices', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', vars.invoiceId] });
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to verify payment'),
  });

  // ── Hold / Resume ─────────────────────────────────────────────────────────
  const holdMutation = useMutation({
    mutationFn: (reason?: string) =>
      updateSOStatus(poId, po?.status === 'on_hold' ? 'confirmed' : 'on_hold', reason),
    onSuccess: () => {
      const isHolding = po?.status !== 'on_hold';
      message.success(isHolding ? 'Purchase order placed on hold — production stopped' : 'Purchase order resumed — production can continue');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setHoldModalOpen(false);
      setHoldReason('');
    },
    onError: () => message.error('Failed to update status'),
  });

  // ── Forward to Manufacturing ───────────────────────────────────────────────
  const manufacturingMutation = useMutation({
    mutationFn: () => sendToManufacturing(poId),
    onSuccess: () => {
      message.success('Purchase order transferred to manufacturing successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to forward to manufacturing'),
  });

  // ── Cancel PO ─────────────────────────────────────────────────────────────
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => updateSOStatus(poId, 'cancelled', reason || undefined),
    onSuccess: () => {
      message.success('Purchase order cancelled');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setCancelModalOpen(false);
      setCancelReason('');
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to cancel purchase order'),
  });

  // ── Delete PO ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteSalesOrder(poId),
    onSuccess: () => {
      message.success('Purchase order deleted');
      router.push('/purchase-orders');
    },
    onError: () => message.error('Failed to delete purchase order'),
  });

  // ── Update PO (with versioning) ──────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateSalesOrder>[1]) =>
      updateSalesOrder(poId, data),
    onSuccess: () => {
      message.success('Purchase order updated successfully');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setEditMode(false);
      setChangeNotesModalOpen(false);
      setChangeNotes('');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to update purchase order'),
  });

  // ── ETA update ───────────────────────────────────────────────────────────
  const etaMutation = useMutation({
    mutationFn: (expectedDelivery: string) => updatePOExpectedDelivery(poId, expectedDelivery),
    onSuccess: () => {
      message.success('Expected delivery date updated');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      setEtaModalOpen(false);
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to update delivery date'),
  });

  const delayMutation = useMutation({
    mutationFn: (note: string) => reportSODelay(poId, note),
    onSuccess: () => {
      message.success('Delay reported');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      setDelayModalOpen(false);
      setDelayNote('');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to report delay'),
  });

  // ── Record payment ────────────────────────────────────────────────────────
  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(drawerInvoiceId!, data),
    onSuccess: () => {
      message.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice', drawerInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['po-invoices', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      setPaymentModalOpen(false);
      paymentForm.resetFields();
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Failed to record payment'),
  });

  const po = poData?.data;
  const linkedInvoices = invoicesData?.data || [];
  const invoice = invoiceDetail?.data;

  // Dispatch-ready computed values
  const dispatchReadyJobs = useMemo(
    () => linkedJobCards.filter((j) => j.status === 'ready_for_dispatch' || j.status === 'completed_production'),
    [linkedJobCards],
  );
  const hasDispatchReady = dispatchReadyJobs.length > 0;
  const onHoldJobs = useMemo(() => linkedJobCards.filter((j) => j.dispatch_on_hold), [linkedJobCards]);

  // ── Balance calculations ──────────────────────────────────────────────────
  // PO Total is the fixed reference — never modified.
  // "Total Invoiced" = sum of all invoice grand_totals added against this PO.
  // "Remaining"      = PO Total − Total Invoiced
  const poTotal = Number(po?.grand_total || 0);
  const totalInvoiced = linkedInvoices.reduce((s, i) => s + Number(i.grand_total || 0), 0);
  const totalPaidOnInvoices = linkedInvoices.reduce((s, i) => s + Number(i.total_paid || 0), 0);
  const totalBalanceDue = linkedInvoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const remainingBalance = poTotal - totalInvoiced;
  const invoicedPercent = poTotal > 0 ? Math.min(100, Math.round((totalInvoiced / poTotal) * 100)) : 0;
  const paidPercent = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaidOnInvoices / totalInvoiced) * 100)) : 0;

  // Running balance per row: sort invoices by id (chronological), compute
  // cumulative invoiced amount and the PO remaining after each entry.
  const sortedInvoices = [...linkedInvoices].sort((a, b) => a.id - b.id);
  let _cumulative = 0;
  const invoicesWithRunning = sortedInvoices.map((inv) => {
    _cumulative += Number(inv.grand_total || 0);
    return { ...inv, _running_remaining: poTotal - _cumulative };
  });
  // Running balance at the selected invoice — used in the drawer Payment Summary
  const selectedInvRunning = invoicesWithRunning.find((inv) => inv.id === drawerInvoiceId);
  const poBalanceDueAtDrawer = selectedInvRunning?._running_remaining ?? remainingBalance;

  // All payments across all invoices for this PO (for PO-level payment history)
  const allPoPayments = useMemo(() => {
    const payments: (Payment & { _invoice_number?: string })[] = [];
    linkedInvoices.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        payments.push({ ...p, _invoice_number: inv.invoice_number });
      });
    });
    return payments.sort((a, b) => new Date(b.payment_date || b.created_date || 0).getTime() - new Date(a.payment_date || a.created_date || 0).getTime());
  }, [linkedInvoices]);

  // Block creation while invoices are still loading (prevents race condition
  // where linkedInvoices=[] makes remainingBalance look like full PO amount)
  const canCreateInvoice =
    !invLoading &&
    po?.status !== 'cancelled' &&
    po?.status !== 'on_hold' &&
    remainingBalance > 0;

  const handleCreateInvoiceClick = () => {
    addInvoiceForm.resetFields();
    setInvoiceAmountInput(0);
    setAddInvoiceOpen(true);
  };

  const handleAddInvoiceSubmit = (values: any) => {
    invoiceMutation.mutate({
      amount: values.amount,
      invoiceDate: dayjs().format('YYYY-MM-DD'),
      notes: values.notes,
    });
  };

  // ── Edit mode helpers ────────────────────────────────────────────────────
  const enterEditMode = () => {
    if (!po) return;
    setEditItems((po.items || []).map((item) => ({ ...item })));
    setEditNotes(po.notes || '');
    setEditExpectedDelivery(po.expected_delivery);
    setEditBillingAddress(po.billing_address || '');
    setEditShippingAddress(po.shipping_address || '');
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditItems([]);
    setChangeNotes('');
  };

  const updateEditItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    setEditItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate line total
      const qty = Number(updated[index].quantity) || 0;
      const price = Number(updated[index].unit_price) || 0;
      const taxPct = Number(updated[index].tax_percent) || 0;
      const sub = qty * price;
      const tax = (sub * taxPct) / 100;
      updated[index].tax_amount = tax;
      updated[index].line_total = sub + tax;
      return updated;
    });
  };

  const addEditItem = () => {
    setEditItems((prev) => [
      ...prev,
      {
        item_name: '',
        quantity: 1,
        unit_price: 0,
        tax_percent: 0,
        tax_amount: 0,
        line_total: 0,
        sort_order: prev.length,
      },
    ]);
  };

  const removeEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const editSubTotal = editItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const editTaxAmount = editItems.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0);
  const editGrandTotal = editSubTotal + editTaxAmount;

  const handleUpdatePO = () => {
    // Validate items
    if (editItems.length === 0) {
      message.error('At least one item is required');
      return;
    }
    for (const item of editItems) {
      if (!item.item_name?.trim()) {
        message.error('All items must have a name');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        message.error('All items must have a valid quantity');
        return;
      }
    }
    setChangeNotesModalOpen(true);
  };

  const confirmUpdatePO = () => {
    updateMutation.mutate({
      expectedDelivery: editExpectedDelivery,
      billingAddress: editBillingAddress,
      shippingAddress: editShippingAddress,
      notes: editNotes,
      items: editItems.map((item, idx) => ({
        productId: item.product_id,
        itemName: item.item_name,
        description: item.description,
        quantity: Number(item.quantity),
        unitOfMeasure: item.unit_of_measure,
        unitPrice: Number(item.unit_price),
        taxPercent: Number(item.tax_percent || 0),
        sortOrder: idx,
      })),
      changeNotes: changeNotes || undefined,
    });
  };

  const canEdit = po && !['cancelled', 'delivered'].includes(po.status);

  const getSOStatusColor = (s: string) => SO_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getSOStatusLabel = (s: string) => SO_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;
  const getInvStatusColor = (s: string) => INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.color || 'default';
  const getInvStatusLabel = (s: string) => INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  // Invoice table columns — running PO balance shown per row
  type InvoiceWithRunning = Invoice & { _running_remaining: number };
  const invoiceColumns: ColumnsType<InvoiceWithRunning> = [
    {
      title: '#',
      key: 'seq',
      width: 45,
      render: (_, __, i) => <span className="text-gray-400 text-xs">{i + 1}</span>,
    },
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (v) => <span className="font-semibold text-blue-600">{v}</span>,
    },
    { title: 'Date', dataIndex: 'invoice_date', key: 'invoice_date' },
    {
      title: 'Invoice Amount',
      dataIndex: 'grand_total',
      key: 'grand_total',
      render: (v) => <span className="font-semibold text-gray-800">{fmt(v)}</span>,
    },
    {
      title: 'Paid',
      dataIndex: 'total_paid',
      key: 'total_paid',
      render: (v) => <span className="text-green-600 font-semibold">{fmt(v || 0)}</span>,
    },
    {
      title: 'Under Verification',
      key: 'pending_amount',
      render: (_: any, record: InvoiceWithRunning) => {
        const pending = Number((record as any).pending_amount ?? 0);
        if (pending <= 0.005) return <span className="text-gray-300 text-xs">—</span>;
        return (
          <span className="flex items-center gap-1 text-orange-500 font-semibold">
            <SyncOutlined spin style={{ fontSize: 11 }} />
            {fmt(pending)}
          </span>
        );
      },
    },
    {
      title: 'Balance Due',
      dataIndex: 'balance_due',
      key: 'balance_due',
      render: (v) => (
        <span className={`font-semibold ${Number(v) > 0.005 ? 'text-red-500' : 'text-green-600'}`}>
          {fmt(v || 0)}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: InvoiceWithRunning) => {
        const pending = Number((record as any).pending_amount ?? 0);
        return (
          <div className="flex flex-col gap-1">
            <Tag color={getInvStatusColor(record.status)}>{getInvStatusLabel(record.status)}</Tag>
            {pending > 0.005 && (
              <Tag color="orange" icon={<SyncOutlined spin />} style={{ fontSize: 11 }}>
                Pending Verification
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <Button size="small" onClick={() => setDrawerInvoiceId(record.id)}>
              View
            </Button>
          </Tooltip>
          <Tooltip title="Print / Download PDF">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => window.open(`/print/invoice/${record.id}`, '_blank')}
            />
          </Tooltip>
          <Tooltip title={copiedId === record.id ? 'Link copied!' : 'Share invoice link'}>
            <Button
              size="small"
              icon={copiedId === record.id ? <CheckOutlined /> : <ShareAltOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/invoices/${record.id}`,
                );
                setCopiedId(record.id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
            />
          </Tooltip>
          {record.status !== 'fully_paid' && record.status !== 'cancelled' && (
            <Tooltip title="Record Payment">
              <Button
                size="small"
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => {
                  setPaymentModalInvoiceId(record.id);
                  perInvoicePaymentForm.resetFields();
                  setPerInvoicePaymentMethod(undefined);
                }}
              >
                Pay
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Payment history columns
  const paymentColumns: ColumnsType<Payment> = [
    { title: 'Payment #', dataIndex: 'payment_number', key: 'payment_number' },
    { title: 'Date', dataIndex: 'payment_date', key: 'payment_date' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v) => <span className="font-semibold text-green-600">{fmt(v)}</span>,
    },
    { title: 'Method', dataIndex: 'payment_method', key: 'payment_method', render: (v) => v || '-' },
    { title: 'Reference', dataIndex: 'reference_number', key: 'reference_number', render: (v) => v || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s, record) => (
        <div className="flex items-center gap-2 flex-wrap">
          {s === 'completed' ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>Paid Successfully</Tag>
          ) : (
            <Tag color="orange" icon={<SyncOutlined spin />}>Under Processing</Tag>
          )}
          {s === 'pending' && (
            <Popconfirm
              title="Verify this payment?"
              description="This will mark the payment as paid successfully."
              onConfirm={() => verifyPaymentMutation.mutate({ invoiceId: record.invoice_id, paymentId: record.id })}
              okText="Verify"
              cancelText="Cancel"
            >
              <Button size="small" type="primary" icon={<CheckOutlined />} loading={verifyPaymentMutation.isPending}>
                Verify
              </Button>
            </Popconfirm>
          )}
          <Tooltip title="Download Receipt">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => window.open(`/print/payment/${record.id}`, '_blank')}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );

  if (!po)
    return (
      <div className="text-center py-8">
        <Title level={4}>Purchase Order not found</Title>
        <Button onClick={() => router.push('/purchase-orders')}>Back</Button>
      </div>
    );

  return (
    <div>
      {/* Dispatch Ready Banner */}
      {hasDispatchReady && (
        <div className="mb-6 p-0 rounded-xl overflow-hidden" style={{ border: '2px solid #722ed1', boxShadow: '0 4px 20px rgba(114,46,209,0.15)' }}>
          <div className="p-4" style={{ background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)' }}>
            <div className="flex items-start gap-3">
              <RocketOutlined style={{ fontSize: 28, color: '#722ed1', marginTop: 4 }} />
              <div className="flex-1">
                <div className="text-lg font-bold" style={{ color: '#531dab' }}>
                  Products Ready for Dispatch — Action Required
                </div>
                <div className="text-sm mt-1" style={{ color: '#722ed1' }}>
                  The following products from <strong>{po.order_number}</strong> have completed production and are waiting for your approval.
                </div>
                <div className="mt-3 space-y-2">
                  {dispatchReadyJobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200">
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                      <div className="flex-1">
                        <Text strong>{job.product_name}</Text>
                        {job.product_code && <Text type="secondary" className="ml-2 text-xs">SKU: {job.product_code}</Text>}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {job.job_card_number} — {job.quantity} {job.unit || 'units'}
                          {job.status === 'completed_production' && <Tag color="cyan" className="ml-2">Production Complete</Tag>}
                          {job.status === 'ready_for_dispatch' && <Tag color="purple" className="ml-2">Ready for Dispatch</Tag>}
                        </div>
                      </div>
                      <Space>
                        <Button size="small" type="primary" icon={<SendOutlined />}
                          style={{ background: '#722ed1', borderColor: '#722ed1' }}
                          loading={dispatchMutation.isPending}
                          onClick={() => Modal.confirm({
                            title: 'Accept & Dispatch?',
                            content: `Dispatch ${job.product_name} (${job.quantity} ${job.unit || 'units'})`,
                            okText: 'Dispatch Now',
                            onOk: () => dispatchMutation.mutateAsync({ jobId: job.id, action: 'approve' }),
                          })}>
                          Dispatch
                        </Button>
                        <Button size="small" icon={<PauseCircleOutlined />}
                          onClick={() => dispatchMutation.mutate({ jobId: job.id, action: 'hold' })}>
                          Hold
                        </Button>
                      </Space>
                    </div>
                  ))}
                </div>
                {dispatchReadyJobs.length > 1 && (
                  <div className="mt-3">
                    <Button type="primary" icon={<SendOutlined />}
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
                      onClick={() => Modal.confirm({
                        title: 'Dispatch All Ready Products?',
                        content: `This will dispatch ${dispatchReadyJobs.length} products from ${po.order_number}.`,
                        okText: 'Dispatch All',
                        onOk: async () => {
                          for (const job of dispatchReadyJobs) {
                            await jobCardDispatchAction(job.id, 'approve');
                          }
                          message.success('All products dispatched');
                          queryClient.invalidateQueries({ queryKey: ['po-job-cards', poId] });
                          queryClient.invalidateQueries({ queryKey: ['all-job-cards-for-po'] });
                        },
                      })}>
                      Dispatch All ({dispatchReadyJobs.length})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-Hold Items Alert */}
      {onHoldJobs.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<StopOutlined />}
          className="mb-4"
          message={<strong>{onHoldJobs.length} product{onHoldJobs.length > 1 ? 's' : ''} on dispatch hold</strong>}
          description={
            <div className="mt-1">
              {onHoldJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-2 py-1">
                  <Tag color="warning">HOLD</Tag>
                  <span>{job.product_name} — {job.quantity} {job.unit || 'units'} ({job.job_card_number})</span>
                  <Button size="small" type="link"
                    onClick={() => dispatchMutation.mutate({ jobId: job.id, action: 'unhold' })}>
                    Release
                  </Button>
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/purchase-orders')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">
            <ShoppingCartOutlined className="mr-2 text-blue-500" />
            {po.order_number}
          </Title>
          <Tag color={getSOStatusColor(po.status)}>{getSOStatusLabel(po.status)}</Tag>
          {hasDispatchReady && (
            <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px' }}>
              <RocketOutlined className="mr-1" /> Dispatch Ready
            </Tag>
          )}
          {po.current_version > 1 && (
            <Tag color="purple" icon={<HistoryOutlined />} className="text-xs font-semibold">
              v{po.current_version}
            </Tag>
          )}
        </div>
        <Space>
          {editMode && (
            <>
              <Button icon={<CloseOutlined />} onClick={cancelEditMode}>
                Cancel Edit
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleUpdatePO}
              >
                Update &amp; Send PO
              </Button>
            </>
          )}
          {po.quotation_id && (
            <Button
              icon={<FileTextOutlined />}
              onClick={() => router.push(`/quotations/${po.quotation_id}`)}
            >
              View Quotation
            </Button>
          )}
          {po.status !== 'cancelled' && (
            po.sent_to_manufacturing ? (
              <Button
                type="primary"
                icon={<ToolOutlined />}
                onClick={() => router.push(`/manufacturing/po/${poId}`)}
                style={{ background: '#1677ff', borderColor: '#1677ff' }}
              >
                In Manufacturing
              </Button>
            ) : (
              <Button
                icon={<ToolOutlined />}
                loading={manufacturingMutation.isPending}
                onClick={() =>
                  Modal.confirm({
                    title: 'Transfer to Manufacturing?',
                    content: `This will transfer the purchase order with ${po.items?.length || 0} item(s) to the manufacturing team for review and inventory approval.`,
                    okText: 'Transfer',
                    onOk: () => manufacturingMutation.mutateAsync(),
                  })
                }
                className="border-blue-400 text-blue-600"
              >
                Transfer to Manufacturing
              </Button>
            )
          )}
          {!['cancelled', 'delivered', 'dispatched'].includes(po.status) && (
            <Button
              icon={po.status === 'on_hold' ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              loading={holdMutation.isPending}
              onClick={() => {
                if (po.status === 'on_hold') {
                  holdMutation.mutate(undefined);
                } else {
                  setHoldReason('');
                  setHoldModalOpen(true);
                }
              }}
              className={po.status === 'on_hold' ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'}
            >
              {po.status === 'on_hold' ? 'Resume Order' : 'Hold Order'}
            </Button>
          )}
          {!['cancelled', 'delivered', 'dispatched'].includes(po.status) && (
            <Button
              danger
              icon={<StopOutlined />}
              loading={cancelMutation.isPending}
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel Order
            </Button>
          )}
          <Popconfirm
            title="Delete Purchase Order"
            description="This will permanently delete the PO and all its items. Are you sure?"
            onConfirm={() => deleteMutation.mutate()}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </Popconfirm>
          {po.status !== 'cancelled' && po.status !== 'on_hold' && (
            <Tooltip title={remainingBalance <= 0 ? 'All PO value has been invoiced' : ''}>
              <Button
                type="primary"
                icon={<FileDoneOutlined />}
                disabled={remainingBalance <= 0}
                onClick={handleCreateInvoiceClick}
              >
                {remainingBalance <= 0 ? 'Fully Invoiced' : 'Generate Invoice'}
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Dispatched banner */}
      {po.status === 'dispatched' && (
        <Alert
          className="mb-4"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="This purchase order has been fully DISPATCHED"
          description={
            <span>
              All manufacturing job cards have been dispatched.{' '}
              <Button
                type="link"
                className="p-0 h-auto font-medium"
                onClick={() => router.push('/manufacture-status/dispatched')}
              >
                View all dispatched orders
              </Button>
            </span>
          }
        />
      )}

      {/* On Hold banner */}
      {po.status === 'on_hold' && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          icon={<PauseCircleOutlined />}
          message="This purchase order is currently ON HOLD"
          description={
            <div>
              <div>All production is stopped. No invoices can be created or stages completed until the order is resumed.</div>
              {po.hold_reason && (
                <div className="mt-1"><strong>Reason:</strong> {po.hold_reason}</div>
              )}
              <div className="mt-1">
                <strong>Manufacturing:</strong>{' '}
                {po.hold_acknowledged ? (
                  <Tag color="success">Acknowledged</Tag>
                ) : (
                  <Tag color="warning">Pending Acknowledgement</Tag>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* Source quotation banner */}
      {po.quotation_id && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message={
            <span>
              This purchase order was created from{' '}
              <Button
                type="link"
                className="p-0 h-auto font-medium"
                onClick={() => router.push(`/quotations/${po.quotation_id}`)}
              >
                Quotation #{po.quotation_id}
              </Button>
            </span>
          }
        />
      )}

      {/* Balance summary cards */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={6}>
          <Card className="card-shadow text-center">
            <Statistic
              title="PO Total"
              value={poTotal}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
              formatter={(v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow text-center">
            <Statistic
              title="Total Invoiced"
              value={totalInvoiced}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              formatter={(v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            />
            <Progress percent={invoicedPercent} size="small" strokeColor="#fa8c16" showInfo={false} className="mt-2" />
            <div className="text-xs text-gray-400 mt-1">{invoicedPercent}% of PO invoiced</div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow text-center">
            <Statistic
              title="Invoice Balance Due"
              value={totalBalanceDue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: totalBalanceDue > 0.005 ? '#dc2626' : '#52c41a', fontWeight: 'bold' }}
              formatter={(v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            />
            <div className="text-xs mt-2" style={{ color: totalBalanceDue > 0.005 ? '#dc2626' : '#52c41a' }}>
              {totalBalanceDue > 0.005 ? 'Payment pending' : '✓ Fully paid'}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow text-center" style={{ borderColor: (poTotal - totalPaidOnInvoices) > 0.005 ? '#f5222d' : '#52c41a', borderWidth: 1 }}>
            <Statistic
              title="Total PO Balance to be Paid"
              value={poTotal - totalPaidOnInvoices}
              precision={2}
              prefix="₹"
              valueStyle={{ color: (poTotal - totalPaidOnInvoices) > 0.005 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}
              formatter={(v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            />
            <div className="text-xs mt-2" style={{ color: (poTotal - totalPaidOnInvoices) > 0.005 ? '#f5222d' : '#52c41a' }}>
              {(poTotal - totalPaidOnInvoices) > 0.005 ? 'Outstanding balance' : '✓ Fully settled'}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-4">
        {/* Left: PO details + Items */}
        <Col xs={24} lg={16}>
          <Card title="Purchase Order Details" className="card-shadow mb-4">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="PR Number">
                <span className="font-semibold text-blue-600">{po.order_number}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">{po.order_date}</Descriptions.Item>
              <Descriptions.Item label="Customer">{po.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Expected Delivery">
                <div className="flex flex-col gap-1">
                  <Space size={8}>
                    <CalendarOutlined className="text-gray-400" />
                    {po.expected_delivery ? (
                      <Text type={dayjs(po.expected_delivery).isBefore(dayjs(), 'day') ? 'danger' : undefined}>
                        {dayjs(po.expected_delivery).format('DD MMM YYYY')}
                        {dayjs(po.expected_delivery).isBefore(dayjs(), 'day') && ' (Overdue)'}
                      </Text>
                    ) : <Text type="secondary">Not set</Text>}
                    {po.expected_delivery && !['cancelled', 'delivered', 'dispatched'].includes(po.status) && (
                      <Button size="small" danger onClick={() => { setDelayNote(po.delay_note || ''); setDelayModalOpen(true); }}>
                        Report Delay
                      </Button>
                    )}
                  </Space>
                  {po.delay_note && (
                    <Text type="warning" className="text-xs">⚠ Delay reported: {po.delay_note}</Text>
                  )}
                </div>
              </Descriptions.Item>
              {po.under_verification_at && (
                <Descriptions.Item label="Under Verification Since">
                  <Tag color="volcano">
                    {dayjs(po.under_verification_at).format('DD MMM YYYY, hh:mm A')}
                  </Tag>
                </Descriptions.Item>
              )}
              {po.billing_address && (
                <Descriptions.Item label="Billing Address" span={2}>{po.billing_address}</Descriptions.Item>
              )}
              {po.shipping_address && (
                <Descriptions.Item label="Shipping Address" span={2}>{po.shipping_address}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card
            title={editMode ? 'Edit Items' : 'Items'}
            className="card-shadow"
            extra={editMode ? (
              <Button size="small" icon={<PlusOutlined />} onClick={addEditItem}>
                Add Item
              </Button>
            ) : undefined}
          >
            {editMode ? (
              <>
                <Table
                  dataSource={editItems}
                  rowKey={(_, i) => String(i)}
                  pagination={false}
                  size="small"
                  scroll={{ x: 700 }}
                  columns={[
                    { title: '#', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
                    {
                      title: 'Item Name',
                      key: 'item_name',
                      render: (_, __, i) => (
                        <Input
                          size="small"
                          value={editItems[i]?.item_name}
                          onChange={(e) => updateEditItem(i, 'item_name', e.target.value)}
                          placeholder="Item name"
                        />
                      ),
                    },
                    {
                      title: 'Qty',
                      key: 'quantity',
                      width: 80,
                      render: (_, __, i) => (
                        <InputNumber
                          size="small"
                          min={1}
                          value={editItems[i]?.quantity}
                          onChange={(v) => updateEditItem(i, 'quantity', v || 1)}
                          className="w-full"
                        />
                      ),
                    },
                    {
                      title: 'Unit Price',
                      key: 'unit_price',
                      width: 120,
                      render: (_, __, i) => (
                        <InputNumber
                          size="small"
                          min={0}
                          precision={2}
                          prefix="₹"
                          value={editItems[i]?.unit_price}
                          onChange={(v) => updateEditItem(i, 'unit_price', v || 0)}
                          className="w-full"
                        />
                      ),
                    },
                    {
                      title: 'Tax %',
                      key: 'tax_percent',
                      width: 80,
                      render: (_, __, i) => (
                        <InputNumber
                          size="small"
                          min={0}
                          max={100}
                          precision={2}
                          value={editItems[i]?.tax_percent}
                          onChange={(v) => updateEditItem(i, 'tax_percent', v || 0)}
                          className="w-full"
                        />
                      ),
                    },
                    {
                      title: 'Total',
                      key: 'line_total',
                      width: 110,
                      render: (_, __, i) => (
                        <span className="font-semibold">{fmt(editItems[i]?.line_total || 0)}</span>
                      ),
                    },
                    {
                      title: '',
                      key: 'actions',
                      width: 40,
                      render: (_, __, i) => (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<MinusCircleOutlined />}
                          onClick={() => removeEditItem(i)}
                          disabled={editItems.length <= 1}
                        />
                      ),
                    },
                  ]}
                />
                <div className="flex justify-end mt-3">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{fmt(editSubTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax</span>
                      <span>{fmt(editTaxAmount)}</span>
                    </div>
                    <Divider className="my-1" />
                    <div className="flex justify-between font-bold text-base">
                      <span>Grand Total</span>
                      <span className="text-blue-700">{fmt(editGrandTotal)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Table
                dataSource={po.items || []}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
                columns={[
                  { title: '#', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
                  { title: 'Item', dataIndex: 'item_name', key: 'item_name' },
                  { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60 },
                  { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', render: (v) => fmt(v) },
                  { title: 'Tax %', dataIndex: 'tax_percent', key: 'tax_percent', render: (v) => `${v || 0}%` },
                  { title: 'Total', dataIndex: 'line_total', key: 'line_total', render: (v) => <span className="font-semibold">{fmt(v)}</span> },
                ]}
              />
            )}
          </Card>
        </Col>

        {/* Right: Order summary + Invoicing summary */}
        <Col xs={24} lg={8}>
          <Card title="Order Summary" className="card-shadow mb-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <Text type="secondary">Sub Total</Text>
                <span>{fmt(po.sub_total)}</span>
              </div>
              {Number(po.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span>−{fmt(po.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <Text type="secondary">Tax</Text>
                <span>{fmt(po.tax_amount)}</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>PO Total</span>
                <span className="text-blue-700">{fmt(po.grand_total)}</span>
              </div>
            </div>
          </Card>

          <Card title="Invoicing Summary" className="card-shadow">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <Text type="secondary">PO Total</Text>
                <span className="font-semibold text-blue-700">{fmt(poTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <Text type="secondary">Total Invoiced</Text>
                <span className="text-orange-500 font-semibold">{fmt(totalInvoiced)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <Text type="secondary">Total Paid</Text>
                <span className="text-green-600 font-semibold">{fmt(totalPaidOnInvoices)}</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Balance Due</span>
                <span className={totalBalanceDue > 0.005 ? 'text-red-600' : 'text-green-600'}>
                  {fmt(totalBalanceDue)}
                </span>
              </div>
              {remainingBalance > 0.005 && (
                <div className="flex justify-between text-sm">
                  <Text type="secondary">Uninvoiced</Text>
                  <span className="text-gray-500">{fmt(remainingBalance)}</span>
                </div>
              )}
              <Progress
                percent={paidPercent}
                strokeColor={totalBalanceDue <= 0.005 ? '#52c41a' : '#1677ff'}
                format={() => `${paidPercent}% paid`}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Invoices — full width ─────────────────────────────────────────── */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileDoneOutlined />
              Invoices
              {linkedInvoices.length > 0 && <Tag color="blue">{linkedInvoices.length}</Tag>}
              {totalBalanceDue <= 0 && linkedInvoices.length > 0 && (
                <Tag color="success" icon={<CheckCircleOutlined />}>Fully Paid</Tag>
              )}
            </span>
            {canCreateInvoice && (
              <Button
                type="primary"
                size="small"
                icon={<FileDoneOutlined />}
                onClick={handleCreateInvoiceClick}
              >
                Generate Invoice
              </Button>
            )}
          </div>
        }
        className="card-shadow"
      >
        {linkedInvoices.length === 0 ? (
          <div className="text-center py-8">
            <FileDoneOutlined className="text-4xl text-gray-300 mb-3" />
            <div className="text-gray-400 mb-1 font-medium">No invoices yet</div>
            <div className="text-gray-300 text-sm mb-4">
              Add an invoice to start billing against this purchase order
            </div>
            {canCreateInvoice && (
              <Button
                type="primary"
                icon={<FileDoneOutlined />}
                onClick={handleCreateInvoiceClick}
              >
                Generate First Invoice
              </Button>
            )}
          </div>
        ) : (
          <Table
            columns={invoiceColumns as any}
            dataSource={invoicesWithRunning}
            rowKey="id"
            pagination={false}
            loading={invLoading}
            size="small"
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => router.push(`/invoices/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            summary={() => (
              <Table.Summary.Row className="bg-gray-50">
                <Table.Summary.Cell index={0} colSpan={3}>
                  <span className="font-semibold">Total</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <span className="font-bold text-orange-500">{fmt(totalInvoiced)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <span className={`font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(remainingBalance)}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={2} />
              </Table.Summary.Row>
            )}
          />
        )}
      </Card>

      {/* ── Version History ────────────────────────────────────────────────── */}
      {(po.versions?.length ?? 0) > 0 && (
        <POVersionHistory
          versions={po.versions!}
          currentVersion={po.current_version}
          orderNumber={po.order_number}
        />
      )}

      {/* ── Invoice Detail Drawer ─────────────────────────────────────────── */}
      <Drawer
        title={
          invoice ? (
            <div className="flex items-center gap-3">
              <span className="font-bold text-blue-600">{invoice.invoice_number}</span>
              <Tag color={getInvStatusColor(invoice.status)}>{getInvStatusLabel(invoice.status)}</Tag>
            </div>
          ) : 'Invoice Details'
        }
        open={!!drawerInvoiceId}
        onClose={() => { setDrawerInvoiceId(null); setPaymentModalOpen(false); }}
        width={720}
        extra={
          invoice ? (
            <Space>
              <Button
                icon={<PrinterOutlined />}
                onClick={() => window.open(`/print/invoice/${invoice.id}?pdf=1`, '_blank')}
              >
                Download Invoice
              </Button>
              {Number(invoice.balance_due) > 0 && invoice.status !== 'cancelled' && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => {
                    paymentForm.setFieldsValue({ payment_date: dayjs() });
                    setPaymentModalOpen(true);
                  }}
                >
                  Record Payment
                </Button>
              )}
            </Space>
          ) : null
        }
      >
        {invDetailLoading ? (
          <div className="flex justify-center items-center h-40"><Spin /></div>
        ) : invoice ? (
          <div className="space-y-4">
            {/* Enterprise GST banner */}
            {gstNumber && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GST No.</span>
                <span className="font-bold text-blue-800 tracking-widest font-mono text-sm">{gstNumber}</span>
              </div>
            )}

            {/* Invoice info */}
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Invoice #">
                <span className="font-semibold text-blue-600">{invoice.invoice_number}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Date">{invoice.invoice_date}</Descriptions.Item>
              <Descriptions.Item label="Customer">{invoice.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{invoice.due_date || '—'}</Descriptions.Item>
              {invoice.billing_address && (
                <Descriptions.Item label="Billing Address" span={2}>{invoice.billing_address}</Descriptions.Item>
              )}
            </Descriptions>

            {/* Line items with HSN/SAC + CGST/SGST */}
            <Card size="small" title="Line Items" className="card-shadow">
              {(invoice.items || []).length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm">No line items recorded</div>
              ) : (
                <Table
                  dataSource={invoice.items || []}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 800 }}
                  columns={[
                    { title: '#', key: 'i', width: 40, render: (_: any, __: any, i: number) => i + 1 },
                    {
                      title: 'Item / Description',
                      key: 'item',
                      render: (_: any, r: any) => (
                        <div>
                          <div className="font-medium">{r.item_name}</div>
                          {r.description && <div className="text-xs text-gray-400">{r.description}</div>}
                        </div>
                      ),
                    },
                    {
                      title: 'HSN/SAC',
                      dataIndex: 'hsn_code',
                      key: 'hsn_code',
                      width: 80,
                      render: (v: any) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-gray-300">—</span>,
                    },
                    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 50 },
                    {
                      title: 'Unit Price',
                      dataIndex: 'unit_price',
                      key: 'unit_price',
                      width: 90,
                      render: (v: any) => fmt(v),
                    },
                    {
                      title: 'GST%',
                      key: 'gst_pct',
                      width: 60,
                      render: (_: any, r: any) => `${Number(r.tax_percent || 0)}%`,
                    },
                    {
                      title: 'CGST',
                      key: 'cgst',
                      width: 85,
                      render: (_: any, r: any) => (
                        <span className="text-orange-600">{fmt(Number(r.tax_amount || 0) / 2)}</span>
                      ),
                    },
                    {
                      title: 'SGST',
                      key: 'sgst',
                      width: 85,
                      render: (_: any, r: any) => (
                        <span className="text-orange-600">{fmt(Number(r.tax_amount || 0) / 2)}</span>
                      ),
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'line_total',
                      key: 'line_total',
                      width: 90,
                      render: (v: any) => <b>{fmt(v)}</b>,
                    },
                  ]}
                  summary={() => (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={8} className="text-right text-gray-600">
                          Sub Total
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8}>{fmt(invoice.sub_total)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                      {Number(invoice.discount_amount) > 0 && (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={8} className="text-right text-red-500">
                            Discount
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={8} className="text-red-500">
                            -{fmt(invoice.discount_amount)}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={8} className="text-right text-orange-600">
                          CGST
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} className="text-orange-600">
                          {fmt(Number(invoice.tax_amount) / 2)}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={8} className="text-right text-orange-600">
                          SGST
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} className="text-orange-600">
                          {fmt(Number(invoice.tax_amount) / 2)}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={8} className="text-right font-bold">
                          Grand Total
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} className="font-bold text-blue-600">
                          {fmt(invoice.grand_total)}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </>
                  )}
                />
              )}
            </Card>

            {/* Payment summary — per-invoice */}
            <Card size="small" title="Payment Summary" className="card-shadow">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice Amount</span>
                  <span className="font-semibold">{fmt(invoice.grand_total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Verified & Paid</span>
                  <span className="font-semibold text-green-600">{fmt(invoice.total_paid)}</span>
                </div>
                {Number(invoice.pending_amount ?? 0) > 0.005 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-500 flex items-center gap-1"><SyncOutlined spin />Under Processing</span>
                    <span className="font-semibold text-orange-500">{fmt(invoice.pending_amount ?? 0)}</span>
                  </div>
                )}
                <Divider className="my-1" />
                <div className="flex justify-between text-base font-bold">
                  <span>Balance Due</span>
                  <span className={Number(invoice.balance_due) > 0.005 ? 'text-red-600' : 'text-green-600'}>
                    {fmt(invoice.balance_due)}
                  </span>
                </div>
                <div className="text-center mt-1">
                  <Tag color={Number(invoice.balance_due) <= 0.005 ? 'green' : Number(invoice.pending_amount ?? 0) > 0.005 ? 'orange' : 'red'}>
                    {Number(invoice.balance_due) <= 0.005 ? '✓ Fully Paid' : Number(invoice.pending_amount ?? 0) > 0.005 ? 'Pending Verification' : 'Partially Paid'}
                  </Tag>
                </div>
              </div>
            </Card>

            {/* Payment history — payments for this invoice */}
            <Card size="small" title={`Payment History (${(invoice.payments || []).length})`} className="card-shadow">
              {(invoice.payments || []).length === 0 ? (
                <div className="text-center text-gray-400 py-4">No payments recorded yet</div>
              ) : (
                <Table
                  dataSource={invoice.payments || []}
                  columns={paymentColumns as any}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 600 }}
                />
              )}
            </Card>
          </div>
        ) : null}
      </Drawer>

      {/* ── Record Payment Modal ──────────────────────────────────────────── */}
      <Modal
        title="Record Payment"
        open={paymentModalOpen}
        onCancel={() => { setPaymentModalOpen(false); paymentForm.resetFields(); }}
        footer={null}
        maskClosable={false}
      >
        {invoice && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <div className="text-sm text-gray-600">{invoice.invoice_number} — Balance Due</div>
            <div className="text-2xl font-bold text-red-600">{fmt(invoice.balance_due)}</div>
          </div>
        )}
        <Form form={paymentForm} layout="vertical" onFinish={(values) => {
          paymentMutation.mutate({
            amount: values.amount,
            payment_date: dayjs().format('YYYY-MM-DD'),
            reference_number: values.reference_number,
            notes: values.notes,
          });
        }}>
          <Form.Item
            name="amount"
            label="Payment Amount"
            rules={[
              { required: true, message: 'Enter payment amount' },
              { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
              {
                type: 'number',
                max: invoice ? Number(invoice.balance_due) : undefined,
                message: `Amount cannot exceed balance due of ${fmt(Number(invoice?.balance_due || 0))}`,
              },
            ]}
          >
            <InputNumber
              className="w-full"
              prefix="₹"
              precision={2}
              min={0.01}
              placeholder={`Max: ${fmt(Number(invoice?.balance_due || 0))}`}
              parser={(value) => Number(value!.replace(/,/g, '')) as unknown as number}
            />
          </Form.Item>
          <Form.Item label="Payment Date">
            <Input value={dayjs().format('DD MMM YYYY, hh:mm A')} disabled className="bg-gray-50 text-gray-700 font-medium" />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference / Transaction ID">
            <Input placeholder="Cheque No. / UPI Ref / Transaction ID" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3 text-sm text-amber-700">
            Payment will be saved as <strong>Under Processing</strong> until verified by your team.
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setPaymentModalOpen(false); paymentForm.resetFields(); }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={paymentMutation.isPending}>
              Submit for Verification
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Generate Invoice Modal ───────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileDoneOutlined className="text-blue-500" />
            <span>Generate Invoice</span>
          </div>
        }
        open={addInvoiceOpen}
        onCancel={() => { setAddInvoiceOpen(false); addInvoiceForm.resetFields(); setInvoiceAmountInput(0); }}
        footer={null}
        maskClosable={false}
        width={440}
      >
        {/* PO balance reference — read-only */}
        <div className="mb-5">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-2 tracking-wide">
            Balance Reference ({po?.order_number} · {po?.customer_name})
          </div>
          <div className="rounded-lg border overflow-hidden text-sm">
            <div className="flex justify-between items-center px-3 py-2 bg-blue-50 border-b">
              <span className="text-gray-600">PO Total</span>
              <span className="font-bold text-blue-700">{fmt(poTotal)}</span>
            </div>
            {totalInvoiced > 0 && (
              <div className="flex justify-between items-center px-3 py-2 bg-orange-50 border-b">
                <span className="text-gray-600">Already Invoiced</span>
                <span className="font-semibold text-orange-500">− {fmt(totalInvoiced)}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-3 py-2.5 bg-green-50">
              <span className="font-semibold text-gray-700">Remaining to Invoice</span>
              <span className="font-bold text-lg text-green-700">{fmt(Math.max(0, remainingBalance - (invoiceAmountInput || 0)))}</span>
            </div>
          </div>
        </div>

        <Form
          form={addInvoiceForm}
          layout="vertical"
          onFinish={handleAddInvoiceSubmit}
        >
          <Form.Item
            name="amount"
            label="Invoice Amount (₹)"
            rules={[
              { required: true, message: 'Enter invoice amount' },
              { type: 'number', min: 0.01, message: 'Must be greater than 0' },
              { type: 'number', max: remainingBalance, message: `Cannot exceed ${fmt(remainingBalance)}` },
            ]}
          >
            <InputNumber
              className="w-full"
              prefix="₹"
              precision={2}
              min={0.01}
              placeholder={`Max: ${fmt(remainingBalance)}`}
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              // @ts-ignore
              parser={(value) => Number((value || '').replace(/,/g, ''))}
              onChange={(val) => setInvoiceAmountInput(Number(val) || 0)}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-2">
            <Button onClick={() => { setAddInvoiceOpen(false); addInvoiceForm.resetFields(); }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={invoiceMutation.isPending} icon={<FileDoneOutlined />}>
              Generate Invoice
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Per-Invoice Record Payment Modal ─────────────────────────────── */}
      {(() => {
        const targetInvoice = linkedInvoices.find((inv) => inv.id === paymentModalInvoiceId);
        return (
          <Modal
            title={
              <div className="flex items-center gap-2">
                <DollarOutlined className="text-green-500" />
                <span>Record Payment</span>
                {targetInvoice && (
                  <span className="text-sm font-normal text-gray-500 ml-1">— {targetInvoice.invoice_number}</span>
                )}
              </div>
            }
            open={!!paymentModalInvoiceId}
            onCancel={() => { setPaymentModalInvoiceId(null); perInvoicePaymentForm.resetFields(); setPerInvoicePaymentMethod(undefined); }}
            footer={null}
            maskClosable={false}
            width={480}
          >
            {targetInvoice && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Invoice Amount</span>
                  <span className="font-semibold">{fmt(targetInvoice.grand_total)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Already Paid</span>
                  <span className="font-semibold text-green-600">{fmt(targetInvoice.total_paid)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Balance Due</span>
                  <span className="text-red-600">{fmt(targetInvoice.balance_due)}</span>
                </div>
              </div>
            )}
            <Form
              form={perInvoicePaymentForm}
              layout="vertical"
              onFinish={(values) => {
                perInvoicePaymentMutation.mutate({
                  amount: values.amount,
                  payment_date: dayjs().format('YYYY-MM-DD'),
                  payment_method: values.payment_method,
                  reference_number: values.reference_number,
                  notes: values.notes,
                });
              }}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="amount"
                    label="Payment Amount (₹)"
                    rules={[
                      { required: true, message: 'Enter amount' },
                      { type: 'number', min: 0.01, message: 'Must be > 0' },
                      {
                        type: 'number',
                        max: targetInvoice ? Number(targetInvoice.balance_due) : undefined,
                        message: `Cannot exceed ${fmt(Number(targetInvoice?.balance_due || 0))}`,
                      },
                    ]}
                  >
                    <InputNumber
                      className="w-full"
                      prefix="₹"
                      precision={2}
                      min={0.01}
                      placeholder={`Max: ${fmt(Number(targetInvoice?.balance_due || 0))}`}
                      // @ts-ignore
                      parser={(value) => Number((value || '').replace(/,/g, ''))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Payment Date">
                    <Input value={dayjs().format('DD MMM YYYY')} disabled className="bg-gray-50 text-gray-700" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true, message: 'Select payment method' }]}>
                <Select
                  placeholder="Select method"
                  onChange={(val) => { setPerInvoicePaymentMethod(val); perInvoicePaymentForm.setFieldValue('reference_number', undefined); }}
                >
                  <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                  <Select.Option value="cheque">Cheque</Select.Option>
                  <Select.Option value="upi">UPI</Select.Option>
                  <Select.Option value="cash">Cash</Select.Option>
                </Select>
              </Form.Item>
              {perInvoicePaymentMethod === 'bank_transfer' && (
                <Form.Item name="reference_number" label="Transaction ID" rules={[{ required: true, message: 'Enter transaction ID' }]}>
                  <Input placeholder="Enter bank transaction ID" />
                </Form.Item>
              )}
              {perInvoicePaymentMethod === 'cheque' && (
                <Form.Item name="reference_number" label="Cheque Number" rules={[{ required: true, message: 'Enter cheque number' }]}>
                  <Input placeholder="Enter cheque number" />
                </Form.Item>
              )}
              {perInvoicePaymentMethod === 'upi' && (
                <Form.Item name="reference_number" label="UPI Transaction ID" rules={[{ required: true, message: 'Enter UPI transaction ID' }]}>
                  <Input placeholder="Enter UPI transaction ID / UTR" />
                </Form.Item>
              )}
              <Form.Item name="notes" label="Notes (optional)">
                <Input.TextArea rows={2} placeholder="Optional notes..." />
              </Form.Item>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3 text-sm text-amber-700">
                Payment will be saved as <strong>Under Processing</strong> until verified by your team.
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button onClick={() => { setPaymentModalInvoiceId(null); perInvoicePaymentForm.resetFields(); setPerInvoicePaymentMethod(undefined); }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={perInvoicePaymentMutation.isPending} icon={<DollarOutlined />}>
                  Submit for Verification
                </Button>
              </div>
            </Form>
          </Modal>
        );
      })()}

      {/* ── Change Notes Modal (for versioned update) ──────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-blue-500" />
            <span>Update Purchase Order</span>
          </div>
        }
        open={changeNotesModalOpen}
        onCancel={() => { setChangeNotesModalOpen(false); setChangeNotes(''); }}
        footer={null}
        maskClosable={false}
        width={480}
      >
        <div className="mb-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold">Current Version</div>
              <div className="text-xl font-bold text-blue-700">v{po?.current_version}</div>
            </div>
            <div className="text-2xl text-gray-300">→</div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold">New Version</div>
              <div className="text-xl font-bold text-green-600">v{(po?.current_version || 1) + 1}</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 rounded border text-sm">
            <div className="font-semibold mb-1">Updated Total</div>
            <div className="text-lg font-bold text-blue-700">{fmt(editGrandTotal)}</div>
            {editGrandTotal !== Number(po?.grand_total || 0) && (
              <div className="text-xs text-gray-400 mt-1">
                Previous: {fmt(po?.grand_total || 0)}
              </div>
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Change Notes <span className="text-gray-400">(optional)</span>
          </label>
          <Input.TextArea
            rows={3}
            placeholder="Describe what changed and why (e.g., 'Customer requested 10 more units of Product X')"
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={() => { setChangeNotesModalOpen(false); setChangeNotes(''); }}>
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={updateMutation.isPending}
            onClick={confirmUpdatePO}
          >
            Confirm & Update PO
          </Button>
        </div>
      </Modal>

      {/* ETA Modal */}
      <Modal
        title={<span><CalendarOutlined className="mr-2 text-blue-500" />Set Expected Delivery Date</span>}
        open={etaModalOpen}
        onCancel={() => setEtaModalOpen(false)}
        onOk={() => etaMutation.mutate(etaValue ? etaValue.format('YYYY-MM-DD') : '')}
        okText="Save"
        confirmLoading={etaMutation.isPending}
        width={360}
      >
        <div className="py-3">
          <DatePicker
            className="w-full"
            format="DD MMM YYYY"
            value={etaValue}
            onChange={(date) => setEtaValue(date)}
            placeholder="Select expected delivery date"
          />
        </div>
      </Modal>

      {/* Report Delay Modal */}
      <Modal
        title={<span><WarningOutlined className="text-orange-500 mr-2" />Report Delivery Delay</span>}
        open={delayModalOpen}
        onCancel={() => { setDelayModalOpen(false); setDelayNote(''); }}
        onOk={() => delayMutation.mutate(delayNote)}
        okText="Submit"
        okButtonProps={{ danger: true, loading: delayMutation.isPending, disabled: !delayNote.trim() }}
        cancelText="Cancel"
        width={420}
      >
        <div className="py-2">
          <p className="text-gray-600 text-sm mb-3">
            Expected Delivery: <strong>{po?.expected_delivery ? dayjs(po.expected_delivery).format('DD MMM YYYY') : '—'}</strong>
          </p>
          <Input.TextArea
            rows={3}
            placeholder="e.g. Supplier delayed shipment by 5 days due to material shortage..."
            value={delayNote}
            onChange={(e) => setDelayNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* Hold Reason Modal */}
      <Modal
        title={
          <span>
            <PauseCircleOutlined className="text-yellow-500 mr-2" />
            Hold Purchase Order — {po?.order_number}
          </span>
        }
        open={holdModalOpen}
        onCancel={() => { setHoldModalOpen(false); setHoldReason(''); }}
        onOk={() => holdMutation.mutate(holdReason || undefined)}
        okText="Hold Order"
        okButtonProps={{ danger: true, loading: holdMutation.isPending }}
        cancelText="Cancel"
      >
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Production will be stopped"
          description="Placing this order on hold will immediately stop all manufacturing progress. No stages can be completed until the order is resumed."
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for hold (optional)</label>
          <Input.TextArea
            rows={3}
            placeholder="e.g. Customer requested changes, Payment pending, Material shortage..."
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        title={
          <span>
            <StopOutlined className="text-red-500 mr-2" />
            Cancel Purchase Order — {po?.order_number}
          </span>
        }
        open={cancelModalOpen}
        onCancel={() => { setCancelModalOpen(false); setCancelReason(''); }}
        onOk={() => cancelMutation.mutate(cancelReason)}
        okText="Cancel Order"
        okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
        cancelText="Go Back"
      >
        {po?.sent_to_manufacturing ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Manufacturing team will be notified"
            description="This order has been sent to manufacturing. Cancelling will halt all job cards and send an email notification to the manufacturing team and all assigned employees."
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="This action cannot be undone"
            description={
              po?.enquiry_id
                ? 'Cancelling this order will revert the linked enquiry back to Follow Up, so a new quotation can be created.'
                : 'The purchase order will be permanently cancelled.'
            }
          />
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation (optional)</label>
          <Input.TextArea
            rows={3}
            placeholder="e.g. Customer withdrew order, Price dispute, Changed requirements..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

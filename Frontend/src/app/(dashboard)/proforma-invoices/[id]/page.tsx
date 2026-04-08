'use client';

import { useRef, useState } from 'react';
import { Typography, Button, Space, Table, Tag, Spin, message, Divider, Popconfirm } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, SendOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProformaInvoiceById, updatePIStatus, convertPIToSalesOrder } from '@/lib/api/proforma-invoices';
import { downloadPdf, printPage } from '@/lib/utils/printPdf';
import { useAuthStore } from '@/stores/authStore';
import type { ProformaInvoiceItem } from '@/types/proforma-invoice';
import type { Enterprise } from '@/types/auth';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

function statusTag(status: string) {
  const colors: Record<string, string> = { draft: 'default', sent: 'blue', converted: 'green' };
  return <Tag color={colors[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
}

function fmt(val: number | string | undefined | null) {
  return `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function ViewProformaInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const piId = Number(params.id);
  const queryClient = useQueryClient();
  const { user, userType } = useAuthStore();
  const enterprise = userType === 'enterprise' ? (user as Enterprise) : null;

  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['proforma-invoice', piId],
    queryFn: () => getProformaInvoiceById(piId),
    enabled: !!piId,
  });

  const pi = data?.data;

  const markSentMutation = useMutation({
    mutationFn: () => updatePIStatus(piId, 'sent'),
    onSuccess: () => {
      message.success('Marked as Sent');
      queryClient.invalidateQueries({ queryKey: ['proforma-invoice', piId] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update status'),
  });

  const convertMutation = useMutation({
    mutationFn: () => convertPIToSalesOrder(piId),
    onSuccess: (result) => {
      message.success('Converted to Sales Order');
      queryClient.invalidateQueries({ queryKey: ['proforma-invoice', piId] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      const soId = result?.data?.sales_order_id;
      if (soId) router.push(`/purchase-orders/${soId}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to convert'),
  });

  const handleDownloadPDF = async () => {
    await downloadPdf({
      filename: `ProformaInvoice-${pi?.pi_number || piId}.pdf`,
      element: printRef.current || undefined,
      onStart: () => message.loading({ content: 'Generating PDF...', key: 'pdf' }),
      onSuccess: () => message.success({ content: 'PDF downloaded', key: 'pdf' }),
      onError: () => message.error({ content: 'Failed to generate PDF', key: 'pdf' }),
    });
  };

  const itemColumns: ColumnsType<ProformaInvoiceItem> = [
    { title: '#', key: 'idx', width: 45, render: (_, __, i) => i + 1 },
    { title: 'Item Name', dataIndex: 'item_name', key: 'item_name' },
    { title: 'HSN', dataIndex: 'hsn_code', key: 'hsn_code', render: (v) => v || '-' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right' as const,
      render: (v) => fmt(v),
    },
    {
      title: 'Disc %',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      align: 'right' as const,
      render: (v) => v ? `${v}%` : '-',
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_percent',
      key: 'tax_percent',
      align: 'right' as const,
      render: (v) => v ? `${v}%` : '-',
    },
    {
      title: 'Amount',
      dataIndex: 'line_total',
      key: 'line_total',
      align: 'right' as const,
      render: (v) => fmt(v),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Proforma Invoice not found</Title>
        <Button onClick={() => router.push('/proforma-invoices')}>Back</Button>
      </div>
    );
  }

  return (
    <div className="print:p-8">
      {/* Action bar — hidden on print */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/proforma-invoices')}>
            Back
          </Button>
          <Title level={4} className="!mb-0">{pi.pi_number}</Title>
          {statusTag(pi.status)}
        </div>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={printPage}>Print</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadPDF}>Download PDF</Button>
          {pi.status === 'draft' && (
            <Button
              icon={<SendOutlined />}
              onClick={() => markSentMutation.mutate()}
              loading={markSentMutation.isPending}
            >
              Mark as Sent
            </Button>
          )}
          {pi.status !== 'converted' && (
            <Popconfirm
              title="Convert to Sales Order?"
              description="This will create a Sales Order and lock this Proforma Invoice."
              onConfirm={() => convertMutation.mutate()}
              okText="Convert"
              cancelText="Cancel"
            >
              <Button type="primary" loading={convertMutation.isPending}>
                Convert to Sales Order
              </Button>
            </Popconfirm>
          )}
          {pi.status === 'converted' && pi.sales_order_id && (
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => router.push(`/purchase-orders/${pi.sales_order_id}`)}
            >
              View Sales Order
            </Button>
          )}
        </Space>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="bg-white rounded-lg border border-gray-200 p-8 print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{enterprise?.business_name || 'Company Name'}</h1>
            {enterprise?.gst_number && (
              <p className="text-sm text-gray-500 mt-0.5">GSTIN: {enterprise.gst_number}</p>
            )}
            {enterprise?.address && (
              <p className="text-sm text-gray-500 mt-0.5">{enterprise.address}</p>
            )}
            {(enterprise?.city || enterprise?.state) && (
              <p className="text-sm text-gray-500">
                {[enterprise.city, enterprise.state, enterprise.pincode].filter(Boolean).join(', ')}
              </p>
            )}
            {enterprise?.mobile && <p className="text-sm text-gray-500">Ph: {enterprise.mobile}</p>}
            {enterprise?.email && <p className="text-sm text-gray-500">Email: {enterprise.email}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-blue-700 uppercase tracking-wide">Proforma Invoice</h2>
            <p className="text-gray-700 mt-1"><span className="font-medium">PI No:</span> {pi.pi_number}</p>
            <p className="text-gray-700"><span className="font-medium">Date:</span> {dayjs(pi.pi_date).format('DD/MM/YYYY')}</p>
          </div>
        </div>

        <Divider className="my-4" />

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-semibold text-gray-800">{pi.customer_name}</p>
            {pi.email && <p className="text-sm text-gray-600">{pi.email}</p>}
            {pi.mobile && <p className="text-sm text-gray-600">{pi.mobile}</p>}
            {pi.billing_address && <p className="text-sm text-gray-600 whitespace-pre-line">{pi.billing_address}</p>}
          </div>
          {pi.shipping_address && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ship To</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{pi.shipping_address}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <Table
          dataSource={pi.items || []}
          columns={itemColumns}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
          className="mb-4"
        />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{fmt(pi.sub_total)}</span>
            </div>
            {Number(pi.discount_amount) > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-500">
                  Discount
                  {pi.discount_type === 'percentage' ? ` (${pi.discount_value}%)` : ''}
                </span>
                <span className="text-red-500">- {fmt(pi.discount_amount)}</span>
              </div>
            )}
            {Number(pi.tax_amount) > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-500">Tax (GST)</span>
                <span>{fmt(pi.tax_amount)}</span>
              </div>
            )}
            {Number(pi.shipping_charges) > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-500">Shipping</span>
                <span>{fmt(pi.shipping_charges)}</span>
              </div>
            )}
            <Divider className="my-2" />
            <div className="flex justify-between py-1 font-bold text-base">
              <span>Grand Total</span>
              <span className="text-blue-700">{fmt(pi.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(pi.notes || pi.terms_conditions) && (
          <div className="mt-6 grid grid-cols-2 gap-6">
            {pi.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{pi.notes}</p>
              </div>
            )}
            {pi.terms_conditions && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Terms & Conditions</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{pi.terms_conditions}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer disclaimer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 italic">
            * This is a Proforma Invoice. Not a tax invoice. No GST/IRN generated. No accounting liability created.
          </p>
        </div>
      </div>
    </div>
  );
}

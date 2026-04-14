'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPaymentById } from '@/lib/api/invoices';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { PrintMasterTemplate, TableColumn } from '@/components/print-engine/PrintMasterTemplate';
import { fmt, fmtDate, amountInWords, downloadAsPDF } from '@/lib/print/utils';
import dayjs from 'dayjs';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
  upi: 'UPI', card: 'Card', other: 'Other',
};

export default function PaymentReceiptPage() {
  const params    = useParams();
  const paymentId = Number(params.id);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-receipt', paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: !!paymentId,
  });

  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
    staleTime: 5 * 60 * 1000,
  });

  const payment = data?.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = (payment as any)?.invoice;
  const isPaid  = payment?.status === 'completed';

  const handleDownloadPDF = async () => {
    if (!contentRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      await downloadAsPDF(
        contentRef.current,
        `receipt-${payment?.payment_number || paymentId}.pdf`,
      );
    } catch {
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (!payment || isConfigLoading) return;
    const isPdf =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('pdf') === '1';
    const timer = setTimeout(async () => {
      if (isPdf) {
        await handleDownloadPDF();
        window.close();
      } else {
        window.print();
      }
    }, 900);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment, isConfigLoading]);

  if (isLoading || !payment) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing payment receipt...
      </div>
    );
  }

  // ── Payment details as table rows ────────────────────────────────────────
  const detailRows = [
    { key: 'method',    label: 'Payment Method',         value: METHOD_LABELS[payment.payment_method ?? ''] || payment.payment_method || '—' },
    ...(payment.reference_number ? [{ key: 'ref', label: 'Reference / Txn ID', value: payment.reference_number }] : []),
    ...(isPaid && payment.verified_at ? [{ key: 'verified', label: 'Verified On', value: fmtDate(payment.verified_at) }] : []),
    ...(payment.notes ? [{ key: 'notes', label: 'Notes', value: payment.notes }] : []),
  ];

  const columns: TableColumn[] = [
    { key: 'label', label: 'Details', align: 'left'  },
    { key: 'value', label: 'Value',   align: 'right', width: 240 },
  ];

  const summaryRows = [
    { label: 'Amount Received', value: `₹${fmt(payment.amount)}`, highlight: true, large: true },
  ];

  const summaryLeft = (
    <>
      <div className="pt-section-title">Payment Status</div>
      <div className="pt-section-body">
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          background: isPaid ? '#f0fdf4' : '#fff7ed',
          color: isPaid ? '#16a34a' : '#ea580c',
          border: `1px solid ${isPaid ? '#86efac' : '#fed7aa'}`,
        }}>
          {isPaid ? '✓ PAID' : '⏳ PROCESSING'}
        </span>
        {!isPaid && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#874d00' }}>
            This payment is under processing and will be confirmed once verified.
          </div>
        )}
      </div>
      <div className="pt-section-title" style={{ marginTop: 12 }}>Generated On</div>
      <div className="pt-section-body">{dayjs().format('DD MMM YYYY, hh:mm A')}</div>
    </>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f0f0f0' }}>

      <PrintMasterTemplate
        ref={contentRef}
        config={config}
        documentTitle="Payment Receipt"
        metaLines={[
          { label: 'Receipt#',     value: payment.payment_number ?? '—', bold: true },
          { label: 'Payment Date', value: fmtDate(payment.payment_date) },
          ...(invoice?.invoiceNumber ? [{ label: 'Invoice Ref', value: invoice.invoiceNumber }] : []),
        ]}
        fromParty={{
          sectionLabel: 'Received by',
          name:    config?.company_name ?? '',
          address: config?.address ?? undefined,
          phone:   config?.show_phone ? (config?.phone ?? undefined) : undefined,
          email:   config?.show_email ? (config?.email ?? undefined) : undefined,
          gstin:   config?.show_gst   ? (config?.gst_number ?? undefined) : undefined,
        }}
        toParty={{
          sectionLabel: 'Received from',
          name:    invoice?.customerName ?? '—',
          address: invoice?.billingAddress ?? undefined,
        }}
        tableColumns={columns}
        tableRows={detailRows}
        renderCell={(row, key) => {
          if (key === 'label') return <span style={{ color: '#555' }}>{row.label}</span>;
          if (key === 'value') return <strong>{row.value}</strong>;
          return null;
        }}
        summaryRows={summaryRows}
        amountInWords={amountInWords(payment.amount)}
        summaryLeft={summaryLeft}
        signatureLabel="Authorized Signature"
      />

      {isGeneratingPDF && (
        <div className="print:hidden" style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: '#555', padding: '10px 28px', background: '#f5f5f5', borderRadius: 6 }}>
            Generating PDF, please wait...
          </div>
        </div>
      )}
    </div>
  );
}

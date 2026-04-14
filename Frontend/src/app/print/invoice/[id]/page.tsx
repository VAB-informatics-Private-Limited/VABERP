'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceById } from '@/lib/api/invoices';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { PrintMasterTemplate, TableColumn } from '@/components/print-engine/PrintMasterTemplate';
import { fmt, fmtDate, amountInWords, downloadAsPDF } from '@/lib/print/utils';

export default function InvoicePrintPage() {
  const params    = useParams();
  const invoiceId = Number(params.id);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice-print', invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
    staleTime: 5 * 60 * 1000,
  });

  const invoice = invoiceData?.data;

  const handleDownloadPDF = async () => {
    if (!contentRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      await downloadAsPDF(
        contentRef.current,
        `invoice-${invoice?.invoice_number || invoiceId}.pdf`,
      );
    } catch {
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (!invoice || isConfigLoading) return;
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
  }, [invoice, isConfigLoading]);

  if (isLoading || !invoice) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing invoice...
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = invoice.items || [];
  const balanceDue   = Number(invoice.balance_due ?? 0);
  const isPaid       = balanceDue <= 0;

  const columns: TableColumn[] = [
    { key: 'item',    label: 'Item / Description', align: 'left'   },
    { key: 'qty',     label: 'Qty',                align: 'center', width: 60  },
    { key: 'rate',    label: 'Rate',               align: 'right',  width: 90  },
    { key: 'tax_pct', label: 'Tax%',               align: 'center', width: 56  },
    { key: 'tax_amt', label: 'Tax Amt',            align: 'right',  width: 80  },
    { key: 'amount',  label: 'Amount',             align: 'right',  width: 96  },
  ];

  const hasDis = Number(invoice.discount_amount) > 0;
  const hasShi = Number(invoice.shipping_charges) > 0;

  const summaryRows = [
    { label: 'Sub Total',    value: `₹${fmt(invoice.sub_total)}` },
    ...(hasDis ? [{ label: 'Discount', value: `− ₹${fmt(invoice.discount_amount)}`, valueColor: '#16a34a' }] : []),
    { label: 'Tax',          value: `₹${fmt(invoice.tax_amount)}` },
    ...(hasShi ? [{ label: 'Shipping', value: `₹${fmt(invoice.shipping_charges)}` }] : []),
    { label: 'Grand Total',  value: `₹${fmt(invoice.grand_total)}`, separator: true, highlight: true, large: true },
    { label: 'Amount Paid',  value: `₹${fmt(invoice.total_paid)}`, valueColor: '#16a34a' },
    {
      label: isPaid ? '✓ Fully Paid' : 'Balance Due',
      value: isPaid ? '₹0.00' : `₹${fmt(balanceDue)}`,
      valueColor: isPaid ? '#16a34a' : '#dc2626',
      large: true,
    },
  ];

  const summaryLeft = (
    <>
      {invoice.terms_conditions && (
        <>
          <div className="pt-section-title">Terms &amp; Conditions</div>
          <div className="pt-section-body">{invoice.terms_conditions}</div>
        </>
      )}
      {invoice.notes && (
        <>
          <div className="pt-section-title">Additional Notes</div>
          <div className="pt-section-body">{invoice.notes}</div>
        </>
      )}
      {!invoice.terms_conditions && !invoice.notes && (
        <div className="pt-no-terms">No terms or notes.</div>
      )}
    </>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f0f0f0' }}>

      <PrintMasterTemplate
        ref={contentRef}
        config={config}
        documentTitle="Invoice"
        metaLines={[
          { label: 'Invoice#', value: invoice.invoice_number, bold: true },
          { label: 'Date',     value: fmtDate(invoice.invoice_date) },
          ...(invoice.due_date
            ? [{ label: 'Due Date', value: fmtDate(invoice.due_date), danger: !isPaid }]
            : []),
        ]}
        fromParty={{
          sectionLabel: 'Invoice by',
          name:    config?.company_name ?? '',
          address: config?.address ?? undefined,
          phone:   config?.show_phone ? (config?.phone ?? undefined) : undefined,
          email:   config?.show_email ? (config?.email ?? undefined) : undefined,
          gstin:   config?.show_gst   ? (config?.gst_number ?? undefined) : undefined,
          cin:     config?.cin_number ?? undefined,
        }}
        toParty={{
          sectionLabel: 'Invoice to',
          name:    invoice.customer_name ?? '—',
          address: invoice.billing_address ?? undefined,
        }}
        tableColumns={columns}
        tableRows={items}
        renderCell={(row, key) => {
          if (key === 'item')    return <><div style={{ fontWeight: 600 }}>{row.item_name}</div>{row.description && <div style={{ fontSize: 10, color: '#888' }}>{row.description}</div>}{row.hsn_code && <div style={{ fontSize: 10, color: '#888' }}>HSN: {row.hsn_code}</div>}</>;
          if (key === 'qty')     return `${row.quantity}${row.unit_of_measure ? ' ' + row.unit_of_measure : ''}`;
          if (key === 'rate')    return `₹${fmt(row.unit_price)}`;
          if (key === 'tax_pct') return `${row.tax_percent || 0}%`;
          if (key === 'tax_amt') return `₹${fmt(row.tax_amount)}`;
          if (key === 'amount')  return <strong>₹{fmt(row.line_total)}</strong>;
          return null;
        }}
        summaryRows={summaryRows}
        amountInWords={amountInWords(invoice.grand_total)}
        summaryLeft={summaryLeft}
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

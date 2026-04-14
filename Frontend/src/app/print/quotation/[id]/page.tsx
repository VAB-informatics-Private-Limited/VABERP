'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getQuotationById } from '@/lib/api/quotations';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { useAuthStore } from '@/stores/authStore';
import { PrintMasterTemplate, TableColumn } from '@/components/print-engine/PrintMasterTemplate';
import { fmt, fmtDate, amountInWords, downloadAsPDF } from '@/lib/print/utils';

export default function QuotationPrintPage() {
  const params     = useParams();
  const quotationId = Number(params.id);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['quotation-print', quotationId],
    queryFn: () => getQuotationById(quotationId, enterpriseId!),
    enabled: !!quotationId && !!enterpriseId,
  });

  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
    staleTime: 5 * 60 * 1000,
  });

  const quotation = data?.data;

  const handleDownloadPDF = async () => {
    if (!contentRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      await downloadAsPDF(
        contentRef.current,
        `quotation-${quotation?.quotation_number || quotationId}.pdf`,
      );
    } catch {
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (!quotation || isConfigLoading) return;
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
  }, [quotation, isConfigLoading]);

  if (isLoading || !quotation) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing quotation...
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = quotation.items || [];

  // ── Table columns ────────────────────────────────────────────────────────
  const columns: TableColumn[] = [
    { key: 'item',       label: 'Item / Description', align: 'left'   },
    { key: 'qty',        label: 'Qty',                align: 'center', width: 52  },
    { key: 'unit',       label: 'Unit',               align: 'center', width: 52  },
    { key: 'rate',       label: 'Rate',               align: 'right',  width: 90  },
    { key: 'disc',       label: 'Disc%',              align: 'center', width: 56  },
    { key: 'tax',        label: 'Tax%',               align: 'center', width: 56  },
    { key: 'amount',     label: 'Amount',             align: 'right',  width: 96  },
  ];

  // ── Summary rows ─────────────────────────────────────────────────────────
  const hasDis = Number(quotation.discount_amount) > 0;
  const summaryRows = [
    { label: 'Subtotal', value: `₹${fmt(quotation.subtotal)}` },
    ...(hasDis ? [{ label: 'Discount', value: `− ₹${fmt(quotation.discount_amount)}`, valueColor: '#16a34a' }] : []),
    { label: 'Tax', value: `₹${fmt(quotation.tax_amount)}`, separator: hasDis },
    { label: 'Total', value: `₹${fmt(quotation.total_amount)}`, highlight: true, large: true },
  ];

  // ── Summary left ─────────────────────────────────────────────────────────
  const summaryLeft = (
    <>
      {quotation.terms_conditions && (
        <>
          <div className="pt-section-title">Terms &amp; Conditions</div>
          <div className="pt-section-body">{quotation.terms_conditions}</div>
        </>
      )}
      {quotation.notes && (
        <>
          <div className="pt-section-title">Additional Notes</div>
          <div className="pt-section-body">{quotation.notes}</div>
        </>
      )}
      {!quotation.terms_conditions && !quotation.notes && (
        <div className="pt-no-terms">No terms or notes.</div>
      )}
    </>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f0f0f0' }}>

      {/* ── CAPTURE TARGET ── */}
      <PrintMasterTemplate
        ref={contentRef}
        config={config}
        documentTitle="Quotation"
        metaLines={[
          { label: 'Quotation#', value: quotation.quotation_number, bold: true },
          { label: 'Date', value: fmtDate(quotation.quotation_date) },
          ...(quotation.valid_until
            ? [{ label: 'Valid Until', value: fmtDate(quotation.valid_until) }]
            : []),
          ...(quotation.expected_delivery
            ? [{ label: 'ETA', value: fmtDate(quotation.expected_delivery) }]
            : []),
        ]}
        fromParty={{
          sectionLabel: 'Quotation by',
          name:    config?.company_name ?? '',
          address: config?.address ?? undefined,
          phone:   config?.show_phone  ? (config?.phone  ?? undefined) : undefined,
          email:   config?.show_email  ? (config?.email  ?? undefined) : undefined,
          gstin:   config?.show_gst    ? (config?.gst_number ?? undefined) : undefined,
          cin:     config?.cin_number  ?? undefined,
        }}
        toParty={{
          sectionLabel: 'Quotation to',
          name:    quotation.customer_name  ?? quotation.business_name ?? '—',
          subName: quotation.business_name  && quotation.customer_name ? quotation.business_name : undefined,
          address: quotation.billing_address ?? undefined,
          phone:   quotation.customer_mobile ?? undefined,
          email:   quotation.customer_email  ?? undefined,
        }}
        tableColumns={columns}
        tableRows={items}
        renderCell={(row, key) => {
          if (key === 'item')   return <><div style={{ fontWeight: 600 }}>{row.product_name}</div>{row.product_code && <div style={{ fontSize: 10, color: '#888' }}>SKU: {row.product_code}</div>}{row.hsn_code && <div style={{ fontSize: 10, color: '#888' }}>HSN: {row.hsn_code}</div>}</>;
          if (key === 'qty')    return row.quantity;
          if (key === 'unit')   return row.unit || '—';
          if (key === 'rate')   return `₹${fmt(row.unit_price)}`;
          if (key === 'disc')   return `${Number(row.discount_percent ?? 0).toFixed(2)}%`;
          if (key === 'tax')    return `${Number(row.tax_percent ?? 0).toFixed(2)}%`;
          if (key === 'amount') return <strong>₹{fmt(row.total_amount)}</strong>;
          return null;
        }}
        summaryRows={summaryRows}
        amountInWords={amountInWords(quotation.total_amount)}
        summaryLeft={summaryLeft}
      />
      {/* ── END CAPTURE TARGET ── */}

      {/* Buttons — outside capture ref, hidden when printing */}
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

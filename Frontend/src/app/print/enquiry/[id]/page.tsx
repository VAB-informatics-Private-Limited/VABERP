'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getEnquiryById, getFollowupHistory } from '@/lib/api/enquiries';
import { getPrintTemplateConfig } from '@/lib/api/print-templates';
import { useAuthStore } from '@/stores/authStore';
import { PrintMasterTemplate, TableColumn } from '@/components/print-engine/PrintMasterTemplate';
import { fmtDate, downloadAsPDF } from '@/lib/print/utils';
import { DEFAULT_PRINT_TEMPLATE } from '@/types/print-template';
import { INTEREST_STATUS_OPTIONS } from '@/types/enquiry';

export default function EnquiryPrintPage() {
  const params     = useParams();
  const enquiryId  = Number(params.id);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['enquiry-print', enquiryId],
    queryFn: () => getEnquiryById(enquiryId, enterpriseId ?? undefined),
    enabled: !!enquiryId,
  });

  const { data: followupsData } = useQuery({
    queryKey: ['enquiry-followups-print', enquiryId],
    queryFn: () => getFollowupHistory(enquiryId, enterpriseId ?? undefined),
    enabled: !!enquiryId,
  });

  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
    staleTime: 5 * 60 * 1000,
  });

  const enquiry  = data?.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followups: any[] = followupsData?.data || [];

  const getStatusLabel = (status: string) =>
    INTEREST_STATUS_OPTIONS.find((s) => s.value === status)?.label || status;

  const handleDownloadPDF = async () => {
    if (!contentRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      await downloadAsPDF(contentRef.current, `enquiry-${enquiryId}.pdf`);
    } catch {
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (!enquiry || isConfigLoading) return;
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
  }, [enquiry, isConfigLoading]);

  if (isLoading || !enquiry) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing enquiry report...
      </div>
    );
  }

  // ── Enquiry details as table rows ────────────────────────────────────────────
  const detailRows = [
    { key: 'status',   label: 'Interest Status',   value: getStatusLabel(enquiry.interest_status) },
    { key: 'source',   label: 'Source',            value: enquiry.source || '—' },
    { key: 'product',  label: 'Product Interest',  value: enquiry.product_interest || '—' },
    { key: 'created',  label: 'Created Date',      value: fmtDate(enquiry.created_date) },
    ...(enquiry.next_followup_date ? [{ key: 'next', label: 'Next Follow-up', value: fmtDate(enquiry.next_followup_date) }] : []),
    ...(enquiry.employee_name ? [{ key: 'emp', label: 'Assigned To', value: enquiry.employee_name }] : []),
  ];

  const columns: TableColumn[] = [
    { key: 'label', label: 'Field',  align: 'left', width: 200 },
    { key: 'value', label: 'Detail', align: 'left' },
  ];

  // ── Follow-up history block shown after body ──────────────────────────────────
  const followupBlock = followups.length > 0 ? (
    <div style={{ marginTop: 8 }}>
      <div className="pt-section-title">Follow-up History</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 6 }}>
        <thead>
          <tr style={{ background: config?.primary_color ?? '#f97316' }}>
            {['Date', 'Type', 'Notes', 'Next Follow-up'].map((h) => (
              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#fff', fontWeight: 700, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {followups.map((f: any, i: number) => (
            <tr key={f.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 10px' }}>{f.followup_date || f.date || '—'}</td>
              <td style={{ padding: '6px 10px' }}>{f.followup_type || f.type || '—'}</td>
              <td style={{ padding: '6px 10px' }}>{f.notes || f.note || '—'}</td>
              <td style={{ padding: '6px 10px' }}>{f.next_followup_date || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const summaryLeft = enquiry.remarks ? (
    <>
      <div className="pt-section-title">Remarks</div>
      <div className="pt-section-body">{enquiry.remarks}</div>
    </>
  ) : (
    <div className="pt-no-terms">No remarks.</div>
  );

  const address = [enquiry.address, enquiry.city, enquiry.state, enquiry.pincode]
    .filter(Boolean).join(', ');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f0f0f0' }}>

      <PrintMasterTemplate
        ref={contentRef}
        config={config}
        documentTitle="Enquiry Report"
        metaLines={[
          { label: 'Enquiry ID', value: `#${enquiry.id}`, bold: true },
          { label: 'Date',       value: fmtDate(enquiry.created_date) },
          { label: 'Status',     value: getStatusLabel(enquiry.interest_status) },
        ]}
        fromParty={{
          sectionLabel: 'Reported by',
          name:    config?.company_name ?? '',
          address: config?.address ?? undefined,
          phone:   config?.show_phone ? (config?.phone ?? undefined) : undefined,
          email:   config?.show_email ? (config?.email ?? undefined) : undefined,
          gstin:   config?.show_gst   ? (config?.gst_number ?? undefined) : undefined,
        }}
        toParty={{
          sectionLabel: 'Enquiry from',
          name:    enquiry.customer_name  ?? '—',
          subName: enquiry.business_name  ?? undefined,
          address: address || undefined,
          phone:   enquiry.customer_mobile ?? undefined,
          email:   enquiry.customer_email  ?? undefined,
          gstin:   enquiry.gst_number      ?? undefined,
        }}
        tableColumns={columns}
        tableRows={detailRows}
        renderCell={(row, key) => {
          if (key === 'label') return <span style={{ color: '#555', fontWeight: 600 }}>{row.label}</span>;
          if (key === 'value') return row.value;
          return null;
        }}
        summaryRows={[]}
        summaryLeft={summaryLeft}
        afterBody={followupBlock}
        signatureLabel="Prepared by"
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

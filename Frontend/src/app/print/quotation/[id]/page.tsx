'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getQuotationById } from '@/lib/api/quotations';
import { useAuthStore } from '@/stores/authStore';
import { PrintLayout } from '@/components/print-engine/PrintLayout';
import dayjs from 'dayjs';

const fmt = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return dayjs(d).format('DD-MM-YYYY');
};

export default function QuotationPrintPage() {
  const params = useParams();
  const quotationId = Number(params.id);
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  const { data, isLoading } = useQuery({
    queryKey: ['quotation-print', quotationId],
    queryFn: () => getQuotationById(quotationId, enterpriseId!),
    enabled: !!quotationId && !!enterpriseId,
  });

  const quotation = data?.data;

  useEffect(() => {
    if (!quotation) return;
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [quotation]);

  if (isLoading || !quotation) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing quotation for print...
      </div>
    );
  }

  const items = quotation.items || [];

  return (
    <PrintLayout>
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', maxWidth: 800, margin: '0 auto' }}>

        {/* Quotation Title Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid #222' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#333' }}>QUOTATION</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{quotation.quotation_number}</div>
            {quotation.current_version > 1 && (
              <div style={{ fontSize: 11, color: '#888' }}>Version {quotation.current_version}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#666' }}>Date: {fmtDate(quotation.quotation_date)}</div>
            {quotation.valid_until && (
              <div style={{ fontSize: 11, color: '#666' }}>Valid Until: {fmtDate(quotation.valid_until)}</div>
            )}
            {quotation.expected_delivery && (
              <div style={{ fontSize: 11, color: '#666' }}>Expected Delivery: {fmtDate(quotation.expected_delivery)}</div>
            )}
            <div style={{ marginTop: 6 }}>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#e6f4ff', color: '#0958d9', border: '1px solid #91caff' }}>
                {quotation.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div style={{ display: 'grid', gridTemplateColumns: quotation.shipping_address ? '1fr 1fr' : '1fr', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{quotation.customer_name}</div>
            {quotation.business_name && <div style={{ color: '#555', fontSize: 12 }}>{quotation.business_name}</div>}
            {quotation.customer_mobile && <div style={{ color: '#555', fontSize: 11 }}>Ph: {quotation.customer_mobile}</div>}
            {quotation.customer_email && <div style={{ color: '#555', fontSize: 11 }}>Email: {quotation.customer_email}</div>}
            {quotation.billing_address && <div style={{ color: '#555', fontSize: 11, marginTop: 4, whiteSpace: 'pre-line' }}>{quotation.billing_address}</div>}
          </div>
          {quotation.shipping_address && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Ship To</div>
              <div style={{ color: '#555', fontSize: 11, whiteSpace: 'pre-line' }}>{quotation.shipping_address}</div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
          <thead>
            <tr style={{ backgroundColor: '#222', color: '#fff' }}>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'left', width: 28 }}>#</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'left' }}>Product</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 50 }}>HSN</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 40 }}>Qty</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 36 }}>Unit</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'right', width: 80 }}>Unit Price</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 44 }}>Disc%</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 44 }}>Tax%</th>
              <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'right', width: 80 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={item.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px' }}>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  {item.product_code && <div style={{ color: '#888', fontSize: 10 }}>SKU: {item.product_code}</div>}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.hsn_code || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right' }}>₹{fmt(Number(item.unit_price))}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.discount_percent ? `${item.discount_percent}%` : '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.tax_percent ? `${item.tax_percent}%` : '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>₹{fmt(Number(item.total_amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 260, fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Subtotal</td>
                <td style={{ padding: '4px 16px', textAlign: 'right', fontWeight: 600, border: '1px solid #e0e0e0', width: 120 }}>₹{fmt(Number(quotation.subtotal || 0))}</td>
              </tr>
              {Number(quotation.discount_amount) > 0 && (
                <tr>
                  <td style={{ padding: '4px 16px', textAlign: 'right', color: '#c00', border: '1px solid #e0e0e0' }}>Discount</td>
                  <td style={{ padding: '4px 16px', textAlign: 'right', color: '#c00', border: '1px solid #e0e0e0' }}>−₹{fmt(Number(quotation.discount_amount))}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Tax</td>
                <td style={{ padding: '4px 16px', textAlign: 'right', border: '1px solid #e0e0e0' }}>₹{fmt(Number(quotation.tax_amount || 0))}</td>
              </tr>
              <tr style={{ backgroundColor: '#222', color: '#fff' }}>
                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, border: '1px solid #444' }}>Total Amount</td>
                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, border: '1px solid #444' }}>₹{fmt(Number(quotation.total_amount || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div style={{ marginBottom: 14, paddingTop: 12, borderTop: '1px solid #ddd' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11 }}>Notes</div>
            <div style={{ color: '#555', fontSize: 11, whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
          </div>
        )}

        {/* Terms & Conditions */}
        {quotation.terms_conditions && (
          <div style={{ marginBottom: 14, paddingTop: 12, borderTop: '1px solid #ddd' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11 }}>Terms & Conditions</div>
            <div style={{ color: '#555', fontSize: 11, whiteSpace: 'pre-wrap' }}>{quotation.terms_conditions}</div>
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 10, color: '#aaa' }}>
          This is a computer-generated quotation
        </div>

        {/* Print button — hidden when printing */}
        <div className="print:hidden" style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 24px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </PrintLayout>
  );
}

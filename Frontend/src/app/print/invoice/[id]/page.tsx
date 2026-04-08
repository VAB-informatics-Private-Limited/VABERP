'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceById } from '@/lib/api/invoices';
import { useAuthStore } from '@/stores/authStore';
import { Enterprise } from '@/types';
import dayjs from 'dayjs';

const fmt = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return dayjs(d).format('DD-MM-YYYY');
};

export default function InvoicePrintPage() {
  const params = useParams();
  const invoiceId = Number(params.id);
  const { user } = useAuthStore();
  const businessName = (user as Enterprise)?.business_name || 'Your Company';

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice-print', invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });

  const invoice = invoiceData?.data;

  useEffect(() => {
    if (!invoice) return;
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [invoice]);

  if (isLoading || !invoice) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing invoice for print...
      </div>
    );
  }

  const balanceDue = Number(invoice.balance_due);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', padding: '32px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #222' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{businessName}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Tax Invoice</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#333', marginBottom: 4 }}>INVOICE</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{invoice.invoice_number}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Date: {fmtDate(invoice.invoice_date)}</div>
          {invoice.due_date && (
            <div style={{ fontSize: 11, color: '#666' }}>Due: {fmtDate(invoice.due_date)}</div>
          )}
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{invoice.customer_name}</div>
        {invoice.billing_address && (
          <div style={{ fontSize: 11, color: '#555', marginTop: 4, whiteSpace: 'pre-line' }}>{invoice.billing_address}</div>
        )}
      </div>

      {/* Line Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
        <thead>
          <tr style={{ backgroundColor: '#222', color: '#fff' }}>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'left', width: 28 }}>#</th>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'left' }}>Description</th>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 50 }}>Qty</th>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'right', width: 90 }}>Unit Price</th>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'center', width: 50 }}>Tax%</th>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'right', width: 90 }}>Tax Amt</th>
            <th style={{ border: '1px solid #444', padding: '6px 8px', textAlign: 'right', width: 90 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item: any, i: number) => (
            <tr key={item.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px' }}>
                <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                {item.description && <div style={{ color: '#777', fontSize: 10 }}>{item.description}</div>}
                {item.hsn_code && <div style={{ color: '#aaa', fontSize: 10 }}>HSN: {item.hsn_code}</div>}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.quantity} {item.unit_of_measure || ''}</td>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right' }}>₹{fmt(Number(item.unit_price))}</td>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'center' }}>{item.tax_percent || 0}%</td>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right' }}>₹{fmt(Number(item.tax_amount || 0))}</td>
              <td style={{ border: '1px solid #ddd', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>₹{fmt(Number(item.line_total || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 260, fontSize: 11 }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Sub Total</td>
              <td style={{ padding: '4px 16px', textAlign: 'right', fontWeight: 600, border: '1px solid #e0e0e0', width: 120 }}>₹{fmt(Number(invoice.sub_total))}</td>
            </tr>
            {Number(invoice.discount_amount) > 0 && (
              <tr>
                <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Discount</td>
                <td style={{ padding: '4px 16px', textAlign: 'right', color: '#c00', border: '1px solid #e0e0e0' }}>−₹{fmt(Number(invoice.discount_amount))}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Tax</td>
              <td style={{ padding: '4px 16px', textAlign: 'right', border: '1px solid #e0e0e0' }}>₹{fmt(Number(invoice.tax_amount))}</td>
            </tr>
            {Number(invoice.shipping_charges) > 0 && (
              <tr>
                <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Shipping</td>
                <td style={{ padding: '4px 16px', textAlign: 'right', border: '1px solid #e0e0e0' }}>₹{fmt(Number(invoice.shipping_charges))}</td>
              </tr>
            )}
            <tr style={{ backgroundColor: '#222', color: '#fff' }}>
              <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, border: '1px solid #444' }}>Grand Total</td>
              <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, border: '1px solid #444' }}>₹{fmt(Number(invoice.grand_total))}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px', textAlign: 'right', color: '#666', border: '1px solid #e0e0e0' }}>Amount Paid</td>
              <td style={{ padding: '4px 16px', textAlign: 'right', color: '#187', fontWeight: 600, border: '1px solid #e0e0e0' }}>₹{fmt(Number(invoice.total_paid))}</td>
            </tr>
            <tr style={{ backgroundColor: balanceDue > 0 ? '#fff0f0' : '#f0fff4' }}>
              <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, border: `1px solid ${balanceDue > 0 ? '#fcc' : '#9d9'}`, color: balanceDue > 0 ? '#c00' : '#060' }}>Balance Due</td>
              <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, border: `1px solid ${balanceDue > 0 ? '#fcc' : '#9d9'}`, color: balanceDue > 0 ? '#c00' : '#060' }}>
                {balanceDue <= 0 ? '✓ PAID' : `₹${fmt(balanceDue)}`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terms */}
      {invoice.terms_conditions && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #ddd', fontSize: 10, color: '#555' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Terms &amp; Conditions</div>
          <div style={{ whiteSpace: 'pre-line' }}>{invoice.terms_conditions}</div>
        </div>
      )}
      {invoice.notes && (
        <div style={{ marginTop: 12, fontSize: 10, color: '#555' }}>
          <span style={{ fontWeight: 600 }}>Notes: </span>{invoice.notes}
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 10, color: '#aaa' }}>
        Thank you for your business
      </div>

      {/* Print button — hidden when printing */}
      <div className="print:hidden" style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 24px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          Print / Download
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPaymentById } from '@/lib/api/invoices';
import { useAuthStore } from '@/stores/authStore';
import { Enterprise } from '@/types';
import dayjs from 'dayjs';

const fmt = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return dayjs(d).format('DD MMM YYYY');
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  upi: 'UPI',
  card: 'Card',
  other: 'Other',
};

export default function PaymentReceiptPage() {
  const params = useParams();
  const paymentId = Number(params.id);
  const { user } = useAuthStore();
  const businessName = (user as Enterprise)?.business_name || 'Your Company';
  const businessAddress = (user as any)?.address || '';
  const businessGst = (user as any)?.gst_number || '';
  const businessPhone = (user as any)?.phone || '';

  const { data, isLoading } = useQuery({
    queryKey: ['payment-receipt', paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: !!paymentId,
  });

  const payment = data?.data;
  const invoice = (payment as any)?.invoice;
  const isPaid = payment?.status === 'completed';

  useEffect(() => {
    if (!payment) return;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [payment]);

  if (isLoading || !payment) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#555' }}>
        Preparing payment receipt...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', padding: '40px', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '3px solid #111' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{businessName}</div>
          {businessAddress && <div style={{ fontSize: 10, color: '#777', marginTop: 3 }}>{businessAddress}</div>}
          {businessGst && <div style={{ fontSize: 10, color: '#777' }}>GSTIN: {businessGst}</div>}
          {businessPhone && <div style={{ fontSize: 10, color: '#777' }}>{businessPhone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, color: '#111' }}>PAYMENT RECEIPT</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>{payment.payment_number}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              background: isPaid ? '#f6ffed' : '#fff7e6',
              color: isPaid ? '#389e0d' : '#d46b08',
              border: `1px solid ${isPaid ? '#b7eb8f' : '#ffd591'}`,
            }}>
              {isPaid ? '✓ PAID SUCCESSFULLY' : '⏳ UNDER PROCESSING'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Date & Invoice Ref */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Payment Date</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(payment.payment_date)}</div>
        </div>
        {invoice?.invoiceNumber && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Invoice Reference</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{invoice.invoiceNumber}</div>
          </div>
        )}
        {isPaid && payment.verified_at && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Verified On</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(payment.verified_at)}</div>
          </div>
        )}
      </div>

      {/* Received From */}
      <div style={{ marginBottom: 24, padding: '14px 16px', background: '#f8f9fa', borderRadius: 6, border: '1px solid #e8e8e8' }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Received From</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{invoice?.customerName || '—'}</div>
        {invoice?.billingAddress && (
          <div style={{ fontSize: 10, color: '#666', marginTop: 3, whiteSpace: 'pre-line' }}>{invoice.billingAddress}</div>
        )}
      </div>

      {/* Payment Details Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#111', color: '#fff' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Details</th>
            <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#fff' }}>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', color: '#555' }}>Payment Method</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', fontWeight: 600, textAlign: 'right' }}>
              {METHOD_LABELS[payment.payment_method || ''] || payment.payment_method || '—'}
            </td>
          </tr>
          {payment.reference_number && (
            <tr style={{ background: '#fafafa' }}>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', color: '#555' }}>Reference / Transaction ID</td>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', fontWeight: 600, textAlign: 'right' }}>{payment.reference_number}</td>
            </tr>
          )}
          {payment.notes && (
            <tr style={{ background: '#fff' }}>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', color: '#555' }}>Notes</td>
              <td style={{ padding: '10px 14px', borderBottom: '1px solid #eee', textAlign: 'right', color: '#555' }}>{payment.notes}</td>
            </tr>
          )}
          <tr style={{ background: '#111', color: '#fff' }}>
            <td style={{ padding: '14px', fontWeight: 700, fontSize: 14 }}>Amount Received</td>
            <td style={{ padding: '14px', fontWeight: 800, fontSize: 18, textAlign: 'right' }}>₹{fmt(Number(payment.amount))}</td>
          </tr>
        </tbody>
      </table>

      {/* Status Note */}
      {!isPaid && (
        <div style={{ padding: '12px 16px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, marginBottom: 20, fontSize: 11, color: '#874d00' }}>
          <strong>Note:</strong> This payment is currently under processing and will be confirmed once verified by the accounts team.
        </div>
      )}

      {isPaid && (
        <div style={{ padding: '12px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, marginBottom: 20, fontSize: 11, color: '#135200' }}>
          <strong>✓ Payment Verified:</strong> This payment has been verified and recorded against the invoice.
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa' }}>
        <div>Generated on {dayjs().format('DD MMM YYYY, hh:mm A')}</div>
        <div>This is a computer-generated receipt</div>
      </div>

      {/* Print / Download Button — hidden when printing */}
      <div className="print:hidden" style={{ marginTop: 28, textAlign: 'center' }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '10px 32px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Download / Print Receipt
        </button>
      </div>
    </div>
  );
}

import api from './client';
import type { Rfq, RfqComparison } from '@/types/rfq';

function mapVendorItem(d: any) {
  return {
    id: d.id,
    rfq_vendor_id: d.rfqVendorId,
    indent_item_id: d.indentItemId,
    item_name: d.indentItem?.itemName,
    unit_price: d.unitPrice !== undefined && d.unitPrice !== null ? Number(d.unitPrice) : null,
    tax_percent: d.taxPercent !== undefined && d.taxPercent !== null ? Number(d.taxPercent) : null,
    notes: d.notes,
  };
}

function mapVendor(d: any) {
  return {
    id: d.id,
    rfq_id: d.rfqId,
    supplier_id: d.supplierId,
    supplier_name: d.supplier?.supplierName,
    supplier_email: d.supplier?.email,
    status: d.status,
    email_sent_at: d.emailSentAt,
    quote_pdf_path: d.quotePdfPath,
    delivery_days: d.deliveryDays ?? null,
    notes: d.notes,
    items: (d.items || []).map(mapVendorItem),
  };
}

function mapRfq(d: any): Rfq {
  return {
    id: d.id,
    rfq_number: d.rfqNumber,
    indent_id: d.indentId,
    status: d.status,
    notes: d.notes,
    sent_date: d.sentDate,
    created_date: d.createdDate,
    vendors: (d.vendors || []).map(mapVendor),
  };
}

export interface RfqListItem {
  id: number;
  rfq_number: string;
  indent_id: number;
  indent_number?: string;
  status: 'draft' | 'sent' | 'completed';
  notes?: string;
  sent_date?: string;
  created_date?: string;
  vendor_count: number;
  responded_count: number;
  vendors: { id: number; supplier_name?: string; status: string; delivery_days?: number | null }[];
}

export async function getAllRFQs(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: RfqListItem[]; total: number; page: number; pageSize: number }> {
  const res = await api.get('/rfqs', { params });
  const d = res.data;
  return {
    data: (d.data || []).map((r: any): RfqListItem => ({
      id: r.id,
      rfq_number: r.rfqNumber,
      indent_id: r.indentId,
      indent_number: r.indentNumber,
      status: r.status,
      notes: r.notes,
      sent_date: r.sentDate,
      created_date: r.createdDate,
      vendor_count: r.vendorCount,
      responded_count: r.respondedCount,
      vendors: (r.vendors || []).map((v: any) => ({
        id: v.id,
        supplier_name: v.supplierName,
        status: v.status,
        delivery_days: v.deliveryDays ?? null,
      })),
    })),
    total: d.total,
    page: d.page,
    pageSize: d.pageSize,
  };
}

export interface RfqDetail {
  id: number;
  rfq_number: string;
  indent_id: number;
  indent_number?: string;
  status: 'draft' | 'sent' | 'completed';
  notes?: string;
  sent_date?: string;
  created_date?: string;
  vendors: {
    id: number;
    supplier_id: number;
    supplier_name?: string;
    supplier_email?: string;
    contact_person?: string;
    phone?: string;
    status: string;
    email_sent_at?: string;
    quote_pdf_path?: string;
    delivery_days?: number | null;
    notes?: string;
    grand_total: number;
    items: {
      id: number;
      indent_item_id: number;
      item_name?: string;
      quantity: number;
      unit?: string;
      unit_price: number | null;
      tax_percent: number | null;
      line_total: number | null;
    }[];
  }[];
  rows: {
    indent_item_id: number;
    item_name: string;
    quantity: number;
    unit?: string;
    vendor_prices: Record<number, { unit_price: number | null; tax_percent: number | null; line_total: number | null }>;
  }[];
  indent_items: { id: number; item_name: string; quantity: number; unit?: string }[];
}

export async function getRFQById(rfqId: number): Promise<RfqDetail> {
  const res = await api.get(`/rfqs/${rfqId}`);
  const d = res.data;
  return {
    id: d.id,
    rfq_number: d.rfqNumber,
    indent_id: d.indentId,
    indent_number: d.indentNumber,
    status: d.status,
    notes: d.notes,
    sent_date: d.sentDate,
    created_date: d.createdDate,
    indent_items: (d.indentItems || []).map((i: any) => ({
      id: i.id,
      item_name: i.itemName,
      quantity: i.quantity,
      unit: i.unit,
    })),
    vendors: (d.vendors || []).map((v: any) => ({
      id: v.id,
      supplier_id: v.supplierId,
      supplier_name: v.supplierName,
      supplier_email: v.supplierEmail,
      contact_person: v.contactPerson,
      phone: v.phone,
      status: v.status,
      email_sent_at: v.emailSentAt,
      quote_pdf_path: v.quotePdfPath,
      delivery_days: v.deliveryDays ?? null,
      notes: v.notes,
      grand_total: Number(v.grandTotal),
      items: (v.items || []).map((i: any) => ({
        id: i.id,
        indent_item_id: i.indentItemId,
        item_name: i.itemName,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unitPrice !== null ? Number(i.unitPrice) : null,
        tax_percent: i.taxPercent !== null ? Number(i.taxPercent) : null,
        line_total: i.lineTotal !== null ? Number(i.lineTotal) : null,
      })),
    })),
    rows: (d.rows || []).map((r: any) => ({
      indent_item_id: r.indentItemId,
      item_name: r.itemName,
      quantity: r.quantity,
      unit: r.unit,
      vendor_prices: Object.fromEntries(
        Object.entries(r.vendorPrices || {}).map(([k, v]: [string, any]) => [
          Number(k),
          {
            unit_price: v.unitPrice !== null ? Number(v.unitPrice) : null,
            tax_percent: v.taxPercent !== null ? Number(v.taxPercent) : null,
            line_total: v.lineTotal !== null ? Number(v.lineTotal) : null,
          },
        ]),
      ),
    })),
  };
}

export async function createRFQ(
  indentId: number,
  vendorItems: { supplierId: number; indentItemIds: number[] }[],
  notes?: string,
): Promise<Rfq> {
  const res = await api.post(`/rfqs/from-indent/${indentId}`, { vendorItems, notes });
  return mapRfq(res.data);
}

export async function addRFQVendors(
  rfqId: number,
  vendorItems: { supplierId: number; indentItemIds: number[] }[],
): Promise<Rfq> {
  const res = await api.post(`/rfqs/${rfqId}/add-vendors`, { vendorItems });
  return mapRfq(res.data);
}

export async function sendRFQEmails(rfqId: number): Promise<{ message: string; rfqNumber: string }> {
  const res = await api.post(`/rfqs/${rfqId}/send`);
  return res.data;
}

export async function getRFQByIndent(indentId: number): Promise<Rfq | null> {
  const res = await api.get(`/rfqs/by-indent/${indentId}`);
  if (!res.data) return null;
  return mapRfq(res.data);
}

export async function getRFQComparison(rfqId: number): Promise<RfqComparison> {
  const res = await api.get(`/rfqs/${rfqId}/comparison`);
  const d = res.data;
  return {
    rfq_id: d.rfqId,
    rfq_number: d.rfqNumber,
    is_urgent: !!d.isUrgent,
    vendors: (d.vendors || []).map((v: any) => ({
      id: v.id,
      supplier_id: v.supplierId,
      supplier_name: v.supplierName,
      grand_total: Number(v.grandTotal),
      delivery_days: v.deliveryDays ?? null,
      assigned_item_ids: (v.assignedItemIds || []).map(Number),
      score: v.score ?? null,
      badge: v.badge ?? null,
      badge_color: v.badgeColor ?? null,
      hint: v.hint ?? null,
    })),
    rows: (d.rows || []).map((r: any) => ({
      indent_item_id: r.indentItemId,
      item_name: r.itemName,
      quantity: r.quantity,
      unit: r.unit,
      assigned_vendor_ids: (r.assignedVendorIds || []).map(Number),
      vendor_prices: Object.fromEntries(
        Object.entries(r.vendorPrices || {}).map(([k, v]: [string, any]) => [
          Number(k),
          {
            unit_price: v.unitPrice !== null ? Number(v.unitPrice) : null,
            tax_percent: v.taxPercent !== null ? Number(v.taxPercent) : null,
            line_total: v.lineTotal !== null ? Number(v.lineTotal) : null,
          },
        ]),
      ),
    })),
  };
}

export async function updateVendorQuote(
  rfqId: number,
  vendorId: number,
  items: { indentItemId: number; unitPrice: number; taxPercent?: number; notes?: string }[],
  deliveryDays?: number,
): Promise<Rfq> {
  const res = await api.patch(`/rfqs/${rfqId}/vendors/${vendorId}/quote`, { items, deliveryDays });
  return mapRfq(res.data);
}

export async function uploadVendorQuotePDF(
  rfqId: number,
  vendorId: number,
  file: File,
): Promise<{ message: string; filePath: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(`/rfqs/${rfqId}/vendors/${vendorId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function getVendorPDFUrl(rfqId: number, vendorId: number): string {
  const base = (api.defaults.baseURL || '').replace(/\/$/, '');
  return `${base}/rfqs/${rfqId}/vendors/${vendorId}/pdf`;
}

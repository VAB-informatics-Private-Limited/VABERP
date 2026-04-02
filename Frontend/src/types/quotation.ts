/** A single line-item as stored inside a version snapshot (camelCase — matches backend JSONB) */
export interface QuotationVersionItem {
  productId?: number;
  itemName: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal: number;
  sortOrder?: number;
}

/** A point-in-time snapshot of a quotation as returned by GET /quotations/:id */
export interface QuotationVersion {
  id: number;
  quotation_id: number;
  version_number: number;
  snapshot: {
    quotationDate: string;
    validUntil?: string;
    customerName: string;
    email?: string;
    mobile?: string;
    billingAddress?: string;
    shippingAddress?: string;
    subTotal: number;
    discountType?: string;
    discountValue?: number;
    discountAmount?: number;
    taxAmount?: number;
    shippingCharges?: number;
    grandTotal: number;
    termsConditions?: string;
    notes?: string;
    status: string;
    items: QuotationVersionItem[];
  };
  changed_by?: number;
  changed_by_name?: string;
  change_notes?: string;
  changed_at: string;
}

export interface QuotationItem {
  id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  description?: string;
  hsn_code?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  max_discount_percent?: number;
  tax_percent?: number;
  tax_amount?: number;
  total_amount: number;
}

export interface Quotation {
  id: number;
  enterprise_id: number;
  quotation_number: string;
  enquiry_id?: number;
  customer_id?: number;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  business_name?: string;
  billing_address?: string;
  shipping_address?: string;
  quotation_date: string;
  valid_until?: string;
  expected_delivery?: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  terms_conditions?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_by: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  current_version: number;
  is_locked: boolean;
  sales_order_id?: number | null;
  po_cancelled_at?: string | null;
  cancelled_po_number?: string | null;
  created_date: string;
  modified_date?: string;
  items?: QuotationItem[];
  /** Previous versions ordered newest-first (current state is NOT in this array) */
  versions?: QuotationVersion[];
}

export interface QuotationFormData {
  enquiry_id?: number;
  customer_id?: number;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  business_name?: string;
  billing_address?: string;
  shipping_address?: string;
  quotation_date: string;
  valid_until?: string;
  expected_delivery?: string;
  notes?: string;
  terms_conditions?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: QuotationItem[];
}

export interface QuotationListParams {
  enterpriseId: number;
  page?: number;
  pageSize?: number;
  status?: string;
  customerName?: string;
  quotationNumber?: string;
  startDate?: string;
  endDate?: string;
}

export const QUOTATION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'accepted', label: 'Accepted', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'orange' },
  { value: 'po_cancelled', label: 'PO Cancelled', color: 'volcano' },
];

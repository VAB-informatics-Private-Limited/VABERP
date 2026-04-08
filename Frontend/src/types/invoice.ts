export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id?: number;
  item_name: string;
  description?: string;
  hsn_code?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  tax_amount?: number;
  line_total?: number;
  sort_order?: number;
}

export interface Payment {
  id: number;
  enterprise_id: number;
  invoice_id: number;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method?: string | null;
  reference_number?: string;
  notes?: string;
  received_by?: number;
  received_by_name?: string;
  status: string; // 'pending' | 'completed' | 'cancelled' | 'refunded'
  verified_by?: number;
  verified_at?: string;
  created_date: string;
}

export interface Invoice {
  id: number;
  enterprise_id: number;
  customer_id: number;
  quotation_id?: number;
  sales_order_id?: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_name: string;
  billing_address?: string;
  sub_total: number;
  discount_type?: string;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  shipping_charges: number;
  grand_total: number;
  total_paid: number;
  pending_amount?: number;
  balance_due: number;
  terms_conditions?: string;
  notes?: string;
  status: string;
  created_by?: number;
  created_by_name?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  so_order_number?: string | null;
  so_grand_total?: number | null;
  so_invoiced_amount?: number | null;
  so_remaining_amount?: number | null;
  created_date: string;
  modified_date?: string;
}

export interface InvoiceFormData {
  customer_id: number;
  quotation_id?: number;
  sales_order_id?: number;
  customer_name: string;
  billing_address?: string;
  invoice_date?: string;
  due_date?: string;
  discount_type?: string;
  discount_value?: number;
  shipping_charges?: number;
  terms_conditions?: string;
  notes?: string;
  items: InvoiceItem[];
}

export interface PaymentFormData {
  amount: number;
  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  customerId?: number;
  salesOrderId?: number;
  startDate?: string;
  endDate?: string;
}

export const INVOICE_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid', color: 'red' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'orange' },
  { value: 'fully_paid', label: 'Fully Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'volcano' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const;

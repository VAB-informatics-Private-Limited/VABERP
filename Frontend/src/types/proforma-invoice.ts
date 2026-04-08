export interface ProformaInvoiceItem {
  id: number;
  pi_id: number;
  product_id?: number | null;
  item_name: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
}

export interface ProformaInvoice {
  id: number;
  enterprise_id: number;
  quotation_id?: number | null;
  customer_id?: number | null;
  pi_number: string;
  pi_date: string;
  customer_name: string;
  email?: string | null;
  mobile?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  sub_total: number;
  discount_type?: string | null;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  shipping_charges: number;
  grand_total: number;
  notes?: string | null;
  terms_conditions?: string | null;
  status: 'draft' | 'sent' | 'converted';
  sales_order_id?: number | null;
  created_by?: number | null;
  created_by_name?: string | null;
  items?: ProformaInvoiceItem[];
  created_date: string;
  modified_date: string;
}

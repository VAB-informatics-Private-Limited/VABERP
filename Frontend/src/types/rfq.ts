export interface RfqVendorItem {
  id: number;
  rfq_vendor_id: number;
  indent_item_id: number;
  item_name?: string;
  unit_price: number | null;
  tax_percent: number | null;
  notes?: string;
}

export interface RfqVendor {
  id: number;
  rfq_id: number;
  supplier_id: number;
  supplier_name?: string;
  supplier_email?: string;
  status: 'pending' | 'responded' | 'rejected';
  email_sent_at?: string;
  quote_pdf_path?: string;
  delivery_days?: number | null;
  notes?: string;
  items: RfqVendorItem[];
}

export interface Rfq {
  id: number;
  rfq_number: string;
  indent_id: number;
  status: 'draft' | 'sent' | 'completed';
  notes?: string;
  sent_date?: string;
  created_date?: string;
  vendors: RfqVendor[];
}

export interface RfqComparisonRow {
  indent_item_id: number;
  item_name: string;
  quantity: number;
  unit?: string;
  vendor_prices: Record<number, { unit_price: number | null; tax_percent: number | null; line_total: number | null }>;
  assigned_vendor_ids: number[];
}

export interface RfqComparisonVendor {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  grand_total: number;
  delivery_days: number | null;
  assigned_item_ids: number[];
  score: number | null;
  badge: string | null;
  badge_color: string | null;
  hint: string | null;
}

export interface RfqComparison {
  rfq_id: number;
  rfq_number: string;
  is_urgent: boolean;
  vendors: RfqComparisonVendor[];
  rows: RfqComparisonRow[];
}

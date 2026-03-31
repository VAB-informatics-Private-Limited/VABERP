export interface IndentPO {
  id: number;
  po_number: string;
  status: string;
  supplier_name?: string;
  grand_total?: number;
}

export interface IndentItem {
  id: number;
  indent_id: number;
  material_request_item_id?: number;
  raw_material_id?: number;
  raw_material_name?: string;
  raw_material_code?: string;
  raw_material_category?: string;
  raw_material_subcategory?: string;
  item_name: string;
  required_quantity: number;
  available_quantity: number;
  shortage_quantity: number;
  ordered_quantity: number;
  received_quantity: number;
  unit_of_measure?: string;
  status: string;
  notes?: string;
  // GRN rejection details (populated from latest GRN item when status = 'grn_rejected')
  grn_rejected_qty?: number;
  grn_rejection_reason?: string;
  grn_rejection_notes?: string;
  grn_rtv_status?: string;    // null | 'pending' | 'returned' — tracks physical return to vendor
  grn_item_status?: string;   // 'pending' | 'confirmed' | 'partial' | 'rejected'
}

export interface IndentGRN {
  id: number;
  grn_number: string;
  status: string;
  received_date?: string;
}

export interface IndentReplacementRef {
  id: number;
  indent_number: string;
  status: string;
  created_date: string;
}

export interface Indent {
  id: number;
  enterprise_id: number;
  indent_number: string;
  material_request_id?: number;
  material_request_number?: string;
  sales_order_id?: number;
  order_number?: string;
  requested_by?: number;
  requested_by_name?: string;
  request_date: string;
  expected_delivery?: string;
  source?: string; // 'material_request' | 'inventory' | 'replacement'
  status: string;
  notes?: string;
  items?: IndentItem[];
  purchase_orders?: IndentPO[];
  grn?: IndentGRN | null;
  created_date: string;
  // Replacement tracking
  parent_indent_id?: number | null;
  parent_indent_number?: string;
  parent_indent_status?: string;
  is_replacement?: boolean;
  rejection_reason?: string | null;
  replacement_indents?: IndentReplacementRef[];
}

export const INDENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'partially_ordered', label: 'Partially Ordered', color: 'cyan' },
  { value: 'fully_ordered', label: 'Fully Ordered', color: 'blue' },
  { value: 'closed', label: 'Closed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
] as const;

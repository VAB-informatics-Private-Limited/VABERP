export interface IndentItem {
  id: number;
  indent_id: number;
  material_request_item_id?: number;
  raw_material_id?: number;
  raw_material_name?: string;
  raw_material_code?: string;
  item_name: string;
  required_quantity: number;
  available_quantity: number;
  shortage_quantity: number;
  ordered_quantity: number;
  received_quantity: number;
  unit_of_measure?: string;
  status: string;
  notes?: string;
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
  source?: string; // 'material_request' | 'inventory'
  status: string;
  notes?: string;
  items?: IndentItem[];
  created_date: string;
}

export const INDENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'partially_ordered', label: 'Partially Ordered', color: 'cyan' },
  { value: 'fully_ordered', label: 'Fully Ordered', color: 'blue' },
  { value: 'closed', label: 'Closed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
] as const;

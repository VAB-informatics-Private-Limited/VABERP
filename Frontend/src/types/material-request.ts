export interface MaterialRequestItem {
  id: number;
  material_request_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  raw_material_id?: number;
  raw_material_name?: string;
  raw_material_code?: string;
  item_name: string;
  quantity_requested: number;
  quantity_approved: number;
  quantity_issued: number;
  available_stock: number;
  unit_of_measure?: string;
  status: string;
  notes?: string;
}

export interface MaterialRequest {
  id: number;
  enterprise_id: number;
  job_card_id?: number;
  job_card_name?: string;
  job_card_number?: string;
  sales_order_id?: number;
  order_number?: string;
  indent_id?: number;
  request_number: string;
  requested_by?: number;
  requested_by_name?: string;
  request_date: string;
  purpose?: string;
  status: string;
  approved_by?: number;
  approved_date?: string;
  notes?: string;
  items?: MaterialRequestItem[];
  created_date: string;
}

export const MR_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'partially_approved', label: 'Partially Approved', color: 'cyan' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'partially_fulfilled', label: 'Partially Issued', color: 'geekblue' },
  { value: 'fulfilled', label: 'Fully Issued', color: 'blue' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
] as const;

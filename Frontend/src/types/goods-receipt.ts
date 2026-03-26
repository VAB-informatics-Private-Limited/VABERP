export interface GoodsReceiptItem {
  id: number;
  grn_id: number;
  indent_item_id?: number;
  raw_material_id?: number;
  raw_material_name?: string;
  item_name: string;
  unit_of_measure?: string;
  expected_qty: number;
  confirmed_qty: number;
  status: string; // 'pending', 'confirmed', 'partial', 'rejected'
  notes?: string;
  created_date: string;
}

export interface GoodsReceipt {
  id: number;
  enterprise_id: number;
  grn_number: string;
  indent_id?: number;
  indent_number?: string;
  status: string; // 'pending', 'partially_confirmed', 'confirmed', 'rejected'
  released_by?: number;
  released_by_name?: string;
  received_by?: number;
  received_by_name?: string;
  received_date?: string;
  notes?: string;
  items?: GoodsReceiptItem[];
  created_date: string;
  modified_date: string;
}

export const GRN_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Confirmation', color: 'orange' },
  { value: 'partially_confirmed', label: 'Partially Confirmed', color: 'blue' },
  { value: 'confirmed', label: 'Confirmed', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
] as const;

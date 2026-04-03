export const REJECTION_REASONS = [
  { value: 'damaged',        label: 'Damaged' },
  { value: 'defective',      label: 'Defective / Not Working' },
  { value: 'incorrect_item', label: 'Incorrect Item' },
  { value: 'other',          label: 'Other' },
];

export interface GoodsReceiptItem {
  id: number;
  grn_id: number;
  indent_item_id?: number;
  raw_material_id?: number;
  raw_material_name?: string;
  item_name: string;
  unit_of_measure?: string;
  expected_qty: number;
  shortage_qty: number | null;  // ordered quantity (shortageQuantity from indent item)
  confirmed_qty: number;   // total received
  accepted_qty: number;    // accepted into inventory
  rejected_qty: number;    // rejected / damaged
  rejection_reason?: string;
  status: string; // 'pending', 'confirmed', 'partial', 'rejected'
  rtv_status: string | null; // null | 'pending' | 'returned'
  notes?: string;
  created_date: string;
}

export interface GoodsReceipt {
  id: number;
  enterprise_id: number;
  grn_number: string;
  indent_id?: number;
  indent_number?: string;
  material_request_id?: number;
  po_number?: string;
  supplier_name?: string;
  supplier_id?: number;
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

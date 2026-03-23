export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id?: number;
  raw_material_id?: number;
  indent_item_id?: number;
  item_name: string;
  quantity: number;
  quantity_received: number;
  unit_of_measure?: string;
  unit_price: number;
  tax_percent: number;
  line_total: number;
  sort_order: number;
}

export interface PurchaseOrder {
  id: number;
  enterprise_id: number;
  material_request_id?: number;
  indent_id?: number;
  supplier_id?: number;
  po_number: string;
  supplier_name: string;
  supplier_contact?: string;
  supplier_email?: string;
  supplier_address?: string;
  order_date: string;
  expected_delivery?: string;
  sub_total: number;
  tax_amount: number;
  grand_total: number;
  status: string;
  approved_by?: number;
  approved_date?: string;
  notes?: string;
  items?: PurchaseOrderItem[];
  created_date: string;
}

export const PO_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'pending_approval', label: 'Pending Approval', color: 'orange' },
  { value: 'approved', label: 'Approved', color: 'blue' },
  { value: 'ordered', label: 'Ordered', color: 'cyan' },
  { value: 'partially_received', label: 'Partially Received', color: 'purple' },
  { value: 'received', label: 'Received', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

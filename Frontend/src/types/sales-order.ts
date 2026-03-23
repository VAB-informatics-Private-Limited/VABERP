export interface SalesOrderItem {
  id?: number;
  sales_order_id?: number;
  product_id?: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  tax_percent?: number;
  tax_amount?: number;
  line_total?: number;
  sort_order?: number;
}

/** A single line-item as stored inside a version snapshot (camelCase — matches backend JSONB) */
export interface SalesOrderVersionItem {
  productId?: number;
  itemName: string;
  description?: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal: number;
  sortOrder?: number;
}

/** A point-in-time snapshot of a sales order as returned by GET /sales-orders/:id */
export interface SalesOrderVersion {
  id: number;
  sales_order_id: number;
  version_number: number;
  snapshot: {
    orderDate: string;
    expectedDelivery?: string;
    customerName: string;
    billingAddress?: string;
    shippingAddress?: string;
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    notes?: string;
    status: string;
    items: SalesOrderVersionItem[];
  };
  change_summary?: string;
  change_notes?: string;
  changed_by?: number;
  changed_by_name?: string;
  changed_at: string;
}

export interface SalesOrder {
  id: number;
  enterprise_id: number;
  customer_id: number;
  quotation_id?: number;
  enquiry_id?: number;
  order_number: string;
  order_date: string;
  expected_delivery?: string;
  customer_name: string;
  billing_address?: string;
  shipping_address?: string;
  sub_total: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  invoiced_amount: number;
  remaining_amount: number;
  notes?: string;
  hold_reason?: string;
  hold_acknowledged?: boolean;
  status: string;
  sent_to_manufacturing?: boolean;
  current_version: number;
  updated_by?: number;
  items?: SalesOrderItem[];
  versions?: SalesOrderVersion[];
  created_date: string;
  modified_date?: string;
}

export const SO_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'on_hold', label: 'On Hold', color: 'gold' },
  { value: 'in_production', label: 'In Production', color: 'orange' },
  { value: 'ready', label: 'Ready', color: 'cyan' },
  { value: 'dispatched', label: 'Dispatched', color: 'purple' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
] as const;

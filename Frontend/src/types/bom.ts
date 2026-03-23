export interface BomItem {
  id: number;
  bom_id: number;
  product_id?: number;
  product_name?: string;
  product_code?: string;
  raw_material_id?: number;
  raw_material_name?: string;
  raw_material_code?: string;
  item_name: string;
  required_quantity: number;
  available_quantity: number;
  unit_of_measure?: string;
  status: 'available' | 'shortage';
  notes?: string;
  is_custom?: boolean;
  sort_order: number;
  created_date: string;
}

export interface Bom {
  id: number;
  enterprise_id: number;
  purchase_order_id: number;
  product_id?: number;
  product_name?: string;
  bom_number: string;
  quantity: number;
  status: 'pending' | 'stock_checked' | 'stock_shortage' | 'in_progress' | 'completed';
  notes?: string;
  items: BomItem[];
  job_cards?: any[];
  created_date: string;
  modified_date?: string;
}

export interface ManufacturingPO {
  id: number;
  order_number: string;
  customer_name: string;
  customer_id?: number;
  order_date: string;
  expected_delivery?: string;
  grand_total: number;
  status: string;
  items: Array<{
    id: number;
    item_name: string;
    product_id?: number;
    product_name?: string;
    product_code?: string;
    quantity: number;
    unit_of_measure?: string;
  }>;
  bom_count: number;
  job_card_count: number;
  job_cards: Array<{
    id: number;
    job_number: string;
    product_id?: number;
    status: string;
    quantity: number;
    quantity_completed: number;
  }>;
  manufacturing_status: 'no_bom' | 'bom_created' | 'in_progress' | 'completed';
  material_approval_status: 'none' | 'pending_approval' | 'approved' | 'rejected';
  hold_reason?: string;
  hold_acknowledged?: boolean;
  material_request_id?: number;
  manufacturing_priority?: number;
  manufacturing_notes?: string;
  created_date: string;
}

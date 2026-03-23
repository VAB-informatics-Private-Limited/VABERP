export interface Inventory {
  id: number;
  enterprise_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  category_id?: number;
  category_name?: string;
  subcategory_id?: number;
  subcategory_name?: string;
  hsn_code?: string;
  quantity: number;
  unit?: string;
  location?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  last_updated: string;
  status: 'active' | 'inactive';
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
}

export interface InventoryLedger {
  id: number;
  enterprise_id: number;
  inventory_id: number;
  product_name?: string;
  transaction_type: 'in' | 'out' | 'adjustment' | 'return';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type?: string;
  reference_no?: string;
  remarks?: string;
  created_by?: string;
  created_date: string;
}

export interface InventoryFormData {
  product_id: number;
  quantity: number;
  unit?: string;
  location?: string;
  min_stock_level?: number;
  max_stock_level?: number;
}

export interface InventoryLedgerFormData {
  inventory_id: number;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_no?: string;
  remarks?: string;
}

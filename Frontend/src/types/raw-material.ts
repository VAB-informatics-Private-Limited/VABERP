export interface RawMaterial {
  id: number;
  enterprise_id: number;
  material_code: string;
  material_name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  unit_of_measure: string | null;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  min_stock_level: number;
  cost_per_unit: number | null;
  status: 'active' | 'inactive';
  created_date: string;
  modified_date: string;
}

export interface RawMaterialLedger {
  id: number;
  enterprise_id: number;
  raw_material_id: number;
  raw_material_name: string;
  raw_material_code: string;
  transaction_type: 'purchase' | 'issue' | 'return' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type: string | null;
  reference_id: number | null;
  remarks: string | null;
  created_by: number | null;
  created_date: string;
}

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  purchase: 'green',
  issue: 'red',
  return: 'blue',
  adjustment: 'orange',
};

export const CATEGORY_OPTIONS = [
  'Electronics',
  'Plastic',
  'Metal',
  'Rubber',
  'Glass',
  'Wood',
  'Fabric',
  'Chemical',
  'Packaging',
  'Other',
];

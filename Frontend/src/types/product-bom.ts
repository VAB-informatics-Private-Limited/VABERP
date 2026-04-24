export interface ProductBomItem {
  id: number;
  product_bom_id: number;
  raw_material_id?: number | null;
  raw_material_name?: string;
  raw_material_code?: string;
  component_product_id?: number | null;
  component_product_name?: string;
  item_name: string;
  required_quantity: number;
  unit_of_measure?: string;
  is_custom: boolean;
  notes?: string;
  sort_order: number;
  created_date?: string;
}

export interface ProductBom {
  id: number;
  enterprise_id: number;
  product_id: number;
  bom_number: string;
  version: number;
  notes?: string;
  status: 'active' | 'archived';
  items: ProductBomItem[];
  created_date?: string;
  modified_date?: string;
}

export interface ProductBomItemInput {
  raw_material_id?: number | null;
  component_product_id?: number | null;
  item_name: string;
  required_quantity: number;
  unit_of_measure?: string;
  is_custom?: boolean;
  notes?: string;
  sort_order?: number;
}

export interface ProductBomInput {
  notes?: string;
  items: ProductBomItemInput[];
}

export interface SupplierCategoryMapping {
  id: number;
  category: string;
  subcategory?: string;
}

export interface Supplier {
  id: number;
  enterprise_id: number;
  supplier_code: string;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  payment_terms?: string;
  status: string;
  notes?: string;
  categories?: SupplierCategoryMapping[];
  created_date: string;
  modified_date: string;
}

export const SUPPLIER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
] as const;

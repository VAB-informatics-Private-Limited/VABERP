export interface Category {
  id: number;
  enterprise_id: number;
  category_name: string;
  hsn_code?: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface SubCategory {
  id: number;
  enterprise_id: number;
  category_id: number;
  category_name?: string;
  subcategory_name: string;
  hsn_code?: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface DiscountTier {
  minQty: number;
  discountPercent: number;
}

export interface Product {
  id: number;
  enterprise_id: number;
  category_id: number;
  subcategory_id?: number;
  category_name?: string;
  subcategory_name?: string;
  product_name: string;
  product_code?: string;
  hsn_code?: string;
  description?: string;
  unit?: string;
  price?: number;
  gst_rate?: number;
  max_discount_percent?: number;
  discount_tiers?: DiscountTier[];
  image?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface ProductAttribute {
  id: number;
  enterprise_id: number;
  product_id: number;
  attribute_name: string;
  attribute_value: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface CategoryFormData {
  category_name: string;
  hsn_code?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface SubCategoryFormData {
  category_id: number;
  subcategory_name: string;
  hsn_code?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface ProductFormData {
  category_id: number;
  subcategory_id?: number;
  product_name: string;
  product_code?: string;
  hsn_code?: string;
  description?: string;
  unit?: string;
  price?: number;
  gst_rate?: number;
  max_discount_percent?: number;
  discount_tiers?: DiscountTier[];
  status?: 'active' | 'inactive';
}

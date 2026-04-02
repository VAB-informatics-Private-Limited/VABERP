import { z } from 'zod';

export const categorySchema = z.object({
  category_name: z.string().min(2, 'Category name is required'),
  hsn_code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const subCategorySchema = z.object({
  category_id: z.number({ required_error: 'Please select a category' }),
  subcategory_name: z.string().min(2, 'Subcategory name is required'),
  hsn_code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const productSchema = z.object({
  category_id: z.number({ required_error: 'Please select a category' }),
  subcategory_id: z.number().optional(),
  product_name: z.string().min(2, 'Product name is required'),
  product_code: z.string().optional(),
  hsn_code: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  price: z.number().optional(),
  gst_rate: z.number().min(0).max(100).optional(),
  max_discount_percent: z.number().min(0).max(100).optional(),
  discount_tiers: z.array(z.object({ minQty: z.number().min(1), discountPercent: z.number().min(0).max(100) })).optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const productAttributeSchema = z.object({
  attribute_name: z.string().min(1, 'Attribute name is required'),
  attribute_value: z.string().min(1, 'Attribute value is required'),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type SubCategoryFormValues = z.infer<typeof subCategorySchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductAttributeFormValues = z.infer<typeof productAttributeSchema>;

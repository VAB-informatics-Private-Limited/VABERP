import { z } from 'zod';

// HSN codes in India are 4, 6, or 8 digits. Numeric only.
const HSN_REGEX = /^\d{4}(\d{2}(\d{2})?)?$/;

// SKU: letters, digits, dash/underscore. 2–40 chars. Blocks whitespace + special chars.
const SKU_REGEX = /^[A-Za-z0-9_-]{2,40}$/;

const optionalHsn = z.preprocess(
  (v) => (v === null || v === undefined || v === '' ? undefined : v),
  z.string().regex(HSN_REGEX, 'HSN code must be 4, 6, or 8 digits (numbers only)').optional(),
);

export const categorySchema = z.object({
  category_name: z.string().min(2, 'Category name is required'),
  hsn_code: optionalHsn,
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const subCategorySchema = z.object({
  category_id: z.number({ required_error: 'Please select a category' }),
  subcategory_name: z.string().min(2, 'Subcategory name is required'),
  hsn_code: optionalHsn,
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

const bomItemSchema = z.object({
  raw_material_id: z.number().nullable().optional(),
  component_product_id: z.number().nullable().optional(),
  item_name: z.string(),
  required_quantity: z.number().min(0),
  unit_of_measure: z.string().optional(),
  is_custom: z.boolean().optional(),
  notes: z.string().optional(),
  sort_order: z.number().optional(),
});

export const productSchema = z.object({
  category_id: z.number({ required_error: 'Please select a category' }),
  subcategory_id: z.number().optional(),
  product_name: z.string().min(2, 'Product name is required'),
  product_code: z
    .string({ required_error: 'SKU ID is required' })
    .min(2, 'SKU ID is required')
    .regex(SKU_REGEX, 'SKU ID must be 2–40 chars, letters/digits/_- only (no spaces)'),
  hsn_code: optionalHsn,
  description: z.string().optional(),
  unit: z.string().min(1, 'Please select a unit'),
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
  gst_rate: z.number().min(0).max(100).optional(),
  discount_tiers: z
    .array(z.object({ minQty: z.number().min(1), discountPercent: z.number().min(0).max(100) }))
    .optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  bom: z
    .object({
      notes: z.string().optional(),
      items: z.array(bomItemSchema),
    })
    .optional(),
});

export const productAttributeSchema = z.object({
  attribute_name: z.string().min(1, 'Attribute name is required'),
  attribute_value: z.string().min(1, 'Attribute value is required'),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type SubCategoryFormValues = z.infer<typeof subCategorySchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductAttributeFormValues = z.infer<typeof productAttributeSchema>;

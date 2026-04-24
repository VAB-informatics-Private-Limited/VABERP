import { z } from 'zod';
import { MOBILE_REGEX, PINCODE_REGEX, GSTIN_REGEX } from './shared';

// Preprocess: convert null/undefined to empty string for optional string fields
const optionalString = z.preprocess(
  (val) => (val === null || val === undefined ? '' : val),
  z.string(),
);

export const customerSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  business_name: optionalString,
  mobile: z
    .string()
    .regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'),
  email: z.preprocess(
    (val) => (val === null || val === undefined ? '' : val),
    z.string().email('Invalid email address').or(z.literal('')),
  ),
  address: optionalString,
  state: optionalString,
  city: optionalString,
  pincode: z.preprocess(
    (val) => (val === null || val === undefined ? '' : val),
    z.string().regex(PINCODE_REGEX, 'PIN code must be exactly 6 digits').or(z.literal('')),
  ),
  gst_number: z.preprocess(
    (val) => (val === null || val === undefined ? '' : val),
    z.string().regex(GSTIN_REGEX, 'Enter a valid GSTIN (e.g. 27AAPFU0939F1ZV)').or(z.literal('')),
  ),
  contact_person: optionalString,
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

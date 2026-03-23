import { z } from 'zod';

// Preprocess: convert null/undefined to empty string for optional string fields
const optionalString = z.preprocess(
  (val) => (val === null || val === undefined ? '' : val),
  z.string(),
);

export const customerSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  business_name: optionalString,
  mobile: z.string().min(10, 'Mobile number must be 10 digits').max(10, 'Mobile number must be 10 digits'),
  email: z.preprocess(
    (val) => (val === null || val === undefined ? '' : val),
    z.string().email('Invalid email address').or(z.literal('')),
  ),
  address: optionalString,
  state: optionalString,
  city: optionalString,
  pincode: z.preprocess(
    (val) => (val === null || val === undefined ? '' : val),
    z.string().max(6, 'Pincode must be 6 digits').or(z.literal('')),
  ),
  gst_number: optionalString,
  contact_person: optionalString,
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

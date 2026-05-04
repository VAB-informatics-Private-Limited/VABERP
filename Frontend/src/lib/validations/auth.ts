import { z } from 'zod';
import { MOBILE_REGEX, PINCODE_REGEX, GSTIN_REGEX } from './shared';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const enterpriseEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const enterprisePasswordSchema = z.object({
  email_id: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const emailOtpSchema = z.object({
  email_id: z.string().email('Please enter a valid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const mobileOtpSchema = z.object({
  mobile_number: z.string().min(10, 'Please enter a valid mobile number'),
  otp: z.string().length(4, 'OTP must be 4 digits'),
});

export const registrationSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  businessEmail: z.string().email('Please enter a valid email address'),
  businessMobile: z
    .string()
    .regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'),
  businessAddress: z.string().min(5, 'Address is required'),
  businessState: z.string().min(2, 'State is required'),
  businessCity: z.string().min(2, 'City is required'),
  pincode: z.string().regex(PINCODE_REGEX, 'PIN code must be exactly 6 digits'),
  gstNumber: z
    .string()
    .optional()
    .refine((v) => !v || GSTIN_REGEX.test(v), 'Enter a valid GSTIN (e.g. 27AAPFU0939F1ZV)'),
  cinNumber: z.string().optional(),
});

// Lightweight initial signup — no password (credentials are issued by
// super-admin on approval). Full business details collected later at
// /complete-registration.
export const quickSignupSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  businessEmail: z.string().email('Please enter a valid email address'),
  businessMobile: z
    .string()
    .regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'),
  industry: z.string().min(2, 'Please choose your industry'),
});

// Step 2 — full business details, collected after super-admin approval.
export const completeRegistrationSchema = z.object({
  businessAddress: z.string().min(5, 'Address is required'),
  businessState: z.string().min(2, 'State is required'),
  businessCity: z.string().min(2, 'City is required'),
  pincode: z.string().regex(PINCODE_REGEX, 'PIN code must be exactly 6 digits'),
  gstNumber: z
    .string()
    .optional()
    .refine((v) => !v || GSTIN_REGEX.test(v), 'Enter a valid GSTIN (e.g. 27AAPFU0939F1ZV)'),
  cinNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const passwordResetSchema = z.object({
  email_id: z.string().email('Please enter a valid email address'),
  oldpassword: z.string().min(1, 'Current password is required'),
  confirmpassword: z.string().min(6, 'New password must be at least 6 characters'),
}).refine((data) => data.oldpassword !== data.confirmpassword, {
  message: 'New password must be different from current password',
  path: ['confirmpassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type EnterpriseEmailFormData = z.infer<typeof enterpriseEmailSchema>;
export type EnterprisePasswordFormData = z.infer<typeof enterprisePasswordSchema>;
export type EmailOtpFormData = z.infer<typeof emailOtpSchema>;
export type MobileOtpFormData = z.infer<typeof mobileOtpSchema>;
export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type QuickSignupFormData = z.infer<typeof quickSignupSchema>;
export type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

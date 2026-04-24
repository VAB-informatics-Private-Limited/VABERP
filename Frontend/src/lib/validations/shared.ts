import type { Rule } from 'antd/es/form';

// Indian mobile: 10 digits, starts with 6/7/8/9.
export const MOBILE_REGEX = /^[6-9]\d{9}$/;

// Indian PIN code: exactly 6 digits.
export const PINCODE_REGEX = /^\d{6}$/;

// GSTIN: state(2) + PAN(5 letters + 4 digits + 1 letter) + entity(1) + Z + checksum(1).
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Reusable AntD Form rules so validation messages stay identical everywhere.
export const MOBILE_RULE: Rule = {
  pattern: MOBILE_REGEX,
  message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9',
};

export const PINCODE_RULE: Rule = {
  pattern: PINCODE_REGEX,
  message: 'PIN code must be exactly 6 digits',
};

export const GSTIN_RULE: Rule = {
  pattern: GSTIN_REGEX,
  message: 'Enter a valid GSTIN (e.g. 27AAPFU0939F1ZV)',
};

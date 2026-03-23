export interface BusinessProfile {
  enterprise_id: number;
  business_name: string;
  email: string;
  mobile: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  cin_number?: string;
  logo_url?: string;
  website?: string;
  status: 'active' | 'blocked';
  expiry_date?: string;
  created_date?: string;
}

export interface InterestStatusConfig {
  id: number;
  enterprise_id: number;
  status_name: string;
  status_code: string;
  color: string;
  sequence_order: number;
  is_active: boolean;
  created_date?: string;
}

export interface EmailTemplate {
  id: number;
  enterprise_id: number;
  template_name: string;
  template_type: 'quotation' | 'invoice' | 'follow_up' | 'welcome' | 'other';
  subject: string;
  body: string;
  is_active: boolean;
  created_date?: string;
  updated_date?: string;
}

export const TEMPLATE_TYPE_OPTIONS = [
  { value: 'quotation', label: 'Quotation', color: 'blue' },
  { value: 'invoice', label: 'Invoice', color: 'green' },
  { value: 'follow_up', label: 'Follow Up', color: 'orange' },
  { value: 'welcome', label: 'Welcome', color: 'purple' },
  { value: 'other', label: 'Other', color: 'default' },
] as const;

export const DEFAULT_STATUS_COLORS = [
  '#1890ff', // Blue
  '#52c41a', // Green
  '#faad14', // Orange
  '#f5222d', // Red
  '#722ed1', // Purple
  '#13c2c2', // Cyan
  '#eb2f96', // Magenta
  '#fa8c16', // Gold
] as const;

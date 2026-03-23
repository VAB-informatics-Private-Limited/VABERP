export type InterestStatus =
  | 'enquiry'
  | 'follow_up'
  | 'new_call'
  | 'not_interested'
  | 'owner_not_available'
  | 'prospect'
  | 'quotation_sent'
  | 'sale_closed'
  | 'converted';

export interface Enquiry {
  id: number;
  enterprise_id: number;
  employee_id: number;
  employee_name?: string;
  customer_id?: number;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  business_name?: string;
  gst_number?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  source?: string;
  interest_status: InterestStatus;
  product_interest?: string;
  remarks?: string;
  next_followup_date?: string;
  converted_customer_id?: number;
  created_date: string;
  modified_date?: string;
  status: 'active' | 'inactive';
}

export interface EnquiryFormData {
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  business_name?: string;
  gst_number?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  source?: string;
  interest_status: InterestStatus;
  product_interest?: string;
  remarks?: string;
  next_followup_date?: string;
}

export interface EnquiryListParams {
  enterpriseId: number;
  employeeId?: number;
  page?: number;
  pageSize?: number;
  interestStatus?: InterestStatus;
  source?: string;
  customerName?: string;
  customerMobile?: string;
  startDate?: string;
  endDate?: string;
}

export interface Followup {
  id: number;
  enquiry_id: number;
  enterprise_id: number;
  employee_id: number;
  employee_name?: string;
  followup_date: string;
  followup_time?: string;
  interest_status: InterestStatus;
  remarks?: string;
  next_followup_date?: string;
  created_date: string;
}

export interface FollowupFormData {
  enquiry_id: number;
  followup_date: string;
  followup_time?: string;
  interest_status: InterestStatus;
  remarks?: string;
  next_followup_date?: string;
}

export interface TodayFollowup {
  id: number;
  enquiry_id: number;
  customer_name: string;
  customer_mobile: string;
  business_name?: string;
  interest_status: InterestStatus;
  next_followup_date: string;
  remarks?: string;
  employee_name?: string;
}

// Kept as fallback for components that don't use dynamic sources yet
export const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Phone', label: 'Phone' },
  { value: 'Email', label: 'Email' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Advertisement', label: 'Advertisement' },
  { value: 'Trade Show', label: 'Trade Show' },
  { value: 'Cold Call', label: 'Cold Call' },
  { value: 'Other', label: 'Other' },
];

export const INTEREST_STATUS_OPTIONS: { value: InterestStatus; label: string; color: string }[] = [
  { value: 'enquiry', label: 'Enquiry', color: 'blue' },
  { value: 'follow_up', label: 'Follow Up', color: 'cyan' },
  { value: 'new_call', label: 'New Call', color: 'purple' },
  { value: 'not_interested', label: 'Not Interested', color: 'red' },
  { value: 'owner_not_available', label: 'Owner Not Available', color: 'orange' },
  { value: 'prospect', label: 'Prospect', color: 'gold' },
  { value: 'quotation_sent', label: 'Quotation Sent', color: 'lime' },
  { value: 'sale_closed', label: 'Sale Closed', color: 'green' },
];

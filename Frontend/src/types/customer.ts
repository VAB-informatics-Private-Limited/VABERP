export interface Customer {
  id: number;
  enterprise_id: number;
  customer_name: string;
  business_name?: string;
  mobile: string;
  email?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gst_number?: string;
  contact_person?: string;
  customer_number?: string;
  source_enquiry_id?: number;
  status: 'active' | 'inactive';
  created_date: string;
  modified_date?: string;
}

export interface CustomerFormData {
  customer_name: string;
  business_name?: string;
  mobile: string;
  email?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gst_number?: string;
  contact_person?: string;
  status?: 'active' | 'inactive';
}

export interface CustomerListParams {
  enterpriseId: number;
  page?: number;
  pageSize?: number;
  customerName?: string;
  businessName?: string;
  customerMobile?: string;
  customerEmail?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

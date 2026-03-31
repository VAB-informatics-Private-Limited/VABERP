import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import {
  Enquiry,
  EnquiryFormData,
  EnquiryListParams,
  Followup,
  FollowupFormData,
  TodayFollowup,
} from '@/types/enquiry';

// Helper function to map backend camelCase to frontend snake_case for enquiries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEnquiryFromBackend(data: any): Enquiry {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    employee_id: data.assignedTo,
    employee_name: data.assignedEmployee?.firstName
      ? `${data.assignedEmployee.firstName} ${data.assignedEmployee.lastName || ''}`.trim()
      : undefined,
    customer_id: data.customerId,
    customer_name: data.customerName,
    customer_mobile: data.mobile,
    customer_email: data.email,
    business_name: data.businessName,
    gst_number: data.gstNumber,
    address: data.address,
    country: data.country,
    state: data.state,
    city: data.city,
    pincode: data.pincode,
    source: data.source || undefined,
    interest_status: data.interestStatus,
    product_interest: data.requirements,
    remarks: data.remarks,
    next_followup_date: data.nextFollowupDate,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
    converted_customer_id: data.convertedCustomerId || undefined,
    status: data.status || 'active',
  };
}

// ============ Enquiries ============

export async function getEnquiryList(params: EnquiryListParams): Promise<PaginatedResponse<Enquiry>> {
  // Only include params that have actual values — avoid sending undefined/null filters
  const queryParams: Record<string, unknown> = {
    page: params.page,
    limit: params.pageSize,
  };
  if (params.customerName || params.customerMobile) {
    queryParams.search = params.customerName || params.customerMobile;
  }
  if (params.interestStatus) {
    queryParams.interestStatus = params.interestStatus;
  }
  if (params.employeeId) {
    queryParams.assignedTo = params.employeeId;
  }
  if (params.startDate) {
    queryParams.fromDate = params.startDate;
  }
  if (params.endDate) {
    queryParams.toDate = params.endDate;
  }
  if (params.source) {
    queryParams.source = params.source;
  }

  const response = await apiClient.get<PaginatedResponse<Enquiry>>('/enquiries', {
    params: queryParams,
  });

  // Map backend camelCase to frontend snake_case
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapEnquiryFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getEnquiryById(id: number, _enterpriseId?: number): Promise<ApiResponse<Enquiry>> {
  const response = await apiClient.get<ApiResponse<Enquiry>>(`/enquiries/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapEnquiryFromBackend(backendData.data) : undefined,
  };
}

export async function addEnquiry(data: EnquiryFormData & { enterprise_id?: number; employee_id?: number }): Promise<ApiResponse> {
  // Map frontend field names to backend DTO field names
  const payload = {
    customerName: data.customer_name,
    mobile: data.customer_mobile,
    email: data.customer_email,
    businessName: data.business_name,
    gstNumber: data.gst_number,
    address: data.address,
    country: data.country,
    state: data.state,
    city: data.city,
    pincode: data.pincode,
    source: data.source,
    interestStatus: data.interest_status,
    requirements: data.product_interest,
    remarks: data.remarks,
    nextFollowupDate: data.next_followup_date,
    assignedTo: data.employee_id,
  };
  const response = await apiClient.post<ApiResponse>('/enquiries', payload);
  return response.data;
}

export async function updateEnquiry(
  data: EnquiryFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id, ...formData } = data;
  // Map frontend field names to backend DTO field names
  const payload = {
    customerName: formData.customer_name,
    mobile: formData.customer_mobile,
    email: formData.customer_email,
    businessName: formData.business_name,
    gstNumber: formData.gst_number,
    address: formData.address,
    country: formData.country,
    state: formData.state,
    city: formData.city,
    pincode: formData.pincode,
    source: formData.source,
    interestStatus: formData.interest_status,
    requirements: formData.product_interest,
    remarks: formData.remarks,
    nextFollowupDate: formData.next_followup_date,
  };
  const response = await apiClient.put<ApiResponse>(`/enquiries/${id}`, payload);
  return response.data;
}

export async function deleteEnquiry(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/enquiries/${id}`);
  return response.data;
}

export async function assignEnquiry(id: number, assignedTo: number): Promise<ApiResponse> {
  const response = await apiClient.put<ApiResponse>(`/enquiries/${id}`, { assignedTo });
  return response.data;
}

export async function convertToCustomer(enquiryId: number): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>(`/enquiries/${enquiryId}/convert`);
  return response.data;
}

export async function checkEnquiryMobile(mobile: string): Promise<{ exists: boolean; customerName?: string }> {
  const response = await apiClient.get('/enquiries/check-mobile', { params: { mobile } });
  return (response.data as any);
}

// Helper function to map backend camelCase to frontend snake_case for followups
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFollowupFromBackend(data: any): Followup {
  return {
    id: data.id,
    enquiry_id: data.enquiryId,
    enterprise_id: data.enterpriseId,
    employee_id: data.employeeId,
    employee_name: data.employee?.firstName
      ? `${data.employee.firstName} ${data.employee.lastName || ''}`.trim()
      : undefined,
    followup_date: data.followupDate,
    followup_time: data.followupTime,
    interest_status: data.interestStatus,
    remarks: data.notes || data.remarks,
    next_followup_date: data.nextFollowupDate,
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTodayFollowupFromBackend(data: any): TodayFollowup {
  return {
    id: data.id,
    enquiry_id: data.enquiryId || data.id,
    customer_name: data.customerName,
    customer_mobile: data.mobile,
    business_name: data.businessName,
    interest_status: data.interestStatus,
    next_followup_date: data.nextFollowupDate,
    remarks: data.remarks,
    employee_name: data.assignedEmployee?.firstName
      ? `${data.assignedEmployee.firstName} ${data.assignedEmployee.lastName || ''}`.trim()
      : undefined,
  };
}

// ============ Follow-ups ============

export async function getFollowupHistory(enquiryId: number, _enterpriseId?: number): Promise<ApiResponse<Followup[]>> {
  const response = await apiClient.get<ApiResponse<Followup[]>>(`/enquiries/${enquiryId}/followups`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapFollowupFromBackend),
  };
}

export async function addFollowup(
  data: FollowupFormData & { enterprise_id?: number; employee_id?: number }
): Promise<ApiResponse> {
  const payload = {
    followupDate: data.followup_date,
    followupTime: data.followup_time,
    interestStatus: data.interest_status,
    remarks: data.remarks,
    nextFollowupDate: data.next_followup_date,
  };
  const response = await apiClient.post<ApiResponse>(`/enquiries/${data.enquiry_id}/followups`, payload);
  return response.data;
}

export async function updateFollowup(
  data: FollowupFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id, ...updateData } = data;
  const response = await apiClient.patch<ApiResponse>(`/enquiries/followups/${id}`, updateData);
  return response.data;
}

export async function submitFollowupOutcome(
  enquiryId: number,
  data: { outcomeStatus: string; remarks?: string; nextFollowupDate?: string }
): Promise<ApiResponse<{ outcomeStatus: string; customer?: { id: number } }>> {
  const response = await apiClient.post(`/enquiries/${enquiryId}/outcome`, data);
  return response.data;
}

export async function getTodayFollowups(
  _enterpriseId?: number,
  assignedTo?: number
): Promise<ApiResponse<TodayFollowup[]>> {
  const response = await apiClient.get<ApiResponse<TodayFollowup[]>>('/enquiries/today-followups', {
    params: { assignedTo },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapTodayFollowupFromBackend),
  };
}

// ============ Reports ============

export async function getEnquiryQuotations(enquiryId: number): Promise<{ message: string; data: any[] }> {
  const response = await apiClient.get(`/enquiries/${enquiryId}/quotations`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map((q: any) => ({
      id: q.id,
      quotation_number: q.quotationNumber,
      status: q.status,
      total_amount: q.grandTotal,
      current_version: q.currentVersion ?? 1,
      is_locked: q.isLocked ?? false,
      created_date: q.createdDate,
    })),
  };
}

export async function getSalesEnquiryReports(params: {
  enterpriseId?: number;
  employeeId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<{ total: number; byStatus: Record<string, number> }>> {
  const response = await apiClient.get<ApiResponse<{ total: number; byStatus: Record<string, number> }>>(
    '/reports/enquiry',
    { params }
  );
  return response.data;
}

export async function getSalesProspectsReport(params: {
  enterpriseId?: number;
  employeeId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<Enquiry[]>> {
  const response = await apiClient.get<ApiResponse<Enquiry[]>>('/reports/prospect', { params });
  return response.data;
}

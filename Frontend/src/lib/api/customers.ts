import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Customer, CustomerFormData, CustomerListParams } from '@/types/customer';

// Helper function to map backend camelCase to frontend snake_case for customers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCustomerFromBackend(data: any): Customer {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    customer_name: data.customerName,
    business_name: data.businessName,
    mobile: data.mobile,
    email: data.email,
    address: data.address,
    state: data.state,
    city: data.city,
    pincode: data.pincode,
    gst_number: data.gstNumber,
    contact_person: data.contactPerson,
    status: data.status || 'active',
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

// Get Customer List with filters and pagination
export async function getCustomerList(params: CustomerListParams): Promise<PaginatedResponse<Customer>> {
  const response = await apiClient.get<PaginatedResponse<Customer>>('/customers', {
    params: {
      page: params.page,
      limit: params.pageSize,
      search: params.customerName || params.businessName || params.customerMobile,
    },
  });
  // Map backend camelCase to frontend snake_case
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapCustomerFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

// Get Customer by ID (enterprise_id extracted from JWT)
export async function getCustomerById(id: number, _enterpriseId?: number): Promise<ApiResponse<Customer>> {
  const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapCustomerFromBackend(backendData.data) : undefined,
  };
}

// Add New Customer (enterprise_id extracted from JWT)
export async function addCustomer(data: CustomerFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  // Map frontend field names to backend entity field names
  const payload = {
    customerName: data.customer_name,
    businessName: data.business_name,
    mobile: data.mobile,
    email: data.email,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    gstNumber: data.gst_number,
    contactPerson: data.contact_person,
    status: data.status,
  };
  const response = await apiClient.post<ApiResponse>('/customers', payload);
  return response.data;
}

// Update Customer (enterprise_id extracted from JWT)
export async function updateCustomer(data: CustomerFormData & { id: number; enterprise_id?: number }): Promise<ApiResponse> {
  const { id, enterprise_id, ...formData } = data;
  // Map frontend field names to backend entity field names
  const payload = {
    customerName: formData.customer_name,
    businessName: formData.business_name || '',
    mobile: formData.mobile,
    email: formData.email || '',
    address: formData.address || '',
    city: formData.city || '',
    state: formData.state || '',
    pincode: formData.pincode || '',
    gstNumber: formData.gst_number || '',
    contactPerson: formData.contact_person || '',
    status: formData.status || 'active',
  };
  console.log('API updateCustomer - sending PATCH /customers/' + id, payload);
  const response = await apiClient.patch<ApiResponse>(`/customers/${id}`, payload);
  return response.data;
}

// Delete Customer (enterprise_id extracted from JWT)
export async function deleteCustomer(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/customers/${id}`);
  return response.data;
}

// Get Customer List for Reports (same as regular list)
export async function getCustomerListReport(params: CustomerListParams): Promise<PaginatedResponse<Customer>> {
  return getCustomerList(params);
}

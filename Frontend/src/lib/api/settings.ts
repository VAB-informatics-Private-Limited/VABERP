import apiClient from './client';
import { ApiResponse } from '@/types/api';
import { BusinessProfile, InterestStatusConfig, EmailTemplate } from '@/types/settings';

// Helper to map backend camelCase response to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileFromBackend(data: any): BusinessProfile {
  return {
    enterprise_id: data.id,
    business_name: data.businessName,
    email: data.email,
    mobile: data.mobile,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    gst_number: data.gstNumber,
    cin_number: data.cinNumber,
    website: data.website,
    status: data.status || 'active',
    expiry_date: data.expiryDate,
    created_date: data.createdDate,
  };
}

// Business Profile
export async function getBusinessProfile(_enterpriseId?: number): Promise<ApiResponse<BusinessProfile>> {
  const response = await apiClient.get('/enterprises/profile');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapProfileFromBackend(backendData.data) : undefined,
  };
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<ApiResponse<BusinessProfile>> {
  // Build payload with only the editable fields (snake_case keys will be
  // auto-converted to camelCase by the API client's transformRequest)
  const payload: Record<string, unknown> = {};
  if (data.business_name !== undefined) payload.business_name = data.business_name;
  if (data.email !== undefined) payload.email = data.email;
  if (data.mobile !== undefined) payload.mobile = data.mobile;
  if (data.website !== undefined) payload.website = data.website;
  if (data.address !== undefined) payload.address = data.address;
  if (data.city !== undefined) payload.city = data.city;
  if (data.state !== undefined) payload.state = data.state;
  if (data.pincode !== undefined) payload.pincode = data.pincode;
  if (data.gst_number !== undefined) payload.gst_number = data.gst_number;
  if (data.cin_number !== undefined) payload.cin_number = data.cin_number;

  const response = await apiClient.patch('/enterprises/profile', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapProfileFromBackend(backendData.data) : undefined,
  };
}

// Helper to map interest status from backend camelCase to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInterestStatusFromBackend(data: any): InterestStatusConfig {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    status_name: data.statusName,
    status_code: data.statusCode,
    color: data.color,
    sequence_order: data.sequenceOrder,
    is_active: data.isActive,
    created_date: data.createdDate,
  };
}

// Interest Status Configuration
export async function getInterestStatuses(_enterpriseId?: number): Promise<ApiResponse<InterestStatusConfig[]>> {
  const response = await apiClient.get('/interest-statuses');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapInterestStatusFromBackend),
  };
}

export async function addInterestStatus(data: {
  enterprise_id?: number;
  status_name: string;
  status_code: string;
  color: string;
  sequence_order: number;
}): Promise<ApiResponse<InterestStatusConfig>> {
  const payload = {
    status_name: data.status_name,
    status_code: data.status_code,
    color: data.color,
    sequence_order: data.sequence_order,
  };
  const response = await apiClient.post('/interest-statuses', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInterestStatusFromBackend(backendData.data) : undefined,
  };
}

export async function updateInterestStatus(data: {
  id: number;
  enterprise_id?: number;
  status_name?: string;
  status_code?: string;
  color?: string;
  sequence_order?: number;
  is_active?: boolean;
}): Promise<ApiResponse<InterestStatusConfig>> {
  const { id, enterprise_id, ...fields } = data;
  const response = await apiClient.patch(`/interest-statuses/${id}`, fields);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInterestStatusFromBackend(backendData.data) : undefined,
  };
}

export async function deleteInterestStatus(id: number, _enterpriseId?: number): Promise<ApiResponse<null>> {
  const response = await apiClient.delete(`/interest-statuses/${id}`);
  return response.data;
}

// Helper to map email template from backend camelCase to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmailTemplateFromBackend(data: any): EmailTemplate {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    template_name: data.templateName,
    template_type: data.templateType,
    subject: data.subject,
    body: data.body,
    is_active: data.isActive,
    created_date: data.createdDate,
    updated_date: data.updatedDate,
  };
}

// Email Templates
export async function getEmailTemplates(_enterpriseId?: number): Promise<ApiResponse<EmailTemplate[]>> {
  const response = await apiClient.get('/email-templates');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapEmailTemplateFromBackend),
  };
}

export async function addEmailTemplate(data: {
  enterprise_id?: number;
  template_name: string;
  template_type: string;
  subject: string;
  body: string;
}): Promise<ApiResponse<EmailTemplate>> {
  const payload = {
    template_name: data.template_name,
    template_type: data.template_type,
    subject: data.subject,
    body: data.body,
  };
  const response = await apiClient.post('/email-templates', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapEmailTemplateFromBackend(backendData.data) : undefined,
  };
}

export async function updateEmailTemplate(data: {
  id: number;
  enterprise_id?: number;
  template_name?: string;
  template_type?: string;
  subject?: string;
  body?: string;
  is_active?: boolean;
}): Promise<ApiResponse<null>> {
  const { id, enterprise_id, ...fields } = data;
  const response = await apiClient.patch(`/email-templates/${id}`, fields);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? null : null,
  };
}

export async function deleteEmailTemplate(id: number, _enterpriseId?: number): Promise<ApiResponse<null>> {
  const response = await apiClient.delete(`/email-templates/${id}`);
  return response.data;
}

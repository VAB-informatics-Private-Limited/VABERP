import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { CrmLead, CrmFollowup, CrmActivity, CrmTeamMember, CrmPerformanceStat, CrmSummary, ModuleTeamLeader } from '@/types/crm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLeadFromBackend(d: any): CrmLead {
  return {
    id: d.id,
    enterprise_id: d.enterpriseId,
    lead_number: d.leadNumber,
    customer_name: d.customerName,
    email: d.email ?? null,
    mobile: d.mobile ?? null,
    business_name: d.businessName ?? null,
    gst_number: d.gstNumber ?? null,
    address: d.address ?? null,
    city: d.city ?? null,
    state: d.state ?? null,
    country: d.country ?? null,
    pincode: d.pincode ?? null,
    source: d.source ?? null,
    status: d.status,
    expected_value: d.expectedValue != null ? Number(d.expectedValue) : null,
    requirements: d.requirements ?? null,
    remarks: d.remarks ?? null,
    next_followup_date: d.nextFollowupDate ?? null,
    created_by: d.createdBy ?? null,
    assigned_to: d.assignedTo ?? null,
    assigned_to_name: d.assignedEmployee
      ? `${d.assignedEmployee.firstName} ${d.assignedEmployee.lastName}`
      : null,
    assigned_by: d.assignedBy ?? null,
    manager_id: d.managerId ?? null,
    manager_name: d.manager
      ? `${d.manager.firstName} ${d.manager.lastName}`
      : null,
    converted_customer_id: d.convertedCustomerId ?? null,
    customer_id: d.customerId ?? null,
    created_date: d.createdDate,
    modified_date: d.modifiedDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFollowupFromBackend(d: any): CrmFollowup {
  return {
    id: d.id,
    enterprise_id: d.enterpriseId,
    crm_lead_id: d.crmLeadId,
    created_by: d.createdBy,
    created_by_name: d.createdByEmployee
      ? `${d.createdByEmployee.firstName} ${d.createdByEmployee.lastName}`
      : undefined,
    followup_type: d.followupType,
    followup_date: d.followupDate,
    status: d.status ?? null,
    notes: d.notes ?? null,
    next_followup_date: d.nextFollowupDate ?? null,
    next_followup_type: d.nextFollowupType ?? null,
    created_date: d.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapActivityFromBackend(d: any): CrmActivity {
  return {
    id: d.id,
    enterprise_id: d.enterpriseId,
    crm_lead_id: d.crmLeadId,
    performed_by: d.performedBy,
    performed_by_name: d.performedByEmployee
      ? `${d.performedByEmployee.firstName} ${d.performedByEmployee.lastName}`
      : undefined,
    action: d.action,
    old_value: d.oldValue ?? null,
    new_value: d.newValue ?? null,
    description: d.description ?? null,
    created_date: d.createdDate,
  };
}

// ── Leads ──────────────────────────────────────────────────

export async function getLeadList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  assignedTo?: number;
}): Promise<PaginatedResponse<CrmLead>> {
  const response = await apiClient.get('/crm/leads', {
    params: {
      page: params.page,
      limit: params.pageSize,
      search: params.search || undefined,
      status: params.status || undefined,
      assignedTo: params.assignedTo || undefined,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapLeadFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

export async function getLeadById(id: number): Promise<ApiResponse<CrmLead>> {
  const response = await apiClient.get(`/crm/leads/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapLeadFromBackend(d.data) : undefined };
}

export async function createLead(data: {
  customerName: string;
  email?: string;
  mobile?: string;
  businessName?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: string;
  expectedValue?: number;
  requirements?: string;
  remarks?: string;
  nextFollowupDate?: string;
  assignedTo?: number;
}): Promise<ApiResponse<CrmLead>> {
  const response = await apiClient.post('/crm/leads', data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapLeadFromBackend(d.data) : undefined };
}

export async function updateLead(id: number, data: Partial<{
  customerName: string; email: string; mobile: string; businessName: string;
  gstNumber: string; address: string; city: string; state: string;
  country: string; pincode: string; source: string; expectedValue: number;
  requirements: string; remarks: string; nextFollowupDate: string; assignedTo: number;
}>): Promise<ApiResponse> {
  const response = await apiClient.put(`/crm/leads/${id}`, data);
  return response.data;
}

export async function updateLeadStatus(id: number, status: string): Promise<ApiResponse> {
  const response = await apiClient.patch(`/crm/leads/${id}/status`, { status });
  return response.data;
}

export async function deleteLead(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/crm/leads/${id}`);
  return response.data;
}

export async function assignLead(id: number, assignedTo: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/crm/leads/${id}/assign`, { assignedTo });
  return response.data;
}

// ── Follow-ups ─────────────────────────────────────────────

export async function getLeadFollowups(leadId: number): Promise<ApiResponse<CrmFollowup[]>> {
  const response = await apiClient.get(`/crm/leads/${leadId}/followups`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapFollowupFromBackend) };
}

export async function addLeadFollowup(leadId: number, data: {
  followupType: string;
  followupDate: string;
  status?: string;
  notes?: string;
  nextFollowupDate?: string;
  nextFollowupType?: string;
}): Promise<ApiResponse> {
  const response = await apiClient.post(`/crm/leads/${leadId}/followups`, data);
  return response.data;
}

// ── Activity ───────────────────────────────────────────────

export async function getLeadActivity(leadId: number): Promise<ApiResponse<CrmActivity[]>> {
  const response = await apiClient.get(`/crm/leads/${leadId}/activity`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapActivityFromBackend) };
}

// ── Follow-up lists ────────────────────────────────────────

export async function getTodayCrmFollowups(): Promise<ApiResponse<CrmLead[]>> {
  const response = await apiClient.get('/crm/leads/followups/today');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapLeadFromBackend) };
}

export async function getOverdueCrmFollowups(): Promise<ApiResponse<CrmLead[]>> {
  const response = await apiClient.get('/crm/leads/followups/overdue');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapLeadFromBackend) };
}

// ── Reports ────────────────────────────────────────────────

export async function getCrmSummary(): Promise<ApiResponse<CrmSummary>> {
  const response = await apiClient.get('/crm/reports/summary');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: {
      total: d.data?.total || 0,
      by_status: (d.data?.byStatus || []).map((s: any) => ({
        status: s.status,
        count: Number(s.count),
      })),
    },
  };
}

export async function getCrmPerformanceStats(): Promise<ApiResponse<CrmPerformanceStat[]>> {
  const response = await apiClient.get('/crm/reports/performance');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map((s: any) => ({
      employee_id: s.employeeId,
      employee_name: s.employeeName,
      total: s.total,
      converted: s.converted,
      lost: s.lost,
      active: s.active,
      conversion_rate: s.conversionRate,
    })),
  };
}

// ── Team ───────────────────────────────────────────────────

export async function getCrmTeam(): Promise<ApiResponse<CrmTeamMember[]>> {
  const response = await apiClient.get('/crm/team');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map((e: any) => ({
      id: e.id,
      first_name: e.firstName,
      last_name: e.lastName,
      email: e.email,
      reporting_to: e.reportingTo ?? null,
    })),
  };
}

export async function getModuleLeaders(): Promise<ApiResponse<ModuleTeamLeader[]>> {
  const response = await apiClient.get('/crm/team/module-leaders');
  const d = response.data as any;
  return { message: d.message, data: d.data || [] };
}

export async function setModuleLeader(moduleName: string, employeeId: number | null): Promise<ApiResponse> {
  const response = await apiClient.put(`/crm/team/module-leaders/${moduleName}`, { employeeId });
  return response.data;
}

export async function getAssignableEmployees(): Promise<ApiResponse<CrmTeamMember[]>> {
  const response = await apiClient.get('/crm/team/assignable');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map((e: any) => ({
      id: e.id,
      first_name: e.firstName,
      last_name: e.lastName,
      email: e.email,
      reporting_to: e.reportingTo ?? null,
    })),
  };
}

export async function updateReportingTo(employeeId: number, reportingTo: number | null): Promise<ApiResponse> {
  const response = await apiClient.patch(`/crm/team/${employeeId}/reporting-to`, { reportingTo });
  return response.data;
}

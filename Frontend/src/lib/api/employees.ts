import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { MenuPermissions } from '@/types/auth';
import {
  Department,
  Designation,
  EmployeeDetails,
  DepartmentFormData,
  DesignationFormData,
  EmployeeFormData,
  ReportingManager,
} from '@/types/employee';

// Helper functions to map backend camelCase to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDepartmentFromBackend(data: any): Department {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    department_name: data.departmentName,
    description: data.description,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDesignationFromBackend(data: any): Designation {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    department_id: data.departmentId,
    department_name: data.department?.departmentName,
    designation_name: data.designationName,
    description: data.description,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmployeeFromBackend(data: any): EmployeeDetails {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    department_id: data.departmentId,
    designation_id: data.designationId,
    department_name: data.department?.departmentName,
    designation_name: data.designation?.designationName,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone_number: data.phoneNumber,
    hire_date: data.hireDate,
    status: data.status || 'active',
    created_date: data.createdDate,
    reporting_to: data.reportingTo ?? null,
    is_reporting_head: data.isReportingHead ?? false,
    reporting_manager_id: data.reportingManagerId ?? null,
  };
}

// ============ Departments ============

export async function getDepartments(_enterpriseId?: number): Promise<ApiResponse<Department[]>> {
  const response = await apiClient.get<PaginatedResponse<Department>>('/employees/departments', {
    params: { limit: 1000 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return { message: backendData.message, data: (backendData.data || []).map(mapDepartmentFromBackend) };
}

export async function getDropdownDepartment(_enterpriseId?: number): Promise<ApiResponse<Department[]>> {
  return getDepartments();
}

export async function addDepartment(data: DepartmentFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    departmentName: data.department_name,
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.post<ApiResponse>('/employees/departments', payload);
  return response.data;
}

export async function updateDepartment(
  data: DepartmentFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    departmentName: data.department_name,
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.patch<ApiResponse>(`/employees/departments/${id}`, payload);
  return response.data;
}

export async function deleteDepartment(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/employees/departments/${id}`);
  return response.data;
}

export async function seedDefaultDepartments(): Promise<ApiResponse<{ createdDepartments: number; createdDesignations: number }>> {
  const response = await apiClient.post('/employees/departments/seed-defaults');
  return response.data;
}

// ============ Designations ============

export async function getDesignations(_enterpriseId?: number, departmentId?: number): Promise<ApiResponse<Designation[]>> {
  const response = await apiClient.get<PaginatedResponse<Designation>>('/employees/designations', {
    params: { departmentId, limit: 1000 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return { message: backendData.message, data: (backendData.data || []).map(mapDesignationFromBackend) };
}

export async function getDropdownDesignationByDeptId(
  _enterpriseId?: number,
  departmentId?: number
): Promise<ApiResponse<Designation[]>> {
  return getDesignations(undefined, departmentId);
}

export async function addDesignation(data: DesignationFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    departmentId: data.department_id,
    designationName: data.designation_name,
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.post<ApiResponse>('/employees/designations', payload);
  return response.data;
}

export async function updateDesignation(
  data: DesignationFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    departmentId: data.department_id,
    designationName: data.designation_name,
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.patch<ApiResponse>(`/employees/designations/${id}`, payload);
  return response.data;
}

export async function deleteDesignation(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/employees/designations/${id}`);
  return response.data;
}

// ============ Employees ============

export async function getSalesEmployees(): Promise<PaginatedResponse<EmployeeDetails>> {
  const response = await apiClient.get<PaginatedResponse<EmployeeDetails>>('/employees/sales-reps');
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapEmployeeFromBackend),
    totalRecords: backendData.totalRecords,
  };
}

export async function getEmployees(_enterpriseId?: number, page?: number, limit?: number, search?: string): Promise<PaginatedResponse<EmployeeDetails>> {
  const response = await apiClient.get<PaginatedResponse<EmployeeDetails>>('/employees', {
    params: { page, limit, search },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapEmployeeFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getEmployeeById(id: number, _enterpriseId?: number): Promise<ApiResponse<EmployeeDetails>> {
  const response = await apiClient.get<ApiResponse<EmployeeDetails>>(`/employees/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapEmployeeFromBackend(backendData.data) : undefined,
  };
}

export async function addEmployee(data: EmployeeFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    departmentId: data.department_id,
    designationId: data.designation_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    password: data.password,
    phoneNumber: data.phone_number,
    hireDate: data.hire_date,
    status: data.status,
    reportingTo: data.reporting_to ?? null,
    reportingManagerId: data.reporting_manager_id ?? null,
  };
  const response = await apiClient.post<ApiResponse>('/employees', payload);
  return response.data;
}

export async function updateEmployee(
  data: EmployeeFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    departmentId: data.department_id,
    designationId: data.designation_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    password: data.password,
    phoneNumber: data.phone_number,
    hireDate: data.hire_date,
    status: data.status,
    reportingTo: data.reporting_to ?? null,
    reportingManagerId: data.reporting_manager_id ?? null,
  };
  const response = await apiClient.patch<ApiResponse>(`/employees/${id}`, payload);
  return response.data;
}

// ============ Reporting Managers ============

export async function getReportingManagers(): Promise<ApiResponse<ReportingManager[]>> {
  const response = await apiClient.get('/employees/reporting-managers');
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map((m: any) => ({
      id: m.id,
      enterprise_id: m.enterpriseId,
      name: m.name,
      status: m.status || 'active',
      created_date: m.createdDate,
    })),
  };
}

export async function addReportingManager(data: { name: string; status?: string }): Promise<ApiResponse> {
  const response = await apiClient.post('/employees/reporting-managers', data);
  return response.data;
}

export async function updateReportingManager(data: { id: number; name?: string; status?: string }): Promise<ApiResponse> {
  const { id, ...body } = data;
  const response = await apiClient.patch(`/employees/reporting-managers/${id}`, body);
  return response.data;
}

export async function deleteReportingManager(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/employees/reporting-managers/${id}`);
  return response.data;
}

export async function getReporters(): Promise<{ value: number; label: string; is_reporting_head: boolean }[]> {
  const response = await apiClient.get('/employees/reporters');
  const d = response.data as any;
  return (d.data || []).map((e: any) => ({
    value: e.id,
    label: `${e.firstName} ${e.lastName}`,
    is_reporting_head: true,
  }));
}

export async function setReportingHead(id: number, value: boolean): Promise<ApiResponse> {
  const response = await apiClient.patch(`/employees/${id}/reporting-head`, { value });
  return response.data;
}

export async function deleteEmployee(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/employees/${id}`);
  return response.data;
}

// ============ Permissions ============

// Convert camelCase submodule keys (e.g. purchaseOrders) back to snake_case (purchase_orders).
// Needed because old saves went through transformRequest which camelCased the keys.
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function normalizePermissions(permissions: MenuPermissions): MenuPermissions {
  const result: MenuPermissions = {};
  for (const [module, submodules] of Object.entries(permissions)) {
    result[module] = {};
    for (const [submodule, actions] of Object.entries(submodules as Record<string, unknown>)) {
      result[module][camelToSnake(submodule)] = actions as Record<string, 0 | 1>;
    }
  }
  return result;
}

export interface EmployeePermissionsResponse {
  permissions: MenuPermissions;
  dataStartDate: string | null;
  ownDataOnly: boolean;
  updatedAt: string | null;
  updatedBy: number | null;
  updatedByName: string | null;
}

export async function getEmployeePermissions(employeeId: number): Promise<ApiResponse<EmployeePermissionsResponse>> {
  const response = await apiClient.get<ApiResponse<EmployeePermissionsResponse>>(`/employees/${employeeId}/permissions`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  const rawData = backendData.data;
  // Support both new wrapped format { permissions, dataStartDate } and legacy flat format
  const isWrapped = rawData && typeof rawData === 'object' && 'permissions' in rawData;
  return {
    message: backendData.message,
    data: {
      permissions: isWrapped ? normalizePermissions(rawData.permissions) : (rawData ? normalizePermissions(rawData) : {}),
      dataStartDate: isWrapped ? rawData.dataStartDate ?? null : null,
      ownDataOnly: isWrapped ? rawData.ownDataOnly ?? false : false,
      updatedAt: isWrapped ? rawData.updatedAt ?? null : null,
      updatedBy: isWrapped ? rawData.updatedBy ?? null : null,
      updatedByName: isWrapped ? rawData.updatedByName ?? null : null,
    },
  };
}

export async function updateEmployeePermissions(
  data: { employee_id: number; enterprise_id?: number; permissions: MenuPermissions; dataStartDate?: string | null; ownDataOnly?: boolean }
): Promise<ApiResponse> {
  const { employee_id, permissions, dataStartDate, ownDataOnly } = data;
  // Bypass transformRequest so snake_case submodule keys (e.g. purchase_orders) are NOT
  // converted to camelCase — they must be stored as-is for hasPermission() to work.
  const body = {
    permissions,
    dataStartDate: dataStartDate !== undefined ? dataStartDate : undefined,
    ownDataOnly: ownDataOnly !== undefined ? ownDataOnly : undefined,
  };
  const response = await apiClient.patch<ApiResponse>(
    `/employees/${employee_id}/permissions`,
    body,
    { transformRequest: [(d) => JSON.stringify(d)] },
  );
  return response.data;
}

export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  designation: string | null;
  department: string | null;
  accessModules: string[];
  activeTaskCount: number;
  activeJobCardCount: number;
  activeTasks: {
    id: number;
    taskNumber: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
  }[];
  activeJobCards: {
    id: number;
    jobNumber: string;
    jobName: string;
    status: string;
  }[];
}

export async function getTeamOverview(): Promise<ApiResponse<TeamMember[]>> {
  const response = await apiClient.get('/employees/my-team');
  return response.data;
}

export async function addEmployeeWithPermissions(
  employeeData: EmployeeFormData & { enterprise_id?: number },
  permissions?: MenuPermissions,
): Promise<ApiResponse> {
  const payload = {
    departmentId: employeeData.department_id,
    designationId: employeeData.designation_id,
    firstName: employeeData.first_name,
    lastName: employeeData.last_name,
    email: employeeData.email,
    password: employeeData.password,
    phoneNumber: employeeData.phone_number,
    hireDate: employeeData.hire_date,
    status: employeeData.status,
    reportingTo: employeeData.reporting_to ?? null,
    reportingManagerId: employeeData.reporting_manager_id ?? null,
    permissions,
  };
  const response = await apiClient.post<ApiResponse>('/employees', payload);
  return response.data;
}

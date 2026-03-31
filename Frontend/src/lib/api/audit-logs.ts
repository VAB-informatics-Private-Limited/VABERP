import apiClient from './client';
import { PaginatedResponse } from '@/types/api';

export interface AuditLog {
  id: number;
  enterprise_id: number;
  user_id?: number;
  user_type?: string;
  user_name?: string;
  entity_type: string;
  entity_id: number;
  action: string;
  description?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_date: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuditLogFromBackend(data: any): AuditLog {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    user_id: data.userId,
    user_type: data.userType,
    user_name: data.userName,
    entity_type: data.entityType,
    entity_id: data.entityId,
    action: data.action,
    description: data.description,
    old_values: data.oldValues,
    new_values: data.newValues,
    created_date: data.createdDate,
  };
}

export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  entityType?: string;
  entityId?: number;
  action?: string;
  fromDate?: string;
  toDate?: string;
  userName?: string;
}): Promise<PaginatedResponse<AuditLog>> {
  const queryParams: Record<string, unknown> = {
    page: params.page,
    limit: params.pageSize,
  };
  if (params.entityType) queryParams.entityType = params.entityType;
  if (params.entityId) queryParams.entityId = params.entityId;
  if (params.action) queryParams.action = params.action;
  if (params.fromDate) queryParams.fromDate = params.fromDate;
  if (params.toDate) queryParams.toDate = params.toDate;
  if (params.userName) queryParams.userName = params.userName;

  const response = await apiClient.get('/audit-logs', { params: queryParams });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapAuditLogFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

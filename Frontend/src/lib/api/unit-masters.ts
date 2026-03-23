import apiClient from './client';
import { ApiResponse } from '@/types/api';
import { UnitMaster, UnitMasterFormData } from '@/types/unit-master';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFromBackend(data: any): UnitMaster {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    unit_name: data.unitName,
    short_name: data.shortName,
    description: data.description,
    sort_order: data.sortOrder,
    is_active: data.isActive,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getUnitMasters(): Promise<ApiResponse<UnitMaster[]>> {
  const response = await apiClient.get('/unit-masters');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapFromBackend),
  };
}

export async function createUnitMaster(data: UnitMasterFormData): Promise<ApiResponse<UnitMaster>> {
  const payload = {
    unitName: data.unit_name,
    shortName: data.short_name,
    description: data.description,
    sortOrder: data.sort_order,
    isActive: data.is_active ?? true,
  };
  const response = await apiClient.post('/unit-masters', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapFromBackend(d.data) : undefined };
}

export async function updateUnitMaster(id: number, data: Partial<UnitMasterFormData>): Promise<ApiResponse<UnitMaster>> {
  const payload: Record<string, unknown> = {};
  if (data.unit_name !== undefined) payload.unitName = data.unit_name;
  if (data.short_name !== undefined) payload.shortName = data.short_name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.sort_order !== undefined) payload.sortOrder = data.sort_order;
  if (data.is_active !== undefined) payload.isActive = data.is_active;
  const response = await apiClient.put(`/unit-masters/${id}`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapFromBackend(d.data) : undefined };
}

export async function deleteUnitMaster(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/unit-masters/${id}`);
  return response.data;
}

export async function seedDefaultUnits(): Promise<ApiResponse> {
  const response = await apiClient.post('/unit-masters/seed-defaults');
  return response.data;
}

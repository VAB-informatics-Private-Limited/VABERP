import apiClient from './client';
import { ApiResponse } from '@/types/api';
import { StageMaster, StageMasterFormData } from '@/types/stage-master';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFromBackend(data: any): StageMaster {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    stage_name: data.stageName,
    description: data.description,
    sort_order: data.sortOrder,
    is_active: data.isActive,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getStageMasters(): Promise<ApiResponse<StageMaster[]>> {
  const response = await apiClient.get('/stage-masters');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapFromBackend),
  };
}

export async function createStageMaster(data: StageMasterFormData): Promise<ApiResponse<StageMaster>> {
  const payload = {
    stageName: data.stage_name,
    description: data.description,
    sortOrder: data.sort_order,
    isActive: data.is_active ?? true,
  };
  const response = await apiClient.post('/stage-masters', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapFromBackend(d.data) : undefined };
}

export async function updateStageMaster(id: number, data: Partial<StageMasterFormData>): Promise<ApiResponse<StageMaster>> {
  const payload: Record<string, unknown> = {};
  if (data.stage_name !== undefined) payload.stageName = data.stage_name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.sort_order !== undefined) payload.sortOrder = data.sort_order;
  if (data.is_active !== undefined) payload.isActive = data.is_active;
  const response = await apiClient.put(`/stage-masters/${id}`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapFromBackend(d.data) : undefined };
}

export async function deleteStageMaster(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/stage-masters/${id}`);
  return response.data;
}

export async function seedDefaultStages(): Promise<ApiResponse> {
  const response = await apiClient.post('/stage-masters/seed-defaults');
  return response.data;
}

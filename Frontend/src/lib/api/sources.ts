import apiClient from './client';
import { ApiResponse } from '@/types/api';
import { Source } from '@/types/source';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSourceFromBackend(data: any): Source {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    source_name: data.sourceName,
    source_code: data.sourceCode,
    is_active: data.isActive,
    sequence_order: data.sequenceOrder,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getSources(_enterpriseId?: number): Promise<ApiResponse<Source[]>> {
  const response = await apiClient.get('/sources');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapSourceFromBackend),
  };
}

export async function addSource(data: {
  enterprise_id?: number;
  source_name: string;
  source_code: string;
  sequence_order?: number;
}): Promise<ApiResponse<Source>> {
  const payload = {
    sourceName: data.source_name,
    sourceCode: data.source_code,
    sequenceOrder: data.sequence_order,
  };
  const response = await apiClient.post('/sources', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapSourceFromBackend(backendData.data) : undefined,
  };
}

export async function updateSource(data: {
  id: number;
  enterprise_id?: number;
  source_name?: string;
  source_code?: string;
  sequence_order?: number;
  is_active?: boolean;
}): Promise<ApiResponse<Source>> {
  const { id, enterprise_id, ...fields } = data;
  // Map snake_case to camelCase for backend
  const payload: Record<string, unknown> = {};
  if (fields.source_name !== undefined) payload.sourceName = fields.source_name;
  if (fields.source_code !== undefined) payload.sourceCode = fields.source_code;
  if (fields.sequence_order !== undefined) payload.sequenceOrder = fields.sequence_order;
  if (fields.is_active !== undefined) payload.isActive = fields.is_active;

  const response = await apiClient.patch(`/sources/${id}`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapSourceFromBackend(backendData.data) : undefined,
  };
}

export async function deleteSource(id: number, _enterpriseId?: number): Promise<ApiResponse<null>> {
  const response = await apiClient.delete(`/sources/${id}`);
  return response.data;
}

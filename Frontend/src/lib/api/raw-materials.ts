import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { RawMaterial, RawMaterialLedger } from '@/types/raw-material';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRawMaterialFromBackend(data: any): RawMaterial {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    material_code: data.materialCode,
    material_name: data.materialName,
    description: data.description,
    category: data.category,
    unit_of_measure: data.unitOfMeasure,
    current_stock: Number(data.currentStock),
    reserved_stock: Number(data.reservedStock),
    available_stock: Number(data.availableStock),
    min_stock_level: Number(data.minStockLevel),
    cost_per_unit: data.costPerUnit ? Number(data.costPerUnit) : null,
    status: data.status,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLedgerFromBackend(data: any): RawMaterialLedger {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    raw_material_id: data.rawMaterialId,
    raw_material_name: data.rawMaterial?.materialName || '',
    raw_material_code: data.rawMaterial?.materialCode || '',
    transaction_type: data.transactionType,
    quantity: Number(data.quantity),
    previous_stock: Number(data.previousStock),
    new_stock: Number(data.newStock),
    reference_type: data.referenceType,
    reference_id: data.referenceId,
    remarks: data.remarks,
    created_by: data.createdBy,
    created_date: data.createdDate,
  };
}

export async function getRawMaterialList(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}): Promise<PaginatedResponse<RawMaterial>> {
  const response = await apiClient.get('/raw-materials', {
    params: {
      page: params?.page,
      limit: params?.pageSize,
      search: params?.search,
      category: params?.category,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapRawMaterialFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

export async function getRawMaterial(id: number): Promise<ApiResponse<RawMaterial & { ledger: RawMaterialLedger[] }>> {
  const response = await apiClient.get(`/raw-materials/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  const material = mapRawMaterialFromBackend(d.data);
  const ledger = (d.data.ledger || []).map(mapLedgerFromBackend);
  return { message: d.message, data: { ...material, ledger } };
}

export async function createRawMaterial(data: {
  material_name: string;
  description?: string;
  category?: string;
  unit_of_measure?: string;
  current_stock?: number;
  min_stock_level?: number;
  cost_per_unit?: number;
}): Promise<ApiResponse<RawMaterial>> {
  const payload = {
    materialName: data.material_name,
    description: data.description,
    category: data.category,
    unitOfMeasure: data.unit_of_measure,
    currentStock: data.current_stock,
    minStockLevel: data.min_stock_level,
    costPerUnit: data.cost_per_unit,
  };
  const response = await apiClient.post('/raw-materials', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapRawMaterialFromBackend(d.data) : undefined };
}

export async function bulkCreateRawMaterials(items: {
  material_name: string;
  description?: string;
  category?: string;
  unit_of_measure?: string;
  current_stock?: number;
  min_stock_level?: number;
  cost_per_unit?: number;
}[]): Promise<ApiResponse<RawMaterial[]>> {
  const payload = {
    items: items.map((d) => ({
      materialName: d.material_name,
      description: d.description,
      category: d.category,
      unitOfMeasure: d.unit_of_measure,
      currentStock: d.current_stock,
      minStockLevel: d.min_stock_level,
      costPerUnit: d.cost_per_unit,
    })),
  };
  const response = await apiClient.post('/raw-materials/bulk', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapRawMaterialFromBackend) };
}

export async function updateRawMaterial(id: number, data: {
  material_name?: string;
  description?: string;
  category?: string;
  unit_of_measure?: string;
  min_stock_level?: number;
  cost_per_unit?: number;
}): Promise<ApiResponse<RawMaterial>> {
  const payload: Record<string, unknown> = {};
  if (data.material_name !== undefined) payload.materialName = data.material_name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.category !== undefined) payload.category = data.category;
  if (data.unit_of_measure !== undefined) payload.unitOfMeasure = data.unit_of_measure;
  if (data.min_stock_level !== undefined) payload.minStockLevel = data.min_stock_level;
  if (data.cost_per_unit !== undefined) payload.costPerUnit = data.cost_per_unit;
  const response = await apiClient.patch(`/raw-materials/${id}`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapRawMaterialFromBackend(d.data) : undefined };
}

export async function deleteRawMaterial(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/raw-materials/${id}`);
  return response.data;
}

export async function adjustStock(id: number, data: {
  type: string;
  quantity: number;
  remarks?: string;
}): Promise<ApiResponse<RawMaterial>> {
  const response = await apiClient.post(`/raw-materials/${id}/stock-adjustment`, data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapRawMaterialFromBackend(d.data) : undefined };
}

export async function getRawMaterialCategories(): Promise<ApiResponse<string[]>> {
  const response = await apiClient.get('/raw-materials/categories');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data };
}

export async function getRawMaterialLedger(params?: {
  page?: number;
  pageSize?: number;
  rawMaterialId?: number;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<RawMaterialLedger>> {
  const response = await apiClient.get('/raw-materials/ledger', {
    params: {
      page: params?.page,
      limit: params?.pageSize,
      rawMaterialId: params?.rawMaterialId,
      transactionType: params?.transactionType,
      startDate: params?.startDate,
      endDate: params?.endDate,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapLedgerFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

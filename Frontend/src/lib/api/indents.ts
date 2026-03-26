import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Indent } from '@/types/indent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIndentFromBackend(data: any): Indent {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    indent_number: data.indentNumber,
    material_request_id: data.materialRequestId,
    material_request_number: data.materialRequest?.requestNumber,
    sales_order_id: data.salesOrderId,
    order_number: data.salesOrder?.orderNumber,
    requested_by: data.requestedBy,
    requested_by_name: data.requestedByEmployee?.firstName
      ? `${data.requestedByEmployee.firstName} ${data.requestedByEmployee.lastName || ''}`.trim()
      : undefined,
    request_date: data.requestDate,
    source: data.source,
    status: data.status,
    notes: data.notes,
    items: data.items?.map((i: any) => ({
      id: i.id,
      indent_id: i.indentId,
      material_request_item_id: i.materialRequestItemId,
      raw_material_id: i.rawMaterialId,
      raw_material_name: i.rawMaterial?.materialName,
      raw_material_code: i.rawMaterial?.materialCode,
      raw_material_category: i.rawMaterial?.category,
      raw_material_subcategory: i.rawMaterial?.subcategory,
      item_name: i.itemName || i.rawMaterial?.materialName,
      required_quantity: Number(i.requiredQuantity),
      available_quantity: Number(i.availableQuantity),
      shortage_quantity: Number(i.shortageQuantity),
      ordered_quantity: Number(i.orderedQuantity),
      received_quantity: Number(i.receivedQuantity),
      unit_of_measure: i.unitOfMeasure || i.rawMaterial?.unitOfMeasure,
      status: i.status,
      notes: i.notes,
    })),
    created_date: data.createdDate,
  };
}

export async function getIndentList(params: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<Indent>> {
  const response = await apiClient.get('/indents', { params: { page: params.page, limit: params.pageSize, status: params.status } });
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapIndentFromBackend), totalRecords: d.totalRecords, page: d.page, limit: d.limit };
}

export async function getIndentById(id: number): Promise<ApiResponse<Indent>> {
  const response = await apiClient.get(`/indents/${id}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function getIndentByMR(mrId: number): Promise<ApiResponse<Indent>> {
  const response = await apiClient.get(`/indents/by-mr/${mrId}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function createIndentFromMR(mrId: number): Promise<ApiResponse<Indent>> {
  const response = await apiClient.post(`/indents/from-mr/${mrId}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function createIndentFromInventory(data: {
  items: { rawMaterialId: number; quantity: number; notes?: string }[];
  notes?: string;
}): Promise<ApiResponse<Indent>> {
  const response = await apiClient.post('/indents/from-inventory', data);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function updateIndentItem(indentId: number, itemId: number, data: { shortageQuantity?: number; notes?: string }): Promise<ApiResponse<Indent>> {
  const response = await apiClient.patch(`/indents/${indentId}/items/${itemId}`, data);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function removeIndentItem(indentId: number, itemId: number): Promise<ApiResponse<Indent>> {
  const response = await apiClient.delete(`/indents/${indentId}/items/${itemId}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function createPOFromIndent(indentId: number, data: {
  supplierId?: number;
  items: { indentItemId: number; quantity: number; unitPrice?: number; taxPercent?: number }[];
  expectedDelivery?: string;
  notes?: string;
}): Promise<ApiResponse> {
  const response = await apiClient.post(`/purchase-orders/from-indent/${indentId}`, data);
  return response.data;
}

export async function receiveIndentGoods(indentId: number, items: { indentItemId: number; receivedQuantity: number }[]): Promise<ApiResponse<Indent>> {
  const response = await apiClient.post(`/indents/${indentId}/receive-goods`, { items });
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

export async function releaseIndentToInventory(indentId: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/indents/${indentId}/release-to-inventory`);
  return response.data;
}

export interface ReleaseAllResult {
  message: string;
  releasedItems: Array<{ name: string; qty: number; unit?: string }>;
  skippedItems: Array<{ name: string; reason: string; shortageQty: number; receivedQty: number; stockAvailable: number }>;
}

export async function releaseAllIndentItems(indentId: number): Promise<ReleaseAllResult> {
  const response = await apiClient.post(`/indents/${indentId}/release-all`);
  const d = response.data as any;
  return {
    message: d.message,
    releasedItems: d.releasedItems || [],
    skippedItems: d.skippedItems || [],
  };
}

export async function cancelIndent(id: number): Promise<ApiResponse<Indent>> {
  const response = await apiClient.post(`/indents/${id}/cancel`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapIndentFromBackend(d.data) : undefined };
}

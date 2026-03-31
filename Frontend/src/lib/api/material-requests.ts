import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { MaterialRequest } from '@/types/material-request';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMRFromBackend(data: any): MaterialRequest {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    job_card_id: data.jobCardId,
    job_card_name: data.jobCard?.jobName,
    job_card_number: data.jobCard?.jobNumber,
    sales_order_id: data.salesOrderId,
    order_number: data.salesOrder?.orderNumber,
    indent_id: data.indentId,
    request_number: data.requestNumber,
    requested_by: data.requestedBy,
    requested_by_name: data.requestedByEmployee?.firstName
      ? `${data.requestedByEmployee.firstName} ${data.requestedByEmployee.lastName || ''}`.trim()
      : undefined,
    request_date: data.requestDate,
    expected_delivery: data.expectedDelivery,
    purpose: data.purpose,
    status: data.status,
    approved_by: data.approvedBy,
    approved_date: data.approvedDate,
    notes: data.notes,
    confirmed_received: data.confirmedReceived,
    confirmed_received_at: data.confirmedReceivedAt,
    items: data.items?.map((i: any) => ({
      id: i.id,
      material_request_id: i.materialRequestId,
      product_id: i.productId,
      product_name: i.product?.productName,
      product_code: i.product?.productCode,
      raw_material_id: i.rawMaterialId,
      raw_material_name: i.rawMaterial?.materialName,
      raw_material_code: i.rawMaterial?.materialCode,
      item_name: i.itemName || i.rawMaterial?.materialName || i.product?.productName,
      quantity_requested: Number(i.quantityRequested),
      quantity_approved: Number(i.quantityApproved),
      quantity_issued: Number(i.quantityIssued),
      available_stock: Number(i.availableStock),
      unit_of_measure: i.unitOfMeasure || i.rawMaterial?.unitOfMeasure || i.product?.unitOfMeasure,
      status: i.status,
      notes: i.notes,
    })),
    created_date: data.createdDate,
  };
}

export async function getMaterialRequestList(params: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<MaterialRequest>> {
  const response = await apiClient.get('/material-requests', { params: { page: params.page, limit: params.pageSize, status: params.status } });
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapMRFromBackend), totalRecords: d.totalRecords, page: d.page, limit: d.limit };
}

export async function getMaterialRequestById(id: number): Promise<ApiResponse<MaterialRequest>> {
  const response = await apiClient.get(`/material-requests/${id}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapMRFromBackend(d.data) : undefined };
}

export async function approveMaterialRequest(id: number, items: { itemId: number; quantityApproved: number; status: string; notes?: string }[]): Promise<ApiResponse<MaterialRequest>> {
  const response = await apiClient.patch(`/material-requests/${id}/approve`, { items });
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapMRFromBackend(d.data) : undefined };
}

export async function issueMaterials(id: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/material-requests/${id}/issue`);
  return response.data;
}

export async function issueSingleItem(mrId: number, itemId: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/material-requests/${mrId}/issue-item/${itemId}`);
  return response.data;
}

export async function issuePartialItem(mrId: number, itemId: number, quantity: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/material-requests/${mrId}/issue-partial/${itemId}`, { quantity });
  return response.data;
}

export async function recheckStock(mrId: number): Promise<ApiResponse<MaterialRequest> & { recheckResult?: { totalRechecked: number; nowAvailable: number; items: { itemName: string; available: number; requested: number }[] } }> {
  const response = await apiClient.post(`/material-requests/${mrId}/recheck`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapMRFromBackend(d.data) : undefined, recheckResult: d.recheckResult };
}

export async function refreshStock(mrId: number): Promise<ApiResponse<MaterialRequest> & { refreshResult?: { totalItems: number; updatedCount: number; updatedItems: { itemName: string; previousStock: number; currentStock: number }[] } }> {
  const response = await apiClient.post(`/material-requests/${mrId}/refresh-stock`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapMRFromBackend(d.data) : undefined, refreshResult: d.refreshResult };
}

export async function confirmMaterialsReceived(id: number): Promise<ApiResponse<MaterialRequest>> {
  const response = await apiClient.post(`/material-requests/${id}/confirm-received`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapMRFromBackend(d.data) : undefined };
}

export async function updateMaterialRequestETA(id: number, expectedDelivery: string): Promise<ApiResponse<MaterialRequest>> {
  const response = await apiClient.patch(`/material-requests/${id}/eta`, { expectedDelivery });
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapMRFromBackend(d.data) : undefined };
}

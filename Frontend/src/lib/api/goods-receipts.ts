import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { GoodsReceipt, GoodsReceiptItem } from '@/types/goods-receipt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGrnItemFromBackend(data: any): GoodsReceiptItem {
  return {
    id: data.id,
    grn_id: data.grnId,
    indent_item_id: data.indentItemId,
    raw_material_id: data.rawMaterialId,
    raw_material_name: data.rawMaterial?.materialName,
    item_name: data.itemName,
    unit_of_measure: data.unitOfMeasure,
    expected_qty: Number(data.expectedQty || 0),
    shortage_qty: data.shortageQty !== null && data.shortageQty !== undefined ? Number(data.shortageQty) : null,
    confirmed_qty: Number(data.confirmedQty || 0),
    accepted_qty: Number(data.acceptedQty || 0),
    rejected_qty: Number(data.rejectedQty || 0),
    rejection_reason: data.rejectionReason,
    status: data.status || 'pending',
    rtv_status: data.rtvStatus ?? null,
    notes: data.notes,
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGrnFromBackend(data: any): GoodsReceipt {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    grn_number: data.grnNumber,
    indent_id: data.indentId,
    indent_number: data.indent?.indentNumber,
    po_number: data.poNumber,
    supplier_name: data.supplierName,
    supplier_id: data.supplierId,
    status: data.status || 'pending',
    released_by: data.releasedBy,
    released_by_name: data.releasedByEmployee
      ? `${data.releasedByEmployee.firstName} ${data.releasedByEmployee.lastName || ''}`.trim()
      : undefined,
    received_by: data.receivedBy,
    received_by_name: data.receivedByEmployee
      ? `${data.receivedByEmployee.firstName} ${data.receivedByEmployee.lastName || ''}`.trim()
      : undefined,
    received_date: data.receivedDate,
    notes: data.notes,
    items: data.items?.map(mapGrnItemFromBackend),
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getGoodReceiptList(params: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<GoodsReceipt>> {
  const response = await apiClient.get('/goods-receipts', {
    params: { status: params.status, page: params.page, limit: params.limit || 20 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapGrnFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

export async function getGoodsReceiptById(id: number): Promise<ApiResponse<GoodsReceipt>> {
  const response = await apiClient.get(`/goods-receipts/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: d.data ? mapGrnFromBackend(d.data) : undefined,
  };
}

export async function confirmGoodsReceipt(
  id: number,
  payload: {
    receivedBy: number;
    items: {
      grnItemId: number;
      confirmedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      rejectionReason?: string;
      notes?: string;
    }[];
    notes?: string;
  },
): Promise<ApiResponse<GoodsReceipt>> {
  const response = await apiClient.post(`/goods-receipts/${id}/confirm`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: d.data ? mapGrnFromBackend(d.data) : undefined,
  };
}

export async function rejectGoodsReceipt(
  id: number,
  notes?: string,
): Promise<ApiResponse> {
  const response = await apiClient.post(`/goods-receipts/${id}/reject`, { notes });
  return response.data;
}

export async function markGrnItemReturned(
  grnId: number,
  itemId: number,
): Promise<ApiResponse<GoodsReceipt>> {
  const response = await apiClient.patch(`/goods-receipts/${grnId}/items/${itemId}/mark-returned`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: d.data ? mapGrnFromBackend(d.data) : undefined,
  };
}

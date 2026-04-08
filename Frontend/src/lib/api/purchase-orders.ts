import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { PurchaseOrder } from '@/types/purchase-order';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPOFromBackend(data: any): PurchaseOrder {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    material_request_id: data.materialRequestId,
    indent_id: data.indentId,
    supplier_id: data.supplierId,
    po_number: data.poNumber,
    supplier_name: data.supplierName,
    supplier_contact: data.supplierContact,
    supplier_email: data.supplierEmail,
    supplier_address: data.supplierAddress,
    order_date: data.orderDate,
    expected_delivery: data.expectedDelivery,
    sub_total: Number(data.subTotal),
    tax_amount: Number(data.taxAmount),
    grand_total: Number(data.grandTotal),
    status: data.status,
    approved_by: data.approvedBy,
    approved_date: data.approvedDate,
    notes: data.notes,
    items: data.items?.map((i: any) => ({
      id: i.id,
      purchase_order_id: i.purchaseOrderId,
      product_id: i.productId,
      raw_material_id: i.rawMaterialId,
      indent_item_id: i.indentItemId,
      item_name: i.itemName,
      quantity: i.quantity,
      quantity_received: i.quantityReceived,
      unit_of_measure: i.unitOfMeasure,
      unit_price: Number(i.unitPrice),
      tax_percent: Number(i.taxPercent),
      line_total: Number(i.lineTotal),
      sort_order: i.sortOrder,
    })),
    created_date: data.createdDate,
  };
}

export async function getPurchaseOrderList(params: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<PurchaseOrder>> {
  const response = await apiClient.get('/purchase-orders', { params: { page: params.page, limit: params.pageSize, status: params.status } });
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapPOFromBackend), totalRecords: d.totalRecords, page: d.page, limit: d.limit };
}

export async function getPurchaseOrderById(id: number): Promise<ApiResponse<PurchaseOrder>> {
  const response = await apiClient.get(`/purchase-orders/${id}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapPOFromBackend(d.data) : undefined };
}

export async function approvePurchaseOrder(id: number): Promise<ApiResponse> {
  const response = await apiClient.patch(`/purchase-orders/${id}/approve`);
  return response.data;
}

export async function receivePurchaseOrder(id: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/purchase-orders/${id}/receive`);
  return response.data;
}

export async function updatePOExpectedDelivery(id: number, expectedDelivery: string): Promise<ApiResponse<PurchaseOrder>> {
  const response = await apiClient.patch(`/sales-orders/${id}/eta`, { expectedDelivery });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapPOFromBackend(d.data) : undefined };
}

export async function deletePurchaseOrder(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/purchase-orders/${id}`);
  return response.data;
}

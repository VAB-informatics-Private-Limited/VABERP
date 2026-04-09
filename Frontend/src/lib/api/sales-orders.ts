import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { SalesOrder, SalesOrderVersion } from '@/types/sales-order';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSOVersionFromBackend(v: any): SalesOrderVersion {
  return {
    id: v.id,
    sales_order_id: v.salesOrderId,
    version_number: v.versionNumber,
    snapshot: v.snapshot,
    change_summary: v.changeSummary,
    change_notes: v.changeNotes,
    changed_by: v.changedBy,
    changed_by_name: v.changedByEmployee
      ? `${v.changedByEmployee.firstName || ''} ${v.changedByEmployee.lastName || ''}`.trim()
      : undefined,
    changed_at: v.changedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSOFromBackend(data: any): SalesOrder {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    customer_id: data.customerId,
    quotation_id: data.quotationId,
    enquiry_id: data.enquiryId,
    order_number: data.orderNumber,
    order_date: data.orderDate,
    expected_delivery: data.expectedDelivery,
    customer_name: data.customerName,
    billing_address: data.billingAddress,
    shipping_address: data.shippingAddress,
    sub_total: Number(data.subTotal),
    discount_amount: Number(data.discountAmount),
    tax_amount: Number(data.taxAmount),
    grand_total: Number(data.grandTotal),
    invoiced_amount: Number(data.invoicedAmount || 0),
    remaining_amount: Number(data.grandTotal) - Number(data.invoicedAmount || 0),
    total_paid: Number(data.totalPaid || 0),
    notes: data.notes,
    delay_note: data.delayNote || null,
    hold_reason: data.holdReason || undefined,
    hold_acknowledged: data.holdAcknowledged || false,
    status: data.status,
    under_verification_at: data.underVerificationAt || null,
    sent_to_manufacturing: data.sentToManufacturing || false,
    current_version: data.currentVersion || 1,
    updated_by: data.updatedBy,
    items: data.items?.map((item: any) => ({
      id: item.id,
      sales_order_id: item.salesOrderId,
      product_id: item.productId,
      item_name: item.itemName,
      description: item.description,
      quantity: item.quantity,
      unit_of_measure: item.unitOfMeasure,
      unit_price: Number(item.unitPrice),
      tax_percent: Number(item.taxPercent),
      tax_amount: Number(item.taxAmount),
      line_total: Number(item.lineTotal),
      sort_order: item.sortOrder,
    })),
    versions: data.versions?.map(mapSOVersionFromBackend),
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getSalesOrderList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedResponse<SalesOrder>> {
  const response = await apiClient.get('/sales-orders', {
    params: { page: params.page, limit: params.pageSize, search: params.search, status: params.status },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapSOFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

export async function getSalesOrderById(id: number): Promise<ApiResponse<SalesOrder>> {
  const response = await apiClient.get(`/sales-orders/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSOFromBackend(d.data) : undefined };
}

export async function createSalesOrderFromQuotation(quotationId: number): Promise<ApiResponse<SalesOrder>> {
  const response = await apiClient.post(`/sales-orders/from-quotation/${quotationId}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSOFromBackend(d.data) : undefined };
}

export async function acknowledgeHold(soId: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/sales-orders/${soId}/acknowledge-hold`);
  return response.data;
}

export async function sendToManufacturing(soId: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/sales-orders/${soId}/send-to-manufacturing`);
  return response.data;
}

export async function createInvoiceFromSO(
  soId: number,
  data: { amount: number; invoiceDate?: string; notes?: string; paymentMethod?: string },
): Promise<ApiResponse> {
  const response = await apiClient.post(`/sales-orders/${soId}/create-invoice`, data);
  return response.data;
}

export async function updateSOStatus(id: number, status: string, reason?: string): Promise<ApiResponse<SalesOrder>> {
  const response = await apiClient.put(`/sales-orders/${id}/status`, { status, reason });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSOFromBackend(d.data) : undefined };
}

export async function updateSOETA(id: number, expectedDelivery: string): Promise<ApiResponse<SalesOrder>> {
  const response = await apiClient.patch(`/sales-orders/${id}/eta`, { expectedDelivery });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSOFromBackend(d.data) : undefined };
}

export async function updateSalesOrder(
  id: number,
  data: {
    expectedDelivery?: string;
    billingAddress?: string;
    shippingAddress?: string;
    notes?: string;
    items: {
      productId?: number;
      itemName: string;
      description?: string;
      quantity: number;
      unitOfMeasure?: string;
      unitPrice: number;
      taxPercent?: number;
      sortOrder?: number;
    }[];
    changeNotes?: string;
  },
): Promise<ApiResponse<SalesOrder>> {
  const response = await apiClient.put(`/sales-orders/${id}`, data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSOFromBackend(d.data) : undefined };
}

export async function deleteSalesOrder(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/sales-orders/${id}`);
  return response.data;
}

export async function reportSODelay(id: number, delayNote: string): Promise<ApiResponse<SalesOrder>> {
  const response = await apiClient.patch(`/sales-orders/${id}/delay`, { delayNote });
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSOFromBackend(d.data) : undefined };
}

import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Quotation, QuotationFormData, QuotationListParams, QuotationItem, QuotationVersion } from '@/types/quotation';

// Helper functions to map backend camelCase to frontend snake_case

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuotationVersionFromBackend(data: any): QuotationVersion {
  return {
    id: data.id,
    quotation_id: data.quotationId,
    version_number: data.versionNumber,
    snapshot: data.snapshot, // JSONB — already the right shape, no mapping needed
    changed_by: data.changedBy,
    changed_by_name: data.changedByEmployee
      ? `${data.changedByEmployee.firstName} ${data.changedByEmployee.lastName || ''}`.trim()
      : undefined,
    change_notes: data.changeNotes,
    changed_at: data.changedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuotationItemFromBackend(data: any): QuotationItem {
  return {
    id: data.id,
    product_id: data.productId,
    product_name: data.itemName || data.product?.productName,
    product_code: data.product?.productCode,
    description: data.description,
    hsn_code: data.hsnCode,
    unit: data.unitOfMeasure,
    quantity: data.quantity,
    unit_price: data.unitPrice,
    discount_percent: data.discountPercent,
    discount_amount: data.discountAmount,
    tax_percent: data.taxPercent,
    tax_amount: data.taxAmount,
    total_amount: data.lineTotal,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuotationFromBackend(data: any): Quotation {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    quotation_number: data.quotationNumber,
    enquiry_id: data.enquiryId,
    customer_id: data.customerId,
    customer_name: data.customerName,
    customer_mobile: data.mobile,
    customer_email: data.email,
    business_name: data.businessName,
    billing_address: data.billingAddress,
    shipping_address: data.shippingAddress,
    quotation_date: data.quotationDate,
    valid_until: data.validUntil,
    expected_delivery: data.expectedDelivery,
    subtotal: Number(data.subTotal || 0),
    discount_amount: Number(data.discountAmount || 0),
    tax_amount: data.taxAmount,
    total_amount: data.grandTotal,
    notes: data.notes,
    terms_conditions: data.termsConditions,
    status: data.status || 'draft',
    created_by: data.createdBy,
    created_by_name: data.createdByEmployee?.firstName
      ? `${data.createdByEmployee.firstName} ${data.createdByEmployee.lastName || ''}`.trim()
      : undefined,
    updated_by: data.updatedBy,
    updated_by_name: data.updatedByEmployee?.firstName
      ? `${data.updatedByEmployee.firstName} ${data.updatedByEmployee.lastName || ''}`.trim()
      : undefined,
    current_version: data.currentVersion ?? 1,
    is_locked: data.isLocked ?? false,
    sales_order_id: data.salesOrderId ?? null,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
    items: data.items?.map(mapQuotationItemFromBackend),
    versions: data.versions?.map(mapQuotationVersionFromBackend),
  };
}

export async function getQuotationList(params: QuotationListParams): Promise<PaginatedResponse<Quotation>> {
  const response = await apiClient.get<PaginatedResponse<Quotation>>('/quotations', {
    params: {
      page: params.page,
      limit: params.pageSize,
      search: params.customerName || params.quotationNumber,
      status: params.status,
      fromDate: params.startDate,
      toDate: params.endDate,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapQuotationFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getQuotationById(id: number, _enterpriseId?: number): Promise<ApiResponse<Quotation>> {
  const response = await apiClient.get<ApiResponse<Quotation>>(`/quotations/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapQuotationFromBackend(backendData.data) : undefined,
  };
}

export async function checkQuotationMobile(mobile: string): Promise<{ exists: boolean; quotationNumber?: string; customerName?: string }> {
  const response = await apiClient.get('/quotations/check-mobile', { params: { mobile } });
  return (response.data as any);
}

export async function addQuotation(
  data: QuotationFormData & { enterprise_id?: number; created_by?: number }
): Promise<ApiResponse<{ id: number; quotation_number: string }>> {
  // Map items from snake_case to camelCase
  const items = data.items.map(item => ({
    productId: item.product_id,
    itemName: item.product_name || 'Product',
    description: item.description,
    hsnCode: item.hsn_code,
    quantity: item.quantity,
    unitOfMeasure: item.unit,
    unitPrice: item.unit_price,
    discountPercent: item.discount_percent,
    taxPercent: item.tax_percent,
  }));

  const payload = {
    enquiryId: data.enquiry_id,
    customerId: data.customer_id,
    customerName: data.customer_name,
    email: data.customer_email,
    mobile: data.customer_mobile,
    billingAddress: data.billing_address,
    shippingAddress: data.shipping_address,
    quotationDate: data.quotation_date,
    validUntil: data.valid_until,
    notes: data.notes,
    termsConditions: data.terms_conditions,
    status: data.status,
    items,
  };
  const response = await apiClient.post<ApiResponse<{ id: number; quotation_number: string }>>(
    '/quotations',
    payload
  );
  return response.data;
}

export async function updateQuotation(
  data: QuotationFormData & { id: number; enterprise_id?: number; change_notes?: string }
): Promise<ApiResponse> {
  const { id } = data;
  // Map items from snake_case to camelCase
  const items = data.items.map(item => ({
    productId: item.product_id,
    itemName: item.product_name || 'Product',
    description: item.description,
    hsnCode: item.hsn_code,
    quantity: item.quantity,
    unitOfMeasure: item.unit,
    unitPrice: item.unit_price,
    discountPercent: item.discount_percent,
    taxPercent: item.tax_percent,
  }));

  const payload = {
    enquiryId: data.enquiry_id,
    customerId: data.customer_id,
    customerName: data.customer_name,
    email: data.customer_email,
    mobile: data.customer_mobile,
    billingAddress: data.billing_address,
    shippingAddress: data.shipping_address,
    quotationDate: data.quotation_date,
    validUntil: data.valid_until,
    notes: data.notes,
    termsConditions: data.terms_conditions,
    status: data.status,
    changeNotes: data.change_notes,
    items,
  };
  const response = await apiClient.put<ApiResponse>(`/quotations/${id}`, payload);
  return response.data;
}

export async function updateQuotationStatus(
  id: number,
  status: string,
  _enterpriseId?: number,
  rejectionReason?: string,
): Promise<ApiResponse> {
  const response = await apiClient.put<ApiResponse>(`/quotations/${id}/status`, { status, rejectionReason });
  return response.data;
}

export async function deleteQuotation(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/quotations/${id}`);
  return response.data;
}

export async function updateQuotationETA(id: number, expectedDelivery: string): Promise<ApiResponse<Quotation>> {
  const response = await apiClient.patch(`/quotations/${id}/eta`, { expectedDelivery });
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapQuotationFromBackend(d.data) : undefined };
}

export async function duplicateQuotation(id: number, _enterpriseId?: number): Promise<ApiResponse<Quotation>> {
  const response = await apiClient.post<ApiResponse<Quotation>>(`/quotations/${id}/duplicate`);
  return response.data;
}

export async function acceptQuotation(id: number): Promise<ApiResponse<Quotation>> {
  const response = await apiClient.post<ApiResponse<Quotation>>(`/quotations/${id}/accept`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapQuotationFromBackend(backendData.data) : undefined,
  };
}

export async function generateQuotationPDF(id: number, _enterpriseId?: number): Promise<Blob> {
  const response = await apiClient.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
  return response.data;
}

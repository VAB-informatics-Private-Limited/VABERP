import apiClient from './client';
import { ProformaInvoice, ProformaInvoiceItem } from '@/types/proforma-invoice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPIItemFromBackend(data: any): ProformaInvoiceItem {
  return {
    id: data.id,
    pi_id: data.piId,
    product_id: data.productId ?? null,
    item_name: data.itemName,
    hsn_code: data.hsnCode ?? null,
    quantity: Number(data.quantity),
    unit_price: Number(data.unitPrice),
    discount_percent: Number(data.discountPercent || 0),
    tax_percent: Number(data.taxPercent || 0),
    tax_amount: Number(data.taxAmount || 0),
    line_total: Number(data.lineTotal || 0),
    sort_order: data.sortOrder ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPIFromBackend(data: any): ProformaInvoice {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    quotation_id: data.quotationId ?? null,
    customer_id: data.customerId ?? null,
    pi_number: data.piNumber,
    pi_date: data.piDate,
    customer_name: data.customerName,
    email: data.email ?? null,
    mobile: data.mobile ?? null,
    billing_address: data.billingAddress ?? null,
    shipping_address: data.shippingAddress ?? null,
    sub_total: Number(data.subTotal || 0),
    discount_type: data.discountType ?? null,
    discount_value: Number(data.discountValue || 0),
    discount_amount: Number(data.discountAmount || 0),
    tax_amount: Number(data.taxAmount || 0),
    shipping_charges: Number(data.shippingCharges || 0),
    grand_total: Number(data.grandTotal || 0),
    notes: data.notes ?? null,
    terms_conditions: data.termsConditions ?? null,
    status: data.status || 'draft',
    sales_order_id: data.salesOrderId ?? null,
    created_by: data.createdBy ?? null,
    created_by_name: data.createdByEmployee
      ? `${data.createdByEmployee.firstName} ${data.createdByEmployee.lastName || ''}`.trim()
      : null,
    items: data.items ? data.items.map(mapPIItemFromBackend) : undefined,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export interface GetProformaInvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export async function getProformaInvoices(params: GetProformaInvoicesParams = {}) {
  const queryParams: Record<string, string | number> = {};
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  if (params.search) queryParams.search = params.search;
  if (params.status) queryParams.status = params.status;

  const response = await apiClient.get('/proforma-invoices', { params: queryParams });
  const result = response.data;
  return {
    ...result,
    data: result.data ? result.data.map(mapPIFromBackend) : [],
  };
}

export async function getProformaInvoiceById(id: number) {
  const response = await apiClient.get(`/proforma-invoices/${id}`);
  return {
    ...response.data,
    data: mapPIFromBackend(response.data.data),
  };
}

export async function createPIFromQuotation(quotationId: number) {
  const response = await apiClient.post(`/proforma-invoices/from-quotation/${quotationId}`);
  return {
    ...response.data,
    data: mapPIFromBackend(response.data.data),
  };
}

export async function updatePIStatus(id: number, status: string) {
  const response = await apiClient.patch(`/proforma-invoices/${id}/status`, { status });
  return {
    ...response.data,
    data: mapPIFromBackend(response.data.data),
  };
}

export async function convertPIToSalesOrder(piId: number) {
  const response = await apiClient.post(`/proforma-invoices/${piId}/convert-to-sales-order`);
  return {
    ...response.data,
    data: mapPIFromBackend(response.data.data),
  };
}

export async function deleteProformaInvoice(id: number) {
  const response = await apiClient.delete(`/proforma-invoices/${id}`);
  return response.data;
}

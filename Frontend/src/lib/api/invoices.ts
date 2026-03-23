import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Invoice, InvoiceListParams, PaymentFormData, Payment } from '@/types/invoice';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaymentFromBackend(data: any): Payment {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    invoice_id: data.invoiceId,
    payment_number: data.paymentNumber,
    payment_date: data.paymentDate,
    amount: Number(data.amount),
    payment_method: data.paymentMethod,
    reference_number: data.referenceNumber,
    notes: data.notes,
    received_by: data.receivedBy,
    received_by_name: data.receivedByEmployee?.firstName
      ? `${data.receivedByEmployee.firstName} ${data.receivedByEmployee.lastName || ''}`.trim()
      : undefined,
    status: data.status,
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvoiceFromBackend(data: any): Invoice {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    customer_id: data.customerId,
    quotation_id: data.quotationId,
    sales_order_id: data.salesOrderId,
    invoice_number: data.invoiceNumber,
    invoice_date: data.invoiceDate,
    due_date: data.dueDate,
    customer_name: data.customerName,
    billing_address: data.billingAddress,
    sub_total: Number(data.subTotal),
    discount_type: data.discountType,
    discount_value: Number(data.discountValue),
    discount_amount: Number(data.discountAmount),
    tax_amount: Number(data.taxAmount),
    shipping_charges: Number(data.shippingCharges),
    grand_total: Number(data.grandTotal),
    total_paid: Number(data.totalPaid),
    balance_due: Number(data.balanceDue),
    terms_conditions: data.termsConditions,
    notes: data.notes,
    status: data.status,
    created_by: data.createdBy,
    created_by_name: data.createdByEmployee?.firstName
      ? `${data.createdByEmployee.firstName} ${data.createdByEmployee.lastName || ''}`.trim()
      : undefined,
    items: data.items?.map((item: any) => ({
      id: item.id,
      invoice_id: item.invoiceId,
      product_id: item.productId,
      item_name: item.itemName,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit_of_measure: item.unitOfMeasure,
      unit_price: Number(item.unitPrice),
      discount_percent: Number(item.discountPercent),
      tax_percent: Number(item.taxPercent),
      tax_amount: Number(item.taxAmount),
      line_total: Number(item.lineTotal),
      sort_order: item.sortOrder,
    })),
    payments: data.payments?.map(mapPaymentFromBackend),
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getInvoiceList(params: InvoiceListParams): Promise<PaginatedResponse<Invoice>> {
  const queryParams: Record<string, unknown> = {
    page: params.page,
    limit: params.pageSize,
  };
  if (params.search) queryParams.search = params.search;
  if (params.status) queryParams.status = params.status;
  if (params.customerId) queryParams.customerId = params.customerId;
  if (params.startDate) queryParams.fromDate = params.startDate;
  if (params.endDate) queryParams.toDate = params.endDate;

  const response = await apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params: queryParams });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapInvoiceFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getInvoiceById(id: number): Promise<ApiResponse<Invoice>> {
  const response = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInvoiceFromBackend(backendData.data) : undefined,
  };
}

export async function createInvoice(data: any): Promise<ApiResponse<Invoice>> {
  const payload = {
    customerId: data.customer_id,
    quotationId: data.quotation_id,
    salesOrderId: data.sales_order_id,
    customerName: data.customer_name,
    billingAddress: data.billing_address,
    invoiceDate: data.invoice_date,
    dueDate: data.due_date,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    shippingCharges: data.shipping_charges,
    termsConditions: data.terms_conditions,
    notes: data.notes,
    items: (data.items || []).map((item: any) => ({
      productId: item.product_id,
      itemName: item.item_name,
      description: item.description,
      hsnCode: item.hsn_code,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure,
      unitPrice: item.unit_price,
      discountPercent: item.discount_percent,
      taxPercent: item.tax_percent,
      sortOrder: item.sort_order,
    })),
  };
  const response = await apiClient.post<ApiResponse>('/invoices', payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInvoiceFromBackend(backendData.data) : undefined,
  };
}

export async function createInvoiceFromQuotation(quotationId: number): Promise<ApiResponse<Invoice>> {
  const response = await apiClient.post<ApiResponse>(`/invoices/from-quotation/${quotationId}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInvoiceFromBackend(backendData.data) : undefined,
  };
}

export async function updateInvoice(id: number, data: any): Promise<ApiResponse<Invoice>> {
  const payload = {
    customerName: data.customer_name,
    billingAddress: data.billing_address,
    invoiceDate: data.invoice_date,
    dueDate: data.due_date,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    shippingCharges: data.shipping_charges,
    termsConditions: data.terms_conditions,
    notes: data.notes,
    items: data.items?.map((item: any) => ({
      productId: item.product_id,
      itemName: item.item_name,
      description: item.description,
      hsnCode: item.hsn_code,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure,
      unitPrice: item.unit_price,
      discountPercent: item.discount_percent,
      taxPercent: item.tax_percent,
      sortOrder: item.sort_order,
    })),
  };
  const response = await apiClient.put<ApiResponse>(`/invoices/${id}`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInvoiceFromBackend(backendData.data) : undefined,
  };
}

export async function deleteInvoice(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/invoices/${id}`);
  return response.data;
}

export async function recordPayment(invoiceId: number, data: PaymentFormData): Promise<ApiResponse<Invoice>> {
  const payload = {
    amount: data.amount,
    paymentMethod: data.payment_method,
    paymentDate: data.payment_date,
    referenceNumber: data.reference_number,
    notes: data.notes,
  };
  const response = await apiClient.post<ApiResponse>(`/invoices/${invoiceId}/payments`, payload);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInvoiceFromBackend(backendData.data) : undefined,
  };
}

export async function getPaymentHistory(invoiceId: number): Promise<ApiResponse<Payment[]>> {
  const response = await apiClient.get<ApiResponse>(`/invoices/${invoiceId}/payments`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapPaymentFromBackend),
  };
}

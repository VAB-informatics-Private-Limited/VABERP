import apiClient from './client';
import type { ServiceProduct, CreateServiceProductPayload, ServiceRevenueSummary } from '@/types/service-product';
import type { ProductType } from '@/types/product-type';

function mapProductType(pt: any): ProductType {
  return {
    id: pt.id,
    enterprise_id: pt.enterpriseId ?? pt.enterprise_id,
    name: pt.name,
    warranty_months: pt.warrantyMonths ?? pt.warranty_months ?? 12,
    description: pt.description ?? null,
    status: pt.status ?? 'active',
    service_rules: (pt.serviceRules ?? pt.service_rules ?? []).map((r: any) => ({
      id: r.id,
      product_type_id: r.productTypeId ?? r.product_type_id,
      day_offset: r.dayOffset ?? r.day_offset,
      event_type: r.eventType ?? r.event_type,
      title: r.title,
      description: r.description ?? null,
      price: r.price != null ? parseFloat(r.price) : null,
      is_active: r.isActive ?? r.is_active ?? true,
    })),
    created_date: pt.createdDate ?? pt.created_date,
    modified_date: pt.modifiedDate ?? pt.modified_date,
  };
}

function mapServiceEvent(ev: any) {
  return {
    id: ev.id,
    enterprise_id: ev.enterpriseId ?? ev.enterprise_id,
    service_product_id: ev.serviceProductId ?? ev.service_product_id,
    rule_id: ev.ruleId ?? ev.rule_id ?? null,
    due_date: ev.dueDate ?? ev.due_date,
    event_type: ev.eventType ?? ev.event_type,
    title: ev.title,
    description: ev.description ?? null,
    price: ev.price != null ? parseFloat(ev.price) : null,
    status: ev.status ?? 'pending',
    reminder_count: ev.reminderCount ?? ev.reminder_count ?? 0,
    last_reminder_at: ev.lastReminderAt ?? ev.last_reminder_at ?? null,
    created_date: ev.createdDate ?? ev.created_date,
    modified_date: ev.modifiedDate ?? ev.modified_date,
  };
}

function mapServiceBooking(b: any) {
  return {
    id: b.id,
    enterprise_id: b.enterpriseId ?? b.enterprise_id,
    service_product_id: b.serviceProductId ?? b.service_product_id,
    service_event_id: b.serviceEventId ?? b.service_event_id ?? null,
    scheduled_date: b.scheduledDate ?? b.scheduled_date,
    scheduled_slot: b.scheduledSlot ?? b.scheduled_slot ?? null,
    status: b.status ?? 'pending',
    technician_id: b.technicianId ?? b.technician_id ?? null,
    service_charge: b.serviceCharge ?? b.service_charge ?? 0,
    payment_status: b.paymentStatus ?? b.payment_status ?? 'unpaid',
    payment_method: b.paymentMethod ?? b.payment_method ?? null,
    notes: b.notes ?? null,
    completed_at: b.completedAt ?? b.completed_at ?? null,
    completion_notes: b.completionNotes ?? b.completion_notes ?? null,
    created_by: b.createdBy ?? b.created_by ?? null,
    created_date: b.createdDate ?? b.created_date,
    modified_date: b.modifiedDate ?? b.modified_date,
  };
}

function mapServiceProduct(sp: any): ServiceProduct {
  return {
    id: sp.id,
    enterprise_id: sp.enterpriseId ?? sp.enterprise_id,
    customer_id: sp.customerId ?? sp.customer_id ?? null,
    product_id: sp.productId ?? sp.product_id ?? null,
    product_type_id: sp.productTypeId ?? sp.product_type_id ?? null,
    job_card_id: sp.jobCardId ?? sp.job_card_id ?? null,
    serial_number: sp.serialNumber ?? sp.serial_number ?? null,
    model_number: sp.modelNumber ?? sp.model_number ?? null,
    dispatch_date: sp.dispatchDate ?? sp.dispatch_date,
    warranty_start_date: sp.warrantyStartDate ?? sp.warranty_start_date ?? null,
    warranty_end_date: sp.warrantyEndDate ?? sp.warranty_end_date ?? null,
    status: sp.status ?? 'active',
    customer_name: sp.customerName ?? sp.customer_name ?? null,
    customer_mobile: sp.customerMobile ?? sp.customer_mobile ?? null,
    customer_address: sp.customerAddress ?? sp.customer_address ?? null,
    notes: sp.notes ?? null,
    created_by: sp.createdBy ?? sp.created_by ?? null,
    product_type: sp.productType ? mapProductType(sp.productType) : null,
    service_events: (sp.serviceEvents ?? sp.service_events ?? []).map(mapServiceEvent),
    service_bookings: (sp.serviceBookings ?? sp.service_bookings ?? []).map(mapServiceBooking),
    created_date: sp.createdDate ?? sp.created_date,
    modified_date: sp.modifiedDate ?? sp.modified_date,
  };
}

export const getServiceProducts = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  productTypeId?: number;
}) =>
  apiClient.get('/service-products', { params }).then((r) => ({
    data: (r.data.data ?? []).map(mapServiceProduct) as ServiceProduct[],
    totalRecords: r.data.totalRecords ?? 0,
    page: r.data.page ?? 1,
  }));

export const getServiceProduct = (id: number) =>
  apiClient.get(`/service-products/${id}`).then((r) => ({
    data: mapServiceProduct(r.data.data),
  }));

export const createServiceProduct = (payload: CreateServiceProductPayload) =>
  apiClient.post('/service-products', payload).then((r) => ({
    data: mapServiceProduct(r.data.data),
  }));

export const updateServiceProduct = (id: number, payload: Partial<CreateServiceProductPayload> & { status?: string; productTypeId?: number }) =>
  apiClient.put(`/service-products/${id}`, payload).then((r) => ({
    data: mapServiceProduct(r.data.data),
  }));

export const deleteServiceProduct = (id: number) =>
  apiClient.delete(`/service-products/${id}`).then((r) => r.data);

export const getRevenueSummary = () =>
  apiClient.get('/service-products/revenue-summary').then((r) => r.data.data as ServiceRevenueSummary);

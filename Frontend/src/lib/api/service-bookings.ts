import apiClient from './client';
import type { ServiceBooking, CreateServiceBookingPayload } from '@/types/service-booking';

function mapServiceBooking(b: any): ServiceBooking {
  return {
    id: b.id,
    enterprise_id: b.enterpriseId ?? b.enterprise_id,
    service_product_id: b.serviceProductId ?? b.service_product_id,
    service_event_id: b.serviceEventId ?? b.service_event_id ?? null,
    scheduled_date: b.scheduledDate ?? b.scheduled_date,
    scheduled_slot: b.scheduledSlot ?? b.scheduled_slot ?? null,
    status: b.status,
    technician_id: b.technicianId ?? b.technician_id ?? null,
    service_charge: parseFloat(b.serviceCharge ?? b.service_charge ?? 0),
    payment_status: b.paymentStatus ?? b.payment_status ?? 'unpaid',
    payment_method: b.paymentMethod ?? b.payment_method ?? null,
    notes: b.notes ?? null,
    completed_at: b.completedAt ?? b.completed_at ?? null,
    completion_notes: b.completionNotes ?? b.completion_notes ?? null,
    created_by: b.createdBy ?? b.created_by ?? null,
    service_product: b.serviceProduct ?? b.service_product,
    service_event: b.serviceEvent ?? b.service_event,
    technician: b.technician,
    created_date: b.createdDate ?? b.created_date,
    modified_date: b.modifiedDate ?? b.modified_date,
  };
}

export const getServiceBookings = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  technicianId?: number;
  fromDate?: string;
  toDate?: string;
}) =>
  apiClient.get('/service-bookings', { params }).then((r) => ({
    data: (r.data.data ?? []).map(mapServiceBooking) as ServiceBooking[],
    totalRecords: r.data.totalRecords ?? 0,
    page: r.data.page ?? 1,
  }));

export const getServiceBooking = (id: number) =>
  apiClient.get(`/service-bookings/${id}`).then((r) => ({
    data: mapServiceBooking(r.data.data),
  }));

export const createServiceBooking = (payload: CreateServiceBookingPayload) =>
  apiClient.post('/service-bookings', payload).then((r) => ({
    data: mapServiceBooking(r.data.data),
  }));

export const assignTechnician = (id: number, payload: { technicianId: number; scheduledSlot?: string }) =>
  apiClient.patch(`/service-bookings/${id}/assign-technician`, payload).then((r) => ({
    data: mapServiceBooking(r.data.data),
  }));

export const completeBooking = (
  id: number,
  payload: { completionNotes?: string; serviceCharge?: number; paymentMethod?: string; paymentStatus?: string },
) =>
  apiClient.patch(`/service-bookings/${id}/complete`, payload).then((r) => ({
    data: mapServiceBooking(r.data.data),
  }));

export const cancelBooking = (id: number) =>
  apiClient.patch(`/service-bookings/${id}/cancel`).then((r) => r.data);

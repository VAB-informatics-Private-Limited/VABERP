import type { ServiceProduct } from './service-product';
import type { ServiceEvent } from './service-event';

export type ServiceBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceBooking {
  id: number;
  enterprise_id: number;
  service_product_id: number;
  service_event_id: number | null;
  scheduled_date: string;
  scheduled_slot: string | null;
  status: ServiceBookingStatus;
  technician_id: number | null;
  service_charge: number;
  payment_status: 'unpaid' | 'paid' | 'waived';
  payment_method: string | null;
  notes: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_by: number | null;
  service_product?: ServiceProduct;
  service_event?: ServiceEvent;
  technician?: { id: number; name: string };
  created_date: string;
  modified_date: string;
}

export interface CreateServiceBookingPayload {
  serviceProductId: number;
  serviceEventId?: number;
  scheduledDate: string;
  scheduledSlot?: string;
  serviceCharge?: number;
  notes?: string;
}

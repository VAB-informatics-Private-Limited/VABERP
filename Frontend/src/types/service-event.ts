import type { ServiceProduct } from './service-product';

export type ServiceEventStatus = 'pending' | 'reminded' | 'booked' | 'completed' | 'expired';
export type ServiceEventType = 'free_service' | 'paid_service' | 'amc_reminder' | 'warranty_expiry';

export interface ServiceEvent {
  id: number;
  enterprise_id: number;
  service_product_id: number;
  rule_id: number | null;
  due_date: string;
  event_type: ServiceEventType | string;
  title: string;
  description: string | null;
  price: number | null;
  status: ServiceEventStatus;
  reminder_count: number;
  last_reminder_at: string | null;
  assigned_to: number | null;
  assigned_employee?: { id: number; first_name: string; last_name: string } | null;
  service_product?: ServiceProduct;
  created_date: string;
  modified_date: string;
}

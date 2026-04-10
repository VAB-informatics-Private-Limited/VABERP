import type { ProductType } from './product-type';
import type { ServiceEvent } from './service-event';
import type { ServiceBooking } from './service-booking';

export interface ServiceProduct {
  id: number;
  enterprise_id: number;
  customer_id: number | null;
  product_id: number | null;
  product_type_id: number | null;
  job_card_id: number | null;
  serial_number: string | null;
  model_number: string | null;
  dispatch_date: string;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  status: 'active' | 'inactive';
  customer_name: string | null;
  customer_mobile: string | null;
  customer_address: string | null;
  notes: string | null;
  created_by: number | null;
  product_type: ProductType | null;
  service_events?: ServiceEvent[];
  service_bookings?: ServiceBooking[];
  created_date: string;
  modified_date: string;
}

export interface CreateServiceProductPayload {
  customerId?: number;
  productId?: number;
  productTypeId?: number;
  serialNumber?: string;
  modelNumber?: string;
  dispatchDate: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  notes?: string;
}

export interface ServiceRevenueSummary {
  totalProducts: number;
  completedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  pendingReminders: number;
}

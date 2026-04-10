export interface ServiceRule {
  id: number;
  product_type_id: number;
  day_offset: number;
  event_type: 'free_service' | 'paid_service' | 'amc_reminder' | 'warranty_expiry' | string;
  title: string;
  description: string | null;
  price: number | null;
  is_active: boolean;
}

export interface ProductType {
  id: number;
  enterprise_id: number;
  name: string;
  warranty_months: number;
  description: string | null;
  status: 'active' | 'inactive';
  service_rules: ServiceRule[];
  created_date: string;
  modified_date: string;
}

export interface CreateProductTypePayload {
  name: string;
  warranty_months?: number;
  description?: string;
  serviceRules?: {
    dayOffset: number;
    eventType: string;
    title: string;
    description?: string;
    price?: number;
    isActive?: boolean;
  }[];
}

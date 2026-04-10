import apiClient from './client';
import type { ProductType, ServiceRule, CreateProductTypePayload } from '@/types/product-type';

function mapRule(r: any): ServiceRule {
  return {
    id: r.id,
    product_type_id: r.productTypeId ?? r.product_type_id,
    day_offset: r.dayOffset ?? r.day_offset,
    event_type: r.eventType ?? r.event_type,
    title: r.title,
    description: r.description ?? null,
    price: r.price != null ? parseFloat(r.price) : null,
    is_active: r.isActive ?? r.is_active ?? true,
  };
}

function mapProductType(pt: any): ProductType {
  return {
    id: pt.id,
    enterprise_id: pt.enterpriseId ?? pt.enterprise_id,
    name: pt.name,
    warranty_months: pt.warrantyMonths ?? pt.warranty_months ?? 12,
    description: pt.description ?? null,
    status: pt.status ?? 'active',
    service_rules: (pt.serviceRules ?? pt.service_rules ?? []).map(mapRule),
    created_date: pt.createdDate ?? pt.created_date,
    modified_date: pt.modifiedDate ?? pt.modified_date,
  };
}

export const getProductTypes = () =>
  apiClient.get('/product-types').then((r) => ({
    data: (r.data.data ?? []).map(mapProductType) as ProductType[],
  }));

export const getProductType = (id: number) =>
  apiClient.get(`/product-types/${id}`).then((r) => ({
    data: mapProductType(r.data.data),
  }));

export const createProductType = (payload: CreateProductTypePayload) =>
  apiClient.post('/product-types', payload).then((r) => ({
    data: mapProductType(r.data.data),
  }));

export const updateProductType = (id: number, payload: Partial<CreateProductTypePayload> & { status?: string }) =>
  apiClient.put(`/product-types/${id}`, payload).then((r) => ({
    data: mapProductType(r.data.data),
  }));

export const deleteProductType = (id: number) =>
  apiClient.delete(`/product-types/${id}`).then((r) => r.data);

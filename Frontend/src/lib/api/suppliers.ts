import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Supplier } from '@/types/supplier';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupplierFromBackend(data: any): Supplier {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    supplier_code: data.supplierCode,
    supplier_name: data.supplierName,
    contact_person: data.contactPerson,
    phone: data.phone,
    email: data.email,
    address: data.address,
    gst_number: data.gstNumber,
    payment_terms: data.paymentTerms,
    status: data.status,
    notes: data.notes,
    categories: (data.categories || []).map((c: any) => ({
      id: c.id,
      category: c.category,
      subcategory: c.subcategory,
    })),
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

export async function getSupplierList(params: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<Supplier>> {
  const response = await apiClient.get('/suppliers', { params: { page: params.page, limit: params.pageSize, status: params.status } });
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapSupplierFromBackend), totalRecords: d.totalRecords, page: d.page, limit: d.limit };
}

export async function getSupplierById(id: number): Promise<ApiResponse<Supplier>> {
  const response = await apiClient.get(`/suppliers/${id}`);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSupplierFromBackend(d.data) : undefined };
}

export async function createSupplier(data: {
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  paymentTerms?: string;
  notes?: string;
}): Promise<ApiResponse<Supplier>> {
  const response = await apiClient.post('/suppliers', data);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSupplierFromBackend(d.data) : undefined };
}

export async function updateSupplier(id: number, data: Partial<{
  supplierName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  paymentTerms: string;
  status: string;
  notes: string;
}>): Promise<ApiResponse<Supplier>> {
  const response = await apiClient.patch(`/suppliers/${id}`, data);
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapSupplierFromBackend(d.data) : undefined };
}

export async function deleteSupplier(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/suppliers/${id}`);
  return response.data;
}

export async function getSuppliersByCategory(categories: string[], subcategories?: string[]): Promise<PaginatedResponse<Supplier>> {
  const params: Record<string, string> = { categories: categories.join(',') };
  if (subcategories?.length) params.subcategories = subcategories.join(',');
  const response = await apiClient.get('/suppliers/by-category', { params });
  const d = response.data as any;
  return { message: d.message, data: (d.data || []).map(mapSupplierFromBackend), totalRecords: d.totalRecords || 0, page: d.page || 1, limit: d.limit || 200 };
}

export async function addSupplierCategory(supplierId: number, data: { category: string; subcategory?: string }): Promise<ApiResponse> {
  const response = await apiClient.post(`/suppliers/${supplierId}/categories`, data);
  return response.data;
}

export async function removeSupplierCategory(categoryId: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/suppliers/categories/${categoryId}`);
  return response.data;
}

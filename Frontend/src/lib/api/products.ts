import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import {
  Category,
  SubCategory,
  Product,
  ProductAttribute,
  CategoryFormData,
  SubCategoryFormData,
  ProductFormData,
} from '@/types/product';

// Helper functions to map backend camelCase to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCategoryFromBackend(data: any): Category {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    category_name: data.categoryName,
    hsn_code: data.hsnCode,
    description: data.description,
    image: data.image,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubCategoryFromBackend(data: any): SubCategory {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    category_id: data.categoryId,
    category_name: data.category?.categoryName,
    subcategory_name: data.subcategoryName,
    hsn_code: data.hsnCode,
    description: data.description,
    image: data.image,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductFromBackend(data: any): Product {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    category_id: data.categoryId,
    subcategory_id: data.subcategoryId,
    category_name: data.category?.categoryName,
    subcategory_name: data.subcategory?.subcategoryName,
    product_name: data.productName,
    product_code: data.productCode,
    hsn_code: data.hsnCode,
    description: data.description,
    unit: data.unitOfMeasure,
    price: data.sellingPrice,
    image: data.image,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductAttributeFromBackend(data: any): ProductAttribute {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    product_id: data.productId,
    attribute_name: data.attributeName,
    attribute_value: data.attributeValue,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// ============ Categories ============

export async function getCategoryList(_enterpriseId?: number, page?: number, limit?: number, search?: string): Promise<PaginatedResponse<Category>> {
  const response = await apiClient.get<PaginatedResponse<Category>>('/products/categories', {
    params: { page, limit, search },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapCategoryFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getDropdownCategoryList(_enterpriseId?: number): Promise<ApiResponse<Category[]>> {
  const response = await apiClient.get<PaginatedResponse<Category>>('/products/categories', {
    params: { limit: 1000 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return { message: backendData.message, data: (backendData.data || []).map(mapCategoryFromBackend) };
}

export async function addCategory(data: CategoryFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    categoryName: data.category_name,
    hsnCode: data.hsn_code || '',
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.post<ApiResponse>('/products/categories', payload);
  return response.data;
}

export async function updateCategory(data: CategoryFormData & { id: number; enterprise_id?: number }): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    categoryName: data.category_name,
    hsnCode: data.hsn_code || '',
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.put<ApiResponse>(`/products/categories/${id}`, payload);
  return response.data;
}

export async function deleteCategory(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/products/categories/${id}`);
  return response.data;
}

// ============ Subcategories ============

export async function getSubCategoryList(_enterpriseId?: number, categoryId?: number): Promise<ApiResponse<SubCategory[]>> {
  const response = await apiClient.get<PaginatedResponse<SubCategory>>('/products/subcategories', {
    params: { categoryId, limit: 1000 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return { message: backendData.message, data: (backendData.data || []).map(mapSubCategoryFromBackend) };
}

export async function getDropdownSubCategoryList(_enterpriseId?: number, categoryId?: number): Promise<ApiResponse<SubCategory[]>> {
  return getSubCategoryList(undefined, categoryId);
}

export async function addSubCategory(data: SubCategoryFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    categoryId: data.category_id,
    subcategoryName: data.subcategory_name,
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.post<ApiResponse>('/products/subcategories', payload);
  return response.data;
}

export async function updateSubCategory(data: SubCategoryFormData & { id: number; enterprise_id?: number }): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    categoryId: data.category_id,
    subcategoryName: data.subcategory_name,
    description: data.description,
    status: data.status,
  };
  const response = await apiClient.put<ApiResponse>(`/products/subcategories/${id}`, payload);
  return response.data;
}

export async function deleteSubCategory(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/products/subcategories/${id}`);
  return response.data;
}

// ============ Products ============

export async function getProductList(params: {
  enterpriseId?: number;
  categoryId?: number;
  subcategoryId?: number;
  page?: number;
  pageSize?: number;
  searchText?: string;
}): Promise<PaginatedResponse<Product>> {
  const response = await apiClient.get<PaginatedResponse<Product>>('/products', {
    params: {
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId,
      page: params.page,
      limit: params.pageSize,
      search: params.searchText,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapProductFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getDropdownProductsList(_enterpriseId?: number, _subcategoryId?: number): Promise<ApiResponse<Product[]>> {
  const response = await apiClient.get<ApiResponse<Product[]>>('/products/dropdown');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return { message: backendData.message, data: (backendData.data || []).map(mapProductFromBackend) };
}

export async function addProduct(data: ProductFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    categoryId: data.category_id,
    subcategoryId: data.subcategory_id,
    productName: data.product_name,
    productCode: data.product_code,
    hsnCode: data.hsn_code,
    description: data.description,
    unitOfMeasure: data.unit,
    sellingPrice: data.price,
    status: data.status,
  };
  const response = await apiClient.post<ApiResponse>('/products', payload);
  return response.data;
}

export async function updateProduct(data: ProductFormData & { id: number; enterprise_id?: number }): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    categoryId: data.category_id,
    subcategoryId: data.subcategory_id,
    productName: data.product_name,
    productCode: data.product_code,
    hsnCode: data.hsn_code,
    description: data.description,
    unitOfMeasure: data.unit,
    sellingPrice: data.price,
    status: data.status,
  };
  const response = await apiClient.put<ApiResponse>(`/products/${id}`, payload);
  return response.data;
}

// ============ Product Attributes ============

export async function getProductAttributes(productId: number, _enterpriseId?: number): Promise<ApiResponse<ProductAttribute[]>> {
  const response = await apiClient.get<ApiResponse<ProductAttribute[]>>(`/products/${productId}/attributes`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapProductAttributeFromBackend),
  };
}

export async function addProductAttribute(data: {
  product_id: number;
  attribute_name: string;
  attribute_value: string;
  enterprise_id?: number;
}): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/products/attributes', {
    productId: data.product_id,
    attributeName: data.attribute_name,
    attributeValue: data.attribute_value,
  });
  return response.data;
}

export async function updateProductAttribute(data: {
  id: number;
  attribute_name: string;
  attribute_value: string;
  enterprise_id?: number;
}): Promise<ApiResponse> {
  const { id, ...updateData } = data;
  const response = await apiClient.put<ApiResponse>(`/products/attributes/${id}`, {
    attributeName: updateData.attribute_name,
    attributeValue: updateData.attribute_value,
  });
  return response.data;
}

export async function deleteProductAttribute(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/products/attributes/${id}`);
  return response.data;
}

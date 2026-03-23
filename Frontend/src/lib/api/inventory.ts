import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Inventory, InventoryLedger, InventoryFormData, InventoryLedgerFormData } from '@/types/inventory';

// Helper functions to map backend camelCase to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInventoryFromBackend(data: any): Inventory {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    product_id: data.productId,
    product_name: data.product?.productName,
    product_code: data.product?.productCode,
    category_id: data.product?.categoryId,
    category_name: data.product?.category?.categoryName,
    subcategory_id: data.product?.subcategoryId,
    subcategory_name: data.product?.subcategory?.subcategoryName,
    hsn_code: data.product?.hsnCode,
    quantity: data.currentStock,
    unit: data.product?.unitOfMeasure,
    location: data.warehouseLocation,
    min_stock_level: data.minStockLevel,
    max_stock_level: data.maxStockLevel,
    last_updated: data.modifiedDate || data.createdDate,
    status: data.status || 'active',
    priority: data.priority || 'none',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInventoryLedgerFromBackend(data: any): InventoryLedger {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    inventory_id: data.inventoryId,
    product_name: data.product?.productName,
    transaction_type: data.transactionType?.toLowerCase() as 'in' | 'out' | 'adjustment' | 'return',
    quantity: data.quantity,
    previous_stock: data.previousStock ?? 0,
    new_stock: data.newStock ?? 0,
    reference_type: data.referenceType,
    reference_no: data.referenceId ? `${data.referenceType || ''}-${data.referenceId}` : undefined,
    remarks: data.remarks,
    created_by: data.createdByName || undefined,
    created_date: data.createdDate,
  };
}

// Get Inventory List
export async function getInventoryList(
  _enterpriseId?: number,
  page?: number,
  pageSize?: number,
  searchText?: string,
  lowStockOnly?: boolean,
  categoryId?: number,
  subcategoryId?: number,
  availability?: string,
): Promise<PaginatedResponse<Inventory>> {
  const response = await apiClient.get<PaginatedResponse<Inventory>>('/inventory', {
    params: {
      page,
      limit: pageSize,
      search: searchText,
      lowStockOnly,
      categoryId,
      subcategoryId,
      availability,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapInventoryFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

// Get Inventory by ID
export async function getInventoryById(id: number, _enterpriseId?: number): Promise<ApiResponse<Inventory>> {
  const response = await apiClient.get<ApiResponse<Inventory>>(`/inventory/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapInventoryFromBackend(backendData.data) : undefined,
  };
}

// Add New Inventory Entry
export async function addInventory(data: InventoryFormData & { enterprise_id?: number }): Promise<ApiResponse> {
  const payload = {
    productId: data.product_id,
    currentStock: data.quantity,
    minStockLevel: data.min_stock_level,
    maxStockLevel: data.max_stock_level,
    warehouseLocation: data.location,
  };
  const response = await apiClient.post<ApiResponse>('/inventory', payload);
  return response.data;
}

// Update Inventory Entry
export async function updateInventory(data: InventoryFormData & { id: number; enterprise_id?: number }): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    productId: data.product_id,
    currentStock: data.quantity,
    minStockLevel: data.min_stock_level,
    maxStockLevel: data.max_stock_level,
    warehouseLocation: data.location,
  };
  const response = await apiClient.put<ApiResponse>(`/inventory/${id}`, payload);
  return response.data;
}

// Delete Inventory Entry
export async function deleteInventory(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/inventory/${id}`);
  return response.data;
}

// Add Inventory Ledger Entry (Stock In/Out)
export async function addInventoryLedger(
  data: InventoryLedgerFormData & { enterprise_id?: number; product_id?: number }
): Promise<ApiResponse> {
  const payload = {
    productId: data.product_id,
    transactionType: data.transaction_type?.toUpperCase(),
    quantity: data.quantity,
    referenceType: 'MANUAL',
    remarks: data.remarks,
  };
  const response = await apiClient.post<ApiResponse>('/inventory/stock', payload);
  return response.data;
}

// Get Inventory Ledger
export async function getInventoryLedger(
  _enterpriseId?: number,
  productId?: number,
  page?: number,
  limit?: number
): Promise<PaginatedResponse<InventoryLedger>> {
  const response = await apiClient.get<PaginatedResponse<InventoryLedger>>('/inventory/ledger', {
    params: { productId, page: page || 1, limit: limit || 500 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapInventoryLedgerFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

// Update Inventory Priority by Product ID
export async function updateInventoryPriorityByProduct(
  productId: number,
  priority: string,
): Promise<ApiResponse> {
  const response = await apiClient.put<ApiResponse>(`/inventory/product/${productId}/priority`, { priority });
  return response.data;
}

// Get Priority Items
export async function getPriorityItems(): Promise<ApiResponse<Inventory[]>> {
  const response = await apiClient.get<ApiResponse<Inventory[]>>('/inventory/priority-items');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapInventoryFromBackend),
  };
}

// Get Low Stock Alerts
export async function getLowStockAlerts(_enterpriseId?: number): Promise<ApiResponse<Inventory[]>> {
  const response = await apiClient.get<ApiResponse<Inventory[]>>('/inventory/alerts');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapInventoryFromBackend),
  };
}

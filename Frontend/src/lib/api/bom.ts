import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Bom, BomItem, ManufacturingPO } from '@/types/bom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBomItemFromBackend(data: any): BomItem {
  return {
    id: data.id,
    bom_id: data.bomId,
    product_id: data.productId,
    product_name: data.product?.productName,
    product_code: data.product?.productCode,
    raw_material_id: data.rawMaterialId,
    raw_material_name: data.rawMaterial?.materialName,
    raw_material_code: data.rawMaterial?.materialCode,
    item_name: data.itemName,
    required_quantity: Number(data.requiredQuantity),
    available_quantity: Number(data.availableQuantity),
    unit_of_measure: data.unitOfMeasure,
    status: data.status,
    notes: data.notes,
    is_custom: data.isCustom || false,
    sort_order: data.sortOrder,
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBomFromBackend(data: any): Bom {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    purchase_order_id: data.purchaseOrderId,
    product_id: data.productId,
    product_name: data.product?.productName,
    bom_number: data.bomNumber,
    quantity: Number(data.quantity),
    status: data.status,
    notes: data.notes,
    items: (data.items || []).map(mapBomItemFromBackend),
    job_cards: data.jobCards || [],
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapManufacturingPOFromBackend(data: any): ManufacturingPO {
  return {
    id: data.id,
    order_number: data.orderNumber,
    customer_name: data.customerName,
    customer_id: data.customerId,
    order_date: data.orderDate,
    expected_delivery: data.expectedDelivery,
    grand_total: Number(data.grandTotal),
    status: data.status,
    items: (data.items || []).map((item: any) => ({
      id: item.id,
      item_name: item.itemName,
      product_id: item.productId,
      product_name: item.product?.productName,
      product_code: item.product?.productCode,
      quantity: Number(item.quantity),
      unit_of_measure: item.unitOfMeasure,
    })),
    bom_count: data.bomCount,
    job_card_count: data.jobCardCount,
    job_cards: (data.jobCards || []).map((jc: any) => ({
      id: jc.id,
      job_number: jc.jobNumber,
      product_id: jc.productId,
      status: jc.status,
      quantity: Number(jc.quantity),
      quantity_completed: Number(jc.quantityCompleted),
    })),
    manufacturing_status: data.manufacturingStatus,
    material_approval_status: data.materialApprovalStatus || 'none',
    hold_reason: data.holdReason || undefined,
    hold_acknowledged: data.holdAcknowledged || false,
    material_request_id: data.materialRequestId,
    manufacturing_priority: data.manufacturingPriority,
    manufacturing_notes: data.manufacturingNotes,
    created_date: data.createdDate,
  };
}

// ============ Manufacturing Purchase Orders ============

export async function getManufacturingPurchaseOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedResponse<ManufacturingPO>> {
  const response = await apiClient.get('/manufacturing/purchase-orders', {
    params: {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      status: params.status,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapManufacturingPOFromBackend),
    totalRecords: d.totalRecords,
    page: d.page,
    limit: d.limit,
  };
}

// ============ BOM ============

export async function createBom(data: {
  purchaseOrderId: number;
  productId?: number;
  quantity?: number;
  notes?: string;
  items?: Array<{
    productId?: number;
    rawMaterialId?: number;
    itemName: string;
    requiredQuantity: number;
    unitOfMeasure?: string;
    notes?: string;
  }>;
}): Promise<ApiResponse<Bom>> {
  const response = await apiClient.post('/manufacturing/bom', data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapBomFromBackend(d.data) : undefined };
}

export async function getBomById(id: number): Promise<ApiResponse<Bom>> {
  const response = await apiClient.get(`/manufacturing/bom/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapBomFromBackend(d.data) : undefined };
}

export async function getBomByPurchaseOrder(poId: number): Promise<ApiResponse<Bom>> {
  const response = await apiClient.get(`/manufacturing/purchase-orders/${poId}/bom`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapBomFromBackend(d.data) : undefined };
}

export async function checkBomStock(bomId: number): Promise<ApiResponse<Bom>> {
  const response = await apiClient.post(`/manufacturing/bom/${bomId}/check-stock`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapBomFromBackend(d.data) : undefined };
}

export async function createJobCardsFromBom(bomId: number, jobCards: Array<{
  stageMasterId?: number;
  assignedTo?: number;
  quantity?: number;
  startDate?: string;
  expectedCompletion?: string;
  priority?: number;
  notes?: string;
}>, customMaterials?: Array<{
  rawMaterialId?: number;
  itemName: string;
  requiredQuantity: number;
  unitOfMeasure?: string;
}>): Promise<ApiResponse> {
  const response = await apiClient.post(`/manufacturing/bom/${bomId}/job-cards`, { jobCards, customMaterials });
  return response.data;
}

export async function getBomShortageItems(): Promise<ApiResponse<any[]>> {
  const response = await apiClient.get('/manufacturing/bom/shortage-items');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data || [] };
}

export async function deleteBom(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/manufacturing/bom/${id}`);
  return response.data;
}

// ============ Manufacturing Workflow ============

export async function sendForApproval(poId: number, data: {
  priority?: number;
  notes?: string;
  expectedDelivery?: string;
  items?: Array<{
    itemId: number;
    itemName?: string;
    quantity?: number;
    description?: string;
    unitOfMeasure?: string;
  }>;
}): Promise<ApiResponse> {
  const response = await apiClient.post(`/manufacturing/purchase-orders/${poId}/send-for-approval`, data);
  return response.data;
}

export async function updateManufacturingDetails(poId: number, data: {
  priority?: number;
  notes?: string;
  expectedDelivery?: string;
  items?: Array<{
    itemId: number;
    itemName?: string;
    quantity?: number;
    description?: string;
    unitOfMeasure?: string;
  }>;
}): Promise<ApiResponse> {
  const response = await apiClient.put(`/manufacturing/purchase-orders/${poId}/details`, data);
  return response.data;
}

export async function startProductionForItem(poId: number, itemId: number, force?: boolean): Promise<ApiResponse> {
  const response = await apiClient.post(`/manufacturing/purchase-orders/${poId}/start-production-item`, { itemId, force });
  return response.data;
}

export async function requestInventoryForItem(poId: number, itemId: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/manufacturing/purchase-orders/${poId}/request-inventory-item`, { itemId });
  return response.data;
}

export async function recheckJobCardMaterials(jobCardId: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/manufacturing/jobs/${jobCardId}/recheck-materials`);
  return response.data;
}

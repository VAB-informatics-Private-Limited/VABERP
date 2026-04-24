import apiClient from './client';
import { ApiResponse } from '@/types/api';
import { ProductBom, ProductBomItem, ProductBomInput } from '@/types/product-bom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemFromBackend(data: any): ProductBomItem {
  return {
    id: data.id,
    product_bom_id: data.productBomId,
    raw_material_id: data.rawMaterialId ?? null,
    raw_material_name: data.rawMaterial?.materialName,
    raw_material_code: data.rawMaterial?.materialCode,
    component_product_id: data.componentProductId ?? null,
    component_product_name: data.componentProduct?.productName,
    item_name: data.itemName,
    required_quantity: Number(data.requiredQuantity ?? 0),
    unit_of_measure: data.unitOfMeasure,
    is_custom: !!data.isCustom,
    notes: data.notes,
    sort_order: Number(data.sortOrder ?? 0),
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProductBomFromBackend(data: any): ProductBom | null {
  if (!data) return null;
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    product_id: data.productId,
    bom_number: data.bomNumber,
    version: data.version ?? 1,
    notes: data.notes,
    status: data.status === 'archived' ? 'archived' : 'active',
    items: (data.items || []).map(mapItemFromBackend),
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

function toBackendPayload(payload: ProductBomInput) {
  return {
    notes: payload.notes,
    items: (payload.items || []).map((item, index) => ({
      rawMaterialId: item.raw_material_id ?? undefined,
      componentProductId: item.component_product_id ?? undefined,
      itemName: item.item_name,
      requiredQuantity: Number(item.required_quantity),
      unitOfMeasure: item.unit_of_measure,
      isCustom: item.is_custom ?? (!item.raw_material_id && !item.component_product_id),
      notes: item.notes,
      sortOrder: item.sort_order ?? index,
    })),
  };
}

export async function getProductBom(productId: number): Promise<ApiResponse<ProductBom | null>> {
  const response = await apiClient.get<ApiResponse>(`/products/${productId}/bom`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: mapProductBomFromBackend(backendData.data),
  };
}

export async function upsertProductBom(
  productId: number,
  payload: ProductBomInput,
): Promise<ApiResponse<ProductBom | null>> {
  const response = await apiClient.post<ApiResponse>(
    `/products/${productId}/bom`,
    toBackendPayload(payload),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: mapProductBomFromBackend(backendData.data),
  };
}

export async function deleteProductBom(productId: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/products/${productId}/bom`);
  return response.data;
}

export { toBackendPayload as toProductBomBackendPayload };

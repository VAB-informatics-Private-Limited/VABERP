import apiClient from './client';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SparePart {
  id: number;
  part_code: string;
  name: string;
  description?: string;
  oem_part_no?: string;
  alt_part_no?: string;
  manufacturer?: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  unit_price: number;
  supplier_id?: number;
  status: 'active' | 'discontinued';
  created_date?: string;
}

export interface MachineSpare {
  id: number;
  machine_id: number;
  spare_part_id: number;
  quantity: number;
  source: 'template_model' | 'template_category' | 'manual' | string;
  notes?: string;
  spare_part?: SparePart;
  created_date?: string;
}

export interface MachineSpareMap {
  id: number;
  spare_part_id: number;
  spare_part?: SparePart;
  model_number?: string;
  category_id?: number;
  category?: { id: number; name: string };
  default_quantity: number;
  is_mandatory: boolean;
  priority: number;
  notes?: string;
}

export interface SuggestionItem {
  spare_part_id: number;
  part_code: string;
  name: string;
  unit: string;
  default_quantity: number;
  is_mandatory: boolean;
  notes?: string;
  current_stock: number;
  manufacturer?: string;
  oem_part_no?: string;
}

export interface SuggestionResult {
  source: 'model' | 'category' | 'none';
  items: SuggestionItem[];
}

// ─── Mappers ────────────────────────────────────────────────────────────────

const mapSparePart = (sp: any): SparePart => ({
  id: sp.id,
  part_code: sp.partCode ?? sp.part_code,
  name: sp.name,
  description: sp.description,
  oem_part_no: sp.oemPartNo ?? sp.oem_part_no,
  alt_part_no: sp.altPartNo ?? sp.alt_part_no,
  manufacturer: sp.manufacturer,
  unit: sp.unit ?? 'pcs',
  current_stock: Number(sp.currentStock ?? sp.current_stock ?? 0),
  min_stock: Number(sp.minStock ?? sp.min_stock ?? 0),
  unit_price: Number(sp.unitPrice ?? sp.unit_price ?? 0),
  supplier_id: sp.supplierId ?? sp.supplier_id,
  status: sp.status ?? 'active',
  created_date: sp.createdDate ?? sp.created_date,
});

const mapMachineSpare = (ms: any): MachineSpare => ({
  id: ms.id,
  machine_id: ms.machineId ?? ms.machine_id,
  spare_part_id: ms.sparePartId ?? ms.spare_part_id,
  quantity: Number(ms.quantity ?? 0),
  source: ms.source ?? 'manual',
  notes: ms.notes,
  spare_part: ms.sparePart ? mapSparePart(ms.sparePart) : (ms.spare_part ? mapSparePart(ms.spare_part) : undefined),
  created_date: ms.createdDate ?? ms.created_date,
});

const mapMap = (m: any): MachineSpareMap => ({
  id: m.id,
  spare_part_id: m.sparePartId ?? m.spare_part_id,
  spare_part: m.sparePart ? mapSparePart(m.sparePart) : (m.spare_part ? mapSparePart(m.spare_part) : undefined),
  model_number: m.modelNumber ?? m.model_number,
  category_id: m.categoryId ?? m.category_id,
  category: m.category ? { id: m.category.id, name: m.category.name } : undefined,
  default_quantity: Number(m.defaultQuantity ?? m.default_quantity ?? 1),
  is_mandatory: m.isMandatory ?? m.is_mandatory ?? false,
  priority: m.priority ?? 100,
  notes: m.notes,
});

const mapSuggestionItem = (it: any): SuggestionItem => ({
  spare_part_id: it.sparePartId ?? it.spare_part_id,
  part_code: it.partCode ?? it.part_code,
  name: it.name,
  unit: it.unit ?? 'pcs',
  default_quantity: Number(it.defaultQuantity ?? it.default_quantity ?? 1),
  is_mandatory: it.isMandatory ?? it.is_mandatory ?? false,
  notes: it.notes,
  current_stock: Number(it.currentStock ?? it.current_stock ?? 0),
  manufacturer: it.manufacturer,
  oem_part_no: it.oemPartNo ?? it.oem_part_no,
});

// ─── Spare Parts CRUD ──────────────────────────────────────────────────────

export const listSpareParts = async (params?: {
  page?: number; limit?: number; search?: string; status?: string; supplierId?: number;
}) => {
  const res = await apiClient.get('/spare-parts', { params });
  return {
    data: (res.data.data ?? []).map(mapSparePart),
    total: res.data.totalRecords ?? 0,
  };
};

export const getSparePart = async (id: number) => {
  const res = await apiClient.get(`/spare-parts/${id}`);
  return mapSparePart(res.data.data);
};

export const createSparePart = async (dto: Partial<SparePart>) => {
  const res = await apiClient.post('/spare-parts', dto);
  return mapSparePart(res.data.data);
};

export const updateSparePart = async (id: number, dto: Partial<SparePart>) => {
  const res = await apiClient.patch(`/spare-parts/${id}`, dto);
  return mapSparePart(res.data.data);
};

export const deleteSparePart = async (id: number) => {
  await apiClient.delete(`/spare-parts/${id}`);
};

// ─── Suggestion ────────────────────────────────────────────────────────────

export const suggestSpares = async (dto: { modelNumber?: string; categoryId?: number }): Promise<SuggestionResult> => {
  const res = await apiClient.post('/spare-parts/suggest', dto);
  const d = res.data.data ?? {};
  return {
    source: d.source ?? 'none',
    items: (d.items ?? []).map(mapSuggestionItem),
  };
};

// ─── Template Map ──────────────────────────────────────────────────────────

export const listSpareMap = async (params?: { modelNumber?: string; categoryId?: number }) => {
  const res = await apiClient.get('/machine-spare-map', { params });
  return (res.data.data ?? []).map(mapMap) as MachineSpareMap[];
};

export const upsertSpareMap = async (dto: {
  sparePartId: number;
  modelNumber?: string;
  categoryId?: number;
  defaultQuantity?: number;
  isMandatory?: boolean;
  notes?: string;
  priority?: number;
}) => {
  const res = await apiClient.post('/machine-spare-map', dto);
  return mapMap(res.data.data);
};

export const upsertSpareMapBulk = async (items: Array<{
  sparePartId: number;
  modelNumber?: string;
  categoryId?: number;
  defaultQuantity?: number;
  isMandatory?: boolean;
  notes?: string;
  priority?: number;
}>) => {
  const res = await apiClient.post('/machine-spare-map/bulk', { items });
  return (res.data.data ?? []).map(mapMap) as MachineSpareMap[];
};

export const deleteSpareMap = async (id: number) => {
  await apiClient.delete(`/machine-spare-map/${id}`);
};

// ─── Per-Machine Spares ────────────────────────────────────────────────────

export const getMachineSpares = async (machineId: number) => {
  const res = await apiClient.get(`/machines/${machineId}/spares`);
  return (res.data.data ?? []).map(mapMachineSpare) as MachineSpare[];
};

export const saveMachineSpares = async (
  machineId: number,
  items: Array<{ sparePartId: number; quantity: number; notes?: string; source?: string }>,
) => {
  const res = await apiClient.post(`/machines/${machineId}/spares/save`, { items });
  return (res.data.data ?? []).map(mapMachineSpare) as MachineSpare[];
};

export const addMachineSpare = async (
  machineId: number,
  dto: { sparePartId: number; quantity: number; notes?: string; source?: string },
) => {
  const res = await apiClient.post(`/machines/${machineId}/spares`, dto);
  return mapMachineSpare(res.data.data);
};

export const updateMachineSpare = async (
  machineId: number,
  sparePartId: number,
  dto: { quantity?: number; notes?: string },
) => {
  const res = await apiClient.patch(`/machines/${machineId}/spares/${sparePartId}`, dto);
  return mapMachineSpare(res.data.data);
};

export const deleteMachineSpare = async (machineId: number, sparePartId: number) => {
  await apiClient.delete(`/machines/${machineId}/spares/${sparePartId}`);
};

export const saveAsTemplate = async (machineId: number, scope: 'model' | 'category') => {
  const res = await apiClient.post(`/machines/${machineId}/spares/save-as-template`, { scope });
  return res.data.data as { upserted: number };
};

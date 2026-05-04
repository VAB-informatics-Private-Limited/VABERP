import apiClient from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WasteCategory {
  id: number;
  name: string;
  code: string;
  classification: string; // recyclable | hazardous | general | e-waste | organic
  unit: string;
  requires_manifest: boolean;
  max_storage_days?: number;
  handling_notes?: string;
  is_active: boolean;
}

export interface WasteSource {
  id: number;
  name: string;
  source_type: string; // machine | department | process | external
  reference_id?: number;
  reference_type?: string;
  location?: string;
  is_active: boolean;
}

export interface WasteInventoryItem {
  id: number;
  batch_no: string;
  category_id: number;
  category?: WasteCategory;
  source_id?: number;
  source?: WasteSource;
  raw_material_id?: number | null;
  raw_material_name?: string;
  raw_material_code?: string;
  production_job_id?: number | null;
  quantity_generated: number;
  quantity_available: number;
  quantity_reserved: number;
  unit: string;
  storage_location?: string;
  storage_date: string;
  expiry_alert_date?: string;
  status: string; // available | partially_disposed | fully_disposed | reserved | expired | quarantined
  manifest_number?: string;
  hazard_level?: string;
  estimated_value?: number;
  notes?: string;
  created_date: string;
  logs?: WasteInventoryLog[];
}

export interface WasteInventoryLog {
  id: number;
  inventory_id: number;
  action: string;
  quantity_delta: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: number;
  performed_by?: number | null;
  performed_by_name?: string;
  notes?: string;
  created_date: string;
  // Resolved context when reference_type === 'job_card'
  jobCardNumber?: string;
  jobCardName?: string;
  purchaseOrderNumber?: string;
  purchaseOrderId?: number;
  customerName?: string;
}

export interface WasteParty {
  id: number;
  party_code: string;
  company_name: string;
  party_type: string; // vendor | customer | both
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  pollution_board_cert?: string;
  cert_expiry_date?: string;
  handles_hazardous: boolean;
  payment_terms: string;
  status: string;
  rating?: number;
  notes?: string;
  rates?: WastePartyRate[];
}

export interface WastePartyRate {
  id: number;
  party_id: number;
  category_id: number;
  category?: WasteCategory;
  rate_type: string; // buy_rate | disposal_rate
  rate: number;
  currency: string;
  effective_from: string;
  effective_to?: string;
}

export interface WasteDisposalTransaction {
  id: number;
  transaction_no: string;
  party_id: number;
  party?: WasteParty;
  transaction_type: string; // disposal | sale | internal_reuse
  disposal_method?: string;
  status: string; // draft | confirmed | in_transit | completed | cancelled
  scheduled_date: string;
  completed_date?: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  net_value?: number;
  manifest_number?: string;
  vehicle_number?: string;
  driver_name?: string;
  notes?: string;
  lines?: WasteDisposalLine[];
  created_date: string;
}

export interface WasteDisposalLine {
  id: number;
  transaction_id: number;
  inventory_id: number;
  inventory?: WasteInventoryItem;
  category_id: number;
  category?: WasteCategory;
  quantity_requested: number;
  quantity_actual?: number;
  unit: string;
  rate?: number;
  revenue: number;
  cost: number;
  notes?: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

const mapCategory = (c: any): WasteCategory => ({
  id: c.id, name: c.name, code: c.code,
  classification: c.classification ?? 'general',
  unit: c.unit ?? 'kg',
  requires_manifest: c.requiresManifest ?? c.requires_manifest ?? false,
  max_storage_days: c.maxStorageDays ?? c.max_storage_days,
  handling_notes: c.handlingNotes ?? c.handling_notes,
  is_active: c.isActive ?? c.is_active ?? true,
});

const mapSource = (s: any): WasteSource => ({
  id: s.id, name: s.name,
  source_type: s.sourceType ?? s.source_type ?? 'department',
  reference_id: s.referenceId ?? s.reference_id,
  reference_type: s.referenceType ?? s.reference_type,
  location: s.location,
  is_active: s.isActive ?? s.is_active ?? true,
});

const mapLog = (l: any): WasteInventoryLog => ({
  id: l.id,
  inventory_id: l.inventoryId ?? l.inventory_id,
  action: l.action,
  quantity_delta: parseFloat(l.quantityDelta ?? l.quantity_delta ?? '0'),
  quantity_after: parseFloat(l.quantityAfter ?? l.quantity_after ?? '0'),
  reference_type: l.referenceType ?? l.reference_type,
  reference_id: l.referenceId ?? l.reference_id,
  performed_by: l.performedBy ?? l.performed_by ?? null,
  performed_by_name:
    l.performedByEmployee?.name ??
    l.performedByEmployee?.fullName ??
    l.performed_by_name,
  notes: l.notes,
  created_date: l.createdDate ?? l.created_date,
  jobCardNumber: l.jobCardNumber,
  jobCardName: l.jobCardName,
  purchaseOrderNumber: l.purchaseOrderNumber,
  purchaseOrderId: l.purchaseOrderId,
  customerName: l.customerName,
});

const mapInventory = (i: any): WasteInventoryItem => ({
  id: i.id,
  batch_no: i.batchNo ?? i.batch_no,
  category_id: i.categoryId ?? i.category_id,
  category: i.category ? mapCategory(i.category) : undefined,
  source_id: i.sourceId ?? i.source_id,
  source: i.source ? mapSource(i.source) : undefined,
  raw_material_id: i.rawMaterialId ?? i.raw_material_id ?? null,
  raw_material_name: i.rawMaterial?.materialName ?? i.raw_material_name,
  raw_material_code: i.rawMaterial?.materialCode ?? i.raw_material_code,
  production_job_id: i.productionJobId ?? i.production_job_id ?? null,
  quantity_generated: parseFloat(i.quantityGenerated ?? i.quantity_generated ?? '0'),
  quantity_available: parseFloat(i.quantityAvailable ?? i.quantity_available ?? '0'),
  quantity_reserved: parseFloat(i.quantityReserved ?? i.quantity_reserved ?? '0'),
  unit: i.unit ?? 'kg',
  storage_location: i.storageLocation ?? i.storage_location,
  storage_date: i.storageDate ?? i.storage_date,
  expiry_alert_date: i.expiryAlertDate ?? i.expiry_alert_date,
  status: i.status,
  manifest_number: i.manifestNumber ?? i.manifest_number,
  hazard_level: i.hazardLevel ?? i.hazard_level,
  estimated_value: i.estimatedValue ?? i.estimated_value,
  notes: i.notes,
  created_date: i.createdDate ?? i.created_date,
  logs: i.logs?.map(mapLog),
});

const mapParty = (p: any): WasteParty => ({
  id: p.id,
  party_code: p.partyCode ?? p.party_code ?? '',
  company_name: p.companyName ?? p.company_name,
  party_type: p.partyType ?? p.party_type ?? 'vendor',
  contact_person: p.contactPerson ?? p.contact_person,
  phone: p.phone, email: p.email, address: p.address,
  gst_number: p.gstNumber ?? p.gst_number,
  pollution_board_cert: p.pollutionBoardCert ?? p.pollution_board_cert,
  cert_expiry_date: p.certExpiryDate ?? p.cert_expiry_date,
  handles_hazardous: p.handlesHazardous ?? p.handles_hazardous ?? false,
  payment_terms: p.paymentTerms ?? p.payment_terms ?? 'immediate',
  status: p.status, rating: p.rating, notes: p.notes,
  rates: p.rates?.map(mapRate),
});

const mapRate = (r: any): WastePartyRate => ({
  id: r.id,
  party_id: r.partyId ?? r.party_id,
  category_id: r.categoryId ?? r.category_id,
  category: r.category ? mapCategory(r.category) : undefined,
  rate_type: r.rateType ?? r.rate_type,
  rate: parseFloat(r.rate ?? '0'),
  currency: r.currency ?? 'INR',
  effective_from: r.effectiveFrom ?? r.effective_from,
  effective_to: r.effectiveTo ?? r.effective_to,
});

const mapLine = (l: any): WasteDisposalLine => ({
  id: l.id,
  transaction_id: l.transactionId ?? l.transaction_id,
  inventory_id: l.inventoryId ?? l.inventory_id,
  inventory: l.inventory ? mapInventory(l.inventory) : undefined,
  category_id: l.categoryId ?? l.category_id,
  category: l.category ? mapCategory(l.category) : undefined,
  quantity_requested: parseFloat(l.quantityRequested ?? l.quantity_requested ?? '0'),
  quantity_actual: l.quantityActual != null ? parseFloat(l.quantityActual) : (l.quantity_actual != null ? parseFloat(l.quantity_actual) : undefined),
  unit: l.unit ?? 'kg',
  rate: l.rate != null ? parseFloat(l.rate) : undefined,
  revenue: parseFloat(l.revenue ?? '0'),
  cost: parseFloat(l.cost ?? '0'),
  notes: l.notes,
});

const mapTransaction = (t: any): WasteDisposalTransaction => ({
  id: t.id,
  transaction_no: t.transactionNo ?? t.transaction_no,
  party_id: t.partyId ?? t.party_id,
  party: t.party ? mapParty(t.party) : undefined,
  transaction_type: t.transactionType ?? t.transaction_type ?? 'disposal',
  disposal_method: t.disposalMethod ?? t.disposal_method,
  status: t.status,
  scheduled_date: t.scheduledDate ?? t.scheduled_date,
  completed_date: t.completedDate ?? t.completed_date,
  total_quantity: parseFloat(t.totalQuantity ?? t.total_quantity ?? '0'),
  total_revenue: parseFloat(t.totalRevenue ?? t.total_revenue ?? '0'),
  total_cost: parseFloat(t.totalCost ?? t.total_cost ?? '0'),
  net_value: parseFloat(t.totalRevenue ?? t.total_revenue ?? '0') - parseFloat(t.totalCost ?? t.total_cost ?? '0'),
  manifest_number: t.manifestNumber ?? t.manifest_number,
  vehicle_number: t.vehicleNumber ?? t.vehicle_number,
  driver_name: t.driverName ?? t.driver_name,
  notes: t.notes,
  lines: t.lines?.map(mapLine),
  created_date: t.createdDate ?? t.created_date,
});

// ─── Waste Inventory API ──────────────────────────────────────────────────────

export const getWasteDashboard = async () => {
  const res = await apiClient.get('/waste-inventory/dashboard');
  return res.data.data;
};

export const getWasteCategories = async () => {
  const res = await apiClient.get('/waste-inventory/categories');
  return (res.data.data ?? []).map(mapCategory) as WasteCategory[];
};

export const createWasteCategory = async (dto: any) => {
  const res = await apiClient.post('/waste-inventory/categories', dto);
  return mapCategory(res.data.data);
};

export const updateWasteCategory = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/waste-inventory/categories/${id}`, dto);
  return mapCategory(res.data.data);
};

export const getWasteSources = async () => {
  const res = await apiClient.get('/waste-inventory/sources');
  return (res.data.data ?? []).map(mapSource) as WasteSource[];
};

export const createWasteSource = async (dto: any) => {
  const res = await apiClient.post('/waste-inventory/sources', dto);
  return mapSource(res.data.data);
};

export const getWasteInventory = async (params?: any) => {
  const res = await apiClient.get('/waste-inventory', { params });
  return { data: (res.data.data ?? []).map(mapInventory), total: res.data.totalRecords ?? 0 };
};

export const getWasteInventoryItem = async (id: number) => {
  const res = await apiClient.get(`/waste-inventory/${id}`);
  return mapInventory(res.data.data);
};

export const createWasteInventory = async (dto: any) => {
  const res = await apiClient.post('/waste-inventory', dto);
  return res.data;
};

/**
 * Record waste generated during production.
 * Aggregates by raw material + category and writes a per-job-card log.
 */
export const recordProductionWaste = async (dto: {
  jobCardId: number;
  rawMaterialId: number;
  categoryId?: number; // optional — backend auto-resolves/creates a default if missing
  quantity: number;
  unit?: string;
  consumedQuantity?: number;
  notes?: string;
}) => {
  const res = await apiClient.post('/waste-inventory/production-waste', dto);
  return res.data;
};

export const getProductionWasteByMaterial = async (rawMaterialId: number) => {
  const res = await apiClient.get(`/waste-inventory/production-waste/by-material/${rawMaterialId}`);
  return res.data.data;
};

export const updateWasteInventory = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/waste-inventory/${id}`, dto);
  return res.data;
};

export const quarantineWaste = async (id: number, notes: string) => {
  const res = await apiClient.post(`/waste-inventory/${id}/quarantine`, { notes });
  return res.data;
};

export const writeOffWaste = async (id: number, notes: string) => {
  const res = await apiClient.post(`/waste-inventory/${id}/write-off`, { notes });
  return res.data;
};

// ─── Waste Parties API ────────────────────────────────────────────────────────

export const getWasteParties = async (params?: any) => {
  const res = await apiClient.get('/waste-parties', { params });
  return { data: (res.data.data ?? []).map(mapParty), total: res.data.totalRecords ?? 0 };
};

export const createWasteParty = async (dto: any) => {
  const res = await apiClient.post('/waste-parties', dto);
  return mapParty(res.data.data);
};

export const updateWasteParty = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/waste-parties/${id}`, dto);
  return mapParty(res.data.data);
};

export const deleteWasteParty = async (id: number) => {
  await apiClient.delete(`/waste-parties/${id}`);
};

export const getWastePartyRates = async (partyId: number) => {
  const res = await apiClient.get(`/waste-parties/${partyId}/rates`);
  return (res.data.data ?? []).map(mapRate) as WastePartyRate[];
};

export const addWastePartyRate = async (partyId: number, dto: any) => {
  const res = await apiClient.post(`/waste-parties/${partyId}/rates`, dto);
  return mapRate(res.data.data);
};

export const getExpiringWasteCerts = async (days = 30) => {
  const res = await apiClient.get('/waste-parties/expiring-certs', { params: { days } });
  return (res.data.data ?? []).map(mapParty) as WasteParty[];
};

// ─── Waste Disposal API ───────────────────────────────────────────────────────

export const getDisposalDashboard = async () => {
  const res = await apiClient.get('/waste-disposal/dashboard');
  return res.data.data;
};

export const getDisposalTransactions = async (params?: any) => {
  const res = await apiClient.get('/waste-disposal', { params });
  return { data: (res.data.data ?? []).map(mapTransaction), total: res.data.totalRecords ?? 0 };
};

export const getDisposalTransaction = async (id: number) => {
  const res = await apiClient.get(`/waste-disposal/${id}`);
  return mapTransaction(res.data.data);
};

export const createDisposalTransaction = async (dto: any) => {
  const res = await apiClient.post('/waste-disposal', dto);
  return res.data;
};

export const confirmDisposal = async (id: number) => {
  const res = await apiClient.post(`/waste-disposal/${id}/confirm`);
  return res.data;
};

export const completeDisposal = async (id: number, dto: any) => {
  const res = await apiClient.post(`/waste-disposal/${id}/complete`, dto);
  return res.data;
};

export const cancelDisposal = async (id: number) => {
  const res = await apiClient.post(`/waste-disposal/${id}/cancel`);
  return res.data;
};

export const addDisposalLine = async (transactionId: number, dto: any) => {
  const res = await apiClient.post(`/waste-disposal/${transactionId}/lines`, dto);
  return res.data;
};

export const removeDisposalLine = async (transactionId: number, lineId: number) => {
  await apiClient.delete(`/waste-disposal/${transactionId}/lines/${lineId}`);
};

// ─── Waste Analytics API ──────────────────────────────────────────────────────

export const getWasteAnalyticsSummary = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/summary', { params });
  return res.data.data;
};

export const getWasteByCategory = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/by-category', { params });
  return res.data.data ?? [];
};

export const getWasteBySource = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/by-source', { params });
  return res.data.data ?? [];
};

export const getWasteFinancials = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/financials', { params });
  return res.data.data ?? [];
};

export const getWasteTrends = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/trends', { params });
  return res.data.data ?? [];
};

export const getWasteAging = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/aging', { params });
  return res.data.data ?? [];
};

export const getWasteDisposalMethods = async (params?: any) => {
  const res = await apiClient.get('/waste-analytics/disposal-methods', { params });
  return res.data.data ?? [];
};

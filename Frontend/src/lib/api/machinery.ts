import apiClient from './client';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MachineCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

export interface Machine {
  id: number;
  machine_code: string;
  name: string;
  category_id?: number;
  category?: MachineCategory;
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  purchase_date?: string;
  installation_date?: string;
  warranty_expiry?: string;
  location?: string;
  status: string;
  criticality: string;
  meter_unit: string;
  current_meter_reading: number;
  notes?: string;
  image_url?: string;
  created_date: string;
}

export interface MaintenanceVendor {
  id: number;
  vendor_code: string;
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  service_categories: string[];
  rating?: number;
  status: string;
  notes?: string;
}

export interface AmcContract {
  id: number;
  vendor_id: number;
  vendor?: MaintenanceVendor;
  machine_id?: number;
  machine?: Machine;
  contract_number?: string;
  start_date: string;
  end_date: string;
  contract_value?: number;
  coverage_details?: string;
  visit_frequency_days?: number;
  max_visits_included?: number;
  visits_used?: number;
  status: string;
  notes?: string;
}

export interface BomTemplate {
  id: number;
  name: string;
  machine_id?: number;
  machine?: Machine;
  category_id?: number;
  service_type: string;
  version: number;
  is_active: boolean;
  lines?: BomLine[];
  notes?: string;
}

export interface BomLine {
  id: number;
  raw_material_id: number;
  raw_material?: { id: number; name: string; unit?: string };
  quantity_required: number;
  unit?: string;
  is_mandatory: boolean;
  notes?: string;
  sort_order: number;
}

export interface ReminderRule {
  id: number;
  name: string;
  machine_id?: number;
  machine?: Machine;
  category_id?: number;
  trigger_type: string;
  interval_days?: number;
  interval_units?: number;
  advance_notice_days: number;
  priority: string;
  is_recurring: boolean;
  bom_template_id?: number;
  preferred_vendor_id?: number;
  overdue_notify_after_days: number;
  status: string;
}

export interface MaintenanceReminder {
  id: number;
  rule_id: number;
  rule?: ReminderRule;
  machine_id: number;
  machine?: Machine;
  due_date?: string;
  due_at_meter?: number;
  trigger_type: string;
  status: string;
  work_order_id?: number;
  snooze_until?: string;
  snooze_count: number;
}

export interface MaintenanceWorkOrder {
  id: number;
  work_order_no: string;
  machine_id: number;
  machine?: Machine;
  reminder_id?: number;
  service_type: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  on_hold_reason?: string;
  assigned_type: string;
  assigned_technician_id?: number;
  assigned_technician?: { id: number; first_name: string; last_name: string };
  assigned_vendor_id?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  completion_notes?: string;
  estimated_cost?: number;
  actual_cost?: number;
  labor_cost?: number;
  vendor_cost?: number;
  meter_reading_at_service?: number;
  bom_template_id?: number;
  parts?: WorkOrderPart[];
  status_logs?: WorkOrderStatusLog[];
  created_date: string;
}

export interface WorkOrderPart {
  id: number;
  raw_material_id: number;
  raw_material?: { id: number; name: string; unit?: string };
  source: string;
  quantity_required: number;
  quantity_reserved: number;
  quantity_consumed: number;
  unit?: string;
  status: string;
  notes?: string;
}

export interface WorkOrderStatusLog {
  id: number;
  from_status?: string;
  to_status: string;
  reason?: string;
  changed_by_employee?: { id: number; first_name: string; last_name: string };
  created_date: string;
}

export interface DowntimeLog {
  id: number;
  machine_id: number;
  machine?: Machine;
  work_order_id?: number;
  downtime_start: string;
  downtime_end?: string;
  duration_minutes?: number;
  reason_code: string;
  reason_detail?: string;
  impact: string;
  production_loss_units?: number;
  created_date: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

const mapMachine = (m: any): Machine => ({
  id: m.id,
  machine_code: m.machineCode ?? m.machine_code,
  name: m.name,
  category_id: m.categoryId ?? m.category_id,
  category: m.category,
  manufacturer: m.manufacturer,
  model_number: m.modelNumber ?? m.model_number,
  serial_number: m.serialNumber ?? m.serial_number,
  purchase_date: m.purchaseDate ?? m.purchase_date,
  installation_date: m.installationDate ?? m.installation_date,
  warranty_expiry: m.warrantyExpiry ?? m.warranty_expiry,
  location: m.location,
  status: m.status,
  criticality: m.criticality,
  meter_unit: m.meterUnit ?? m.meter_unit ?? 'hours',
  current_meter_reading: m.currentMeterReading ?? m.current_meter_reading ?? 0,
  notes: m.notes,
  image_url: m.imageUrl ?? m.image_url,
  created_date: m.createdDate ?? m.created_date,
});

const mapVendor = (v: any): MaintenanceVendor => ({
  id: v.id,
  vendor_code: v.vendorCode ?? v.vendor_code ?? '',
  company_name: v.companyName ?? v.company_name,
  contact_person: v.contactPerson ?? v.contact_person,
  phone: v.phone,
  email: v.email,
  address: v.address,
  gst_number: v.gstNumber ?? v.gst_number,
  service_categories: v.serviceCategories ?? v.service_categories ?? [],
  rating: v.rating,
  status: v.status,
  notes: v.notes,
});

const mapAmc = (a: any): AmcContract => ({
  id: a.id,
  vendor_id: a.vendorId ?? a.vendor_id,
  vendor: a.vendor ? mapVendor(a.vendor) : undefined,
  machine_id: a.machineId ?? a.machine_id,
  machine: a.machine ? mapMachine(a.machine) : undefined,
  contract_number: a.contractNumber ?? a.contract_number,
  start_date: a.startDate ?? a.start_date,
  end_date: a.endDate ?? a.end_date,
  contract_value: a.contractValue ?? a.contract_value,
  coverage_details: a.coverageDetails ?? a.coverage_details,
  visit_frequency_days: a.visitFrequencyDays ?? a.visit_frequency_days,
  max_visits_included: a.maxVisitsIncluded ?? a.max_visits_included,
  visits_used: a.visitsUsed ?? a.visits_used ?? 0,
  status: a.status,
  notes: a.notes,
});

const mapBomTemplate = (t: any): BomTemplate => ({
  id: t.id,
  name: t.name,
  machine_id: t.machineId ?? t.machine_id,
  machine: t.machine ? mapMachine(t.machine) : undefined,
  category_id: t.categoryId ?? t.category_id,
  service_type: t.serviceType ?? t.service_type ?? 'preventive',
  version: t.version ?? 1,
  is_active: t.isActive ?? t.is_active ?? true,
  lines: t.lines?.map(mapBomLine),
  notes: t.notes,
});

const mapBomLine = (l: any): BomLine => ({
  id: l.id,
  raw_material_id: l.rawMaterialId ?? l.raw_material_id,
  raw_material: l.rawMaterial ?? l.raw_material,
  quantity_required: l.quantityRequired ?? l.quantity_required,
  unit: l.unit,
  is_mandatory: l.isMandatory ?? l.is_mandatory ?? true,
  notes: l.notes,
  sort_order: l.sortOrder ?? l.sort_order ?? 0,
});

const mapReminderRule = (r: any): ReminderRule => ({
  id: r.id,
  name: r.name,
  machine_id: r.machineId ?? r.machine_id,
  machine: r.machine ? mapMachine(r.machine) : undefined,
  category_id: r.categoryId ?? r.category_id,
  trigger_type: r.triggerType ?? r.trigger_type ?? 'time_based',
  interval_days: r.intervalDays ?? r.interval_days,
  interval_units: r.intervalUnits ?? r.interval_units,
  advance_notice_days: r.advanceNoticeDays ?? r.advance_notice_days ?? 7,
  priority: r.priority ?? 'medium',
  is_recurring: r.isRecurring ?? r.is_recurring ?? true,
  bom_template_id: r.bomTemplateId ?? r.bom_template_id,
  preferred_vendor_id: r.preferredVendorId ?? r.preferred_vendor_id,
  overdue_notify_after_days: r.overdueNotifyAfterDays ?? r.overdue_notify_after_days ?? 1,
  status: r.status,
});

const mapReminder = (r: any): MaintenanceReminder => ({
  id: r.id,
  rule_id: r.ruleId ?? r.rule_id,
  rule: r.rule ? mapReminderRule(r.rule) : undefined,
  machine_id: r.machineId ?? r.machine_id,
  machine: r.machine ? mapMachine(r.machine) : undefined,
  due_date: r.dueDate ?? r.due_date,
  due_at_meter: r.dueAtMeter ?? r.due_at_meter,
  trigger_type: r.triggerType ?? r.trigger_type,
  status: r.status,
  work_order_id: r.workOrderId ?? r.work_order_id,
  snooze_until: r.snoozeUntil ?? r.snooze_until,
  snooze_count: r.snoozeCount ?? r.snooze_count ?? 0,
});

const mapWorkOrderPart = (p: any): WorkOrderPart => ({
  id: p.id,
  raw_material_id: p.rawMaterialId ?? p.raw_material_id,
  raw_material: p.rawMaterial ?? p.raw_material,
  source: p.source,
  quantity_required: p.quantityRequired ?? p.quantity_required,
  quantity_reserved: p.quantityReserved ?? p.quantity_reserved ?? 0,
  quantity_consumed: p.quantityConsumed ?? p.quantity_consumed ?? 0,
  unit: p.unit,
  status: p.status,
  notes: p.notes,
});

const mapWorkOrder = (wo: any): MaintenanceWorkOrder => ({
  id: wo.id,
  work_order_no: wo.workOrderNo ?? wo.work_order_no,
  machine_id: wo.machineId ?? wo.machine_id,
  machine: wo.machine ? mapMachine(wo.machine) : undefined,
  reminder_id: wo.reminderId ?? wo.reminder_id,
  service_type: wo.serviceType ?? wo.service_type ?? 'preventive',
  title: wo.title,
  description: wo.description,
  priority: wo.priority ?? 'medium',
  status: wo.status,
  on_hold_reason: wo.onHoldReason ?? wo.on_hold_reason,
  assigned_type: wo.assignedType ?? wo.assigned_type ?? 'internal',
  assigned_technician_id: wo.assignedTechnicianId ?? wo.assigned_technician_id,
  assigned_technician: (() => {
    const t = wo.assignedTechnician ?? wo.assigned_technician ?? null;
    if (!t) return undefined;
    return { id: t.id, first_name: t.firstName ?? t.first_name ?? '', last_name: t.lastName ?? t.last_name ?? '' };
  })(),
  assigned_vendor_id: wo.assignedVendorId ?? wo.assigned_vendor_id,
  scheduled_start: wo.scheduledStart ?? wo.scheduled_start,
  scheduled_end: wo.scheduledEnd ?? wo.scheduled_end,
  actual_start: wo.actualStart ?? wo.actual_start,
  actual_end: wo.actualEnd ?? wo.actual_end,
  completion_notes: wo.completionNotes ?? wo.completion_notes,
  estimated_cost: wo.estimatedCost ?? wo.estimated_cost,
  actual_cost: wo.actualCost ?? wo.actual_cost,
  labor_cost: wo.laborCost ?? wo.labor_cost,
  vendor_cost: wo.vendorCost ?? wo.vendor_cost,
  meter_reading_at_service: wo.meterReadingAtService ?? wo.meter_reading_at_service,
  bom_template_id: wo.bomTemplateId ?? wo.bom_template_id,
  parts: wo.parts?.map(mapWorkOrderPart),
  status_logs: wo.statusLogs?.map((l: any) => ({
    id: l.id,
    from_status: l.fromStatus ?? l.from_status,
    to_status: l.toStatus ?? l.to_status,
    reason: l.reason,
    changed_by_employee: (() => {
      const e = l.changedByEmployee ?? l.changed_by_employee ?? null;
      if (!e) return undefined;
      return { id: e.id, first_name: e.firstName ?? e.first_name ?? '', last_name: e.lastName ?? e.last_name ?? '' };
    })(),
    created_date: l.createdDate ?? l.created_date,
  })),
  created_date: wo.createdDate ?? wo.created_date,
});

const mapDowntime = (d: any): DowntimeLog => ({
  id: d.id,
  machine_id: d.machineId ?? d.machine_id,
  machine: d.machine ? mapMachine(d.machine) : undefined,
  work_order_id: d.workOrderId ?? d.work_order_id,
  downtime_start: d.downtimeStart ?? d.downtime_start,
  downtime_end: d.downtimeEnd ?? d.downtime_end,
  duration_minutes: d.durationMinutes ?? d.duration_minutes,
  reason_code: d.reasonCode ?? d.reason_code ?? 'scheduled_maintenance',
  reason_detail: d.reasonDetail ?? d.reason_detail,
  impact: d.impact ?? 'full_stop',
  production_loss_units: d.productionLossUnits ?? d.production_loss_units,
  created_date: d.createdDate ?? d.created_date,
});

// ─── Machines ────────────────────────────────────────────────────────────────

export const getMachineCategories = async () => {
  const res = await apiClient.get('/machines/categories');
  return res.data.data as MachineCategory[];
};

export const getMachines = async (params?: any) => {
  const res = await apiClient.get('/machines', { params });
  return { data: (res.data.data ?? []).map(mapMachine), total: res.data.totalRecords ?? 0 };
};

export const getMachine = async (id: number) => {
  const res = await apiClient.get(`/machines/${id}`);
  return mapMachine(res.data.data);
};

export const createMachine = async (dto: any) => {
  const res = await apiClient.post('/machines', dto);
  return mapMachine(res.data.data);
};

export const updateMachine = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/machines/${id}`, dto);
  return mapMachine(res.data.data);
};

export const deleteMachine = async (id: number) => {
  await apiClient.delete(`/machines/${id}`);
};

export const createMachineCategory = async (dto: any) => {
  const res = await apiClient.post('/machines/categories', dto);
  return res.data.data as MachineCategory;
};

export const updateMeterReading = async (id: number, dto: { readingValue: number; readingDate: string; notes?: string }) => {
  const res = await apiClient.post(`/machines/${id}/meter-reading`, dto);
  return res.data;
};

export const getMachinesDashboard = async () => {
  const res = await apiClient.get('/machines/dashboard');
  return res.data.data as { total: number; active: number; underMaintenance: number; decommissioned: number };
};

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const getMaintenanceVendors = async (params?: any) => {
  const res = await apiClient.get('/maintenance-vendors', { params });
  return { data: (res.data.data ?? []).map(mapVendor), total: res.data.totalRecords ?? 0 };
};

export const getMaintenanceVendor = async (id: number) => {
  const res = await apiClient.get(`/maintenance-vendors/${id}`);
  return mapVendor(res.data.data);
};

export const createMaintenanceVendor = async (dto: any) => {
  const res = await apiClient.post('/maintenance-vendors', dto);
  return mapVendor(res.data.data);
};

export const updateMaintenanceVendor = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/maintenance-vendors/${id}`, dto);
  return mapVendor(res.data.data);
};

export const deleteMaintenanceVendor = async (id: number) => {
  await apiClient.delete(`/maintenance-vendors/${id}`);
};

export const getAmcContracts = async (vendorId?: number) => {
  const res = await apiClient.get('/maintenance-vendors/amc/list', { params: vendorId ? { vendorId } : undefined });
  return (res.data.data ?? []).map(mapAmc) as AmcContract[];
};

export const getExpiringAmcs = async (days = 30) => {
  const res = await apiClient.get('/maintenance-vendors/amc/expiring', { params: { days } });
  return (res.data.data ?? []).map(mapAmc) as AmcContract[];
};

export const createAmcContract = async (dto: any) => {
  const res = await apiClient.post('/maintenance-vendors/amc', dto);
  return mapAmc(res.data.data);
};

export const updateAmcContract = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/maintenance-vendors/amc/${id}`, dto);
  return mapAmc(res.data.data);
};

export const terminateAmcContract = async (id: number) => {
  const res = await apiClient.patch(`/maintenance-vendors/amc/${id}/terminate`);
  return res.data;
};

// ─── BOM Templates ────────────────────────────────────────────────────────────

export const getBomTemplates = async (params?: any) => {
  const res = await apiClient.get('/maintenance-bom', { params });
  return (res.data.data ?? []).map(mapBomTemplate) as BomTemplate[];
};

export const getBomTemplate = async (id: number) => {
  const res = await apiClient.get(`/maintenance-bom/${id}`);
  return mapBomTemplate(res.data.data);
};

export const createBomTemplate = async (dto: any) => {
  const res = await apiClient.post('/maintenance-bom', dto);
  return mapBomTemplate(res.data.data);
};

export const updateBomTemplate = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/maintenance-bom/${id}`, dto);
  return mapBomTemplate(res.data.data);
};

export const deleteBomTemplate = async (id: number) => {
  await apiClient.delete(`/maintenance-bom/${id}`);
};

// ─── Reminders ───────────────────────────────────────────────────────────────

export const getReminderRules = async (params?: any) => {
  const res = await apiClient.get('/maintenance-reminders/rules', { params });
  return (res.data.data ?? []).map(mapReminderRule) as ReminderRule[];
};

export const createReminderRule = async (dto: any) => {
  const res = await apiClient.post('/maintenance-reminders/rules', dto);
  return mapReminderRule(res.data.data);
};

export const updateReminderRule = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/maintenance-reminders/rules/${id}`, dto);
  return mapReminderRule(res.data.data);
};

export const deleteReminderRule = async (id: number) => {
  await apiClient.delete(`/maintenance-reminders/rules/${id}`);
};

export const getReminders = async (params?: any) => {
  const res = await apiClient.get('/maintenance-reminders', { params });
  return (res.data.data ?? []).map(mapReminder) as MaintenanceReminder[];
};

export const snoozeReminder = async (id: number, snoozeUntil: string) => {
  const res = await apiClient.patch(`/maintenance-reminders/${id}/snooze`, { snoozeUntil });
  return res.data;
};

export const cancelReminder = async (id: number) => {
  const res = await apiClient.patch(`/maintenance-reminders/${id}/cancel`);
  return res.data;
};

export const getRemindersDueCount = async () => {
  const res = await apiClient.get('/maintenance-reminders/due-count');
  return res.data.data as { due: number; overdue: number };
};

// ─── Work Orders ─────────────────────────────────────────────────────────────

export const getWorkOrders = async (params?: any) => {
  const res = await apiClient.get('/maintenance-work-orders', { params });
  return { data: (res.data.data ?? []).map(mapWorkOrder), total: res.data.totalRecords ?? 0 };
};

export const getWorkOrder = async (id: number) => {
  const res = await apiClient.get(`/maintenance-work-orders/${id}`);
  return mapWorkOrder(res.data.data);
};

export const createWorkOrder = async (dto: any) => {
  const res = await apiClient.post('/maintenance-work-orders', dto);
  return mapWorkOrder(res.data.data);
};

export const updateWorkOrder = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/maintenance-work-orders/${id}`, dto);
  return mapWorkOrder(res.data.data);
};

export const changeWorkOrderStatus = async (id: number, status: string, reason?: string) => {
  const res = await apiClient.patch(`/maintenance-work-orders/${id}/status`, { status, reason });
  return res.data;
};

export const closeWorkOrder = async (id: number) => {
  const res = await apiClient.patch(`/maintenance-work-orders/${id}/close`);
  return res.data;
};

export const addWorkOrderPart = async (workOrderId: number, dto: any) => {
  const res = await apiClient.post(`/maintenance-work-orders/${workOrderId}/parts`, dto);
  return res.data;
};

export const reservePart = async (partId: number) => {
  const res = await apiClient.patch(`/maintenance-work-orders/parts/${partId}/reserve`);
  return res.data;
};

export const consumePart = async (partId: number, quantityConsumed: number) => {
  const res = await apiClient.patch(`/maintenance-work-orders/parts/${partId}/consume`, { quantityConsumed });
  return res.data;
};

export const removeWorkOrderPart = async (partId: number) => {
  await apiClient.delete(`/maintenance-work-orders/parts/${partId}`);
};

export const getWorkOrdersDashboard = async () => {
  const res = await apiClient.get('/maintenance-work-orders/dashboard');
  return res.data.data as { total: number; open: number; inProgress: number; completed: number; overdue: number };
};

// ─── Downtime ────────────────────────────────────────────────────────────────

export const getDowntimeLogs = async (params?: any) => {
  const res = await apiClient.get('/maintenance-downtime', { params });
  return (res.data.data ?? []).map(mapDowntime) as DowntimeLog[];
};

export const createDowntimeLog = async (dto: any) => {
  const res = await apiClient.post('/maintenance-downtime', dto);
  return mapDowntime(res.data.data);
};

export const updateDowntimeLog = async (id: number, dto: any) => {
  const res = await apiClient.patch(`/maintenance-downtime/${id}`, dto);
  return mapDowntime(res.data.data);
};

export const deleteDowntimeLog = async (id: number) => {
  await apiClient.delete(`/maintenance-downtime/${id}`);
};

export const getDowntimeStats = async (params?: any) => {
  const res = await apiClient.get('/maintenance-downtime/stats', { params });
  return res.data.data as { totalEvents: number; totalMinutes: number; byReason: Record<string, number> };
};

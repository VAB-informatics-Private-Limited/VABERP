import api from './client';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OrganizerContextLink {
  id: number;
  item_id: number;
  entity_type: string;
  entity_id: number;
  label?: string;
  created_at: string;
}

export interface OrganizerActivityLog {
  id: number;
  item_id: number;
  user_id?: number;
  action: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  created_at: string;
}

export interface OrganizerRecurrenceRule {
  id: number;
  item_id: number;
  frequency: string;
  interval_days?: number;
  days_of_week?: number[];
  day_of_month?: number;
  end_date?: string;
  max_occurrences?: number;
  occurrences_generated: number;
  next_run_date: string;
  last_run_date?: string;
}

export interface OrganizerItem {
  id: number;
  enterprise_id: number;
  item_number: string;
  type: string; // task | reminder | follow_up | recurring
  title: string;
  description?: string;
  priority: string; // low | medium | high | critical
  status: string;   // open | in_progress | done | snoozed | cancelled
  assigned_to: number[];
  created_by: number;
  due_date?: string;
  remind_at?: string;
  snoozed_until?: string;
  completed_at?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  context_links?: OrganizerContextLink[];
  activity_log?: OrganizerActivityLog[];
  recurrence_rule?: OrganizerRecurrenceRule;
}

export interface OrganizerTagMaster {
  id: number;
  enterprise_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface OrganizerDashboard {
  open_tasks: number;
  due_today: number;
  overdue: number;
  follow_ups_pending: number;
}

// ─── Mappers ───────────────────────────────────────────────────────────────

const mapLink = (l: any): OrganizerContextLink => ({
  id: l.id,
  item_id: l.itemId ?? l.item_id,
  entity_type: l.entityType ?? l.entity_type ?? '',
  entity_id: l.entityId ?? l.entity_id,
  label: l.label,
  created_at: l.createdAt ?? l.created_at ?? '',
});

const mapLog = (l: any): OrganizerActivityLog => ({
  id: l.id,
  item_id: l.itemId ?? l.item_id,
  user_id: l.userId ?? l.user_id,
  action: l.action ?? '',
  old_value: l.oldValue ?? l.old_value,
  new_value: l.newValue ?? l.new_value,
  comment: l.comment,
  created_at: l.createdAt ?? l.created_at ?? '',
});

const mapRule = (r: any): OrganizerRecurrenceRule => ({
  id: r.id,
  item_id: r.itemId ?? r.item_id,
  frequency: r.frequency ?? '',
  interval_days: r.intervalDays ?? r.interval_days,
  days_of_week: r.daysOfWeek ?? r.days_of_week ?? [],
  day_of_month: r.dayOfMonth ?? r.day_of_month,
  end_date: r.endDate ?? r.end_date,
  max_occurrences: r.maxOccurrences ?? r.max_occurrences,
  occurrences_generated: r.occurrencesGenerated ?? r.occurrences_generated ?? 0,
  next_run_date: r.nextRunDate ?? r.next_run_date ?? '',
  last_run_date: r.lastRunDate ?? r.last_run_date,
});

export const mapItem = (i: any): OrganizerItem => ({
  id: i.id,
  enterprise_id: i.enterpriseId ?? i.enterprise_id,
  item_number: i.itemNumber ?? i.item_number ?? '',
  type: i.type ?? '',
  title: i.title ?? '',
  description: i.description,
  priority: i.priority ?? 'medium',
  status: i.status ?? 'open',
  assigned_to: i.assignedTo ?? i.assigned_to ?? [],
  created_by: i.createdBy ?? i.created_by,
  due_date: i.dueDate ?? i.due_date,
  remind_at: i.remindAt ?? i.remind_at,
  snoozed_until: i.snoozedUntil ?? i.snoozed_until,
  completed_at: i.completedAt ?? i.completed_at,
  tags: i.tags ?? [],
  notes: i.notes,
  created_at: i.createdAt ?? i.created_at ?? '',
  updated_at: i.updatedAt ?? i.updated_at ?? '',
  context_links: i.contextLinks ? i.contextLinks.map(mapLink) : (i.context_links ? i.context_links.map(mapLink) : undefined),
  activity_log: i.activityLog ? i.activityLog.map(mapLog) : (i.activity_log ? i.activity_log.map(mapLog) : undefined),
  recurrence_rule: i.recurrenceRule ? mapRule(i.recurrenceRule) : (i.recurrence_rule ? mapRule(i.recurrence_rule) : undefined),
});

// ─── API Functions ─────────────────────────────────────────────────────────

export interface OrganizerFilters {
  type?: string;
  status?: string;
  priority?: string;
  assignedTo?: number;
  entityType?: string;
  entityId?: number;
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getOrganizerItems(filters: OrganizerFilters = {}): Promise<{ data: OrganizerItem[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
  const res = await api.get(`/organizer?${params.toString()}`);
  const d = res.data;
  return { data: (d.data ?? []).map(mapItem), total: d.total ?? 0, page: d.page ?? 1, limit: d.limit ?? 30 };
}

export async function getOrganizerItem(id: number): Promise<OrganizerItem> {
  const res = await api.get(`/organizer/${id}`);
  return mapItem(res.data);
}

export async function createOrganizerItem(dto: any): Promise<OrganizerItem> {
  const res = await api.post('/organizer', dto);
  return mapItem(res.data.data ?? res.data);
}

export async function updateOrganizerItem(id: number, dto: any): Promise<OrganizerItem> {
  const res = await api.patch(`/organizer/${id}`, dto);
  return mapItem(res.data.data ?? res.data);
}

export async function updateOrganizerStatus(id: number, status: string): Promise<void> {
  await api.patch(`/organizer/${id}/status`, { status });
}

export async function completeOrganizerItem(id: number): Promise<void> {
  await api.post(`/organizer/${id}/complete`);
}

export async function snoozeOrganizerItem(id: number, snoozeUntil: string): Promise<void> {
  await api.post(`/organizer/${id}/snooze`, { snoozeUntil });
}

export async function deleteOrganizerItem(id: number): Promise<void> {
  await api.delete(`/organizer/${id}`);
}

export async function getOrganizerForEntity(entityType: string, entityId: number): Promise<OrganizerItem[]> {
  const res = await api.get(`/organizer/context/${entityType}/${entityId}`);
  return (Array.isArray(res.data) ? res.data : []).map(mapItem);
}

// ─── Tag Master API ────────────────────────────────────────────────────────

export async function getOrganizerTags(): Promise<OrganizerTagMaster[]> {
  const res = await api.get('/organizer/tags');
  return (res.data ?? []).map((t: any): OrganizerTagMaster => ({
    id: t.id,
    enterprise_id: t.enterpriseId ?? t.enterprise_id,
    name: t.name,
    color: t.color ?? 'blue',
    created_at: t.createdAt ?? t.created_at ?? '',
  }));
}

export async function createOrganizerTag(name: string, color: string): Promise<OrganizerTagMaster> {
  const res = await api.post('/organizer/tags', { name, color });
  return { id: res.data.id, enterprise_id: res.data.enterpriseId ?? 0, name: res.data.name, color: res.data.color, created_at: res.data.createdAt ?? '' };
}

export async function deleteOrganizerTag(id: number): Promise<void> {
  await api.delete(`/organizer/tags/${id}`);
}

export async function getOrganizerDashboard(): Promise<OrganizerDashboard> {
  const res = await api.get('/organizer/dashboard');
  const d = res.data;
  return {
    open_tasks: d.openTasks ?? d.open_tasks ?? 0,
    due_today: d.dueToday ?? d.due_today ?? 0,
    overdue: d.overdue ?? 0,
    follow_ups_pending: d.followUpsPending ?? d.follow_ups_pending ?? 0,
  };
}

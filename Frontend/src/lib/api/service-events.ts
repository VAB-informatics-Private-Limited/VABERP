import apiClient from './client';
import type { ServiceEvent } from '@/types/service-event';

function mapServiceEvent(e: any): ServiceEvent {
  return {
    id: e.id,
    enterprise_id: e.enterpriseId ?? e.enterprise_id,
    service_product_id: e.serviceProductId ?? e.service_product_id,
    rule_id: e.ruleId ?? e.rule_id ?? null,
    due_date: e.dueDate ?? e.due_date,
    event_type: e.eventType ?? e.event_type,
    title: e.title,
    description: e.description ?? null,
    price: e.price != null ? parseFloat(e.price) : null,
    status: e.status,
    reminder_count: e.reminderCount ?? e.reminder_count ?? 0,
    last_reminder_at: e.lastReminderAt ?? e.last_reminder_at ?? null,
    assigned_to: e.assignedTo ?? e.assigned_to ?? null,
    assigned_employee: (() => {
      const emp = e.assignedEmployee ?? e.assigned_employee ?? null;
      if (!emp) return null;
      return {
        id: emp.id,
        first_name: emp.firstName ?? emp.first_name ?? '',
        last_name: emp.lastName ?? emp.last_name ?? '',
      };
    })(),
    service_product: e.serviceProduct ?? e.service_product,
    created_date: e.createdDate ?? e.created_date,
    modified_date: e.modifiedDate ?? e.modified_date,
  };
}

export const getServiceEvents = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  eventType?: string;
  fromDate?: string;
  toDate?: string;
  serviceProductId?: number;
}) =>
  apiClient.get('/service-events', { params }).then((r) => ({
    data: (r.data.data ?? []).map(mapServiceEvent) as ServiceEvent[],
    totalRecords: r.data.totalRecords ?? 0,
    page: r.data.page ?? 1,
  }));

export const completeServiceEvent = (id: number) =>
  apiClient.patch(`/service-events/${id}/complete`).then((r) => r.data);

export const assignServiceEvent = (id: number, employeeId: number | null) =>
  apiClient.patch(`/service-events/${id}/assign`, { employeeId }).then((r) => r.data);

export const getServiceEventsPendingCount = () =>
  apiClient.get('/service-events/pending-count').then((r) => r.data.data as { total: number; overdue: number; upcoming: number; booked: number });

export const getEmployeesWithPermission = (module: string) =>
  apiClient.get('/employees/by-permission', { params: { module } }).then((r) =>
    (r.data.data ?? []).map((e: any) => ({
      id: e.id,
      first_name: e.firstName ?? e.first_name ?? '',
      last_name: e.lastName ?? e.last_name ?? '',
      designation_name: e.designation?.name ?? e.designation_name ?? null,
    })),
  );

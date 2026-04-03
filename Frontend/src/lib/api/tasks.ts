import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Task, TaskComment, TaskStats } from '@/types/tasks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTask(t: any): Task {
  return {
    id: t.id,
    task_number: t.task_number,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    assigned_to: t.assigned_to,
    assigned_to_name: t.assigned_to_name,
    assigned_by: t.assigned_by,
    created_by: t.created_by,
    created_by_name: t.created_by_name,
    module: t.module,
    related_entity_type: t.related_entity_type,
    related_entity_id: t.related_entity_id,
    completed_at: t.completed_at,
    created_date: t.created_date,
    modified_date: t.modified_date,
  };
}

export async function getTaskEmployees(): Promise<{ value: number; label: string }[]> {
  const response = await apiClient.get('/tasks/employees');
  const d = response.data as any;
  return (d.data || []).map((e: any) => ({
    value: e.id as number,
    label: `${e.firstName} ${e.lastName}` as string,
  }));
}

export async function getTaskStats(): Promise<ApiResponse<TaskStats>> {
  const response = await apiClient.get('/tasks/stats');
  const d = response.data as any;
  return { message: d.message, data: d.data };
}

export async function getTaskList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: number;
}): Promise<PaginatedResponse<Task>> {
  const response = await apiClient.get('/tasks', {
    params: {
      page: params.page,
      limit: params.pageSize,
      search: params.search || undefined,
      status: params.status || undefined,
      priority: params.priority || undefined,
      assignedTo: params.assignedTo || undefined,
    },
  });
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapTask),
    totalRecords: d.total,
    page: d.page,
    limit: d.limit,
  };
}

export async function getTaskById(id: number): Promise<ApiResponse<Task>> {
  const response = await apiClient.get(`/tasks/${id}`);
  const d = response.data as any;
  return { message: d.message, data: mapTask(d.data) };
}

export async function createTask(payload: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: number;
  module?: string;
}): Promise<ApiResponse<{ id: number; taskNumber: string }>> {
  const response = await apiClient.post('/tasks', payload);
  return response.data;
}

export async function updateTask(id: number, payload: Partial<{
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  module: string;
}>): Promise<ApiResponse> {
  const response = await apiClient.put(`/tasks/${id}`, payload);
  return response.data;
}

export async function updateTaskStatus(id: number, status: string): Promise<ApiResponse> {
  const response = await apiClient.patch(`/tasks/${id}/status`, { status });
  return response.data;
}

export async function assignTask(id: number, assignedTo: number): Promise<ApiResponse> {
  const response = await apiClient.post(`/tasks/${id}/assign`, { assignedTo });
  return response.data;
}

export async function deleteTask(id: number): Promise<ApiResponse> {
  const response = await apiClient.delete(`/tasks/${id}`);
  return response.data;
}

export async function getTaskComments(taskId: number): Promise<ApiResponse<TaskComment[]>> {
  const response = await apiClient.get(`/tasks/${taskId}/comments`);
  const d = response.data as any;
  return { message: d.message, data: d.data || [] };
}

export async function addTaskComment(taskId: number, comment: string): Promise<ApiResponse> {
  const response = await apiClient.post(`/tasks/${taskId}/comments`, { comment });
  return response.data;
}

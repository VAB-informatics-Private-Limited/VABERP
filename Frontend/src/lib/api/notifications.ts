import apiClient from './client';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  module: string;
  sub_module: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCounts {
  totalUnread: number;
  byModule: Record<string, number>;
  bySubModule: Record<string, number>;
}

export const getNotifications = (params?: { page?: number; limit?: number; unread?: boolean }) =>
  apiClient.get<{ data: any[]; total: number }>('/notifications', { params }).then((r) => ({
    ...r.data,
    data: (r.data.data || []).map((n: any): AppNotification => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      module: n.module,
      sub_module: n.subModule ?? n.sub_module ?? null,
      link: n.link ?? null,
      is_read: n.isRead ?? n.is_read ?? false,
      created_at: n.createdAt ?? n.created_at,
    })),
  }));

export const getNotificationCounts = () =>
  apiClient.get<NotificationCounts>('/notifications/counts').then((r) => r.data);

export const markNotificationRead = (id: number) =>
  apiClient.patch(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
  apiClient.patch('/notifications/read-all').then((r) => r.data);

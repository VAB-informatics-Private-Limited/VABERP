'use client';

import { Layout, Button, Dropdown, Badge, List, Typography, Empty, Divider, Spin } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Employee, Enterprise } from '@/types';
import type { MenuProps } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getNotificationCounts,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/api/notifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Header({ collapsed, onToggle }: HeaderProps) {
  const router = useRouter();
  const { user, userType, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const getUserName = () => {
    if (!user) return 'User';
    if (userType === 'employee') {
      const emp = user as Employee;
      return `${emp.first_name} ${emp.last_name}`;
    }
    return (user as Enterprise).business_name;
  };

  const getUserEmail = () => {
    if (!user) return '';
    if (userType === 'employee') return (user as Employee).email;
    return (user as Enterprise).email;
  };

  const getInitials = () => {
    const name = getUserName();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Notifications
  const { data: countsData } = useQuery({
    queryKey: ['notification-counts'],
    queryFn: getNotificationCounts,
    refetchInterval: 30000,
  });

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => getNotifications({ limit: 15 }),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notification-counts'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notification-counts'] });
    },
  });

  const totalUnread = countsData?.totalUnread || 0;
  const notifications: AppNotification[] = notifData?.data || [];

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  const notificationDropdown = (
    <div style={{
      width: 360,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      border: '1px solid #f0f0f0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid #f5f5f5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 14 }}>Notifications</Text>
          {totalUnread > 0 && (
            <Badge count={totalUnread} style={{ background: '#1677ff' }} />
          )}
        </div>
        {totalUnread > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            loading={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
            style={{ fontSize: 12, padding: 0, color: '#1677ff' }}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {notifLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description="No notifications"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '32px 0' }}
          />
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              style={{
                padding: '12px 16px',
                cursor: n.link ? 'pointer' : 'default',
                background: n.is_read ? '#fff' : '#f0f7ff',
                borderBottom: '1px solid #f5f5f5',
                transition: 'background 0.15s',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
              onMouseEnter={(e) => { if (n.link) (e.currentTarget as HTMLDivElement).style.background = n.is_read ? '#fafafa' : '#e6f0ff'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? '#fff' : '#f0f7ff'; }}
            >
              {/* Unread dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: n.is_read ? 'transparent' : '#1677ff',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: '#111827', marginBottom: 2 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {dayjs(n.created_at).fromNow()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5', textAlign: 'center' }}>
          <Button type="link" size="small" style={{ fontSize: 12, color: '#6b7280' }}>
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '4px 0', minWidth: 180 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', lineHeight: 1.4 }}>
            {getUserName()}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {getUserEmail()}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const name = getUserName();
  const email = getUserEmail();

  return (
    <AntHeader
      className="!bg-white !px-4 flex items-center justify-between"
      style={{ borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 0 0 #e2e8f0' }}
    >
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        className="!w-10 !h-10 hover:!bg-slate-100 !rounded-lg !text-slate-600"
      />

      <div className="flex items-center gap-1">
        {/* Bell with notification dropdown */}
        <Dropdown
          dropdownRender={() => notificationDropdown}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            className="!w-10 !h-10 hover:!bg-slate-100 !rounded-lg !text-slate-500 relative"
            style={{ position: 'relative' }}
          >
            <Badge
              count={totalUnread}
              size="small"
              offset={[-2, 2]}
              style={{ boxShadow: 'none' }}
            >
              <BellOutlined style={{ fontSize: 17 }} />
            </Badge>
          </Button>
        </Dropdown>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 6px' }} />

        <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" trigger={['click']}>
          <div
            className="flex items-center gap-3 cursor-pointer rounded-xl transition-all"
            style={{
              padding: '6px 10px 6px 6px',
              border: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9';
              (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
              (e.currentTarget as HTMLDivElement).style.borderColor = '#f1f5f9';
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.02em', flexShrink: 0,
            }}>
              {getInitials()}
            </div>
            <div className="hidden md:block" style={{ lineHeight: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 3,
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {name}
              </div>
              <div style={{
                fontSize: 11, color: '#94a3b8',
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {email}
              </div>
            </div>
            <svg
              className="hidden md:block"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
}

'use client';

import { Layout, Button, Dropdown, Avatar, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Employee, Enterprise } from '@/types';
import type { MenuProps } from 'antd';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Header({ collapsed, onToggle }: HeaderProps) {
  const router = useRouter();
  const { user, userType, logout } = useAuthStore();

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
    if (userType === 'employee') {
      return (user as Employee).email;
    }
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
        <Button
          type="text"
          icon={<BellOutlined />}
          className="!w-10 !h-10 hover:!bg-slate-100 !rounded-lg !text-slate-500"
        />

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
            {/* Avatar with initials */}
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.02em',
              flexShrink: 0,
              fontFamily: "'Inter', sans-serif",
            }}>
              {getInitials()}
            </div>

            {/* Name + email */}
            <div className="hidden md:block" style={{ lineHeight: 1 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: 3,
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {name}
              </div>
              <div style={{
                fontSize: 11,
                color: '#94a3b8',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {email}
              </div>
            </div>

            {/* Chevron */}
            <svg
              className="hidden md:block"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
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

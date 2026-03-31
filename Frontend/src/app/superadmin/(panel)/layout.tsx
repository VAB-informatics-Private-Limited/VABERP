'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  TeamOutlined,
  AccountBookOutlined,
  CrownOutlined,
  CustomerServiceOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  TagOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useSuperAdminStore } from '@/stores/superAdminStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export default function SuperAdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, superAdmin, logout } = useSuperAdminStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/superadmin/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  const navItems = [
    {
      key: '/superadmin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/superadmin/enterprises',
      icon: <BankOutlined />,
      label: 'Enterprises',
    },
    {
      key: '/superadmin/employees',
      icon: <TeamOutlined />,
      label: 'Employees',
    },
    {
      key: '/superadmin/accounts',
      icon: <AccountBookOutlined />,
      label: 'Accounts',
    },
    {
      key: '/superadmin/subscriptions',
      icon: <CrownOutlined />,
      label: 'Subscriptions',
    },
    {
      key: '/superadmin/support',
      icon: <CustomerServiceOutlined />,
      label: 'Support',
    },
    {
      key: '/superadmin/services',
      icon: <AppstoreOutlined />,
      label: 'Services',
    },
    {
      key: '/superadmin/coupons',
      icon: <TagOutlined />,
      label: 'Coupons',
    },
    {
      key: 'resellers-group',
      icon: <UsergroupAddOutlined />,
      label: 'Resellers',
      children: [
        {
          key: '/superadmin/resellers',
          icon: <TeamOutlined />,
          label: 'All Resellers',
        },
        {
          key: '/superadmin/resellers/plans',
          icon: <CrownOutlined />,
          label: 'Plans',
        },
        {
          key: '/superadmin/resellers/subscriptions',
          icon: <AppstoreOutlined />,
          label: 'Subscriptions',
        },
        {
          key: '/superadmin/resellers/wallets',
          icon: <WalletOutlined />,
          label: 'Wallets',
        },
      ],
    },
  ];

  function handleLogout() {
    logout();
    router.replace('/superadmin/login');
  }

  const allLeafItems = navItems.flatMap((item) =>
    'children' in item && item.children ? item.children : [item]
  ).sort((a, b) => b.key.length - a.key.length);
  const selectedKey = allLeafItems.find((item) => pathname === item.key || pathname.startsWith(item.key + '/'))?.key ?? '';
  const openKeys = pathname.startsWith('/superadmin/resellers') ? ['resellers-group'] : [];

  return (
    <Layout className="min-h-screen">
      <Sider
        width={220}
        style={{
          background: '#1e293b',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-white font-semibold text-sm leading-tight">VAB Informatics</div>
              <div className="text-slate-400 text-xs">Super Admin</div>
            </div>
          </div>
        </div>

        <Menu
          key={selectedKey}
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={navItems}
          onClick={({ key }) => { if (!key.endsWith('-group')) router.push(key); }}
          style={{ background: 'transparent', border: 'none', marginTop: 8, overflowY: 'auto' }}
          theme="dark"
        />
      </Sider>

      <Layout style={{ marginLeft: 220 }}>
        <Header
          style={{
            background: '#ffffff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Text strong className="text-slate-700">
            Super Admin Panel
          </Text>
          <div className="flex items-center gap-3">
            <Text type="secondary" className="text-sm">
              {superAdmin?.email}
            </Text>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="small"
              type="text"
              className="text-slate-600"
            >
              Logout
            </Button>
          </div>
        </Header>

        <Content className="p-6 bg-slate-50 min-h-[calc(100vh-64px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

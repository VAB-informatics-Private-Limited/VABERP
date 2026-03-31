'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined,
  CrownOutlined,
  TeamOutlined,
  BarChartOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  WalletOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useResellerStore } from '@/stores/resellerStore';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export default function ResellerPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, reseller, logout, isSubscriptionActive } = useResellerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace('/reseller/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  const navItems = [
    { key: '/reseller/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/reseller/my-subscription', icon: <CrownOutlined />, label: 'My Subscription' },
    { key: '/reseller/wallet', icon: <WalletOutlined />, label: 'Wallet' },
    { key: '/reseller/tenants', icon: <TeamOutlined />, label: 'Tenants' },
    { key: '/reseller/plans', icon: <CreditCardOutlined />, label: 'My Plans' },
    { key: '/reseller/subscriptions', icon: <CreditCardOutlined />, label: 'Subscriptions' },
    { key: '/reseller/usage', icon: <ThunderboltOutlined />, label: 'Usage' },
    { key: '/reseller/billing', icon: <FileTextOutlined />, label: 'Billing' },
    { key: '/reseller/commissions', icon: <DollarOutlined />, label: 'Commissions' },
    { key: '/reseller/reports', icon: <BarChartOutlined />, label: 'Reports' },
    { key: '/reseller/profile', icon: <UserOutlined />, label: 'Profile' },
  ];

  const selectedKey =
    navItems.find((item) => pathname === item.key || pathname.startsWith(item.key + '/'))?.key ?? '';

  function handleLogout() {
    logout();
    router.replace('/reseller/login');
  }

  return (
    <Layout className="min-h-screen">
      <Sider
        width={220}
        style={{ background: '#1e293b', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflowY: 'auto' }}
      >
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-white font-semibold text-sm leading-tight">VAB Informatics</div>
              <div className="text-slate-400 text-xs">Reseller Portal</div>
            </div>
          </div>
        </div>

        <Menu
          key={selectedKey}
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => router.push(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
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
          <Text strong className="text-slate-700">Reseller Portal</Text>
          <div className="flex items-center gap-3">
            <Text type="secondary" className="text-sm">{reseller?.name}</Text>
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

        <Content
          className="p-6 bg-slate-50 min-h-[calc(100vh-64px)]"
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

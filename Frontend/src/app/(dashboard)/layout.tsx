'use client';

import { useState, useEffect } from 'react';
import { Layout, Drawer } from 'antd';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';

const { Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSubscriptionActive, userType } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <ProtectedRoute>
      <Layout className="min-h-screen">
        {!isMobile && (
          <div className="no-print">
            <Sidebar collapsed={collapsed} />
          </div>
        )}
        {isMobile && (
          <Drawer
            placement="left"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            width={260}
            styles={{ body: { padding: 0 } }}
            closable={false}
          >
            <Sidebar collapsed={false} inDrawer onMenuClick={() => setMobileOpen(false)} />
          </Drawer>
        )}
        <Layout
          className="print:!ml-0"
          style={{
            marginLeft: isMobile ? 0 : (collapsed ? 80 : 240),
            transition: 'margin-left 0.2s',
          }}
        >
          <div className="no-print">
            <Header
              collapsed={isMobile ? !mobileOpen : collapsed}
              onToggle={() => {
                if (isMobile) {
                  setMobileOpen(!mobileOpen);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
            />
          </div>
          <Content
            className="p-3 md:p-6 bg-[#f0f4f8] min-h-[calc(100vh-64px)]"
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ProtectedRoute>
  );
}

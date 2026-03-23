'use client';

import { Layout, Menu, Badge } from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  AppstoreOutlined,
  InboxOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  PhoneOutlined,
  UserOutlined,
  DollarOutlined,
  FileDoneOutlined,
  ToolOutlined,
  ShoppingOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getPermissions } from '@/lib/api/auth';
import { normalizePermissions } from '@/lib/api/employees';
import { getMaterialRequestList } from '@/lib/api/material-requests';
import { MenuPermissions } from '@/types/auth';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  inDrawer?: boolean;
  onMenuClick?: () => void;
}

function buildHasPermission(permissions: MenuPermissions | null, userType: string | null) {
  const canView = (module: string, submodule?: string): boolean => {
    if (userType === 'enterprise') return true;
    if (!permissions) return false;
    const modulePerms = permissions[module];
    if (!modulePerms) return false;
    if (submodule) {
      return modulePerms[submodule]?.['view'] === 1;
    }
    return Object.values(modulePerms).some(
      (subPerms) => Object.values(subPerms as Record<string, number>).some((v) => v === 1)
    );
  };
  return canView;
}

export function Sidebar({ collapsed, inDrawer, onMenuClick }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userType, permissions: cachedPermissions, setPermissions } = useAuthStore();

  // Always fetch live permissions from server for employees so that
  // admin-granted permissions are reflected without requiring re-login
  const { data: serverPermsRes } = useQuery({
    queryKey: ['my-permissions'],
    queryFn: () => getPermissions(),
    enabled: userType === 'employee',
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Sync server permissions into the store (in useEffect to avoid render-time setState)
  useEffect(() => {
    if (userType === 'employee' && serverPermsRes?.data) {
      setPermissions(normalizePermissions(serverPermsRes.data));
    }
  }, [serverPermsRes, userType, setPermissions]);

  // For rendering: use fresh server permissions for employees, cached for enterprise
  const activePermissions: MenuPermissions | null =
    userType === 'employee' && serverPermsRes?.data
      ? normalizePermissions(serverPermsRes.data)
      : cachedPermissions;

  const canView = buildHasPermission(activePermissions, userType);

  const { data: mrData } = useQuery({
    queryKey: ['material-requests-pending-count'],
    queryFn: () => getMaterialRequestList({ pageSize: 100, status: 'pending' }),
    refetchInterval: 60000,
  });
  const pendingMRCount = mrData?.data?.length || 0;

  // Build Sales submenu — only include items the employee has view access to
  const salesChildren = [
    canView('enquiry', 'enquiries') && { key: '/enquiries', label: 'Enquiries' },
    canView('enquiry', 'follow_ups') && { key: '/follow-ups', label: 'Follow-ups' },
    canView('sales', 'quotations') && { key: '/quotations', label: 'Quotations' },
    canView('orders', 'purchase_orders') && { key: '/purchase-orders', label: 'Purchase Orders' },
  ].filter(Boolean);

  const productsChildren = [
    canView('catalog', 'products') && { key: '/products', label: 'All Products' },
    canView('catalog', 'categories') && { key: '/products/categories', label: 'Categories' },
    canView('catalog', 'subcategories') && { key: '/products/subcategories', label: 'Subcategories' },
  ].filter(Boolean);

  const inventoryChildren = [
    canView('inventory', 'raw_materials') && { key: '/inventory', label: 'Raw Materials' },
    canView('inventory', 'stock_ledger') && { key: '/inventory/ledger', label: 'Stock Ledger' },
    canView('inventory', 'material_requests') && {
      key: '/material-requests',
      label: <span>Material Requests {pendingMRCount > 0 && <Badge count={pendingMRCount} size="small" offset={[4, -2]} />}</span>,
    },
  ].filter(Boolean);

  const procurementChildren = [
    canView('procurement', 'indents') && { key: '/procurement/indents', label: 'Indents' },
    canView('procurement', 'suppliers') && { key: '/procurement/suppliers', label: 'Suppliers' },
  ].filter(Boolean);

  const manufacturingChildren = [
    canView('orders', 'manufacturing') && { key: '/manufacturing', label: 'Overview' },
    canView('orders', 'manufacturing') && { key: '/manufacturing/stages', label: 'Stages' },
    canView('orders', 'manufacturing') && { key: '/manufacturing/processes', label: 'Process Templates' },
  ].filter(Boolean);

  const employeesChildren = [
    canView('employees', 'all_employees') && { key: '/employees', label: 'All Employees' },
    canView('employees', 'departments') && { key: '/employees/departments', label: 'Departments' },
    canView('employees', 'designations') && { key: '/employees/designations', label: 'Designations' },
  ].filter(Boolean);

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    salesChildren.length > 0 && {
      key: 'sales-menu',
      icon: <ShoppingCartOutlined />,
      label: 'Sales',
      children: salesChildren,
    },
    canView('orders', 'manufacturing') && {
      key: 'manufacture-status-menu',
      icon: <CarOutlined />,
      label: 'Manufacture Status',
      children: [
        { key: '/manufacture-status', label: 'Status Dashboard' },
        { key: '/manufacture-status/dispatched', label: 'Dispatched Orders' },
      ],
    },
    canView('sales', 'customers') && {
      key: '/customers',
      icon: <TeamOutlined />,
      label: 'Customers',
    },
    productsChildren.length > 0 && {
      key: 'products-menu',
      icon: <AppstoreOutlined />,
      label: 'Products',
      children: productsChildren,
    },
    inventoryChildren.length > 0 && {
      key: 'inventory-menu',
      icon: <InboxOutlined />,
      label: 'Inventory',
      children: inventoryChildren,
    },
    procurementChildren.length > 0 && {
      key: 'procurement-menu',
      icon: <ShoppingOutlined />,
      label: 'Procurement',
      children: procurementChildren,
    },
    manufacturingChildren.length > 0 && {
      key: 'manufacturing-menu',
      icon: <ToolOutlined />,
      label: 'Manufacturing',
      children: manufacturingChildren,
    },
    employeesChildren.length > 0 && {
      key: 'employees-menu',
      icon: <UserOutlined />,
      label: 'Employees',
      children: employeesChildren,
    },
    canView('reports') && {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    canView('reports') && {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    canView('configurations') && {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ].filter(Boolean) as MenuProps['items'];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(key);
    onMenuClick?.();
  };

  // Get selected keys from pathname
  const selectedKeys = [pathname];
  const openKeys = menuItems
    ?.filter((item): item is { key: string; children?: { key: string }[] } =>
      Boolean(item && 'children' in item && item.children)
    )
    .filter((item) => item.children?.some((child) => pathname.startsWith(child.key)))
    .map((item) => item.key) || [];

  const menuContent = (
    <>
      <div className="h-16 flex items-center border-b border-slate-200 px-4">
        {collapsed ? (
          <img src="/logo-icon.png" alt="VAB Informatics" className="w-8 h-8 object-contain mx-auto" />
        ) : (
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="VAB Informatics" className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-gray-800 text-sm tracking-tight">VAB Informatics</span>
              <span className="text-gray-400 text-[9px] tracking-widest uppercase">Private Limited</span>
            </div>
          </div>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={openKeys}
        onClick={handleMenuClick}
        items={menuItems}
        className="border-none sidebar-menu"
      />
    </>
  );

  if (inDrawer) {
    return <div className="h-full bg-white overflow-auto">{menuContent}</div>;
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="!bg-white border-r border-slate-200"
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      {menuContent}
    </Sider>
  );
}

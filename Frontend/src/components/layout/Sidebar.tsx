'use client';

import { Layout, Menu, Badge } from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  InboxOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  DollarOutlined,
  FileDoneOutlined,
  ToolOutlined,
  ShoppingOutlined,
  TeamOutlined,
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
    enabled: userType === 'enterprise' || canView('inventory', 'material_requests'),
  });
  const pendingMRCount = mrData?.data?.length || 0;

  // ── 1. SALES ─────────────────────────────────────────────────────────────
  // Enquiries, Follow-ups, Customers, Quotations
  const salesChildren = [
    canView('enquiry', 'enquiries')   && { key: '/enquiries',  label: 'Enquiries' },
    canView('enquiry', 'follow_ups')  && { key: '/follow-ups', label: 'Follow-ups' },
    canView('sales',   'customers')   && { key: '/customers',  label: 'Customers' },
    canView('sales',   'quotations')  && { key: '/quotations', label: 'Quotations' },
  ].filter(Boolean);

  // ── CRM ──────────────────────────────────────────────────────────────────
  const crmChildren = [
    canView('crm', 'reports')    && { key: '/crm/reports',      label: 'Performance' },
    canView('crm', 'settings')   && { key: '/crm/team',         label: 'Team'        },
  ].filter(Boolean);

  // ── 2. ORDERS ────────────────────────────────────────────────────────────
  // Purchase Orders (sales-side) + Sales Orders
  const ordersChildren = [
    canView('orders', 'purchase_orders') && { key: '/purchase-orders', label: 'Purchase Orders' },
    canView('orders', 'sales_orders')    && { key: '/sales-orders',    label: 'Sales Orders' },
  ].filter(Boolean);

  // ── 3. MANUFACTURING ─────────────────────────────────────────────────────
  // Overview, Job Cards, Process Templates, Dispatch Status, Dispatched Orders
  const manufacturingChildren = [
    canView('orders', 'manufacturing') && { key: '/manufacturing',                label: 'Overview' },
    canView('orders', 'job_cards')     && { key: '/manufacturing/stages',         label: 'Job Cards' },
    canView('orders', 'manufacturing') && { key: '/manufacturing/processes',      label: 'Process Templates' },
    canView('orders', 'manufacturing') && { key: '/manufacture-status',           label: 'Dispatch Status' },
    canView('orders', 'manufacturing') && { key: '/manufacture-status/dispatched',label: 'Dispatched Orders' },
  ].filter(Boolean);

  // ── 4. PRODUCTS ──────────────────────────────────────────────────────────
  const productsChildren = [
    canView('catalog', 'products')      && { key: '/products',               label: 'All Products' },
    canView('catalog', 'categories')    && { key: '/products/categories',    label: 'Categories' },
    canView('catalog', 'subcategories') && { key: '/products/subcategories', label: 'Subcategories' },
  ].filter(Boolean);

  // ── 5. INVENTORY ─────────────────────────────────────────────────────────
  const inventoryChildren = [
    canView('inventory', 'raw_materials')  && { key: '/inventory',               label: 'Raw Materials' },
    canView('inventory', 'stock_ledger')   && { key: '/inventory/ledger',        label: 'Stock Ledger' },
    canView('inventory', 'material_requests') && {
      key: '/material-requests',
      label: (
        <span>
          Material Requests
          {pendingMRCount > 0 && <Badge count={pendingMRCount} size="small" offset={[4, -2]} />}
        </span>
      ),
    },
    canView('inventory', 'goods_receipts') && { key: '/inventory/goods-receipts', label: 'Goods Receipts (GRN)' },
  ].filter(Boolean);

  // ── 6. PROCUREMENT ───────────────────────────────────────────────────────
  // Indents, RFQ Quotations, Vendors — Purchase Orders moved to Orders group
  const procurementChildren = [
    canView('procurement', 'indents')   && { key: '/procurement/indents',         label: 'Indents' },
    canView('procurement', 'rfqs')      && { key: '/procurement/rfq-quotations',  label: 'RFQ Quotations' },
    canView('procurement', 'suppliers') && { key: '/procurement/suppliers',       label: 'Vendors' },
  ].filter(Boolean);

  // ── 7. INVOICING ─────────────────────────────────────────────────────────
  const invoicingChildren = [
    canView('invoicing', 'invoices')  && { key: '/invoices',  label: 'Invoices' },
    canView('invoicing', 'payments')  && { key: '/payments',  label: 'Payments' },
  ].filter(Boolean);

  // ── 8. EMPLOYEES ─────────────────────────────────────────────────────────
  const employeesChildren = [
    canView('employees', 'all_employees') && { key: '/employees',              label: 'All Employees' },
    canView('employees', 'departments')   && { key: '/employees/departments',  label: 'Departments' },
    canView('employees', 'designations')  && { key: '/employees/designations', label: 'Designations' },
  ].filter(Boolean);

  // ── 9. REPORTS ───────────────────────────────────────────────────────────
  const reportsChildren = [
    canView('reports', 'dashboard_reports') && { key: '/analytics', label: 'Analytics' },
    canView('reports', 'enquiry_reports')   && { key: '/reports',   label: 'Enquiry Reports' },
  ].filter(Boolean);

  // ── MENU ASSEMBLY ────────────────────────────────────────────────────────
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
    crmChildren.length > 0 && {
      key: 'crm-menu',
      icon: <TeamOutlined />,
      label: 'CRM',
      children: crmChildren,
    },
    ordersChildren.length > 0 && {
      key: 'orders-menu',
      icon: <FileDoneOutlined />,
      label: 'Orders',
      children: ordersChildren,
    },
    manufacturingChildren.length > 0 && {
      key: 'manufacturing-menu',
      icon: <ToolOutlined />,
      label: 'Manufacturing',
      children: manufacturingChildren,
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
    invoicingChildren.length > 0 && {
      key: 'invoicing-menu',
      icon: <DollarOutlined />,
      label: 'Invoicing',
      children: invoicingChildren,
    },
    employeesChildren.length > 0 && {
      key: 'employees-menu',
      icon: <UserOutlined />,
      label: 'Employees',
      children: employeesChildren,
    },
    reportsChildren.length > 0 && {
      key: 'reports-menu',
      icon: <BarChartOutlined />,
      label: 'Reports',
      children: reportsChildren,
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

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
  CheckSquareOutlined,
  BellOutlined,
  SendOutlined,
  CustomerServiceOutlined,
  WarningFilled,
  DeleteOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getPermissions } from '@/lib/api/auth';
import { normalizePermissions } from '@/lib/api/employees';
import { getMaterialRequestList } from '@/lib/api/material-requests';
import { getNotificationCounts } from '@/lib/api/notifications';
import { getServiceEventsPendingCount } from '@/lib/api/service-events';
import { MenuPermissions } from '@/types/auth';
import { useBrandingStore } from '@/stores/brandingStore';
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
  const { userType, permissions: cachedPermissions, setPermissions, user } = useAuthStore();
  const isReportingHead = userType === 'employee' && !!(user as any)?.is_reporting_head;
  const hasManager = userType === 'employee' && !!(user as any)?.reporting_to;

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

  const { data: notifCounts } = useQuery({
    queryKey: ['sidebar-notification-counts'],
    queryFn: getNotificationCounts,
    refetchInterval: 30000,
  });

  const { data: servicePending } = useQuery({
    queryKey: ['sidebar-service-pending'],
    queryFn: getServiceEventsPendingCount,
    refetchInterval: 60000,
    enabled: canView('service_management', 'service_events'),
  });

  // Map backend module keys → sidebar menu keys
  const MODULE_MENU_MAP: Record<string, string> = {
    orders: 'orders-menu',
    inventory: 'inventory-menu',
    procurement: 'procurement-menu',
    manufacturing: 'manufacturing-menu',
    invoicing: 'invoicing-menu',
    sales: 'sales-menu',
    dispatch: 'dispatch-menu',
  };
  // Map backend sub_module keys → sidebar path keys
  const SUBMODULE_PATH_MAP: Record<string, string> = {
    'purchase-orders': '/purchase-orders',
    'material-requests': '/material-requests',
    indents: '/procurement/indents',
    'rfq-quotations': '/procurement/rfq-quotations',
    'job-cards': '/manufacturing/stages',
    invoices: '/invoices',
    payments: '/payments',
    quotations: '/quotations',
    'goods-receipts': '/inventory/goods-receipts',
  };

  // Helper: badge count for a menu key
  const menuBadge = (menuKey: string): number => {
    if (!notifCounts) return 0;
    // Check if it's a module key (e.g. 'orders-menu')
    for (const [mod, mk] of Object.entries(MODULE_MENU_MAP)) {
      if (mk === menuKey) return notifCounts.byModule?.[mod] || 0;
    }
    // Check if it's a path key (e.g. '/purchase-orders')
    for (const [sub, path] of Object.entries(SUBMODULE_PATH_MAP)) {
      if (path === menuKey) return notifCounts.bySubModule?.[sub] || 0;
    }
    return 0;
  };

  const withBadge = (label: string, menuKey: string) => {
    const count = menuBadge(menuKey);
    if (count === 0) return label;
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        <Badge count={count} size="small" style={{ boxShadow: 'none', fontSize: 10 }} />
      </span>
    );
  };

  // ── 1. SALES ─────────────────────────────────────────────────────────────
  const salesChildren = [
    canView('enquiry', 'enquiries')   && { key: '/enquiries',  label: withBadge('Enquiries', '/enquiries') },
    canView('enquiry', 'follow_ups')  && { key: '/follow-ups', label: withBadge('Follow-ups', '/follow-ups') },
    canView('sales',   'customers')   && { key: '/customers',  label: withBadge('Customers', '/customers') },
    canView('sales',   'quotations')  && { key: '/quotations', label: withBadge('Quotations', '/quotations') },
  ].filter(Boolean);

  // ── 2. ORDERS ────────────────────────────────────────────────────────────
  const ordersChildren = [
    canView('orders', 'purchase_orders') && { key: '/purchase-orders', label: withBadge('Purchase Orders', '/purchase-orders') },
    canView('orders', 'sales_orders')    && { key: '/sales-orders',    label: withBadge('Sales Orders', '/sales-orders') },
  ].filter(Boolean);

  // ── 3. MANUFACTURING ─────────────────────────────────────────────────────
  const manufacturingChildren = [
    canView('orders', 'manufacturing') && { key: '/manufacturing',           label: 'Overview' },
    canView('orders', 'job_cards')     && { key: '/manufacturing/stages',    label: withBadge('Job Cards', '/manufacturing/stages') },
  ].filter(Boolean);

  // ── DISPATCH ─────────────────────────────────────────────────────────────
  const dispatchChildren = [
    canView('orders', 'manufacturing') && { key: '/manufacture-status',            label: 'Dispatch Status' },
    canView('orders', 'manufacturing') && { key: '/manufacture-status/dispatched', label: 'Dispatched Orders' },
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Material Requests
          {pendingMRCount > 0 && <Badge count={pendingMRCount} size="small" style={{ boxShadow: 'none', fontSize: 10 }} />}
        </span>
      ),
    },
    canView('inventory', 'goods_receipts') && { key: '/inventory/goods-receipts', label: withBadge('Goods Receipts (GRN)', '/inventory/goods-receipts') },
  ].filter(Boolean);

  // ── 6. PROCUREMENT ───────────────────────────────────────────────────────
  const procurementChildren = [
    canView('procurement', 'indents')   && { key: '/procurement/indents',         label: withBadge('Indents', '/procurement/indents') },
    canView('procurement', 'rfqs')      && { key: '/procurement/rfq-quotations',  label: withBadge('RFQ Quotations', '/procurement/rfq-quotations') },
    canView('procurement', 'suppliers') && { key: '/procurement/suppliers',       label: 'Vendors' },
  ].filter(Boolean);

  // ── 7. INVOICING ─────────────────────────────────────────────────────────
  const invoicingChildren = [
    canView('invoicing', 'invoices')           && { key: '/invoices',           label: withBadge('Invoices', '/invoices') },
    canView('invoicing', 'payments')           && { key: '/payments',           label: withBadge('Payments', '/payments') },
  ].filter(Boolean);

  // ── 8. EMPLOYEES ─────────────────────────────────────────────────────────
  const employeesChildren = [
    canView('employees', 'all_employees') && { key: '/employees',              label: 'All Employees' },
    canView('employees', 'departments')   && { key: '/employees/departments',  label: 'Departments' },
    canView('employees', 'designations')  && { key: '/employees/designations', label: 'Designations' },
  ].filter(Boolean);

  // ── AFTER-SALES ──────────────────────────────────────────────────────────
  const serviceEventsBadgeCount = (servicePending?.total ?? 0) + (servicePending?.booked ?? 0);
  const afterSalesChildren = [
    canView('service_management', 'service_products') && { key: '/service-products', label: 'Registered Products' },
    canView('service_management', 'service_events') && {
      key: '/service-events',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Lifecycle Events
          {serviceEventsBadgeCount > 0 && (
            <Badge
              count={serviceEventsBadgeCount}
              size="small"
              color={(servicePending?.overdue ?? 0) > 0 ? '#ff4d4f' : '#fa8c16'}
              style={{ boxShadow: 'none', fontSize: 10 }}
            />
          )}
        </span>
      ),
    },
    canView('service_management', 'service_bookings') && { key: '/service-bookings', label: 'Service Bookings' },
    canView('service_management', 'service_revenue')  && { key: '/service-revenue',  label: 'Service Revenue' },
  ].filter(Boolean);

  // ── MACHINERY MAINTENANCE ─────────────────────────────────────────────────
  const machineryChildren = [
    canView('machinery_management', 'machines')       && { key: '/machinery',                 label: 'Machines' },
    canView('machinery_management', 'work_orders')    && { key: '/maintenance-work-orders',   label: 'Work Orders' },
    canView('machinery_management', 'reminder_rules') && { key: '/maintenance-reminders',     label: 'Reminders' },
    canView('machinery_management', 'vendors')        && { key: '/maintenance-vendors',       label: 'Vendors & AMC' },
  ].filter(Boolean);

  // ── WASTE MANAGEMENT ──────────────────────────────────────────────────────
  const wasteManagementChildren = [
    canView('waste_management', 'waste_inventory') && { key: '/waste-inventory', label: 'Waste Inventory' },
    canView('waste_management', 'waste_disposal')  && { key: '/waste-disposal',  label: 'Wastage Disposal' },
    canView('waste_management', 'waste_parties')   && { key: '/waste-parties',   label: 'Vendors & Customers' },
    canView('waste_management', 'waste_analytics') && { key: '/waste-analytics', label: 'Analytics' },
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
      label: withBadge('Sales', 'sales-menu'),
      children: salesChildren,
    },
    ordersChildren.length > 0 && {
      key: 'orders-menu',
      icon: <FileDoneOutlined />,
      label: withBadge('Orders', 'orders-menu'),
      children: ordersChildren,
    },
    manufacturingChildren.length > 0 && {
      key: 'manufacturing-menu',
      icon: <ToolOutlined />,
      label: withBadge('Manufacturing', 'manufacturing-menu'),
      children: manufacturingChildren,
    },
    dispatchChildren.length > 0 && {
      key: 'dispatch-menu',
      icon: <SendOutlined />,
      label: withBadge('Dispatch', 'dispatch-menu'),
      children: dispatchChildren,
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
      label: withBadge('Inventory', 'inventory-menu'),
      children: inventoryChildren,
    },
    procurementChildren.length > 0 && {
      key: 'procurement-menu',
      icon: <ShoppingOutlined />,
      label: withBadge('Procurement', 'procurement-menu'),
      children: procurementChildren,
    },
    invoicingChildren.length > 0 && {
      key: 'invoicing-menu',
      icon: <DollarOutlined />,
      label: withBadge('Invoicing', 'invoicing-menu'),
      children: invoicingChildren,
    },
    employeesChildren.length > 0 && {
      key: 'employees-menu',
      icon: <UserOutlined />,
      label: 'Employees',
      children: employeesChildren,
    },
    afterSalesChildren.length > 0 && {
      key: 'after-sales-menu',
      icon: (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <CustomerServiceOutlined />
          {(servicePending?.overdue ?? 0) > 0 && (
            <WarningFilled
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                fontSize: 10,
                color: '#faad14',
              }}
            />
          )}
        </span>
      ),
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          After-Sales
          {(servicePending?.overdue ?? 0) > 0 && (
            <Badge
              count={servicePending!.overdue}
              size="small"
              color="#ff4d4f"
              style={{ boxShadow: 'none', fontSize: 10 }}
            />
          )}
        </span>
      ),
      children: afterSalesChildren,
    },
    machineryChildren.length > 0 && {
      key: 'machinery-menu',
      icon: <ToolOutlined />,
      label: 'Machinery',
      children: machineryChildren,
    },
    wasteManagementChildren.length > 0 && {
      key: 'waste-management',
      icon: <DeleteOutlined />,
      label: 'Waste Management',
      children: wasteManagementChildren,
    },
    (userType === 'enterprise' || canView('organizer', 'items')) && {
      key: '/organizer',
      icon: <CalendarOutlined />,
      label: 'Organizer',
    },
    reportsChildren.length > 0 && {
      key: 'reports-menu',
      icon: <BarChartOutlined />,
      label: 'Reports',
      children: reportsChildren,
    },
    isReportingHead && {
      key: '/team',
      icon: <TeamOutlined />,
      label: 'My Team',
    },
    hasManager && {
      key: '/manager-updates',
      icon: <BellOutlined />,
      label: 'Manager Updates',
    },
    canView('configurations') && {
      key: 'settings-menu',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        { key: '/settings', label: 'General Settings' },
        { key: '/settings/branding', label: 'Branding' },
        canView('service_management', 'product_types') && { key: '/settings/product-types', label: 'Product Types' },
      ].filter(Boolean),
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

  const brandingData = useBrandingStore((s) => s.branding);
  const brandLogo = brandingData?.logo_url || '/logo-icon.png';
  const brandLogoSmall = brandingData?.logo_small_url || brandingData?.logo_url || '/logo-icon.png';
  const brandName = brandingData?.app_name || 'VAB Informatics';

  const menuContent = (
    <>
      <div className="h-16 flex items-center border-b border-slate-200 px-4">
        {collapsed ? (
          <img src={brandLogoSmall} alt={brandName} className="w-8 h-8 object-contain mx-auto" />
        ) : (
          <div className="flex items-center gap-2.5">
            <img src={brandLogo} alt={brandName} className="w-8 h-8 object-contain flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-gray-800 text-sm tracking-tight">{brandName}</span>
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

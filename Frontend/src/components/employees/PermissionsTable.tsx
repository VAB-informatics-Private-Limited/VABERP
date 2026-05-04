'use client';

import { Collapse, Checkbox, Switch, Tag, Tooltip } from 'antd';
import {
  ShoppingCartOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  ToolOutlined,
  InboxOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
  ShoppingOutlined,
  UserOutlined,
  EyeOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  CalendarOutlined,
  TeamOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import React from 'react';
import { MenuPermissions } from '@/types/auth';

const ACTIONS = [
  { key: 'view', label: 'View', icon: <EyeOutlined />, color: '#1677ff' },
  { key: 'create', label: 'Create', icon: <PlusCircleOutlined />, color: '#52c41a' },
  { key: 'edit', label: 'Edit', icon: <EditOutlined />, color: '#faad14' },
  { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, color: '#ff4d4f' },
  { key: 'approve', label: 'Approve', icon: <CheckCircleOutlined />, color: '#722ed1' },
] as const;

type ActionKey = typeof ACTIONS[number]['key'];

const MODULES = [
  {
    key: 'sales',
    label: 'Sales',
    icon: <ShoppingCartOutlined />,
    color: '#1677ff',
    submodules: [
      { key: 'customers', label: 'Customers', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'quotations', label: 'Quotations', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'enquiry',
    label: 'Enquiries',
    icon: <PhoneOutlined />,
    color: '#13c2c2',
    submodules: [
      { key: 'enquiries', label: 'Enquiries', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'follow_ups', label: 'Follow-ups', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'orders',
    label: 'Orders & Manufacturing',
    icon: <ToolOutlined />,
    color: '#fa8c16',
    submodules: [
      { key: 'purchase_orders', label: 'Purchase Orders', actions: ['view', 'create', 'edit', 'delete', 'approve'] as ActionKey[] },
      { key: 'sales_orders', label: 'Sales Orders', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'manufacturing', label: 'Manufacturing', actions: ['view', 'create', 'edit', 'delete', 'approve'] as ActionKey[] },
      { key: 'job_cards', label: 'Job Cards', actions: ['view', 'create', 'edit', 'delete', 'approve'] as ActionKey[] },
      { key: 'bom', label: 'BOM', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'catalog',
    label: 'Product Catalog',
    icon: <AppstoreOutlined />,
    color: '#eb2f96',
    submodules: [
      { key: 'products', label: 'Products', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'categories', label: 'Categories', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'subcategories', label: 'Subcategories', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: <InboxOutlined />,
    color: '#52c41a',
    submodules: [
      { key: 'raw_materials', label: 'Raw Materials', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'stock_ledger', label: 'Stock Ledger', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'material_requests', label: 'Material Requests', actions: ['view', 'create', 'edit', 'delete', 'approve'] as ActionKey[] },
    ],
  },
  {
    key: 'procurement',
    label: 'Procurement',
    icon: <ShoppingOutlined />,
    color: '#2f54eb',
    submodules: [
      { key: 'indents', label: 'Indents', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'suppliers', label: 'Suppliers', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'invoicing',
    label: 'Invoicing',
    icon: <DollarOutlined />,
    color: '#faad14',
    submodules: [
      { key: 'invoices', label: 'Invoices', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'payments', label: 'Payments', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'employees',
    label: 'Employees',
    icon: <UserOutlined />,
    color: '#722ed1',
    submodules: [
      { key: 'all_employees', label: 'All Employees', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'departments', label: 'Departments', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'designations', label: 'Designations', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'permissions', label: 'Permissions', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    icon: <BarChartOutlined />,
    color: '#13c2c2',
    submodules: [
      { key: 'dashboard_reports', label: 'Dashboard Reports', actions: ['view'] as ActionKey[] },
      { key: 'enquiry_reports', label: 'Enquiry Reports', actions: ['view'] as ActionKey[] },
      { key: 'manufacturing_reports', label: 'Manufacturing Reports', actions: ['view'] as ActionKey[] },
    ],
  },
  {
    key: 'configurations',
    label: 'Settings & Configurations',
    icon: <SettingOutlined />,
    color: '#8c8c8c',
    submodules: [
      { key: 'stage_masters', label: 'Stage Masters', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'unit_masters', label: 'Unit Masters', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'sources', label: 'Sources', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'email_templates', label: 'Email Templates', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'service_management',
    label: 'After-Sales Service',
    icon: <CustomerServiceOutlined />,
    color: '#0891b2',
    submodules: [
      { key: 'product_types', label: 'Product Types', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'service_products', label: 'Registered Products', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'service_events', label: 'Lifecycle Events', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'service_bookings', label: 'Service Bookings', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'service_revenue', label: 'Service Revenue', actions: ['view'] as ActionKey[] },
    ],
  },
  {
    key: 'machinery_management',
    label: 'Machinery Maintenance',
    icon: <ToolOutlined />,
    color: '#7c3aed',
    submodules: [
      { key: 'machines', label: 'Machines', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'work_orders', label: 'Work Orders', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'reminder_rules', label: 'Reminders', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'vendors', label: 'Vendors & AMC', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'bom_templates', label: 'BOM Templates', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'downtime', label: 'Downtime Logs', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'waste_management',
    label: 'Waste Management',
    icon: <DeleteOutlined />,
    color: '#16a34a',
    submodules: [
      { key: 'waste_inventory', label: 'Waste Inventory', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'waste_disposal', label: 'Wastage Disposal', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'waste_parties', label: 'Vendors & Customers', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'waste_analytics', label: 'Analytics', actions: ['view'] as ActionKey[] },
    ],
  },
  {
    key: 'organizer',
    label: 'Organizer',
    icon: <CalendarOutlined />,
    color: '#7c3aed',
    submodules: [
      { key: 'items', label: 'Items (Tasks / Reminders / Follow-ups)', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'assignments', label: 'Assignments', actions: ['view', 'create'] as ActionKey[] },
    ],
  },
  {
    key: 'crm',
    label: 'CRM & Follow-ups',
    icon: <TeamOutlined />,
    color: '#0891b2',
    submodules: [
      { key: 'follow_ups', label: 'Follow-ups', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'customers', label: 'Customers', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
    ],
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: <BranchesOutlined />,
    color: '#ea580c',
    submodules: [
      { key: 'all_tasks', label: 'All Tasks', actions: ['view', 'create', 'edit', 'delete'] as ActionKey[] },
      { key: 'assignments', label: 'Task Assignments', actions: ['view', 'create'] as ActionKey[] },
    ],
  },
] as const;

interface PermissionsTableProps {
  permissions: MenuPermissions;
  onChange: (permissions: MenuPermissions) => void;
}

function getVal(permissions: MenuPermissions, module: string, submodule: string, action: string): 0 | 1 {
  return (permissions?.[module]?.[submodule]?.[action] as 0 | 1) ?? 0;
}

function setVal(permissions: MenuPermissions, module: string, submodule: string, action: string, value: 0 | 1): MenuPermissions {
  return {
    ...permissions,
    [module]: {
      ...permissions[module],
      [submodule]: {
        ...permissions[module]?.[submodule],
        [action]: value,
      },
    },
  };
}

export function PermissionsTable({ permissions, onChange }: PermissionsTableProps) {
  const isModuleAllEnabled = (moduleKey: string) => {
    const mod = MODULES.find((m) => m.key === moduleKey);
    if (!mod) return false;
    return mod.submodules.every((sub) =>
      sub.actions.every((a) => getVal(permissions, moduleKey, sub.key, a) === 1),
    );
  };

  const isModuleAnyEnabled = (moduleKey: string) => {
    const mod = MODULES.find((m) => m.key === moduleKey);
    if (!mod) return false;
    return mod.submodules.some((sub) =>
      sub.actions.some((a) => getVal(permissions, moduleKey, sub.key, a) === 1),
    );
  };

  const isSubmoduleAllEnabled = (moduleKey: string, subKey: string, actions: readonly ActionKey[]) =>
    actions.every((a) => getVal(permissions, moduleKey, subKey, a) === 1);

  const isSubmoduleAnyEnabled = (moduleKey: string, subKey: string, actions: readonly ActionKey[]) =>
    actions.some((a) => getVal(permissions, moduleKey, subKey, a) === 1);

  const handleModuleToggle = (moduleKey: string, checked: boolean) => {
    let updated = { ...permissions };
    const mod = MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;
    for (const sub of mod.submodules) {
      for (const a of sub.actions) {
        updated = setVal(updated, moduleKey, sub.key, a, checked ? 1 : 0);
      }
    }
    onChange(updated);
  };

  const handleSubmoduleToggle = (moduleKey: string, subKey: string, actions: readonly ActionKey[], checked: boolean) => {
    let updated = { ...permissions };
    for (const a of actions) {
      updated = setVal(updated, moduleKey, subKey, a, checked ? 1 : 0);
    }
    onChange(updated);
  };

  const handleActionToggle = (moduleKey: string, subKey: string, actions: readonly ActionKey[], actionKey: string, checked: boolean) => {
    let updated = { ...permissions };
    updated = setVal(updated, moduleKey, subKey, actionKey, checked ? 1 : 0);
    if (actionKey === 'view' && !checked) {
      for (const a of actions) {
        updated = setVal(updated, moduleKey, subKey, a, 0);
      }
    }
    if (actionKey !== 'view' && checked) {
      updated = setVal(updated, moduleKey, subKey, 'view', 1);
    }
    onChange(updated);
  };

  const allModulesFullAccess = MODULES.every((m) => isModuleAllEnabled(m.key));

  const handleGrantAll = (checked: boolean) => {
    let updated = { ...permissions };
    for (const mod of MODULES) {
      for (const sub of mod.submodules) {
        for (const a of sub.actions) {
          updated = setVal(updated, mod.key, sub.key, a, checked ? 1 : 0);
        }
      }
    }
    onChange(updated);
  };

  const moduleItems = MODULES.map((mod) => {
    const allEnabled = isModuleAllEnabled(mod.key);
    const anyEnabled = isModuleAnyEnabled(mod.key);

    // Sub-module inner collapse items
    const subItems = mod.submodules.map((sub) => {
      const subAllEnabled = isSubmoduleAllEnabled(mod.key, sub.key, sub.actions);
      const subAnyEnabled = isSubmoduleAnyEnabled(mod.key, sub.key, sub.actions);
      const enabledCount = sub.actions.filter((a) => getVal(permissions, mod.key, sub.key, a) === 1).length;

      return {
        key: sub.key,
        label: (
          <div className="flex items-center justify-between w-full pr-2">
            <span className="text-sm font-medium text-gray-700">{sub.label}</span>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {subAnyEnabled ? (
                <Tag color={subAllEnabled ? 'green' : 'blue'} className="!m-0 !text-xs">
                  {subAllEnabled ? 'Full' : `${enabledCount}/${sub.actions.length}`}
                </Tag>
              ) : (
                <Tag color="default" className="!m-0 !text-xs">None</Tag>
              )}
              <Tooltip title={subAllEnabled ? 'Revoke access' : 'Grant full access'}>
                <Switch
                  size="small"
                  checked={subAllEnabled}
                  onChange={(checked) => handleSubmoduleToggle(mod.key, sub.key, sub.actions, checked)}
                />
              </Tooltip>
            </div>
          </div>
        ),
        children: (
          <div className="flex flex-wrap gap-2 p-2">
            {ACTIONS.filter((a) => (sub.actions as readonly string[]).includes(a.key)).map((action) => {
              const checked = getVal(permissions, mod.key, sub.key, action.key) === 1;
              return (
                <div
                  key={action.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${
                    checked
                      ? 'border-brand bg-brand-soft'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => handleActionToggle(mod.key, sub.key, sub.actions, action.key, !checked)}
                >
                  <Checkbox
                    checked={checked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleActionToggle(mod.key, sub.key, sub.actions, action.key, e.target.checked);
                    }}
                  />
                  <span style={{ color: checked ? action.color : '#bfbfbf', fontSize: 14 }}>
                    {action.icon}
                  </span>
                  <span className={`text-sm font-medium ${checked ? 'text-gray-800' : 'text-gray-400'}`}>
                    {action.label}
                  </span>
                </div>
              );
            })}
          </div>
        ),
      };
    });

    return {
      key: mod.key,
      label: (
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-base"
              style={{ backgroundColor: mod.color }}
            >
              {mod.icon}
            </span>
            <div>
              <div className="font-semibold text-sm">{mod.label}</div>
              <div className="text-xs text-gray-400 font-normal">
                {mod.submodules.length} sub-module{mod.submodules.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {anyEnabled ? (
              <Tag color={allEnabled ? 'green' : 'blue'} className="!m-0 !text-xs">
                {allEnabled ? 'Full Access' : 'Partial'}
              </Tag>
            ) : (
              <Tag color="default" className="!m-0 !text-xs">No Access</Tag>
            )}
            <Tooltip title={allEnabled ? 'Revoke all access' : 'Grant full access'}>
              <Switch
                size="small"
                checked={allEnabled}
                onChange={(checked) => handleModuleToggle(mod.key, checked)}
              />
            </Tooltip>
          </div>
        </div>
      ),
      children: (
        <Collapse
          accordion={false}
          expandIconPosition="start"
          className="submodule-collapse"
          items={subItems}
        />
      ),
    };
  });

  return (
    <div>
      {/* Global toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div>
          <span className="font-medium text-sm text-gray-700">Grant Full Access</span>
          <span className="text-xs text-gray-400 ml-2">Enable all permissions for all modules</span>
        </div>
        <Switch
          checked={allModulesFullAccess}
          onChange={handleGrantAll}
          checkedChildren="ON"
          unCheckedChildren="OFF"
        />
      </div>

      {/* Module-level collapse */}
      <Collapse
        accordion={false}
        expandIconPosition="start"
        className="module-collapse"
        items={moduleItems}
      />

      <style jsx global>{`
        /* Module-level collapse */
        .module-collapse {
          background: transparent !important;
          border: none !important;
        }
        .module-collapse > .ant-collapse-item {
          margin-bottom: 8px !important;
          border: 1px solid #f0f0f0 !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .module-collapse > .ant-collapse-item:last-child {
          border-radius: 10px !important;
        }
        .module-collapse > .ant-collapse-item > .ant-collapse-header {
          padding: 12px 16px !important;
          align-items: center !important;
          background: #fff !important;
        }
        .module-collapse > .ant-collapse-item-active > .ant-collapse-header {
          background: #fafafa !important;
          border-bottom: 1px solid #f0f0f0;
        }
        .module-collapse > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box {
          padding: 12px 16px !important;
        }

        /* Sub-module collapse (nested) */
        .submodule-collapse {
          background: transparent !important;
          border: none !important;
        }
        .submodule-collapse > .ant-collapse-item {
          margin-bottom: 6px !important;
          border: 1px solid #e8e8e8 !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .submodule-collapse > .ant-collapse-item:last-child {
          border-radius: 8px !important;
        }
        .submodule-collapse > .ant-collapse-item > .ant-collapse-header {
          padding: 10px 14px !important;
          align-items: center !important;
          background: #fafafa !important;
        }
        .submodule-collapse > .ant-collapse-item-active > .ant-collapse-header {
          background: #f0f5ff !important;
          border-bottom: 1px solid #d6e4ff;
        }
        .submodule-collapse > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box {
          padding: 10px 12px !important;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

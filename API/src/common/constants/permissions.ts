export const PERMISSION_STRUCTURE: Record<string, Record<string, string[]>> = {
  sales: {
    customers: ['view', 'create', 'edit', 'delete'],
    quotations: ['view', 'create', 'edit', 'delete'],
  },
  enquiry: {
    enquiries: ['view', 'create', 'edit', 'delete'],
    follow_ups: ['view', 'create', 'edit', 'delete'],
  },
  orders: {
    purchase_orders: ['view', 'create', 'edit', 'delete', 'approve'],
    sales_orders: ['view', 'create', 'edit', 'delete'],
    manufacturing: ['view', 'create', 'edit', 'delete'],
    job_cards: ['view', 'create', 'edit', 'delete', 'approve'],
    bom: ['view', 'create', 'edit', 'delete'],
  },
  catalog: {
    products: ['view', 'create', 'edit', 'delete'],
    categories: ['view', 'create', 'edit', 'delete'],
    subcategories: ['view', 'create', 'edit', 'delete'],
  },
  inventory: {
    raw_materials: ['view', 'create', 'edit', 'delete'],
    stock_ledger: ['view', 'create', 'edit', 'delete'],
    material_requests: ['view', 'create', 'edit', 'delete', 'approve'],
    goods_receipts: ['view', 'create', 'edit', 'delete'],
  },
  procurement: {
    indents: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
  },
  invoicing: {
    invoices: ['view', 'create', 'edit', 'delete'],
    payments: ['view', 'create', 'edit', 'delete'],
  },
  employees: {
    all_employees: ['view', 'create', 'edit', 'delete'],
    departments: ['view', 'create', 'edit', 'delete'],
    designations: ['view', 'create', 'edit', 'delete'],
    permissions: ['view', 'create', 'edit', 'delete'],
  },
  reports: {
    dashboard_reports: ['view'],
    enquiry_reports: ['view'],
    manufacturing_reports: ['view'],
  },
  configurations: {
    stage_masters: ['view', 'create', 'edit', 'delete'],
    unit_masters: ['view', 'create', 'edit', 'delete'],
    sources: ['view', 'create', 'edit', 'delete'],
    email_templates: ['view', 'create', 'edit', 'delete'],
  },
};

export type PermissionsJson = Record<string, Record<string, Record<string, number>>>;

export function buildFullAccessPermissions(): PermissionsJson {
  const result: PermissionsJson = {};
  for (const [module, submodules] of Object.entries(PERMISSION_STRUCTURE)) {
    result[module] = {};
    for (const [submodule, actions] of Object.entries(submodules)) {
      result[module][submodule] = {};
      for (const action of actions) {
        result[module][submodule][action] = 1;
      }
    }
  }
  return result;
}

export function buildEmptyPermissions(): PermissionsJson {
  const result: PermissionsJson = {};
  for (const [module, submodules] of Object.entries(PERMISSION_STRUCTURE)) {
    result[module] = {};
    for (const [submodule, actions] of Object.entries(submodules)) {
      result[module][submodule] = {};
      for (const action of actions) {
        result[module][submodule][action] = 0;
      }
    }
  }
  return result;
}

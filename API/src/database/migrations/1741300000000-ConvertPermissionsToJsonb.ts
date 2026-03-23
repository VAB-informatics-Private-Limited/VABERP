import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertPermissionsToJsonb1741300000000 implements MigrationInterface {
  name = 'ConvertPermissionsToJsonb1741300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new JSONB column
    await queryRunner.query(`
      ALTER TABLE "menu_permissions"
      ADD COLUMN IF NOT EXISTS "permissions" jsonb NOT NULL DEFAULT '{}'
    `);

    // Step 2: Migrate existing flat column values into nested JSONB
    // For each module, if the module's view=1, we apply it to ALL sub-modules under that module
    await queryRunner.query(`
      UPDATE "menu_permissions" SET "permissions" = jsonb_build_object(
        'sales', jsonb_build_object(
          'customers', jsonb_build_object(
            'view', CASE WHEN "sales_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "sales_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "sales_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "sales_delete" = 1 THEN 1 ELSE 0 END
          ),
          'quotations', jsonb_build_object(
            'view', CASE WHEN "sales_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "sales_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "sales_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "sales_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'enquiry', jsonb_build_object(
          'enquiries', jsonb_build_object(
            'view', CASE WHEN "enquiry_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "enquiry_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "enquiry_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "enquiry_delete" = 1 THEN 1 ELSE 0 END
          ),
          'follow_ups', jsonb_build_object(
            'view', CASE WHEN "enquiry_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "enquiry_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "enquiry_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "enquiry_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'orders', jsonb_build_object(
          'purchase_orders', jsonb_build_object(
            'view', CASE WHEN "orders_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "orders_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "orders_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "orders_delete" = 1 THEN 1 ELSE 0 END,
            'approve', CASE WHEN "orders_approve" = 1 THEN 1 ELSE 0 END
          ),
          'sales_orders', jsonb_build_object(
            'view', CASE WHEN "orders_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "orders_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "orders_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "orders_delete" = 1 THEN 1 ELSE 0 END
          ),
          'manufacturing', jsonb_build_object(
            'view', CASE WHEN "orders_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "orders_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "orders_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "orders_delete" = 1 THEN 1 ELSE 0 END,
            'approve', CASE WHEN "orders_approve" = 1 THEN 1 ELSE 0 END
          ),
          'job_cards', jsonb_build_object(
            'view', CASE WHEN "orders_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "orders_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "orders_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "orders_delete" = 1 THEN 1 ELSE 0 END,
            'approve', CASE WHEN "orders_approve" = 1 THEN 1 ELSE 0 END
          ),
          'bom', jsonb_build_object(
            'view', CASE WHEN "orders_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "orders_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "orders_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "orders_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'catalog', jsonb_build_object(
          'products', jsonb_build_object(
            'view', CASE WHEN "catalog_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "catalog_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "catalog_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "catalog_delete" = 1 THEN 1 ELSE 0 END
          ),
          'categories', jsonb_build_object(
            'view', CASE WHEN "catalog_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "catalog_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "catalog_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "catalog_delete" = 1 THEN 1 ELSE 0 END
          ),
          'subcategories', jsonb_build_object(
            'view', CASE WHEN "catalog_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "catalog_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "catalog_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "catalog_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'inventory', jsonb_build_object(
          'raw_materials', jsonb_build_object(
            'view', CASE WHEN "inventory_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "inventory_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "inventory_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "inventory_delete" = 1 THEN 1 ELSE 0 END
          ),
          'stock_ledger', jsonb_build_object(
            'view', CASE WHEN "inventory_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "inventory_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "inventory_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "inventory_delete" = 1 THEN 1 ELSE 0 END
          ),
          'material_requests', jsonb_build_object(
            'view', CASE WHEN "inventory_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "inventory_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "inventory_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "inventory_delete" = 1 THEN 1 ELSE 0 END,
            'approve', CASE WHEN "inventory_approve" = 1 THEN 1 ELSE 0 END
          )
        ),
        'procurement', jsonb_build_object(
          'indents', jsonb_build_object(
            'view', CASE WHEN "procurement_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "procurement_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "procurement_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "procurement_delete" = 1 THEN 1 ELSE 0 END
          ),
          'suppliers', jsonb_build_object(
            'view', CASE WHEN "procurement_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "procurement_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "procurement_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "procurement_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'invoicing', jsonb_build_object(
          'invoices', jsonb_build_object(
            'view', CASE WHEN "invoicing_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "invoicing_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "invoicing_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "invoicing_delete" = 1 THEN 1 ELSE 0 END
          ),
          'payments', jsonb_build_object(
            'view', CASE WHEN "invoicing_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "invoicing_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "invoicing_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "invoicing_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'employees', jsonb_build_object(
          'all_employees', jsonb_build_object(
            'view', CASE WHEN "employees_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "employees_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "employees_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "employees_delete" = 1 THEN 1 ELSE 0 END
          ),
          'departments', jsonb_build_object(
            'view', CASE WHEN "employees_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "employees_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "employees_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "employees_delete" = 1 THEN 1 ELSE 0 END
          ),
          'designations', jsonb_build_object(
            'view', CASE WHEN "employees_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "employees_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "employees_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "employees_delete" = 1 THEN 1 ELSE 0 END
          ),
          'permissions', jsonb_build_object(
            'view', CASE WHEN "employees_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "employees_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "employees_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "employees_delete" = 1 THEN 1 ELSE 0 END
          )
        ),
        'reports', jsonb_build_object(
          'dashboard_reports', jsonb_build_object(
            'view', CASE WHEN "reports_view" = 1 THEN 1 ELSE 0 END
          ),
          'enquiry_reports', jsonb_build_object(
            'view', CASE WHEN "reports_view" = 1 THEN 1 ELSE 0 END
          ),
          'manufacturing_reports', jsonb_build_object(
            'view', CASE WHEN "reports_view" = 1 THEN 1 ELSE 0 END
          )
        ),
        'configurations', jsonb_build_object(
          'stage_masters', jsonb_build_object(
            'view', CASE WHEN "configurations_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "configurations_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "configurations_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "configurations_delete" = 1 THEN 1 ELSE 0 END
          ),
          'unit_masters', jsonb_build_object(
            'view', CASE WHEN "configurations_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "configurations_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "configurations_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "configurations_delete" = 1 THEN 1 ELSE 0 END
          ),
          'sources', jsonb_build_object(
            'view', CASE WHEN "configurations_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "configurations_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "configurations_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "configurations_delete" = 1 THEN 1 ELSE 0 END
          ),
          'email_templates', jsonb_build_object(
            'view', CASE WHEN "configurations_view" = 1 THEN 1 ELSE 0 END,
            'create', CASE WHEN "configurations_create" = 1 THEN 1 ELSE 0 END,
            'edit', CASE WHEN "configurations_edit" = 1 THEN 1 ELSE 0 END,
            'delete', CASE WHEN "configurations_delete" = 1 THEN 1 ELSE 0 END
          )
        )
      )
    `);

    // Step 3: Drop old flat columns
    await queryRunner.query(`
      ALTER TABLE "menu_permissions"
      DROP COLUMN IF EXISTS "sales_view",
      DROP COLUMN IF EXISTS "sales_create",
      DROP COLUMN IF EXISTS "sales_edit",
      DROP COLUMN IF EXISTS "sales_delete",
      DROP COLUMN IF EXISTS "sales_approve",
      DROP COLUMN IF EXISTS "catalog_view",
      DROP COLUMN IF EXISTS "catalog_create",
      DROP COLUMN IF EXISTS "catalog_edit",
      DROP COLUMN IF EXISTS "catalog_delete",
      DROP COLUMN IF EXISTS "catalog_approve",
      DROP COLUMN IF EXISTS "enquiry_view",
      DROP COLUMN IF EXISTS "enquiry_create",
      DROP COLUMN IF EXISTS "enquiry_edit",
      DROP COLUMN IF EXISTS "enquiry_delete",
      DROP COLUMN IF EXISTS "enquiry_approve",
      DROP COLUMN IF EXISTS "orders_view",
      DROP COLUMN IF EXISTS "orders_create",
      DROP COLUMN IF EXISTS "orders_edit",
      DROP COLUMN IF EXISTS "orders_delete",
      DROP COLUMN IF EXISTS "orders_approve",
      DROP COLUMN IF EXISTS "inventory_view",
      DROP COLUMN IF EXISTS "inventory_create",
      DROP COLUMN IF EXISTS "inventory_edit",
      DROP COLUMN IF EXISTS "inventory_delete",
      DROP COLUMN IF EXISTS "inventory_approve",
      DROP COLUMN IF EXISTS "invoicing_view",
      DROP COLUMN IF EXISTS "invoicing_create",
      DROP COLUMN IF EXISTS "invoicing_edit",
      DROP COLUMN IF EXISTS "invoicing_delete",
      DROP COLUMN IF EXISTS "invoicing_approve",
      DROP COLUMN IF EXISTS "reports_view",
      DROP COLUMN IF EXISTS "reports_create",
      DROP COLUMN IF EXISTS "reports_edit",
      DROP COLUMN IF EXISTS "reports_delete",
      DROP COLUMN IF EXISTS "reports_approve",
      DROP COLUMN IF EXISTS "configurations_view",
      DROP COLUMN IF EXISTS "configurations_create",
      DROP COLUMN IF EXISTS "configurations_edit",
      DROP COLUMN IF EXISTS "configurations_delete",
      DROP COLUMN IF EXISTS "configurations_approve",
      DROP COLUMN IF EXISTS "procurement_view",
      DROP COLUMN IF EXISTS "procurement_create",
      DROP COLUMN IF EXISTS "procurement_edit",
      DROP COLUMN IF EXISTS "procurement_delete",
      DROP COLUMN IF EXISTS "procurement_approve",
      DROP COLUMN IF EXISTS "employees_view",
      DROP COLUMN IF EXISTS "employees_create",
      DROP COLUMN IF EXISTS "employees_edit",
      DROP COLUMN IF EXISTS "employees_delete",
      DROP COLUMN IF EXISTS "employees_approve"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add flat columns
    await queryRunner.query(`
      ALTER TABLE "menu_permissions"
      ADD COLUMN IF NOT EXISTS "sales_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sales_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sales_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sales_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sales_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "catalog_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "catalog_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "catalog_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "catalog_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "catalog_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "enquiry_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "enquiry_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "enquiry_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "enquiry_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "enquiry_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "orders_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "orders_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "orders_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "orders_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "orders_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "inventory_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "inventory_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "inventory_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "inventory_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "inventory_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "invoicing_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "invoicing_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "invoicing_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "invoicing_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "invoicing_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reports_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reports_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reports_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reports_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reports_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "configurations_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "configurations_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "configurations_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "configurations_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "configurations_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "procurement_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "procurement_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "procurement_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "procurement_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "procurement_approve" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "employees_view" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "employees_create" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "employees_edit" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "employees_delete" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "employees_approve" integer NOT NULL DEFAULT 0
    `);

    // Restore flat values from JSONB
    await queryRunner.query(`
      UPDATE "menu_permissions" SET
        "sales_view" = COALESCE(("permissions"->'sales'->'customers'->>'view')::int, 0),
        "sales_create" = COALESCE(("permissions"->'sales'->'customers'->>'create')::int, 0),
        "sales_edit" = COALESCE(("permissions"->'sales'->'customers'->>'edit')::int, 0),
        "sales_delete" = COALESCE(("permissions"->'sales'->'customers'->>'delete')::int, 0),
        "catalog_view" = COALESCE(("permissions"->'catalog'->'products'->>'view')::int, 0),
        "catalog_create" = COALESCE(("permissions"->'catalog'->'products'->>'create')::int, 0),
        "catalog_edit" = COALESCE(("permissions"->'catalog'->'products'->>'edit')::int, 0),
        "catalog_delete" = COALESCE(("permissions"->'catalog'->'products'->>'delete')::int, 0),
        "enquiry_view" = COALESCE(("permissions"->'enquiry'->'enquiries'->>'view')::int, 0),
        "enquiry_create" = COALESCE(("permissions"->'enquiry'->'enquiries'->>'create')::int, 0),
        "enquiry_edit" = COALESCE(("permissions"->'enquiry'->'enquiries'->>'edit')::int, 0),
        "enquiry_delete" = COALESCE(("permissions"->'enquiry'->'enquiries'->>'delete')::int, 0),
        "orders_view" = COALESCE(("permissions"->'orders'->'purchase_orders'->>'view')::int, 0),
        "orders_create" = COALESCE(("permissions"->'orders'->'purchase_orders'->>'create')::int, 0),
        "orders_edit" = COALESCE(("permissions"->'orders'->'purchase_orders'->>'edit')::int, 0),
        "orders_delete" = COALESCE(("permissions"->'orders'->'purchase_orders'->>'delete')::int, 0),
        "orders_approve" = COALESCE(("permissions"->'orders'->'purchase_orders'->>'approve')::int, 0),
        "inventory_view" = COALESCE(("permissions"->'inventory'->'raw_materials'->>'view')::int, 0),
        "inventory_create" = COALESCE(("permissions"->'inventory'->'raw_materials'->>'create')::int, 0),
        "inventory_edit" = COALESCE(("permissions"->'inventory'->'raw_materials'->>'edit')::int, 0),
        "inventory_delete" = COALESCE(("permissions"->'inventory'->'raw_materials'->>'delete')::int, 0),
        "inventory_approve" = COALESCE(("permissions"->'inventory'->'material_requests'->>'approve')::int, 0),
        "invoicing_view" = COALESCE(("permissions"->'invoicing'->'invoices'->>'view')::int, 0),
        "invoicing_create" = COALESCE(("permissions"->'invoicing'->'invoices'->>'create')::int, 0),
        "invoicing_edit" = COALESCE(("permissions"->'invoicing'->'invoices'->>'edit')::int, 0),
        "invoicing_delete" = COALESCE(("permissions"->'invoicing'->'invoices'->>'delete')::int, 0),
        "reports_view" = COALESCE(("permissions"->'reports'->'dashboard_reports'->>'view')::int, 0),
        "configurations_view" = COALESCE(("permissions"->'configurations'->'stage_masters'->>'view')::int, 0),
        "configurations_create" = COALESCE(("permissions"->'configurations'->'stage_masters'->>'create')::int, 0),
        "configurations_edit" = COALESCE(("permissions"->'configurations'->'stage_masters'->>'edit')::int, 0),
        "configurations_delete" = COALESCE(("permissions"->'configurations'->'stage_masters'->>'delete')::int, 0),
        "procurement_view" = COALESCE(("permissions"->'procurement'->'indents'->>'view')::int, 0),
        "procurement_create" = COALESCE(("permissions"->'procurement'->'indents'->>'create')::int, 0),
        "procurement_edit" = COALESCE(("permissions"->'procurement'->'indents'->>'edit')::int, 0),
        "procurement_delete" = COALESCE(("permissions"->'procurement'->'indents'->>'delete')::int, 0),
        "employees_view" = COALESCE(("permissions"->'employees'->'all_employees'->>'view')::int, 0),
        "employees_create" = COALESCE(("permissions"->'employees'->'all_employees'->>'create')::int, 0),
        "employees_edit" = COALESCE(("permissions"->'employees'->'all_employees'->>'edit')::int, 0),
        "employees_delete" = COALESCE(("permissions"->'employees'->'all_employees'->>'delete')::int, 0)
    `);

    // Drop JSONB column
    await queryRunner.query(`ALTER TABLE "menu_permissions" DROP COLUMN IF EXISTS "permissions"`);
  }
}

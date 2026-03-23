import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGranularPermissions1741200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const modules = [
      'sales', 'catalog', 'enquiry', 'orders', 'inventory',
      'invoicing', 'reports', 'configurations', 'procurement', 'employees',
    ];
    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    // Add 50 new columns
    for (const mod of modules) {
      for (const action of actions) {
        await queryRunner.query(
          `ALTER TABLE menu_permissions ADD COLUMN IF NOT EXISTS ${mod}_${action} smallint DEFAULT 0`,
        );
      }
    }

    // Migrate existing data from old 8 columns
    const oldModules = [
      'sales', 'catalog', 'enquiry', 'orders',
      'inventory', 'invoicing', 'reports', 'configurations',
    ];

    for (const mod of oldModules) {
      const setClauses = actions.map((a) => `${mod}_${a} = ${mod}`).join(', ');
      await queryRunner.query(`UPDATE menu_permissions SET ${setClauses}`);
    }

    // Drop old columns
    for (const mod of oldModules) {
      await queryRunner.query(
        `ALTER TABLE menu_permissions DROP COLUMN IF EXISTS ${mod}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const oldModules = [
      'sales', 'catalog', 'enquiry', 'orders',
      'inventory', 'invoicing', 'reports', 'configurations',
    ];
    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    // Re-add old columns
    for (const mod of oldModules) {
      await queryRunner.query(
        `ALTER TABLE menu_permissions ADD COLUMN IF NOT EXISTS ${mod} smallint DEFAULT 0`,
      );
    }

    // Migrate back: if any action is 1, set module to 1
    for (const mod of oldModules) {
      const orClauses = actions.map((a) => `${mod}_${a} = 1`).join(' OR ');
      await queryRunner.query(
        `UPDATE menu_permissions SET ${mod} = CASE WHEN (${orClauses}) THEN 1 ELSE 0 END`,
      );
    }

    // Drop granular columns
    const allModules = [
      ...oldModules, 'procurement', 'employees',
    ];
    for (const mod of allModules) {
      for (const action of actions) {
        await queryRunner.query(
          `ALTER TABLE menu_permissions DROP COLUMN IF EXISTS ${mod}_${action}`,
        );
      }
    }
  }
}

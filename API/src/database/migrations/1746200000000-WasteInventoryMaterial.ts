import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add raw_material_id to waste_inventory so production waste can be
 * tracked & aggregated per raw material.
 */
export class WasteInventoryMaterial1746200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "waste_inventory"
      ADD COLUMN IF NOT EXISTS "raw_material_id" INTEGER
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_waste_inventory_raw_material'
        ) THEN
          ALTER TABLE "waste_inventory"
            ADD CONSTRAINT "fk_waste_inventory_raw_material"
            FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_waste_inventory_material"
        ON "waste_inventory" ("enterprise_id", "raw_material_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_waste_inventory_material"`);
    await queryRunner.query(`
      ALTER TABLE "waste_inventory"
      DROP CONSTRAINT IF EXISTS "fk_waste_inventory_raw_material"
    `);
    await queryRunner.query(`
      ALTER TABLE "waste_inventory"
      DROP COLUMN IF EXISTS "raw_material_id"
    `);
  }
}

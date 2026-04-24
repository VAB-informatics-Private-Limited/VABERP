import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduce product-owned master BOMs.
 *
 * Creates product_boms + product_bom_items and adds product_bom_id / source_version
 * columns on bill_of_materials so every PO-instance BOM can be traced back to the
 * product's master. Back-fills master BOMs from the most-recent existing
 * bill_of_materials row for each (enterprise_id, product_id) pair.
 */
export class ProductBom1746100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. product_boms
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_boms" (
        "id" SERIAL PRIMARY KEY,
        "enterprise_id" INTEGER NOT NULL,
        "product_id" INTEGER NOT NULL,
        "bom_number" VARCHAR NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "notes" TEXT,
        "status" VARCHAR NOT NULL DEFAULT 'active',
        "created_date" TIMESTAMP NOT NULL DEFAULT now(),
        "modified_date" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_product_boms_enterprise"
          FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_product_boms_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_boms_product_enterprise"
        ON "product_boms" ("product_id", "enterprise_id")
        WHERE "status" = 'active'
    `);

    // 2. product_bom_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_bom_items" (
        "id" SERIAL PRIMARY KEY,
        "product_bom_id" INTEGER NOT NULL,
        "raw_material_id" INTEGER,
        "component_product_id" INTEGER,
        "item_name" VARCHAR NOT NULL,
        "required_quantity" DECIMAL(15, 2) NOT NULL,
        "unit_of_measure" VARCHAR,
        "is_custom" BOOLEAN NOT NULL DEFAULT false,
        "notes" TEXT,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_date" TIMESTAMP NOT NULL DEFAULT now(),
        "modified_date" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_product_bom_items_bom"
          FOREIGN KEY ("product_bom_id") REFERENCES "product_boms"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_product_bom_items_raw_material"
          FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_product_bom_items_component_product"
          FOREIGN KEY ("component_product_id") REFERENCES "products"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_bom_items_bom"
        ON "product_bom_items" ("product_bom_id")
    `);

    // 3. Add provenance columns to bill_of_materials
    await queryRunner.query(`
      ALTER TABLE "bill_of_materials"
        ADD COLUMN IF NOT EXISTS "product_bom_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "source_version" INTEGER
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_bill_of_materials_product_bom'
        ) THEN
          ALTER TABLE "bill_of_materials"
            ADD CONSTRAINT "fk_bill_of_materials_product_bom"
            FOREIGN KEY ("product_bom_id") REFERENCES "product_boms"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 4. Back-fill: derive one ProductBom per (enterprise_id, product_id) from
    //    the most-recent existing bill_of_materials row that has a non-null product_id.
    await queryRunner.query(`
      WITH latest_bom_per_product AS (
        SELECT DISTINCT ON (enterprise_id, product_id)
          id, enterprise_id, product_id, bom_number, notes
        FROM "bill_of_materials"
        WHERE product_id IS NOT NULL
        ORDER BY enterprise_id, product_id, created_date DESC
      ),
      ranked AS (
        SELECT
          lbp.*,
          ROW_NUMBER() OVER (PARTITION BY lbp.enterprise_id ORDER BY lbp.id) AS rn
        FROM latest_bom_per_product lbp
      )
      INSERT INTO "product_boms" (enterprise_id, product_id, bom_number, version, notes, status)
      SELECT
        r.enterprise_id,
        r.product_id,
        'PBOM-' || LPAD(r.rn::text, 6, '0') AS bom_number,
        1,
        r.notes,
        'active'
      FROM ranked r
      ON CONFLICT DO NOTHING
    `);

    // 5. Copy items from the seed BOM into product_bom_items
    await queryRunner.query(`
      INSERT INTO "product_bom_items" (
        product_bom_id, raw_material_id, item_name, required_quantity,
        unit_of_measure, is_custom, notes, sort_order
      )
      SELECT
        pb.id,
        bi.raw_material_id,
        bi.item_name,
        bi.required_quantity,
        bi.unit_of_measure,
        COALESCE(bi.is_custom, false),
        bi.notes,
        COALESCE(bi.sort_order, 0)
      FROM "product_boms" pb
      JOIN LATERAL (
        SELECT id FROM "bill_of_materials" bom
        WHERE bom.enterprise_id = pb.enterprise_id
          AND bom.product_id    = pb.product_id
        ORDER BY bom.created_date DESC
        LIMIT 1
      ) seed ON true
      JOIN "bom_items" bi ON bi.bom_id = seed.id
      WHERE NOT EXISTS (
        SELECT 1 FROM "product_bom_items" existing WHERE existing.product_bom_id = pb.id
      )
    `);

    // 6. Link existing bill_of_materials rows back to their newly-created master
    await queryRunner.query(`
      UPDATE "bill_of_materials" bom
      SET
        product_bom_id  = pb.id,
        source_version  = pb.version
      FROM "product_boms" pb
      WHERE bom.enterprise_id = pb.enterprise_id
        AND bom.product_id    = pb.product_id
        AND bom.product_bom_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bill_of_materials"
        DROP CONSTRAINT IF EXISTS "fk_bill_of_materials_product_bom"
    `);
    await queryRunner.query(`
      ALTER TABLE "bill_of_materials"
        DROP COLUMN IF EXISTS "product_bom_id",
        DROP COLUMN IF EXISTS "source_version"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_bom_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_boms"`);
  }
}

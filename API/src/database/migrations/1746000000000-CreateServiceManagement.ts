import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceManagement1746000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. product_types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_types" (
        "id"               SERIAL PRIMARY KEY,
        "enterprise_id"    INTEGER NOT NULL REFERENCES "enterprises"("id") ON DELETE CASCADE,
        "name"             VARCHAR(150) NOT NULL,
        "warranty_months"  INTEGER NOT NULL DEFAULT 12,
        "description"      TEXT DEFAULT NULL,
        "status"           VARCHAR(20) NOT NULL DEFAULT 'active',
        "created_date"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "modified_date"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 2. service_rules (child of product_types)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_rules" (
        "id"               SERIAL PRIMARY KEY,
        "product_type_id"  INTEGER NOT NULL REFERENCES "product_types"("id") ON DELETE CASCADE,
        "day_offset"       INTEGER NOT NULL,
        "event_type"       VARCHAR(50) NOT NULL,
        "title"            VARCHAR(200) NOT NULL,
        "description"      TEXT DEFAULT NULL,
        "price"            DECIMAL(10,2) DEFAULT NULL,
        "is_active"        BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // 3. service_products (live product records)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_products" (
        "id"                  SERIAL PRIMARY KEY,
        "enterprise_id"       INTEGER NOT NULL REFERENCES "enterprises"("id") ON DELETE CASCADE,
        "customer_id"         INTEGER DEFAULT NULL REFERENCES "customers"("id") ON DELETE SET NULL,
        "product_id"          INTEGER DEFAULT NULL REFERENCES "products"("id") ON DELETE SET NULL,
        "product_type_id"     INTEGER DEFAULT NULL REFERENCES "product_types"("id") ON DELETE SET NULL,
        "job_card_id"         INTEGER DEFAULT NULL,
        "serial_number"       VARCHAR(150) DEFAULT NULL,
        "model_number"        VARCHAR(150) DEFAULT NULL,
        "dispatch_date"       DATE NOT NULL,
        "warranty_start_date" DATE DEFAULT NULL,
        "warranty_end_date"   DATE DEFAULT NULL,
        "status"              VARCHAR(20) NOT NULL DEFAULT 'active',
        "customer_name"       VARCHAR(200) DEFAULT NULL,
        "customer_mobile"     VARCHAR(20) DEFAULT NULL,
        "customer_address"    TEXT DEFAULT NULL,
        "notes"               TEXT DEFAULT NULL,
        "created_by"          INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "created_date"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "modified_date"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 4. service_events (lifecycle events, auto-generated from rules)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_events" (
        "id"                  SERIAL PRIMARY KEY,
        "enterprise_id"       INTEGER NOT NULL REFERENCES "enterprises"("id") ON DELETE CASCADE,
        "service_product_id"  INTEGER NOT NULL REFERENCES "service_products"("id") ON DELETE CASCADE,
        "rule_id"             INTEGER DEFAULT NULL REFERENCES "service_rules"("id") ON DELETE SET NULL,
        "due_date"            DATE NOT NULL,
        "event_type"          VARCHAR(50) NOT NULL,
        "title"               VARCHAR(200) NOT NULL,
        "description"         TEXT DEFAULT NULL,
        "price"               DECIMAL(10,2) DEFAULT NULL,
        "status"              VARCHAR(20) NOT NULL DEFAULT 'pending',
        "reminder_count"      INTEGER NOT NULL DEFAULT 0,
        "last_reminder_at"    TIMESTAMPTZ DEFAULT NULL,
        "created_date"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "modified_date"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 5. service_bookings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_bookings" (
        "id"                  SERIAL PRIMARY KEY,
        "enterprise_id"       INTEGER NOT NULL REFERENCES "enterprises"("id") ON DELETE CASCADE,
        "service_product_id"  INTEGER NOT NULL REFERENCES "service_products"("id") ON DELETE CASCADE,
        "service_event_id"    INTEGER DEFAULT NULL REFERENCES "service_events"("id") ON DELETE SET NULL,
        "scheduled_date"      DATE NOT NULL,
        "scheduled_slot"      VARCHAR(30) DEFAULT NULL,
        "status"              VARCHAR(20) NOT NULL DEFAULT 'pending',
        "technician_id"       INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "service_charge"      DECIMAL(10,2) NOT NULL DEFAULT 0,
        "payment_status"      VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        "payment_method"      VARCHAR(50) DEFAULT NULL,
        "notes"               TEXT DEFAULT NULL,
        "completed_at"        TIMESTAMPTZ DEFAULT NULL,
        "completion_notes"    TEXT DEFAULT NULL,
        "created_by"          INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "created_date"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "modified_date"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pt_enterprise" ON "product_types"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sr_product_type" ON "service_rules"("product_type_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sp_enterprise" ON "service_products"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sp_customer" ON "service_products"("customer_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_se_enterprise" ON "service_events"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_se_product" ON "service_events"("service_product_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_se_due_date" ON "service_events"("due_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_se_status" ON "service_events"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sb_enterprise" ON "service_bookings"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sb_product" ON "service_bookings"("service_product_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sb_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sb_enterprise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_se_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_se_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_se_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_se_enterprise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sp_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sp_enterprise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sr_product_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pt_enterprise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_types"`);
  }
}

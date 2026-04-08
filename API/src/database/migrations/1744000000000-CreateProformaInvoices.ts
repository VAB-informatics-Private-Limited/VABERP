import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProformaInvoices1744000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "proforma_invoices" (
        "id"                SERIAL PRIMARY KEY,
        "enterprise_id"     INTEGER NOT NULL,
        "quotation_id"      INTEGER DEFAULT NULL REFERENCES "quotations"("id") ON DELETE SET NULL,
        "customer_id"       INTEGER DEFAULT NULL REFERENCES "customers"("id") ON DELETE SET NULL,
        "pi_number"         VARCHAR NOT NULL,
        "pi_date"           DATE NOT NULL DEFAULT CURRENT_DATE,
        "customer_name"     VARCHAR NOT NULL,
        "email"             VARCHAR DEFAULT NULL,
        "mobile"            VARCHAR DEFAULT NULL,
        "billing_address"   TEXT DEFAULT NULL,
        "shipping_address"  TEXT DEFAULT NULL,
        "sub_total"         DECIMAL(12,2) NOT NULL DEFAULT 0,
        "discount_type"     VARCHAR DEFAULT NULL,
        "discount_value"    DECIMAL(10,2) NOT NULL DEFAULT 0,
        "discount_amount"   DECIMAL(12,2) NOT NULL DEFAULT 0,
        "tax_amount"        DECIMAL(12,2) NOT NULL DEFAULT 0,
        "shipping_charges"  DECIMAL(10,2) NOT NULL DEFAULT 0,
        "grand_total"       DECIMAL(12,2) NOT NULL DEFAULT 0,
        "notes"             TEXT DEFAULT NULL,
        "terms_conditions"  TEXT DEFAULT NULL,
        "status"            VARCHAR NOT NULL DEFAULT 'draft',
        "sales_order_id"    INTEGER DEFAULT NULL REFERENCES "sales_orders"("id") ON DELETE SET NULL,
        "created_by"        INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "updated_by"        INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "created_date"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "modified_date"     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "proforma_invoice_items" (
        "id"               SERIAL PRIMARY KEY,
        "pi_id"            INTEGER NOT NULL REFERENCES "proforma_invoices"("id") ON DELETE CASCADE,
        "product_id"       INTEGER DEFAULT NULL REFERENCES "products"("id") ON DELETE SET NULL,
        "item_name"        VARCHAR NOT NULL,
        "hsn_code"         VARCHAR DEFAULT NULL,
        "quantity"         DECIMAL(10,3) NOT NULL DEFAULT 1,
        "unit_price"       DECIMAL(10,2) NOT NULL DEFAULT 0,
        "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "tax_percent"      DECIMAL(5,2) NOT NULL DEFAULT 0,
        "tax_amount"       DECIMAL(10,2) NOT NULL DEFAULT 0,
        "line_total"       DECIMAL(12,2) NOT NULL DEFAULT 0,
        "sort_order"       INTEGER NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pi_enterprise" ON "proforma_invoices"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pi_quotation" ON "proforma_invoices"("quotation_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pi_items_pi" ON "proforma_invoice_items"("pi_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pi_items_pi"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pi_quotation"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pi_enterprise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "proforma_invoice_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "proforma_invoices"`);
  }
}

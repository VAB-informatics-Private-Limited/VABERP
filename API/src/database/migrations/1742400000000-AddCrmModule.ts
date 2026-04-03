import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrmModule1742400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reporting_to to employees
    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "reporting_to" INTEGER DEFAULT NULL
          REFERENCES "employees"("id") ON DELETE SET NULL
    `);

    // crm_leads
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_leads" (
        "id"                    SERIAL PRIMARY KEY,
        "enterprise_id"         INTEGER NOT NULL,
        "customer_id"           INTEGER DEFAULT NULL,
        "lead_number"           VARCHAR NOT NULL,
        "customer_name"         VARCHAR NOT NULL,
        "email"                 VARCHAR DEFAULT NULL,
        "mobile"                VARCHAR DEFAULT NULL,
        "business_name"         VARCHAR DEFAULT NULL,
        "gst_number"            VARCHAR DEFAULT NULL,
        "address"               VARCHAR DEFAULT NULL,
        "city"                  VARCHAR DEFAULT NULL,
        "state"                 VARCHAR DEFAULT NULL,
        "country"               VARCHAR DEFAULT NULL,
        "pincode"               VARCHAR DEFAULT NULL,
        "source"                VARCHAR DEFAULT NULL,
        "status"                VARCHAR NOT NULL DEFAULT 'new',
        "expected_value"        DECIMAL(12,2) DEFAULT NULL,
        "requirements"          TEXT DEFAULT NULL,
        "remarks"               TEXT DEFAULT NULL,
        "next_followup_date"    DATE DEFAULT NULL,
        "created_by"            INTEGER DEFAULT NULL,
        "assigned_to"           INTEGER DEFAULT NULL,
        "assigned_by"           INTEGER DEFAULT NULL,
        "manager_id"            INTEGER DEFAULT NULL,
        "converted_customer_id" INTEGER DEFAULT NULL,
        "created_date"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "modified_date"         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // crm_followups
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_followups" (
        "id"                 SERIAL PRIMARY KEY,
        "enterprise_id"      INTEGER NOT NULL,
        "crm_lead_id"        INTEGER NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
        "created_by"         INTEGER NOT NULL,
        "followup_type"      VARCHAR NOT NULL DEFAULT 'Call',
        "followup_date"      TIMESTAMP NOT NULL,
        "status"             VARCHAR DEFAULT NULL,
        "notes"              TEXT DEFAULT NULL,
        "next_followup_date" DATE DEFAULT NULL,
        "next_followup_type" VARCHAR DEFAULT NULL,
        "created_date"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // crm_activity_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_activity_logs" (
        "id"           SERIAL PRIMARY KEY,
        "enterprise_id" INTEGER NOT NULL,
        "crm_lead_id"  INTEGER NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
        "performed_by" INTEGER NOT NULL,
        "action"       VARCHAR NOT NULL,
        "old_value"    JSONB DEFAULT NULL,
        "new_value"    JSONB DEFAULT NULL,
        "description"  TEXT DEFAULT NULL,
        "created_date" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_followups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_leads"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN IF EXISTS "reporting_to"`);
  }
}

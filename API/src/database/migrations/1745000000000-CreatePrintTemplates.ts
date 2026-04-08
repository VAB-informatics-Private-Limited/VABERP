import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePrintTemplates1745000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "print_template_configs" (
        "id"                 SERIAL PRIMARY KEY,
        "enterprise_id"      INTEGER NOT NULL UNIQUE REFERENCES "enterprises"("id") ON DELETE CASCADE,
        "company_name"       VARCHAR(200) DEFAULT NULL,
        "tagline"            VARCHAR(300) DEFAULT NULL,
        "logo_url"           TEXT DEFAULT NULL,
        "logo_width"         INTEGER NOT NULL DEFAULT 120,
        "address"            TEXT DEFAULT NULL,
        "phone"              VARCHAR(50) DEFAULT NULL,
        "email"              VARCHAR(150) DEFAULT NULL,
        "gst_number"         VARCHAR(50) DEFAULT NULL,
        "cin_number"         VARCHAR(50) DEFAULT NULL,
        "header_alignment"   VARCHAR(10) NOT NULL DEFAULT 'left',
        "header_style"       VARCHAR(20) NOT NULL DEFAULT 'detailed',
        "show_gst"           BOOLEAN NOT NULL DEFAULT true,
        "show_email"         BOOLEAN NOT NULL DEFAULT true,
        "show_phone"         BOOLEAN NOT NULL DEFAULT true,
        "show_tagline"       BOOLEAN NOT NULL DEFAULT false,
        "show_logo"          BOOLEAN NOT NULL DEFAULT true,
        "footer_text"        TEXT DEFAULT NULL,
        "show_footer"        BOOLEAN NOT NULL DEFAULT false,
        "watermark_text"     VARCHAR(100) DEFAULT NULL,
        "show_watermark"     BOOLEAN NOT NULL DEFAULT false,
        "current_version"    INTEGER NOT NULL DEFAULT 1,
        "updated_by"         INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "print_template_versions" (
        "id"              SERIAL PRIMARY KEY,
        "enterprise_id"   INTEGER NOT NULL REFERENCES "enterprises"("id") ON DELETE CASCADE,
        "version_number"  INTEGER NOT NULL,
        "snapshot"        JSONB NOT NULL,
        "change_notes"    TEXT DEFAULT NULL,
        "changed_by"      INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL,
        "changed_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("enterprise_id", "version_number")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ptc_enterprise" ON "print_template_configs"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ptv_enterprise" ON "print_template_versions"("enterprise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ptv_version" ON "print_template_versions"("enterprise_id", "version_number" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ptv_version"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ptv_enterprise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ptc_enterprise"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "print_template_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "print_template_configs"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPoCancelledToQuotations1742300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
        ADD COLUMN IF NOT EXISTS "po_cancelled_at" TIMESTAMPTZ DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "cancelled_po_number" VARCHAR DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
        DROP COLUMN IF EXISTS "po_cancelled_at",
        DROP COLUMN IF EXISTS "cancelled_po_number"
    `);
  }
}

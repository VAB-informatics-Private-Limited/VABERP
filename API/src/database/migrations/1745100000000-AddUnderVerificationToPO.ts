import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnderVerificationToPO1745100000000 implements MigrationInterface {
  name = 'AddUnderVerificationToPO1745100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_orders
      ADD COLUMN IF NOT EXISTS under_verification_at TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_orders DROP COLUMN IF EXISTS under_verification_at
    `);
  }
}

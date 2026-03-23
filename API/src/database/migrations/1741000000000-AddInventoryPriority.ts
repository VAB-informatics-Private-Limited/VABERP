import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryPriority1741000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "priority" varchar NOT NULL DEFAULT 'none'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory" DROP COLUMN IF EXISTS "priority"`,
    );
  }
}

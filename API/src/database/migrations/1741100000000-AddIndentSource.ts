import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndentSource1741100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "indents" ADD COLUMN IF NOT EXISTS "source" varchar NOT NULL DEFAULT 'material_request'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indents" ALTER COLUMN "material_request_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "indents" DROP COLUMN IF EXISTS "source"`,
    );
  }
}

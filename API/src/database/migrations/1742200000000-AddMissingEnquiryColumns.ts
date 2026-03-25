import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingEnquiryColumns1742200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS gst_number varchar NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE enquiries DROP COLUMN IF EXISTS gst_number`,
    );
  }
}

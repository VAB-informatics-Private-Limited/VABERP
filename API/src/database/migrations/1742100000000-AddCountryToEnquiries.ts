import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryToEnquiries1742100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS country varchar NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE enquiries DROP COLUMN IF EXISTS country`,
    );
  }
}

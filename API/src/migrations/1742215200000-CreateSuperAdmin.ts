import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class CreateSuperAdmin1742215200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "super_admin" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "email" VARCHAR NOT NULL UNIQUE,
        "password" VARCHAR NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    const existing = await queryRunner.query(
      `SELECT id FROM "super_admin" WHERE email = $1`,
      ['admin@vabinformatics.com'],
    );

    if (existing.length === 0) {
      const hashed = await bcrypt.hash('VAB@admin123', 10);
      await queryRunner.query(
        `INSERT INTO "super_admin" (name, email, password, status) VALUES ($1, $2, $3, $4)`,
        ['Super Admin', 'admin@vabinformatics.com', hashed, 'active'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "super_admin"`);
  }
}

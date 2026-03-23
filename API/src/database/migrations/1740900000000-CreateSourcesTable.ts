import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSourcesTable1740900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sources',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'enterprise_id',
            type: 'int',
          },
          {
            name: 'source_name',
            type: 'varchar',
          },
          {
            name: 'source_code',
            type: 'varchar',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sequence_order',
            type: 'int',
            default: 1,
          },
          {
            name: 'created_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'modified_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'sources',
      new TableForeignKey({
        columnNames: ['enterprise_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'enterprises',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sources');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('enterprise_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('sources', foreignKey);
      }
    }
    await queryRunner.dropTable('sources', true);
  }
}

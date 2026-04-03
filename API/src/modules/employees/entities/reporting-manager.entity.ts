import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reporting_managers')
export class ReportingManager {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column()
  name: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}

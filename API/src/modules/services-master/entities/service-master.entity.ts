import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('services_master')
export class ServiceMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'service_name' })
  serviceName: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;
}

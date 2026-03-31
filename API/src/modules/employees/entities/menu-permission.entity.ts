import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { PermissionsJson } from '../../../common/constants/permissions';

@Entity('menu_permissions')
export class MenuPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'jsonb', default: '{}' })
  permissions: PermissionsJson;

  @Column({ name: 'data_start_date', type: 'timestamptz', nullable: true, default: null })
  dataStartDate: Date | null;

  @Column({ name: 'own_data_only', type: 'boolean', default: false })
  ownDataOnly: boolean;
}

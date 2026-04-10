import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { ServiceProduct } from '../../service-products/entities/service-product.entity';
import { ServiceEvent } from '../../service-events/entities/service-event.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('service_bookings')
export class ServiceBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'service_product_id' })
  serviceProductId: number;

  @ManyToOne(() => ServiceProduct, (sp) => sp.serviceBookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_product_id' })
  serviceProduct: ServiceProduct;

  @Column({ name: 'service_event_id', nullable: true })
  serviceEventId: number | null;

  @ManyToOne(() => ServiceEvent, { nullable: true })
  @JoinColumn({ name: 'service_event_id' })
  serviceEvent: ServiceEvent;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'scheduled_slot', nullable: true })
  scheduledSlot: string | null; // e.g. '10:00-12:00'

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

  @Column({ name: 'technician_id', nullable: true })
  technicianId: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'technician_id' })
  technician: Employee;

  @Column({ name: 'service_charge', type: 'decimal', precision: 10, scale: 2, default: 0 })
  serviceCharge: number;

  @Column({ name: 'payment_status', default: 'unpaid' })
  paymentStatus: string; // 'unpaid' | 'paid' | 'waived'

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'completion_notes', nullable: true, type: 'text' })
  completionNotes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}

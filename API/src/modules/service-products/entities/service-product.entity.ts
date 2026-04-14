import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Product } from '../../products/entities/product.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { ProductType } from '../../product-types/entities/product-type.entity';
import { ServiceEvent } from '../../service-events/entities/service-event.entity';
import { ServiceBooking } from '../../service-bookings/entities/service-booking.entity';

@Entity('service_products')
export class ServiceProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'product_id', nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_type_id', nullable: true })
  productTypeId: number | null;

  @ManyToOne(() => ProductType, { nullable: true })
  @JoinColumn({ name: 'product_type_id' })
  productType: ProductType;

  @Column({ name: 'job_card_id', type: 'int', nullable: true })
  jobCardId: number | null;

  @Column({ name: 'serial_number', type: 'varchar', nullable: true })
  serialNumber: string | null;

  @Column({ name: 'model_number', type: 'varchar', nullable: true })
  modelNumber: string | null;

  @Column({ name: 'dispatch_date', type: 'date' })
  dispatchDate: Date;

  @Column({ name: 'warranty_start_date', type: 'date', nullable: true })
  warrantyStartDate: Date | null;

  @Column({ name: 'warranty_end_date', type: 'date', nullable: true })
  warrantyEndDate: Date | null;

  @Column({ default: 'active' })
  status: string; // 'active' | 'inactive'

  // Denormalized customer info for quick access (no join needed for reminders)
  @Column({ name: 'customer_name', type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ name: 'customer_mobile', type: 'varchar', nullable: true })
  customerMobile: string | null;

  @Column({ name: 'customer_address', nullable: true, type: 'text' })
  customerAddress: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @OneToMany(() => ServiceEvent, (e) => e.serviceProduct)
  serviceEvents: ServiceEvent[];

  @OneToMany(() => ServiceBooking, (b) => b.serviceProduct)
  serviceBookings: ServiceBooking[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}

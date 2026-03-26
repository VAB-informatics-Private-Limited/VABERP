import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Indent } from '../../indents/entities/indent.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'grn_number' })
  grnNumber: string;

  @Column({ name: 'indent_id', nullable: true })
  indentId: number;

  @ManyToOne(() => Indent)
  @JoinColumn({ name: 'indent_id' })
  indent: Indent;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'partially_confirmed', 'confirmed', 'rejected'

  @Column({ name: 'released_by', nullable: true })
  releasedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'released_by' })
  releasedByEmployee: Employee;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'received_by' })
  receivedByEmployee: Employee;

  @Column({ name: 'received_date', type: 'date', nullable: true })
  receivedDate: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt, { cascade: true })
  items: GoodsReceiptItem[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}

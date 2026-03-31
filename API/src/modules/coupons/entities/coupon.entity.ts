import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'coupon_code', unique: true })
  couponCode: string;

  @Column({ name: 'discount_type', default: 'flat' })
  discountType: string; // 'flat' | 'percentage'

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: Date;

  @Column({ default: 'active' })
  status: string; // 'active' | 'inactive'

  @Column({ name: 'max_uses', default: 0 })
  maxUses: number; // 0 = unlimited

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;
}

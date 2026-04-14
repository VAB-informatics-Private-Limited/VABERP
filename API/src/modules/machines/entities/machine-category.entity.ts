import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';

@Entity('machine_categories')
export class MachineCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ name: 'parent_category_id', type: 'int', nullable: true })
  parentCategoryId: number | null;

  @ManyToOne(() => MachineCategory, { nullable: true })
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory: MachineCategory;

  @OneToMany(() => MachineCategory, (c) => c.parentCategory)
  subCategories: MachineCategory[];

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}

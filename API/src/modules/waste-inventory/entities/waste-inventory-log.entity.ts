import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WasteInventory } from './waste-inventory.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('waste_inventory_log')
export class WasteInventoryLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'inventory_id' })
  inventoryId: number;

  @ManyToOne(() => WasteInventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory: WasteInventory;

  @Column({ type: 'varchar' })
  action: string; // generated | reserved | reservation_released | disposed | adjusted | expired | quarantined | written_off

  @Column({ name: 'quantity_delta', type: 'decimal', precision: 14, scale: 3 })
  quantityDelta: number;

  @Column({ name: 'quantity_after', type: 'decimal', precision: 14, scale: 3 })
  quantityAfter: number;

  @Column({ name: 'reference_type', type: 'varchar', nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'int', nullable: true })
  referenceId: number | null;

  @Column({ name: 'performed_by', type: 'int', nullable: true })
  performedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByEmployee: Employee;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}

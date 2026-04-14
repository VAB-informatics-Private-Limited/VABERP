import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('organizer_tag_masters')
export class OrganizerTagMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enterpriseId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ default: 'blue' })
  color: string;

  @CreateDateColumn()
  createdAt: Date;
}

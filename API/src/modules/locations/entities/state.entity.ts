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
import { Country } from './country.entity';
import { City } from './city.entity';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'country_id' })
  countryId: number;

  @ManyToOne(() => Country, (country) => country.states)
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'code', length: 10, nullable: true })
  code: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => City, (city) => city.state)
  cities: City[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}

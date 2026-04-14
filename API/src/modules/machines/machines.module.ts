import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Machine } from './entities/machine.entity';
import { MachineCategory } from './entities/machine-category.entity';
import { MachineMeterLog } from './entities/machine-meter-log.entity';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Machine, MachineCategory, MachineMeterLog])],
  controllers: [MachinesController],
  providers: [MachinesService],
  exports: [MachinesService, TypeOrmModule],
})
export class MachinesModule {}

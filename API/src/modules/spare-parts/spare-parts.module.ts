import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SparePart } from './entities/spare-part.entity';
import { MachineSpareMap } from './entities/machine-spare-map.entity';
import { MachineSpare } from './entities/machine-spare.entity';
import { Machine } from '../machines/entities/machine.entity';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SparePart, MachineSpareMap, MachineSpare, Machine]),
  ],
  controllers: [SparePartsController],
  providers: [SparePartsService],
  exports: [SparePartsService, TypeOrmModule],
})
export class SparePartsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitMastersController } from './unit-masters.controller';
import { UnitMastersService } from './unit-masters.service';
import { UnitMaster } from './entities/unit-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnitMaster])],
  controllers: [UnitMastersController],
  providers: [UnitMastersService],
  exports: [UnitMastersService],
})
export class UnitMastersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BomTemplate } from './entities/bom-template.entity';
import { BomLine } from './entities/bom-line.entity';
import { MaintenanceBomService } from './maintenance-bom.service';
import { MaintenanceBomController } from './maintenance-bom.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BomTemplate, BomLine])],
  controllers: [MaintenanceBomController],
  providers: [MaintenanceBomService],
  exports: [MaintenanceBomService, TypeOrmModule],
})
export class MaintenanceBomModule {}

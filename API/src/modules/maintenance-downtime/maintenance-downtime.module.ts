import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DowntimeLog } from './entities/downtime-log.entity';
import { MaintenanceDowntimeService } from './maintenance-downtime.service';
import { MaintenanceDowntimeController } from './maintenance-downtime.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DowntimeLog])],
  controllers: [MaintenanceDowntimeController],
  providers: [MaintenanceDowntimeService],
  exports: [MaintenanceDowntimeService],
})
export class MaintenanceDowntimeModule {}

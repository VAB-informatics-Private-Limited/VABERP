import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceWorkOrder } from './entities/maintenance-work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { WorkOrderStatusLog } from './entities/work-order-status-log.entity';
import { MaintenanceReminder } from '../maintenance-reminders/entities/maintenance-reminder.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { BomLine } from '../maintenance-bom/entities/bom-line.entity';
import { MaintenanceWorkOrdersService } from './maintenance-work-orders.service';
import { MaintenanceWorkOrdersController } from './maintenance-work-orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceWorkOrder,
      WorkOrderPart,
      WorkOrderStatusLog,
      MaintenanceReminder,
      RawMaterial,
      BomLine,
    ]),
  ],
  controllers: [MaintenanceWorkOrdersController],
  providers: [MaintenanceWorkOrdersService],
  exports: [MaintenanceWorkOrdersService],
})
export class MaintenanceWorkOrdersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';
import { JobCard } from './entities/job-card.entity';
import { JobCardProgress } from './entities/job-card-progress.entity';
import { JobCardStageHistory } from './entities/job-card-stage-history.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ProcessTemplate } from './entities/process-template.entity';
import { Bom } from './entities/bom.entity';
import { BomItem } from './entities/bom-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLedger } from '../inventory/entities/inventory-ledger.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItem } from '../sales-orders/entities/sales-order-item.entity';
import { StageMaster } from '../stage-masters/entities/stage-master.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobCard, JobCardProgress, JobCardStageHistory, ProcessStage, ProcessTemplate,
      Bom, BomItem,
      Inventory, InventoryLedger,
      SalesOrder, SalesOrderItem,
      StageMaster,
      MaterialRequest, MaterialRequestItem,
      RawMaterial, RawMaterialLedger,
    ]),
  ],
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}

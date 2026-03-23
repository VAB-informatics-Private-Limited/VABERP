import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialRequestsController } from './material-requests.controller';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestItem } from './entities/material-request-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLedger } from '../inventory/entities/inventory-ledger.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { IndentsModule } from '../indents/indents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaterialRequest, MaterialRequestItem, Inventory, InventoryLedger, SalesOrder, RawMaterial, RawMaterialLedger]),
    forwardRef(() => IndentsModule),
  ],
  controllers: [MaterialRequestsController],
  providers: [MaterialRequestsService],
  exports: [MaterialRequestsService],
})
export class MaterialRequestsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLedger } from '../inventory/entities/inventory-ledger.entity';
import { Indent } from '../indents/entities/indent.entity';
import { IndentItem } from '../indents/entities/indent-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { IndentsModule } from '../indents/indents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder, PurchaseOrderItem,
      MaterialRequest, MaterialRequestItem,
      Inventory, InventoryLedger,
      Indent, IndentItem,
      Supplier,
      RawMaterial, RawMaterialLedger,
    ]),
    IndentsModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}

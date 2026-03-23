import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryLedger } from './entities/inventory-ledger.entity';
import { Product } from '../products/entities/product.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryLedger, Product, Employee, Enterprise, MaterialRequestItem]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

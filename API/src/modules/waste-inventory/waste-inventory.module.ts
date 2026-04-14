import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteCategory } from './entities/waste-category.entity';
import { WasteSource } from './entities/waste-source.entity';
import { WasteInventory } from './entities/waste-inventory.entity';
import { WasteInventoryLog } from './entities/waste-inventory-log.entity';
import { WasteInventoryService } from './waste-inventory.service';
import { WasteInventoryController } from './waste-inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WasteCategory, WasteSource, WasteInventory, WasteInventoryLog])],
  controllers: [WasteInventoryController],
  providers: [WasteInventoryService],
  exports: [WasteInventoryService, TypeOrmModule],
})
export class WasteInventoryModule {}

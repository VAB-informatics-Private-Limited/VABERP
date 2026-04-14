import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteDisposalTransaction } from './entities/waste-disposal-transaction.entity';
import { WasteDisposalLine } from './entities/waste-disposal-line.entity';
import { WasteInventory } from '../waste-inventory/entities/waste-inventory.entity';
import { WasteInventoryLog } from '../waste-inventory/entities/waste-inventory-log.entity';
import { WasteParty } from '../waste-parties/entities/waste-party.entity';
import { WasteDisposalService } from './waste-disposal.service';
import { WasteDisposalController } from './waste-disposal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WasteDisposalTransaction, WasteDisposalLine, WasteInventory, WasteInventoryLog, WasteParty])],
  controllers: [WasteDisposalController],
  providers: [WasteDisposalService],
  exports: [WasteDisposalService],
})
export class WasteDisposalModule {}

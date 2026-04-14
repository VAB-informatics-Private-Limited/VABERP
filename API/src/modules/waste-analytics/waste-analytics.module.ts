import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteInventory } from '../waste-inventory/entities/waste-inventory.entity';
import { WasteDisposalTransaction } from '../waste-disposal/entities/waste-disposal-transaction.entity';
import { WasteAnalyticsService } from './waste-analytics.service';
import { WasteAnalyticsController } from './waste-analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WasteInventory, WasteDisposalTransaction])],
  controllers: [WasteAnalyticsController],
  providers: [WasteAnalyticsService],
})
export class WasteAnalyticsModule {}

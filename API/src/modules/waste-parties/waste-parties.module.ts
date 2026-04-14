import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteParty } from './entities/waste-party.entity';
import { WastePartyRate } from './entities/waste-party-rate.entity';
import { WastePartiesService } from './waste-parties.service';
import { WastePartiesController } from './waste-parties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WasteParty, WastePartyRate])],
  controllers: [WastePartiesController],
  providers: [WastePartiesService],
  exports: [WastePartiesService, TypeOrmModule],
})
export class WastePartiesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestStatusesController } from './interest-statuses.controller';
import { InterestStatusesService } from './interest-statuses.service';
import { InterestStatus } from './entities/interest-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InterestStatus])],
  controllers: [InterestStatusesController],
  providers: [InterestStatusesService],
  exports: [InterestStatusesService],
})
export class InterestStatusesModule {}

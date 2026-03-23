import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageMastersController } from './stage-masters.controller';
import { StageMastersService } from './stage-masters.service';
import { StageMaster } from './entities/stage-master.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StageMaster, JobCard])],
  controllers: [StageMastersController],
  providers: [StageMastersService],
  exports: [StageMastersService],
})
export class StageMastersModule {}

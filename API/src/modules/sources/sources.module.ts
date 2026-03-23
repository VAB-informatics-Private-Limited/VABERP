import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';
import { Source } from './entities/source.entity';
import { Enquiry } from '../enquiries/entities/enquiry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Source, Enquiry])],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}

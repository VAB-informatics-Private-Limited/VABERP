import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enterprise } from './entities/enterprise.entity';
import { EnterprisesService } from './enterprises.service';
import { EnterprisesController } from './enterprises.controller';
import { EnterprisesScheduler } from './enterprises.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Enterprise])],
  controllers: [EnterprisesController],
  providers: [EnterprisesService, EnterprisesScheduler],
  exports: [EnterprisesService],
})
export class EnterprisesModule {}

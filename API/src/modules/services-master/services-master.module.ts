import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesMasterService } from './services-master.service';
import { ServicesMasterController } from './services-master.controller';
import { ServiceMaster } from './entities/service-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceMaster])],
  controllers: [ServicesMasterController],
  providers: [ServicesMasterService],
  exports: [ServicesMasterService],
})
export class ServicesMasterModule {}

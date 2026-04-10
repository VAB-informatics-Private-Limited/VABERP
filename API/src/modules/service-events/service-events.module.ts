import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceEvent } from './entities/service-event.entity';
import { ServiceRule } from '../product-types/entities/service-rule.entity';
import { ServiceEventsService } from './service-events.service';
import { ServiceEventsController } from './service-events.controller';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEvent, ServiceRule]), SmsModule],
  controllers: [ServiceEventsController],
  providers: [ServiceEventsService],
  exports: [ServiceEventsService],
})
export class ServiceEventsModule {}

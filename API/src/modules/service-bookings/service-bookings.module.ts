import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceBooking } from './entities/service-booking.entity';
import { ServiceBookingsService } from './service-bookings.service';
import { ServiceBookingsController } from './service-bookings.controller';
import { ServiceEventsModule } from '../service-events/service-events.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceBooking]),
    ServiceEventsModule,
    SmsModule,
  ],
  controllers: [ServiceBookingsController],
  providers: [ServiceBookingsService],
  exports: [ServiceBookingsService],
})
export class ServiceBookingsModule {}

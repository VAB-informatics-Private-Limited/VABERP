import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdmin } from './entities/super-admin.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { Employee } from '../employees/entities/employee.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { PlatformPayment } from './entities/platform-payment.entity';
import { Coupon } from '../coupons/entities/coupon.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SuperAdmin,
      Enterprise,
      Invoice,
      Payment,
      PurchaseOrder,
      SalesOrder,
      Employee,
      SupportTicket,
      SubscriptionPlan,
      PlatformPayment,
      Coupon,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
    }),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}

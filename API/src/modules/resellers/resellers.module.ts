import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResellersService } from './resellers.service';
import { ResellersController } from './resellers.controller';
import { Reseller } from './entities/reseller.entity';
import { ResellerPlanPricing } from './entities/reseller-plan-pricing.entity';
import { SubscriptionPlan } from '../super-admin/entities/subscription-plan.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reseller, ResellerPlanPricing, SubscriptionPlan, Enterprise]),
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
  controllers: [ResellersController],
  providers: [ResellersService],
  exports: [ResellersService],
})
export class ResellersModule {}

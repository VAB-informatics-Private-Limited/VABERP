import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Employee } from '../employees/entities/employee.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { MenuPermission } from '../employees/entities/menu-permission.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { Reseller } from '../resellers/entities/reseller.entity';
import { EnterpriseBranding } from '../enterprise-branding/entities/enterprise-branding.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
    TypeOrmModule.forFeature([Employee, Enterprise, EnterpriseBranding, MenuPermission, SuperAdmin, Reseller]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

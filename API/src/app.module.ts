import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { MenuPermission } from './modules/employees/entities/menu-permission.entity';
import { AuthModule } from './modules/auth/auth.module';
import { EnterprisesModule } from './modules/enterprises/enterprises.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EmailModule } from './modules/email/email.module';
import { InterestStatusesModule } from './modules/interest-statuses/interest-statuses.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { SourcesModule } from './modules/sources/sources.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { MaterialRequestsModule } from './modules/material-requests/material-requests.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { StageMastersModule } from './modules/stage-masters/stage-masters.module';
import { UnitMastersModule } from './modules/unit-masters/unit-masters.module';
import { RawMaterialsModule } from './modules/raw-materials/raw-materials.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { IndentsModule } from './modules/indents/indents.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { LocationsModule } from './modules/locations/locations.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // Permission guard entity
    TypeOrmModule.forFeature([MenuPermission]),

    // Feature modules
    AuthModule,
    EnterprisesModule,
    EmployeesModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    EnquiriesModule,
    QuotationsModule,
    ManufacturingModule,
    ReportsModule,
    EmailModule,
    InterestStatusesModule,
    EmailTemplatesModule,
    SourcesModule,
    InvoicesModule,
    SalesOrdersModule,
    MaterialRequestsModule,
    PurchaseOrdersModule,
    AuditLogsModule,
    StageMastersModule,
    UnitMastersModule,
    RawMaterialsModule,
    SuppliersModule,
    IndentsModule,
    GoodsReceiptsModule,
    SuperAdminModule,
    LocationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}

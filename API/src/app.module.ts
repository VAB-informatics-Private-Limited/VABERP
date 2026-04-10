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
import { SmsModule } from './modules/sms/sms.module';
import { InterestStatusesModule } from './modules/interest-statuses/interest-statuses.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { SourcesModule } from './modules/sources/sources.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ProformaInvoicesModule } from './modules/proforma-invoices/proforma-invoices.module';
import { PrintTemplatesModule } from './modules/print-templates/print-templates.module';
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
import { RfqsModule } from './modules/rfqs/rfqs.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ServicesMasterModule } from './modules/services-master/services-master.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ResellersModule } from './modules/resellers/resellers.module';
import { CrmModule } from './modules/crm/crm.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TeamUpdatesModule } from './modules/team-updates/team-updates.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProductTypesModule } from './modules/product-types/product-types.module';
import { ServiceProductsModule } from './modules/service-products/service-products.module';
import { ServiceEventsModule } from './modules/service-events/service-events.module';
import { ServiceBookingsModule } from './modules/service-bookings/service-bookings.module';
import { ScheduleModule } from '@nestjs/schedule';
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
    SmsModule,
    InterestStatusesModule,
    EmailTemplatesModule,
    SourcesModule,
    InvoicesModule,
    ProformaInvoicesModule,
    PrintTemplatesModule,
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
    RfqsModule,
    SuperAdminModule,
    LocationsModule,
    ServicesMasterModule,
    CouponsModule,
    ResellersModule,
    CrmModule,
    TasksModule,
    TeamUpdatesModule,
    NotificationsModule,
    ProductTypesModule,
    ServiceProductsModule,
    ServiceEventsModule,
    ServiceBookingsModule,
    ScheduleModule.forRoot(),
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

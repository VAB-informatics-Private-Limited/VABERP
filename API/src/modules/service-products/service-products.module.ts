import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceProduct } from './entities/service-product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ServiceProductsService } from './service-products.service';
import { ServiceProductsController } from './service-products.controller';
import { ServiceEventsModule } from '../service-events/service-events.module';
import { ProductTypesModule } from '../product-types/product-types.module';
import { ServiceScheduler } from './service.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceProduct, Customer]),
    ServiceEventsModule,
    ProductTypesModule,
  ],
  controllers: [ServiceProductsController],
  providers: [ServiceProductsService, ServiceScheduler],
  exports: [ServiceProductsService],
})
export class ServiceProductsModule {}

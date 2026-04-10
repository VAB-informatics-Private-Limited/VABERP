import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductType } from './entities/product-type.entity';
import { ServiceRule } from './entities/service-rule.entity';
import { ProductTypesService } from './product-types.service';
import { ProductTypesController } from './product-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductType, ServiceRule])],
  controllers: [ProductTypesController],
  providers: [ProductTypesService],
  exports: [ProductTypesService, TypeOrmModule],
})
export class ProductTypesModule {}

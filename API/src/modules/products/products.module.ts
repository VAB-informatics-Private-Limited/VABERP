import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductBomService } from './product-bom.service';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Product } from './entities/product.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductBom } from './entities/product-bom.entity';
import { ProductBomItem } from './entities/product-bom-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Subcategory,
      Product,
      ProductAttribute,
      ProductBom,
      ProductBomItem,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductBomService],
  exports: [ProductsService, ProductBomService, TypeOrmModule],
})
export class ProductsModule {}

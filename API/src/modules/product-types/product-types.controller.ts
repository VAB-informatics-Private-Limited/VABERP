import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { EnterpriseId, RequirePermission } from '../../common/decorators';

@ApiTags('Product Types')
@ApiBearerAuth('JWT-auth')
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Get()
  @RequirePermission('service_management', 'product_types', 'view')
  findAll(@EnterpriseId() enterpriseId: number) {
    return this.productTypesService.findAll(enterpriseId);
  }

  @Get(':id')
  @RequirePermission('service_management', 'product_types', 'view')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productTypesService.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('service_management', 'product_types', 'create')
  create(
    @EnterpriseId() enterpriseId: number,
    @Body() dto: CreateProductTypeDto,
  ) {
    return this.productTypesService.create(enterpriseId, dto);
  }

  @Put(':id')
  @RequirePermission('service_management', 'product_types', 'edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: UpdateProductTypeDto,
  ) {
    return this.productTypesService.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('service_management', 'product_types', 'delete')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productTypesService.delete(id, enterpriseId);
  }
}

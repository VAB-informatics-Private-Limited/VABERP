import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceProductsService } from './service-products.service';
import { CreateServiceProductDto } from './dto/create-service-product.dto';
import { UpdateServiceProductDto } from './dto/update-service-product.dto';
import { EnterpriseId } from '../../common/decorators/enterprise-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Service Products')
@ApiBearerAuth('JWT-auth')
@Controller('service-products')
export class ServiceProductsController {
  constructor(private readonly serviceProductsService: ServiceProductsService) {}

  @Get()
  @RequirePermission('service_management', 'service_products', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('productTypeId') productTypeId?: number,
  ) {
    return this.serviceProductsService.findAll(
      enterpriseId,
      page ? +page : 1,
      limit ? +limit : 20,
      search,
      status,
      productTypeId ? +productTypeId : undefined,
    );
  }

  @Get('revenue-summary')
  @RequirePermission('service_management', 'service_revenue', 'view')
  getRevenueSummary(@EnterpriseId() enterpriseId: number) {
    return this.serviceProductsService.getRevenueSummary(enterpriseId);
  }

  @Get(':id')
  @RequirePermission('service_management', 'service_products', 'view')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.serviceProductsService.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('service_management', 'service_products', 'create')
  create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateServiceProductDto,
  ) {
    return this.serviceProductsService.create(enterpriseId, dto, user?.id);
  }

  @Put(':id')
  @RequirePermission('service_management', 'service_products', 'edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: UpdateServiceProductDto,
  ) {
    return this.serviceProductsService.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('service_management', 'service_products', 'delete')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.serviceProductsService.delete(id, enterpriseId);
  }
}

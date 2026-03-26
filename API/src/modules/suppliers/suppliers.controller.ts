import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@ApiTags('Suppliers')
@Controller('suppliers')
@ApiBearerAuth('JWT-auth')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @RequirePermission('procurement', 'suppliers', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(enterpriseId, page, limit, status);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get suppliers filtered by category/subcategory' })
  @RequirePermission('procurement', 'suppliers', 'view')
  async getByCategory(
    @EnterpriseId() enterpriseId: number,
    @Query('categories') categories?: string,
    @Query('subcategories') subcategories?: string,
  ) {
    const cats = categories ? categories.split(',').filter(Boolean) : [];
    const subs = subcategories ? subcategories.split(',').filter(Boolean) : [];
    return this.service.getByCategory(enterpriseId, cats, subs);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @RequirePermission('procurement', 'suppliers', 'view')
  async findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.findOne(id, enterpriseId);
  }

  @Post(':id/categories')
  @ApiOperation({ summary: 'Add category mapping to a supplier' })
  @RequirePermission('procurement', 'suppliers', 'edit')
  async addCategory(
    @EnterpriseId() enterpriseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { category: string; subcategory?: string },
  ) {
    return this.service.addCategory(id, enterpriseId, dto);
  }

  @Delete('categories/:catId')
  @ApiOperation({ summary: 'Remove category mapping from a supplier' })
  @RequirePermission('procurement', 'suppliers', 'edit')
  async removeCategory(
    @EnterpriseId() enterpriseId: number,
    @Param('catId', ParseIntPipe) catId: number,
  ) {
    return this.service.removeCategory(catId, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  @RequirePermission('procurement', 'suppliers', 'create')
  async create(@EnterpriseId() enterpriseId: number, @Body() dto: CreateSupplierDto) {
    return this.service.create(enterpriseId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @RequirePermission('procurement', 'suppliers', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: Partial<CreateSupplierDto>,
  ) {
    return this.service.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  @RequirePermission('procurement', 'suppliers', 'delete')
  async delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.delete(id, enterpriseId);
  }
}

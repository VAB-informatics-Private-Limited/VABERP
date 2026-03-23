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

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @RequirePermission('procurement', 'suppliers', 'view')
  async findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.findOne(id, enterpriseId);
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

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto, StockAdjustmentDto } from './dto/update-raw-material.dto';

@ApiTags('Raw Materials')
@Controller('raw-materials')
@ApiBearerAuth('JWT-auth')
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Get()
  @ApiOperation({ summary: 'List raw materials with pagination' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    const result = await this.rawMaterialsService.findAll(
      enterpriseId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      category,
    );
    return { message: 'Raw materials fetched', ...result };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List distinct categories' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async getCategories(@EnterpriseId() enterpriseId: number) {
    const categories = await this.rawMaterialsService.getCategories(enterpriseId);
    return { message: 'Categories fetched', data: categories };
  }

  @Get('subcategories')
  @ApiOperation({ summary: 'List distinct subcategories for a given category' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async getSubcategories(
    @EnterpriseId() enterpriseId: number,
    @Query('category') category: string,
  ) {
    const subcategories = await this.rawMaterialsService.getSubcategories(enterpriseId, category || '');
    return { message: 'Subcategories fetched', data: subcategories };
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get raw material ledger' })
  @RequirePermission('inventory', 'stock_ledger', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'rawMaterialId', required: false })
  @ApiQuery({ name: 'transactionType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getLedger(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rawMaterialId') rawMaterialId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.rawMaterialsService.getLedger(
      enterpriseId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      rawMaterialId ? parseInt(rawMaterialId) : undefined,
      transactionType,
      startDate,
      endDate,
    );
    return { message: 'Ledger fetched', ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single raw material with ledger' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async findOne(
    @EnterpriseId() enterpriseId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.rawMaterialsService.findOne(enterpriseId, id);
    return { message: 'Raw material fetched', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create raw material' })
  @RequirePermission('inventory', 'raw_materials', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() dto: CreateRawMaterialDto,
  ) {
    const data = await this.rawMaterialsService.create(enterpriseId, dto);
    return { message: 'Raw material created', data };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple raw materials at once' })
  @RequirePermission('inventory', 'raw_materials', 'create')
  async bulkCreate(
    @EnterpriseId() enterpriseId: number,
    @Body() dto: { items: CreateRawMaterialDto[] },
  ) {
    const data = await this.rawMaterialsService.bulkCreate(enterpriseId, dto.items);
    return { message: `${data.length} raw materials created`, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update raw material' })
  @RequirePermission('inventory', 'raw_materials', 'edit')
  async update(
    @EnterpriseId() enterpriseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRawMaterialDto,
  ) {
    const data = await this.rawMaterialsService.update(enterpriseId, id, dto);
    return { message: 'Raw material updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete raw material (set inactive)' })
  @RequirePermission('inventory', 'raw_materials', 'delete')
  async remove(
    @EnterpriseId() enterpriseId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.rawMaterialsService.remove(enterpriseId, id);
    return { message: 'Raw material deactivated', data };
  }

  @Post(':id/stock-adjustment')
  @ApiOperation({ summary: 'Manual stock adjustment' })
  @RequirePermission('inventory', 'raw_materials', 'create')
  async stockAdjustment(
    @EnterpriseId() enterpriseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockAdjustmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.rawMaterialsService.stockAdjustment(
      enterpriseId,
      id,
      dto,
      user?.id,
    );
    return { message: 'Stock adjusted', data };
  }
}

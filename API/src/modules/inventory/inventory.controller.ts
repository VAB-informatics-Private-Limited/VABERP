import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateInventoryDto, CreateLedgerEntryDto } from './dto';

@ApiTags('Inventory')
@Controller('inventory')
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory records' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'lowStockOnly', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'subcategoryId', required: false })
  @ApiQuery({ name: 'availability', required: false, description: 'low_stock | overstocked | in_stock | out_of_stock' })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('lowStockOnly') lowStockOnly?: boolean,
    @Query('categoryId') categoryId?: number,
    @Query('subcategoryId') subcategoryId?: number,
    @Query('availability') availability?: string,
  ) {
    return this.inventoryService.findAll(enterpriseId, page, limit, search, lowStockOnly, categoryId, subcategoryId, availability);
  }

  @Get('priority-items')
  @ApiOperation({ summary: 'Get inventory items with priority set' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async getPriorityItems(@EnterpriseId() enterpriseId: number) {
    return this.inventoryService.getPriorityItems(enterpriseId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async getLowStockAlerts(@EnterpriseId() enterpriseId: number) {
    return this.inventoryService.getLowStockAlerts(enterpriseId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get inventory ledger (transaction history)' })
  @RequirePermission('inventory', 'stock_ledger', 'view')
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLedger(
    @EnterpriseId() enterpriseId: number,
    @Query('productId') productId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getLedger(enterpriseId, productId, page, limit);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get inventory by product ID' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.inventoryService.findByProduct(productId, enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory record by ID' })
  @RequirePermission('inventory', 'raw_materials', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.inventoryService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new inventory record' })
  @RequirePermission('inventory', 'raw_materials', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateInventoryDto,
  ) {
    return this.inventoryService.create(enterpriseId, createDto);
  }

  @Post('stock')
  @ApiOperation({ summary: 'Add stock transaction (IN/OUT/ADJUSTMENT/RETURN)' })
  @RequirePermission('inventory', 'stock_ledger', 'create')
  async addStock(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateLedgerEntryDto,
  ) {
    return this.inventoryService.addStock(enterpriseId, createDto, user ? { id: user.id, type: user.type } : undefined);
  }

  @Put('product/:productId/priority')
  @ApiOperation({ summary: 'Update inventory priority by product ID' })
  @RequirePermission('inventory', 'raw_materials', 'edit')
  async updatePriorityByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @EnterpriseId() enterpriseId: number,
    @Body('priority') priority: string,
  ) {
    return this.inventoryService.updatePriorityByProduct(productId, enterpriseId, priority);
  }

  @Put(':id/priority')
  @ApiOperation({ summary: 'Update inventory priority' })
  @RequirePermission('inventory', 'raw_materials', 'edit')
  async updatePriority(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body('priority') priority: string,
  ) {
    return this.inventoryService.updatePriority(id, enterpriseId, priority);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an inventory record' })
  @RequirePermission('inventory', 'raw_materials', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateInventoryDto>,
  ) {
    return this.inventoryService.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inventory record' })
  @RequirePermission('inventory', 'raw_materials', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.inventoryService.delete(id, enterpriseId);
  }
}

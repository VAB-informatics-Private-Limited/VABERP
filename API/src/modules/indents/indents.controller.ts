import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IndentsService } from './indents.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';

@ApiTags('Indents')
@Controller('indents')
@ApiBearerAuth('JWT-auth')
export class IndentsController {
  constructor(private readonly service: IndentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all indents' })
  @RequirePermission('procurement', 'indents', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('source') source?: string,
  ) {
    return this.service.findAll(enterpriseId, page, limit, status, source);
  }

  @Get('by-mr/:mrId')
  @ApiOperation({ summary: 'Get indent by material request ID' })
  @RequirePermission('procurement', 'indents', 'view')
  async getByMR(@Param('mrId', ParseIntPipe) mrId: number, @EnterpriseId() enterpriseId: number) {
    return this.service.getByMaterialRequest(mrId, enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get indent by ID' })
  @RequirePermission('procurement', 'indents', 'view')
  async findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.findOne(id, enterpriseId);
  }

  @Post('from-mr/:mrId')
  @ApiOperation({ summary: 'Create indent from MR shortage items (auto-detect)' })
  @RequirePermission('procurement', 'indents', 'create')
  async createFromMrShortage(
    @Param('mrId', ParseIntPipe) mrId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.createFromMrShortage(mrId, enterpriseId, user?.id);
  }

  @Post('from-inventory')
  @ApiOperation({ summary: 'Create indent directly from inventory (Individual Order from Inventory)' })
  @RequirePermission('procurement', 'indents', 'create')
  async createFromInventory(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: { items: { rawMaterialId: number; quantity: number; notes?: string }[]; notes?: string },
  ) {
    return this.service.createFromInventory(enterpriseId, dto.items, user?.id, dto.notes);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update an indent item' })
  @RequirePermission('procurement', 'indents', 'edit')
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: { shortageQuantity?: number; notes?: string },
  ) {
    return this.service.updateItem(id, itemId, enterpriseId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an indent item' })
  @RequirePermission('procurement', 'indents', 'delete')
  async removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.removeItem(id, itemId, enterpriseId);
  }

  @Post(':id/receive-goods')
  @ApiOperation({ summary: 'Receive goods for indent items (updates raw material stock)' })
  @RequirePermission('procurement', 'indents', 'create')
  async receiveGoods(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: { items: { indentItemId: number; receivedQuantity: number }[] },
  ) {
    return this.service.receiveGoods(id, enterpriseId, dto.items, user?.id);
  }

  @Post(':id/release-to-inventory')
  @ApiOperation({ summary: 'Release received items to inventory (resets linked MR for re-approval)' })
  @RequirePermission('procurement', 'indents', 'create')
  async releaseToInventory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.releaseToInventory(id, enterpriseId, user?.id);
  }

  @Post(':id/release-all')
  @ApiOperation({ summary: 'Release all items to inventory — auto-approve and issue to manufacturing' })
  @RequirePermission('procurement', 'indents', 'create')
  async releaseAllItems(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.releaseAllItems(id, enterpriseId, user?.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an indent' })
  @RequirePermission('procurement', 'indents', 'edit')
  async cancel(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.cancel(id, enterpriseId);
  }
}

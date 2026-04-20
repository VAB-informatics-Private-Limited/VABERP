import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { EnterpriseId, CurrentUser, RequirePermission, OwnDataOnly, CurrentUserId, DataStartDate } from '../../common/decorators';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
@ApiBearerAuth('JWT-auth')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all purchase orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @RequirePermission('orders', 'purchase_orders', 'view')
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @DataStartDate() dataStartDate: Date | null,
    @CurrentUser() user: any,
    @OwnDataOnly() ownDataOnly: boolean,
    @CurrentUserId() currentUserId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const isManager = user?.isReportingHead === true && user?.type === 'employee';
    const effectiveManagerUserId = isManager ? currentUserId : undefined;
    return this.service.findAll(enterpriseId, page, limit, status, dataStartDate, ownDataOnly, currentUserId, effectiveManagerUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @RequirePermission('orders', 'purchase_orders', 'view')
  async findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a purchase order' })
  @RequirePermission('orders', 'purchase_orders', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.create(enterpriseId, dto, user?.id);
  }

  @Post('from-material-request/:mrId')
  @ApiOperation({ summary: 'Create PO from unfulfilled material request items' })
  @RequirePermission('orders', 'purchase_orders', 'create')
  async createFromMR(
    @Param('mrId', ParseIntPipe) mrId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('supplierName') supplierName: string,
  ) {
    return this.service.createFromMaterialRequest(mrId, enterpriseId, supplierName, user?.id);
  }

  @Post('from-indent/:indentId')
  @ApiOperation({ summary: 'Create PO from indent (procurement)' })
  @RequirePermission('orders', 'purchase_orders', 'create')
  async createFromIndent(
    @Param('indentId', ParseIntPipe) indentId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: {
      supplierId: number;
      items: { indentItemId: number; quantity: number; unitPrice?: number; taxPercent?: number }[];
      expectedDelivery?: string;
      notes?: string;
    },
  ) {
    return this.service.createFromIndent(indentId, enterpriseId, dto, user?.id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a purchase order' })
  @RequirePermission('orders', 'purchase_orders', 'approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.approve(id, enterpriseId, user?.id);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive goods (adds to inventory/raw materials)' })
  @RequirePermission('orders', 'purchase_orders', 'edit')
  async receive(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.receive(id, enterpriseId, user?.id);
  }

  @Patch(':id/eta')
  @ApiOperation({ summary: 'Update expected delivery date of a purchase order' })
  @RequirePermission('orders', 'purchase_orders', 'edit')
  async updateETA(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body('expectedDelivery') expectedDelivery: string,
  ) {
    return this.service.updateETA(id, enterpriseId, expectedDelivery);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a purchase order' })
  @RequirePermission('orders', 'purchase_orders', 'delete')
  async delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.delete(id, enterpriseId);
  }
}

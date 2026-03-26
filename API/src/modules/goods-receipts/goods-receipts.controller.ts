import {
  Controller, Get, Post, Param, Query, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GoodsReceiptsService } from './goods-receipts.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';

@ApiTags('Goods Receipts')
@Controller('goods-receipts')
@ApiBearerAuth('JWT-auth')
export class GoodsReceiptsController {
  constructor(private readonly service: GoodsReceiptsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all goods receipts (GRNs)' })
  @RequirePermission('inventory', 'goods_receipts', 'view')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll(enterpriseId, status, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get GRN by ID' })
  @RequirePermission('inventory', 'goods_receipts', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.findOne(id, enterpriseId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Inventory team confirms receipt of goods' })
  @RequirePermission('inventory', 'goods_receipts', 'edit')
  async confirmReceipt(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: {
      receivedBy: number;
      items: { grnItemId: number; confirmedQty: number; notes?: string }[];
      notes?: string;
    },
  ) {
    return this.service.confirmReceipt(id, enterpriseId, dto, user?.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending GRN (send back to procurement)' })
  @RequirePermission('inventory', 'goods_receipts', 'edit')
  async rejectReceipt(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: { notes?: string },
  ) {
    return this.service.rejectReceipt(id, enterpriseId, body?.notes);
  }
}

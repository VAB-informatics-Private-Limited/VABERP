import {
  Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MaterialRequestsService } from './material-requests.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateMaterialRequestDto, ApproveMaterialRequestDto } from './dto/create-material-request.dto';

@ApiTags('Material Requests')
@Controller('material-requests')
@ApiBearerAuth('JWT-auth')
export class MaterialRequestsController {
  constructor(private readonly service: MaterialRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all material requests' })
  @RequirePermission('inventory', 'material_requests', 'view')
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
  @ApiOperation({ summary: 'Get material request by ID' })
  @RequirePermission('inventory', 'material_requests', 'view')
  async findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.service.findOne(id, enterpriseId);
  }

  @Patch(':id/eta')
  @ApiOperation({ summary: 'Update material request expected delivery (ETA)' })
  @RequirePermission('inventory', 'material_requests', 'edit')
  async updateETA(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body('expectedDelivery') expectedDelivery: string,
  ) {
    return this.service.updateETA(id, enterpriseId, expectedDelivery);
  }

  @Post()
  @ApiOperation({ summary: 'Create a material request' })
  @RequirePermission('inventory', 'material_requests', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateMaterialRequestDto,
  ) {
    return this.service.create(enterpriseId, dto, user?.id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve material request items' })
  @RequirePermission('inventory', 'material_requests', 'approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: ApproveMaterialRequestDto,
  ) {
    return this.service.approve(id, enterpriseId, dto, user?.id);
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Issue all approved materials (deduct from inventory)' })
  @RequirePermission('inventory', 'material_requests', 'edit')
  async issue(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.issue(id, enterpriseId, user?.id);
  }

  @Post(':id/issue-item/:itemId')
  @ApiOperation({ summary: 'Issue a single material item (deduct from inventory)' })
  @RequirePermission('inventory', 'material_requests', 'edit')
  async issueItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.issueItem(id, itemId, enterpriseId, user?.id);
  }

  @Post(':id/issue-partial/:itemId')
  @ApiOperation({ summary: 'Issue a partial quantity of a material item' })
  @RequirePermission('inventory', 'material_requests', 'edit')
  async issuePartialItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('quantity') quantity: number,
  ) {
    return this.service.issuePartialItem(id, itemId, quantity, enterpriseId, user?.id);
  }

  @Post(':id/confirm-received')
  @ApiOperation({ summary: 'Manufacturing team confirms receipt of issued materials' })
  @RequirePermission('orders', 'manufacturing', 'view')
  async confirmReceived(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.confirmReceived(id, enterpriseId);
  }

  @Post(':id/recheck')
  @ApiOperation({ summary: 'Recheck stock for rejected items — if available, reset to pending for re-approval' })
  @RequirePermission('inventory', 'material_requests', 'edit')
  async recheck(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.recheck(id, enterpriseId);
  }

  @Post(':id/refresh-stock')
  @ApiOperation({ summary: 'Refresh available stock for all items from raw materials/inventory' })
  @RequirePermission('inventory', 'material_requests', 'edit')
  async refreshStock(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.refreshStock(id, enterpriseId);
  }
}

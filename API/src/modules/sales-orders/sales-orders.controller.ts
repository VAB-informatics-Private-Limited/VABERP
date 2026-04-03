import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { EnterpriseId, CurrentUser, RequirePermission, DataStartDate, OwnDataOnly, CurrentUserId } from '../../common/decorators';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/create-sales-order.dto';

@ApiTags('Sales Orders')
@Controller('sales-orders')
@ApiBearerAuth('JWT-auth')
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all sales orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @RequirePermission('orders', 'sales_orders', 'view')
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @DataStartDate() dataStartDate: Date | null,
    @OwnDataOnly() ownDataOnly: boolean,
    @CurrentUserId() currentUserId: number,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    // Purchase Orders are visible to all employees with access — no own-data filtering
    return this.service.findAll(enterpriseId, page, limit, search, status, dataStartDate, false, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order by ID' })
  @RequirePermission('orders', 'sales_orders', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.findOne(id, enterpriseId);
  }

  @Patch(':id/eta')
  @ApiOperation({ summary: 'Update sales order expected delivery (ETA)' })
  @RequirePermission('orders', 'sales_orders', 'edit')
  async updateETA(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body('expectedDelivery') expectedDelivery: string,
  ) {
    return this.service.updateETA(id, enterpriseId, expectedDelivery);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sales order' })
  @RequirePermission('orders', 'sales_orders', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateSalesOrderDto,
  ) {
    return this.service.create(enterpriseId, createDto, user?.id);
  }

  @Post('from-quotation/:quotationId')
  @ApiOperation({ summary: 'Create sales order from quotation' })
  @RequirePermission('orders', 'sales_orders', 'create')
  async createFromQuotation(
    @Param('quotationId', ParseIntPipe) quotationId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.createFromQuotation(quotationId, enterpriseId, user?.id);
  }

  @Post(':id/acknowledge-hold')
  @ApiOperation({ summary: 'Acknowledge hold from manufacturing' })
  @RequirePermission('orders', 'sales_orders', 'edit')
  async acknowledgeHold(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.acknowledgeHold(id, enterpriseId);
  }

  @Post(':id/send-to-manufacturing')
  @ApiOperation({ summary: 'Create job cards from sales order items' })
  @RequirePermission('orders', 'sales_orders', 'edit')
  async sendToManufacturing(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.sendToManufacturing(id, enterpriseId, user?.id);
  }

  @Post(':id/create-invoice')
  @ApiOperation({ summary: 'Create invoice from sales order' })
  @RequirePermission('orders', 'sales_orders', 'create')
  async createInvoice(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() body: { amount?: number; invoiceDate?: string; notes?: string; paymentMethod?: string },
  ) {
    return this.service.createInvoice(id, enterpriseId, user?.id, body);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update sales order status' })
  @RequirePermission('orders', 'sales_orders', 'edit')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.updateStatus(id, enterpriseId, status, reason, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sales order (with versioning)' })
  @RequirePermission('orders', 'sales_orders', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateSalesOrderDto,
  ) {
    return this.service.update(id, enterpriseId, updateDto, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sales order' })
  @RequirePermission('orders', 'sales_orders', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.delete(id, enterpriseId);
  }
}

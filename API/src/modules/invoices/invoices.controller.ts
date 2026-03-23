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
import { InvoicesService } from './invoices.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateInvoiceDto, RecordPaymentDto } from './dto/create-invoice.dto';

@ApiTags('Invoices')
@Controller('invoices')
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @RequirePermission('invoicing', 'invoices', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.invoicesService.findAll(enterpriseId, page, limit, search, status, customerId, fromDate, toDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @RequirePermission('invoicing', 'invoices', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.invoicesService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @RequirePermission('invoicing', 'invoices', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(enterpriseId, createDto, user?.id);
  }

  @Post('from-quotation/:quotationId')
  @ApiOperation({ summary: 'Create invoice from quotation' })
  @RequirePermission('invoicing', 'invoices', 'create')
  async createFromQuotation(
    @Param('quotationId', ParseIntPipe) quotationId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.createFromQuotation(quotationId, enterpriseId, user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @RequirePermission('invoicing', 'invoices', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() updateDto: Partial<CreateInvoiceDto>,
  ) {
    return this.invoicesService.update(id, enterpriseId, updateDto, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  @RequirePermission('invoicing', 'invoices', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.invoicesService.delete(id, enterpriseId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @RequirePermission('invoicing', 'payments', 'create')
  async recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.invoicesService.recordPayment(id, enterpriseId, dto, user?.id);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payment history for an invoice' })
  @RequirePermission('invoicing', 'payments', 'view')
  async getPayments(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.invoicesService.getPayments(id, enterpriseId);
  }
}

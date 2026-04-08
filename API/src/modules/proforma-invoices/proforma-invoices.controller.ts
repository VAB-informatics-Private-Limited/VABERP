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
import { ProformaInvoicesService } from './proforma-invoices.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateProformaInvoiceDto, UpdatePIStatusDto } from './dto/create-proforma-invoice.dto';

@ApiTags('Proforma Invoices')
@Controller('proforma-invoices')
@ApiBearerAuth('JWT-auth')
export class ProformaInvoicesController {
  constructor(private readonly piService: ProformaInvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all proforma invoices' })
  @RequirePermission('invoicing', 'proforma_invoices', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.piService.findAll(enterpriseId, page, limit, search, status);
  }

  @Post('from-quotation/:quotationId')
  @ApiOperation({ summary: 'Generate proforma invoice from quotation' })
  @RequirePermission('invoicing', 'proforma_invoices', 'create')
  async createFromQuotation(
    @Param('quotationId', ParseIntPipe) quotationId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.piService.createFromQuotation(quotationId, enterpriseId, user?.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create proforma invoice manually' })
  @RequirePermission('invoicing', 'proforma_invoices', 'create')
  async create(
    @Body() createDto: CreateProformaInvoiceDto,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.piService.create(enterpriseId, createDto, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proforma invoice by ID' })
  @RequirePermission('invoicing', 'proforma_invoices', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.piService.findOne(id, enterpriseId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update proforma invoice status' })
  @RequirePermission('invoicing', 'proforma_invoices', 'edit')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePIStatusDto,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.piService.updateStatus(id, enterpriseId, body.status, user?.id);
  }

  @Post(':id/convert-to-sales-order')
  @ApiOperation({ summary: 'Convert proforma invoice to sales order' })
  @RequirePermission('invoicing', 'proforma_invoices', 'edit')
  async convertToSalesOrder(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.piService.convertToSalesOrder(id, enterpriseId, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete proforma invoice' })
  @RequirePermission('invoicing', 'proforma_invoices', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.piService.delete(id, enterpriseId);
  }
}

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
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QuotationsService } from './quotations.service';
import { EnterpriseId, CurrentUser, RequirePermission, DataStartDate, OwnDataOnly, CurrentUserId } from '../../common/decorators';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto';

@ApiTags('Quotations')
@Controller('quotations')
@ApiBearerAuth('JWT-auth')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get('check-mobile')
  @ApiOperation({ summary: 'Check if a mobile number already has a quotation' })
  @ApiQuery({ name: 'mobile', required: true })
  @RequirePermission('sales', 'quotations', 'view')
  async checkMobile(
    @EnterpriseId() enterpriseId: number,
    @Query('mobile') mobile: string,
  ) {
    return this.quotationsService.checkMobileExists(enterpriseId, mobile);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @RequirePermission('sales', 'quotations', 'view')
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
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const effectiveOwnDataOnly = ownDataOnly || (user?.type === 'employee' && !user?.isReportingHead);
    return this.quotationsService.findAll(
      enterpriseId,
      page,
      limit,
      search,
      status,
      fromDate,
      toDate,
      dataStartDate,
      effectiveOwnDataOnly,
      currentUserId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation by ID' })
  @RequirePermission('sales', 'quotations', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.quotationsService.findOne(id, enterpriseId);
  }

  @Patch(':id/eta')
  @ApiOperation({ summary: 'Update quotation expected delivery (ETA)' })
  @RequirePermission('sales', 'quotations', 'edit')
  async updateETA(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body('expectedDelivery') expectedDelivery: string,
  ) {
    return this.quotationsService.updateETA(id, enterpriseId, expectedDelivery);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  @RequirePermission('sales', 'quotations', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateQuotationDto,
  ) {
    return this.quotationsService.create(enterpriseId, createDto, user?.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a quotation' })
  @RequirePermission('sales', 'quotations', 'create')
  async duplicate(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.quotationsService.duplicate(id, enterpriseId, user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a quotation (saves previous state as a version)' })
  @RequirePermission('sales', 'quotations', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() updateDto: Partial<CreateQuotationDto> & { changeNotes?: string },
  ) {
    const { changeNotes, ...dto } = updateDto;
    return this.quotationsService.update(id, enterpriseId, dto, user?.id, changeNotes);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a quotation — creates a Sales Order and locks the quotation' })
  @RequirePermission('sales', 'quotations', 'edit')
  async accept(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.quotationsService.acceptQuotation(id, enterpriseId, user?.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update quotation status' })
  @RequirePermission('sales', 'quotations', 'edit')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateQuotationStatusDto,
  ) {
    return this.quotationsService.updateStatus(id, enterpriseId, dto.status, user?.id, dto.rejectionReason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quotation' })
  @RequirePermission('sales', 'quotations', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.quotationsService.delete(id, enterpriseId);
  }
}

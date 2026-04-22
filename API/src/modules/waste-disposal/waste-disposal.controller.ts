import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { WasteDisposalService } from './waste-disposal.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';
import {
  CreateDisposalTransactionDto,
  UpdateDisposalTransactionDto,
  CompleteDisposalDto,
  DisposalLineDto,
} from './dto/waste-disposal.dto';

@Controller('waste-disposal')
export class WasteDisposalController {
  constructor(private readonly svc: WasteDisposalService) {}

  @Get('dashboard')
  @RequirePermission('waste_management', 'waste_disposal', 'view')
  getDashboard(@EnterpriseId() enterpriseId: number) {
    return this.svc.getDashboard(enterpriseId);
  }

  @Get()
  @RequirePermission('waste_management', 'waste_disposal', 'view')
  getAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('partyId') partyId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getTransactions(enterpriseId, page ? +page : 1, limit ? +limit : 20, {
      status, partyId: partyId ? +partyId : undefined, transactionType, from, to,
    });
  }

  @Get(':id')
  @RequirePermission('waste_management', 'waste_disposal', 'view')
  getOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getTransaction(id, enterpriseId);
  }

  @Post()
  @RequirePermission('waste_management', 'waste_disposal', 'create')
  create(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: CreateDisposalTransactionDto) {
    return this.svc.createTransaction(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch(':id')
  @RequirePermission('waste_management', 'waste_disposal', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpdateDisposalTransactionDto) {
    return this.svc.updateTransaction(id, enterpriseId, dto);
  }

  @Post(':id/confirm')
  @RequirePermission('waste_management', 'waste_disposal', 'edit')
  confirm(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any) {
    return this.svc.confirm(id, enterpriseId, user?.sub ?? user?.id);
  }

  @Post(':id/complete')
  @RequirePermission('waste_management', 'waste_disposal', 'edit')
  complete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: CompleteDisposalDto) {
    return this.svc.complete(id, enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Post(':id/cancel')
  @RequirePermission('waste_management', 'waste_disposal', 'edit')
  cancel(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any) {
    return this.svc.cancel(id, enterpriseId, user?.sub ?? user?.id);
  }

  @Post(':id/lines')
  @RequirePermission('waste_management', 'waste_disposal', 'edit')
  addLine(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: DisposalLineDto) {
    return this.svc.addLine(id, enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermission('waste_management', 'waste_disposal', 'edit')
  removeLine(@Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any) {
    return this.svc.removeLine(id, lineId, enterpriseId, user?.sub ?? user?.id);
  }
}

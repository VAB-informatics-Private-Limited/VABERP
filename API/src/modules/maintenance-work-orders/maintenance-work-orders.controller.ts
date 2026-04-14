import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MaintenanceWorkOrdersService } from './maintenance-work-orders.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';

@Controller('maintenance-work-orders')
export class MaintenanceWorkOrdersController {
  constructor(private readonly svc: MaintenanceWorkOrdersService) {}

  @Get('dashboard')
  @RequirePermission('machinery_management', 'work_orders', 'view')
  getDashboard(@EnterpriseId() enterpriseId: number) {
    return this.svc.getDashboardStats(enterpriseId);
  }

  @Get()
  @RequirePermission('machinery_management', 'work_orders', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('machineId') machineId?: string,
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    return this.svc.findAll(
      enterpriseId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      machineId ? parseInt(machineId) : undefined,
      status,
      serviceType,
      user?.id,
      user?.permissions,
    );
  }

  @Get(':id')
  @RequirePermission('machinery_management', 'work_orders', 'view')
  findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('machinery_management', 'work_orders', 'create')
  create(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.create(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch(':id')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.update(id, enterpriseId, dto);
  }

  @Patch(':id/status')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  changeStatus(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() body: { status: string; reason?: string }) {
    return this.svc.changeStatus(id, enterpriseId, body.status, user?.sub ?? user?.id, body.reason);
  }

  @Patch(':id/close')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  close(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any) {
    return this.svc.closureVerify(id, enterpriseId, user?.sub ?? user?.id);
  }

  // ─── Parts ──────────────────────────────────────────────────────────────

  @Post(':id/parts')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  addPart(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.addPart(id, enterpriseId, dto);
  }

  @Patch('parts/:partId/reserve')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  reservePart(@Param('partId', ParseIntPipe) partId: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.reservePart(partId, enterpriseId);
  }

  @Patch('parts/:partId/consume')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  consumePart(@Param('partId', ParseIntPipe) partId: number, @EnterpriseId() enterpriseId: number, @Body() body: { quantityConsumed: number }) {
    return this.svc.consumePart(partId, enterpriseId, body.quantityConsumed);
  }

  @Delete('parts/:partId')
  @RequirePermission('machinery_management', 'work_orders', 'edit')
  removePart(@Param('partId', ParseIntPipe) partId: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.removePart(partId, enterpriseId);
  }
}

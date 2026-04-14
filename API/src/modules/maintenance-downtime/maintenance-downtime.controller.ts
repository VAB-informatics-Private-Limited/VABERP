import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MaintenanceDowntimeService } from './maintenance-downtime.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';

@Controller('maintenance-downtime')
export class MaintenanceDowntimeController {
  constructor(private readonly svc: MaintenanceDowntimeService) {}

  @Get('stats')
  @RequirePermission('machinery_management', 'downtime', 'view')
  getStats(@EnterpriseId() enterpriseId: number, @Query('machineId') machineId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getStats(enterpriseId, machineId ? parseInt(machineId) : undefined, from, to);
  }

  @Get()
  @RequirePermission('machinery_management', 'downtime', 'view')
  findAll(@EnterpriseId() enterpriseId: number, @Query('machineId') machineId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.findAll(enterpriseId, machineId ? parseInt(machineId) : undefined, from, to);
  }

  @Get(':id')
  @RequirePermission('machinery_management', 'downtime', 'view')
  findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('machinery_management', 'downtime', 'create')
  create(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.create(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch(':id')
  @RequirePermission('machinery_management', 'downtime', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('machinery_management', 'downtime', 'delete')
  delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.delete(id, enterpriseId);
  }
}

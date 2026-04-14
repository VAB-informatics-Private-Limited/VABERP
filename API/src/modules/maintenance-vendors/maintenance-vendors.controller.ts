import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MaintenanceVendorsService } from './maintenance-vendors.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';

@Controller('maintenance-vendors')
export class MaintenanceVendorsController {
  constructor(private readonly svc: MaintenanceVendorsService) {}

  // ─── Vendors ────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('machinery_management', 'vendors', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(enterpriseId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search, status);
  }

  @Get('amc/list')
  @RequirePermission('machinery_management', 'vendors', 'view')
  getAmcContracts(@EnterpriseId() enterpriseId: number, @Query('vendorId') vendorId?: string) {
    return this.svc.getAmcContracts(enterpriseId, vendorId ? parseInt(vendorId) : undefined);
  }

  @Get('amc/expiring')
  @RequirePermission('machinery_management', 'vendors', 'view')
  getExpiringAmcs(@EnterpriseId() enterpriseId: number, @Query('days') days?: string) {
    return this.svc.getExpiringAmcs(enterpriseId, days ? parseInt(days) : 30);
  }

  @Get(':id')
  @RequirePermission('machinery_management', 'vendors', 'view')
  findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('machinery_management', 'vendors', 'create')
  create(@EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.create(enterpriseId, dto);
  }

  @Patch(':id')
  @RequirePermission('machinery_management', 'vendors', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('machinery_management', 'vendors', 'delete')
  delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.delete(id, enterpriseId);
  }

  // ─── AMC Contracts ──────────────────────────────────────────────────────

  @Post('amc')
  @RequirePermission('machinery_management', 'vendors', 'create')
  createAmc(@EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.createAmcContract(enterpriseId, dto);
  }

  @Patch('amc/:id')
  @RequirePermission('machinery_management', 'vendors', 'edit')
  updateAmc(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.updateAmcContract(id, enterpriseId, dto);
  }

  @Patch('amc/:id/terminate')
  @RequirePermission('machinery_management', 'vendors', 'edit')
  terminateAmc(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.terminateAmcContract(id, enterpriseId);
  }

  // ─── Performance ────────────────────────────────────────────────────────

  @Get(':id/performance')
  @RequirePermission('machinery_management', 'vendors', 'view')
  getPerformance(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getPerformance(id, enterpriseId);
  }

  @Post(':id/performance')
  @RequirePermission('machinery_management', 'vendors', 'create')
  logPerformance(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.logPerformance(enterpriseId, { ...dto, vendorId: id }, user?.sub ?? user?.id);
  }
}

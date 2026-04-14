import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';

@Controller('machines')
export class MachinesController {
  constructor(private readonly svc: MachinesService) {}

  // ─── Categories ─────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermission('machinery_management', 'machines', 'view')
  getCategories(@EnterpriseId() enterpriseId: number) {
    return this.svc.getCategories(enterpriseId);
  }

  @Post('categories')
  @RequirePermission('machinery_management', 'machines', 'create')
  createCategory(@EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.createCategory(enterpriseId, dto);
  }

  @Patch('categories/:id')
  @RequirePermission('machinery_management', 'machines', 'edit')
  updateCategory(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.updateCategory(id, enterpriseId, dto);
  }

  @Delete('categories/:id')
  @RequirePermission('machinery_management', 'machines', 'delete')
  deleteCategory(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deleteCategory(id, enterpriseId);
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('machinery_management', 'machines', 'view')
  getDashboard(@EnterpriseId() enterpriseId: number) {
    return this.svc.getDashboardStats(enterpriseId);
  }

  // ─── Machines ───────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('machinery_management', 'machines', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.svc.findAll(
      enterpriseId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      status,
      categoryId ? parseInt(categoryId) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission('machinery_management', 'machines', 'view')
  findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('machinery_management', 'machines', 'create')
  create(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.create(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch(':id')
  @RequirePermission('machinery_management', 'machines', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('machinery_management', 'machines', 'delete')
  delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.delete(id, enterpriseId);
  }

  // ─── Meter Readings ─────────────────────────────────────────────────────

  @Post(':id/meter-reading')
  @RequirePermission('machinery_management', 'machines', 'edit')
  updateMeterReading(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.updateMeterReading(id, enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Get(':id/meter-logs')
  @RequirePermission('machinery_management', 'machines', 'view')
  getMeterLogs(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getMeterLogs(id, enterpriseId);
  }
}

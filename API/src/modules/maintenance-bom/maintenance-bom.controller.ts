import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MaintenanceBomService } from './maintenance-bom.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';

@Controller('maintenance-bom')
export class MaintenanceBomController {
  constructor(private readonly svc: MaintenanceBomService) {}

  @Get()
  @RequirePermission('machinery_management', 'bom_templates', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('machineId') machineId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    return this.svc.findAll(enterpriseId, machineId ? parseInt(machineId) : undefined, categoryId ? parseInt(categoryId) : undefined, serviceType);
  }

  @Get(':id')
  @RequirePermission('machinery_management', 'bom_templates', 'view')
  findOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('machinery_management', 'bom_templates', 'create')
  create(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.create(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch(':id')
  @RequirePermission('machinery_management', 'bom_templates', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.update(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('machinery_management', 'bom_templates', 'delete')
  delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.delete(id, enterpriseId);
  }

  @Get(':id/lines')
  @RequirePermission('machinery_management', 'bom_templates', 'view')
  getLines(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getLines(id, enterpriseId);
  }
}

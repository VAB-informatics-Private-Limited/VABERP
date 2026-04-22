import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { SparePartsService } from './spare-parts.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { SuggestSparesDto } from './dto/suggest-spares.dto';
import {
  SaveMachineSparesDto, MachineSpareItemDto, SaveAsTemplateDto,
} from './dto/save-machine-spares.dto';
import { UpsertMapDto, UpsertMapBulkDto } from './dto/upsert-map.dto';

@Controller()
export class SparePartsController {
  constructor(private readonly svc: SparePartsService) {}

  // ─── Spare Parts CRUD ────────────────────────────────────────────────────

  @Get('spare-parts')
  @RequirePermission('machinery_management', 'spares', 'view')
  listSpareParts(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.svc.listSpareParts(
      enterpriseId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      status,
      supplierId ? parseInt(supplierId) : undefined,
    );
  }

  @Post('spare-parts/suggest')
  @RequirePermission('machinery_management', 'spares', 'view')
  suggest(@EnterpriseId() enterpriseId: number, @Body() dto: SuggestSparesDto) {
    return this.svc.suggestForNewMachine(enterpriseId, dto);
  }

  @Get('spare-parts/:id')
  @RequirePermission('machinery_management', 'spares', 'view')
  getSparePart(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getSparePart(id, enterpriseId);
  }

  @Post('spare-parts')
  @RequirePermission('machinery_management', 'spares', 'create')
  createSparePart(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateSparePartDto,
  ) {
    return this.svc.createSparePart(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch('spare-parts/:id')
  @RequirePermission('machinery_management', 'spares', 'edit')
  updateSparePart(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: UpdateSparePartDto,
  ) {
    return this.svc.updateSparePart(id, enterpriseId, dto);
  }

  @Delete('spare-parts/:id')
  @RequirePermission('machinery_management', 'spares', 'delete')
  deleteSparePart(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deleteSparePart(id, enterpriseId);
  }

  // ─── Template (machine_spare_map) ────────────────────────────────────────

  @Get('machine-spare-map')
  @RequirePermission('machinery_management', 'spares', 'view')
  listMap(
    @EnterpriseId() enterpriseId: number,
    @Query('modelNumber') modelNumber?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.svc.listMap(
      enterpriseId,
      modelNumber,
      categoryId ? parseInt(categoryId) : undefined,
    );
  }

  @Post('machine-spare-map')
  @RequirePermission('machinery_management', 'spares', 'create')
  upsertMap(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: UpsertMapDto,
  ) {
    return this.svc.upsertMap(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Post('machine-spare-map/bulk')
  @RequirePermission('machinery_management', 'spares', 'create')
  upsertMapBulk(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: UpsertMapBulkDto,
  ) {
    return this.svc.upsertMapBulk(enterpriseId, dto.items, user?.sub ?? user?.id);
  }

  @Delete('machine-spare-map/:id')
  @RequirePermission('machinery_management', 'spares', 'delete')
  deleteMap(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deleteMap(id, enterpriseId);
  }

  // ─── Per-machine spare parts ─────────────────────────────────────────────

  @Get('machines/:id/spares')
  @RequirePermission('machinery_management', 'spares', 'view')
  listMachineSpares(
    @Param('id', ParseIntPipe) machineId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.svc.listMachineSpares(machineId, enterpriseId);
  }

  @Post('machines/:id/spares')
  @RequirePermission('machinery_management', 'spares', 'create')
  addMachineSpare(
    @Param('id', ParseIntPipe) machineId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: MachineSpareItemDto,
  ) {
    return this.svc.addMachineSpare(machineId, enterpriseId, dto, user?.sub ?? user?.id);
  }

  // Replace-all persistence used by the creation wizard
  @Post('machines/:id/spares/save')
  @RequirePermission('machinery_management', 'spares', 'create')
  saveMachineSpares(
    @Param('id', ParseIntPipe) machineId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: SaveMachineSparesDto,
  ) {
    return this.svc.saveMachineSpares(machineId, enterpriseId, dto.items, user?.sub ?? user?.id);
  }

  @Patch('machines/:id/spares/:sparePartId')
  @RequirePermission('machinery_management', 'spares', 'edit')
  updateMachineSpare(
    @Param('id', ParseIntPipe) machineId: number,
    @Param('sparePartId', ParseIntPipe) sparePartId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: { quantity?: number; notes?: string },
  ) {
    return this.svc.updateMachineSpare(machineId, enterpriseId, sparePartId, dto);
  }

  @Delete('machines/:id/spares/:sparePartId')
  @RequirePermission('machinery_management', 'spares', 'delete')
  deleteMachineSpare(
    @Param('id', ParseIntPipe) machineId: number,
    @Param('sparePartId', ParseIntPipe) sparePartId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.svc.deleteMachineSpare(machineId, enterpriseId, sparePartId);
  }

  @Post('machines/:id/spares/save-as-template')
  @RequirePermission('machinery_management', 'spares', 'create')
  saveAsTemplate(
    @Param('id', ParseIntPipe) machineId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: SaveAsTemplateDto,
  ) {
    return this.svc.saveAsTemplate(machineId, enterpriseId, dto.scope, user?.sub ?? user?.id);
  }
}

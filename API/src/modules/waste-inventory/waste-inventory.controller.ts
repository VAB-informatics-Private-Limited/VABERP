import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { WasteInventoryService } from './waste-inventory.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateSourceDto, UpdateSourceDto,
  CreateWasteInventoryDto, UpdateWasteInventoryDto,
  QuarantineDto, WriteOffDto,
} from './dto/waste-inventory.dto';

@Controller('waste-inventory')
export class WasteInventoryController {
  constructor(private readonly svc: WasteInventoryService) {}

  @Get('dashboard')
  @RequirePermission('waste_management', 'waste_inventory', 'view')
  getDashboard(@EnterpriseId() enterpriseId: number) {
    return this.svc.getDashboard(enterpriseId);
  }

  @Get('categories')
  @RequirePermission('waste_management', 'waste_inventory', 'view')
  getCategories(@EnterpriseId() enterpriseId: number) {
    return this.svc.getCategories(enterpriseId);
  }

  @Post('categories')
  @RequirePermission('waste_management', 'waste_inventory', 'create')
  createCategory(@EnterpriseId() enterpriseId: number, @Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(enterpriseId, dto);
  }

  @Patch('categories/:id')
  @RequirePermission('waste_management', 'waste_inventory', 'edit')
  updateCategory(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpdateCategoryDto) {
    return this.svc.updateCategory(id, enterpriseId, dto);
  }

  @Delete('categories/:id')
  @RequirePermission('waste_management', 'waste_inventory', 'delete')
  deleteCategory(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deleteCategory(id, enterpriseId);
  }

  @Get('sources')
  @RequirePermission('waste_management', 'waste_inventory', 'view')
  getSources(@EnterpriseId() enterpriseId: number) {
    return this.svc.getSources(enterpriseId);
  }

  @Post('sources')
  @RequirePermission('waste_management', 'waste_inventory', 'create')
  createSource(@EnterpriseId() enterpriseId: number, @Body() dto: CreateSourceDto) {
    return this.svc.createSource(enterpriseId, dto);
  }

  @Patch('sources/:id')
  @RequirePermission('waste_management', 'waste_inventory', 'edit')
  updateSource(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpdateSourceDto) {
    return this.svc.updateSource(id, enterpriseId, dto);
  }

  @Get()
  @RequirePermission('waste_management', 'waste_inventory', 'view')
  getInventory(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sourceId') sourceId?: string,
    @Query('search') search?: string,
    @Query('classification') classification?: string,
  ) {
    return this.svc.getInventory(enterpriseId, page ? +page : 1, limit ? +limit : 20, {
      status, categoryId: categoryId ? +categoryId : undefined,
      sourceId: sourceId ? +sourceId : undefined, search, classification,
    });
  }

  @Get(':id/log')
  @RequirePermission('waste_management', 'waste_inventory', 'view')
  getLog(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getInventoryLog(id, enterpriseId);
  }

  @Get(':id')
  @RequirePermission('waste_management', 'waste_inventory', 'view')
  getOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getInventoryItem(id, enterpriseId);
  }

  @Post()
  @RequirePermission('waste_management', 'waste_inventory', 'create')
  create(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: CreateWasteInventoryDto) {
    return this.svc.createInventory(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch(':id')
  @RequirePermission('waste_management', 'waste_inventory', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpdateWasteInventoryDto) {
    return this.svc.updateInventory(id, enterpriseId, dto);
  }

  @Post(':id/quarantine')
  @RequirePermission('waste_management', 'waste_inventory', 'edit')
  quarantine(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: QuarantineDto) {
    return this.svc.quarantine(id, enterpriseId, dto.notes ?? '', user?.sub ?? user?.id);
  }

  @Post(':id/write-off')
  @RequirePermission('waste_management', 'waste_inventory', 'edit')
  writeOff(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: WriteOffDto) {
    return this.svc.writeOff(id, enterpriseId, dto, user?.sub ?? user?.id);
  }
}

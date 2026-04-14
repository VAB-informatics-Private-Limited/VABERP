import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizerService } from './organizer.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';

@ApiTags('Organizer')
@Controller('organizer')
@ApiBearerAuth('JWT-auth')
export class OrganizerController {
  constructor(private readonly service: OrganizerService) {}

  @Get('dashboard')
  @RequirePermission('organizer', 'items', 'view')
  getDashboard(@EnterpriseId() enterpriseId: number) {
    return this.service.getDashboard(enterpriseId);
  }

  @Get('tags')
  @RequirePermission('organizer', 'items', 'view')
  getTags(@EnterpriseId() enterpriseId: number) {
    return this.service.getTags(enterpriseId);
  }

  @Post('tags')
  @RequirePermission('organizer', 'items', 'create')
  createTag(@EnterpriseId() enterpriseId: number, @Body() body: { name: string; color?: string }) {
    return this.service.createTag(enterpriseId, body);
  }

  @Delete('tags/:id')
  @RequirePermission('organizer', 'items', 'delete')
  deleteTag(
    @EnterpriseId() enterpriseId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteTag(enterpriseId, id);
  }

  @Get('context/:entityType/:entityId')
  @RequirePermission('organizer', 'items', 'view')
  getForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.findForEntity(entityType, entityId, enterpriseId);
  }

  @Get()
  @RequirePermission('organizer', 'items', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.service.findAll(enterpriseId, query, user?.id, user?.permissions);
  }

  @Get(':id')
  @RequirePermission('organizer', 'items', 'view')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('organizer', 'items', 'create')
  create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return this.service.create(enterpriseId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermission('organizer', 'items', 'edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return this.service.update(id, enterpriseId, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermission('organizer', 'items', 'edit')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(id, enterpriseId, status, user.id);
  }

  @Post(':id/complete')
  @RequirePermission('organizer', 'items', 'edit')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.complete(id, enterpriseId, user.id);
  }

  @Post(':id/snooze')
  @RequirePermission('organizer', 'items', 'edit')
  snooze(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('snoozeUntil') snoozeUntil: string,
  ) {
    return this.service.snooze(id, enterpriseId, snoozeUntil, user.id);
  }

  @Delete(':id')
  @RequirePermission('organizer', 'items', 'delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.remove(id, enterpriseId);
  }
}

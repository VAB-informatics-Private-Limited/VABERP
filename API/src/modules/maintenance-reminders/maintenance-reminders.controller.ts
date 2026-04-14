import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MaintenanceRemindersService } from './maintenance-reminders.service';
import { RequirePermission, EnterpriseId, CurrentUser } from '../../common/decorators';

@Controller('maintenance-reminders')
export class MaintenanceRemindersController {
  constructor(private readonly svc: MaintenanceRemindersService) {}

  // ─── Rules ──────────────────────────────────────────────────────────────

  @Get('rules')
  @RequirePermission('machinery_management', 'reminder_rules', 'view')
  getRules(@EnterpriseId() enterpriseId: number, @Query('machineId') machineId?: string, @Query('status') status?: string) {
    return this.svc.getRules(enterpriseId, machineId ? parseInt(machineId) : undefined, status);
  }

  @Post('rules')
  @RequirePermission('machinery_management', 'reminder_rules', 'create')
  createRule(@EnterpriseId() enterpriseId: number, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.createRule(enterpriseId, dto, user?.sub ?? user?.id);
  }

  @Patch('rules/:id')
  @RequirePermission('machinery_management', 'reminder_rules', 'edit')
  updateRule(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: any) {
    return this.svc.updateRule(id, enterpriseId, dto);
  }

  @Delete('rules/:id')
  @RequirePermission('machinery_management', 'reminder_rules', 'delete')
  deleteRule(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deleteRule(id, enterpriseId);
  }

  // ─── Reminders ──────────────────────────────────────────────────────────

  @Get('due-count')
  @RequirePermission('machinery_management', 'reminder_rules', 'view')
  getDueCount(@EnterpriseId() enterpriseId: number) {
    return this.svc.getDueCount(enterpriseId);
  }

  @Get()
  @RequirePermission('machinery_management', 'reminder_rules', 'view')
  getReminders(@EnterpriseId() enterpriseId: number, @Query('machineId') machineId?: string, @Query('status') status?: string) {
    return this.svc.getReminders(enterpriseId, machineId ? parseInt(machineId) : undefined, status);
  }

  @Patch(':id/snooze')
  @RequirePermission('machinery_management', 'reminder_rules', 'edit')
  snooze(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() body: { snoozeUntil: string }) {
    return this.svc.snoozeReminder(id, enterpriseId, body.snoozeUntil);
  }

  @Patch(':id/cancel')
  @RequirePermission('machinery_management', 'reminder_rules', 'edit')
  cancel(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.cancelReminder(id, enterpriseId);
  }
}

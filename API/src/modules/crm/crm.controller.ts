import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CrmLeadsService } from './crm-leads.service';
import { CrmAssignmentsService } from './crm-assignments.service';
import { CrmFollowupsService } from './crm-followups.service';
import { CrmReportsService } from './crm-reports.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateLeadDto, UpdateLeadDto, UpdateLeadStatusDto, AssignLeadDto, CreateFollowupDto } from './dto';

@ApiTags('CRM')
@Controller('crm')
@ApiBearerAuth('JWT-auth')
export class CrmController {
  constructor(
    private readonly leadsService: CrmLeadsService,
    private readonly assignmentsService: CrmAssignmentsService,
    private readonly followupsService: CrmFollowupsService,
    private readonly reportsService: CrmReportsService,
  ) {}

  // ── Leads ──────────────────────────────────────────────────

  @Get('leads')
  @RequirePermission('crm', 'leads', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  getLeads(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: number,
  ) {
    return this.leadsService.findAll(
      enterpriseId, user.id, user.permissions,
      page, limit, search, status, assignedTo,
    );
  }

  @Get('leads/followups/today')
  @RequirePermission('crm', 'leads', 'view')
  getTodayFollowups(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.getTodayFollowups(enterpriseId, user.id, user.permissions);
  }

  @Get('leads/followups/overdue')
  @RequirePermission('crm', 'leads', 'view')
  getOverdueFollowups(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.getOverdueFollowups(enterpriseId, user.id, user.permissions);
  }

  @Get('leads/:id')
  @RequirePermission('crm', 'leads', 'view')
  getLead(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.leadsService.findOne(id, enterpriseId);
  }

  @Post('leads')
  @RequirePermission('crm', 'leads', 'create')
  createLead(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(enterpriseId, dto, user.id);
  }

  @Put('leads/:id')
  @RequirePermission('crm', 'leads', 'edit')
  updateLead(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(id, enterpriseId, dto, user.id);
  }

  @Patch('leads/:id/status')
  @RequirePermission('crm', 'leads', 'edit')
  updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, enterpriseId, dto, user.id);
  }

  @Delete('leads/:id')
  @RequirePermission('crm', 'leads', 'delete')
  deleteLead(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.leadsService.delete(id, enterpriseId);
  }

  // ── Assignments ────────────────────────────────────────────

  @Post('leads/:id/assign')
  @RequirePermission('crm', 'assignments', 'create')
  assignLead(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: AssignLeadDto,
  ) {
    return this.assignmentsService.assignLead(id, enterpriseId, dto, user.id, user.permissions);
  }

  // ── Follow-ups ─────────────────────────────────────────────

  @Get('leads/:id/followups')
  @RequirePermission('crm', 'followups', 'view')
  getFollowups(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.followupsService.getFollowups(id, enterpriseId);
  }

  @Post('leads/:id/followups')
  @RequirePermission('crm', 'followups', 'create')
  addFollowup(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateFollowupDto,
  ) {
    return this.followupsService.addFollowup(id, enterpriseId, dto, user.id);
  }

  // ── Activity ───────────────────────────────────────────────

  @Get('leads/:id/activity')
  @RequirePermission('crm', 'leads', 'view')
  getActivity(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.leadsService.getActivityLog(id, enterpriseId);
  }

  // ── Reports ────────────────────────────────────────────────

  @Get('reports/summary')
  @RequirePermission('crm', 'reports', 'view')
  getSummary(@EnterpriseId() enterpriseId: number) {
    return this.reportsService.getSummary(enterpriseId);
  }

  @Get('reports/performance')
  @RequirePermission('crm', 'reports', 'view')
  getPerformance(@EnterpriseId() enterpriseId: number) {
    return this.reportsService.getPerformanceStats(enterpriseId);
  }

  // ── Team / Hierarchy ───────────────────────────────────────

  @Get('team')
  @RequirePermission('crm', 'settings', 'view')
  getTeam(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.getTeam(enterpriseId, user.id, user.permissions);
  }

  @Get('team/module-leaders')
  @RequirePermission('crm', 'settings', 'view')
  getModuleLeaders(@EnterpriseId() enterpriseId: number) {
    return this.assignmentsService.getModuleLeaders(enterpriseId);
  }

  @Put('team/module-leaders/:module')
  @RequirePermission('crm', 'settings', 'edit')
  setModuleLeader(
    @Param('module') moduleName: string,
    @EnterpriseId() enterpriseId: number,
    @Body('employeeId') employeeId: number | null,
  ) {
    return this.assignmentsService.setModuleLeader(enterpriseId, moduleName, employeeId);
  }

  @Get('team/assignable')
  @RequirePermission('crm', 'assignments', 'create')
  getAssignableEmployees(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.getAssignableEmployees(enterpriseId, user.id, user.permissions);
  }

  @Patch('team/:employeeId/reporting-to')
  @RequirePermission('crm', 'settings', 'edit')
  updateReportingTo(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @EnterpriseId() enterpriseId: number,
    @Body('reportingTo') reportingTo: number | null,
  ) {
    return this.assignmentsService.updateReportingTo(employeeId, enterpriseId, reportingTo);
  }
}

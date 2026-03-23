import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  @RequirePermission('reports', 'dashboard_reports', 'view')
  async getDashboard(@EnterpriseId() enterpriseId: number) {
    return this.reportsService.getDashboard(enterpriseId);
  }

  @Get('enquiries')
  @ApiOperation({ summary: 'Get enquiry report' })
  @RequirePermission('reports', 'enquiry_reports', 'view')
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'interestStatus', required: false })
  @ApiQuery({ name: 'source', required: false })
  async getEnquiryReport(
    @EnterpriseId() enterpriseId: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('interestStatus') interestStatus?: string,
    @Query('source') source?: string,
  ) {
    return this.reportsService.getEnquiryReport(
      enterpriseId,
      fromDate,
      toDate,
      interestStatus,
      source,
    );
  }

  @Get('prospects')
  @ApiOperation({ summary: 'Get prospect report' })
  @RequirePermission('reports', 'enquiry_reports', 'view')
  async getProspectReport(@EnterpriseId() enterpriseId: number) {
    return this.reportsService.getProspectReport(enterpriseId);
  }

  @Get('followups')
  @ApiOperation({ summary: 'Get followup report' })
  @RequirePermission('reports', 'enquiry_reports', 'view')
  @ApiQuery({ name: 'assignedTo', required: false })
  async getFollowupReport(
    @EnterpriseId() enterpriseId: number,
    @Query('assignedTo') assignedTo?: number,
  ) {
    return this.reportsService.getFollowupReport(enterpriseId, assignedTo);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer report' })
  @RequirePermission('reports', 'dashboard_reports', 'view')
  async getCustomerReport(@EnterpriseId() enterpriseId: number) {
    return this.reportsService.getCustomerReport(enterpriseId);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get employee performance report' })
  @RequirePermission('reports', 'dashboard_reports', 'view')
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getEmployeePerformance(
    @EnterpriseId() enterpriseId: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getEmployeePerformance(enterpriseId, fromDate, toDate);
  }

  @Get('quotations')
  @ApiOperation({ summary: 'Get quotation report' })
  @RequirePermission('reports', 'enquiry_reports', 'view')
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getQuotationReport(
    @EnterpriseId() enterpriseId: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getQuotationReport(enterpriseId, fromDate, toDate);
  }

  @Get('manufacturing')
  @ApiOperation({ summary: 'Get manufacturing report' })
  @RequirePermission('reports', 'manufacturing_reports', 'view')
  async getManufacturingReport(@EnterpriseId() enterpriseId: number) {
    return this.reportsService.getManufacturingReport(enterpriseId);
  }
}

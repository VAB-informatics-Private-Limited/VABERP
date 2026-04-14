import { Controller, Get, Query } from '@nestjs/common';
import { WasteAnalyticsService } from './waste-analytics.service';
import { RequirePermission, EnterpriseId } from '../../common/decorators';

@Controller('waste-analytics')
export class WasteAnalyticsController {
  constructor(private readonly svc: WasteAnalyticsService) {}

  @Get('summary')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getSummary(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getSummary(enterpriseId, from, to);
  }

  @Get('by-source')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getBySource(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string, @Query('groupBy') groupBy?: string) {
    return this.svc.getBySource(enterpriseId, from, to, groupBy);
  }

  @Get('by-category')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getByCategory(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getByCategory(enterpriseId, from, to);
  }

  @Get('disposal-methods')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getDisposalMethods(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getDisposalMethods(enterpriseId, from, to);
  }

  @Get('financials')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getFinancials(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getFinancials(enterpriseId, from, to);
  }

  @Get('trends')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getTrends(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getTrends(enterpriseId, from, to);
  }

  @Get('aging')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getAging(@EnterpriseId() enterpriseId: number, @Query('days') days?: string) {
    return this.svc.getAging(enterpriseId, days ? +days : 30);
  }

  @Get('party-performance')
  @RequirePermission('waste_management', 'waste_analytics', 'view')
  getPartyPerformance(@EnterpriseId() enterpriseId: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getPartyPerformance(enterpriseId, from, to);
  }
}

import { Controller, Get, Patch, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceEventsService } from './service-events.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';

@ApiTags('Service Events')
@ApiBearerAuth('JWT-auth')
@Controller('service-events')
export class ServiceEventsController {
  constructor(private readonly serviceEventsService: ServiceEventsService) {}

  @Get('pending-count')
  @RequirePermission('service_management', 'service_events', 'view')
  getPendingCount(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    // Employees only see their own assigned events count; enterprise sees all
    const assignedTo = user?.type === 'employee' ? user.id : undefined;
    return this.serviceEventsService.getPendingCount(enterpriseId, assignedTo).then((data) => ({
      message: 'Pending count fetched',
      data,
    }));
  }

  @Get()
  @RequirePermission('service_management', 'service_events', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('serviceProductId') serviceProductId?: number,
  ) {
    return this.serviceEventsService.findAll(
      enterpriseId,
      page ? +page : 1,
      limit ? +limit : 20,
      status,
      eventType,
      fromDate,
      toDate,
      serviceProductId ? +serviceProductId : undefined,
    );
  }

  @Patch(':id/assign')
  @RequirePermission('service_management', 'service_events', 'edit')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: { employeeId: number | null },
  ) {
    return this.serviceEventsService.assignTo(id, enterpriseId, body.employeeId);
  }

  @Patch(':id/complete')
  @RequirePermission('service_management', 'service_events', 'edit')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.serviceEventsService.markCompleted(id, enterpriseId);
  }
}

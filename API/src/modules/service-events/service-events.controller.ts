import { Controller, Get, Patch, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceEventsService } from './service-events.service';
import { EnterpriseId } from '../../common/decorators/enterprise-id.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Service Events')
@ApiBearerAuth('JWT-auth')
@Controller('service-events')
export class ServiceEventsController {
  constructor(private readonly serviceEventsService: ServiceEventsService) {}

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

  @Patch(':id/complete')
  @RequirePermission('service_management', 'service_events', 'edit')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.serviceEventsService.markCompleted(id, enterpriseId);
  }
}

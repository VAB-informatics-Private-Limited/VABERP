import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceBookingsService } from './service-bookings.service';
import {
  CreateServiceBookingDto,
  AssignTechnicianDto,
  CompleteBookingDto,
} from './dto/create-service-booking.dto';
import { EnterpriseId } from '../../common/decorators/enterprise-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Service Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('service-bookings')
export class ServiceBookingsController {
  constructor(private readonly serviceBookingsService: ServiceBookingsService) {}

  @Get()
  @RequirePermission('service_management', 'service_bookings', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('technicianId') technicianId?: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.serviceBookingsService.findAll(
      enterpriseId,
      page ? +page : 1,
      limit ? +limit : 20,
      status,
      technicianId ? +technicianId : undefined,
      fromDate,
      toDate,
    );
  }

  @Get(':id')
  @RequirePermission('service_management', 'service_bookings', 'view')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.serviceBookingsService.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('service_management', 'service_bookings', 'create')
  create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateServiceBookingDto,
  ) {
    return this.serviceBookingsService.create(enterpriseId, dto, user?.id);
  }

  @Patch(':id/assign-technician')
  @RequirePermission('service_management', 'service_bookings', 'edit')
  assignTechnician(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: AssignTechnicianDto,
  ) {
    return this.serviceBookingsService.assignTechnician(id, enterpriseId, dto);
  }

  @Patch(':id/complete')
  @RequirePermission('service_management', 'service_bookings', 'edit')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: CompleteBookingDto,
  ) {
    return this.serviceBookingsService.complete(id, enterpriseId, dto);
  }

  @Patch(':id/cancel')
  @RequirePermission('service_management', 'service_bookings', 'edit')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.serviceBookingsService.cancel(id, enterpriseId);
  }
}

import { Controller, Get, Patch, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { EnterpriseId } from '../../common/decorators';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unread') unread?: string,
  ) {
    return this.service.findAll(enterpriseId, page, limit, unread === 'true');
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get unread notification counts by module' })
  async getCounts(@EnterpriseId() enterpriseId: number) {
    return this.service.getCounts(enterpriseId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@EnterpriseId() enterpriseId: number) {
    return this.service.markAllRead(enterpriseId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.markRead(id, enterpriseId);
  }
}

import {
  Controller, Get, Post, Delete,
  Body, Param, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeamUpdatesService } from './team-updates.service';
import { CreateTeamUpdateDto } from './dto/create-team-update.dto';
import { EnterpriseId, CurrentUser } from '../../common/decorators';

@ApiTags('Team Updates')
@Controller('team-updates')
@ApiBearerAuth('JWT-auth')
export class TeamUpdatesController {
  constructor(private readonly service: TeamUpdatesService) {}

  // Manager posts an update to their team
  @Post()
  create(@CurrentUser() user: any, @EnterpriseId() enterpriseId: number, @Body() dto: CreateTeamUpdateDto) {
    return this.service.create(user.id, enterpriseId, dto);
  }

  // Manager views their own updates
  @Get('mine')
  findMine(@CurrentUser() user: any, @EnterpriseId() enterpriseId: number) {
    return this.service.findByManager(user.id, enterpriseId);
  }

  // Employee views updates from their assigned manager
  @Get('from-manager')
  findFromManager(@CurrentUser() user: any, @EnterpriseId() enterpriseId: number) {
    return this.service.findForEmployee(user.id, enterpriseId);
  }

  // Manager deletes an update
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.remove(id, user.id, enterpriseId);
  }
}

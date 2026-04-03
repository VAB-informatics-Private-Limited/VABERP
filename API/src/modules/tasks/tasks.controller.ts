import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateTaskDto, UpdateTaskStatusDto, CreateCommentDto } from './dto';

@ApiTags('Tasks')
@Controller('tasks')
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('stats')
  @RequirePermission('tasks', 'my_tasks', 'view')
  getStats(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.getStats(enterpriseId, user.id, user.permissions, user.isReportingHead);
  }

  @Get()
  @RequirePermission('tasks', 'my_tasks', 'view')
  findAll(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: number,
  ) {
    return this.tasksService.findAll(
      enterpriseId, user.id, user.permissions,
      page, limit, search, status, priority, assignedTo,
      user.isReportingHead,
    );
  }

  @Get('employees')
  @RequirePermission('tasks', 'my_tasks', 'view')
  getEmployees(@EnterpriseId() enterpriseId: number) {
    return this.tasksService.getEmployees(enterpriseId);
  }

  @Get(':id')
  @RequirePermission('tasks', 'my_tasks', 'view')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.tasksService.findOne(id, enterpriseId);
  }

  @Post()
  @RequirePermission('tasks', 'my_tasks', 'create')
  create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(enterpriseId, dto, user.id);
  }

  @Put(':id')
  @RequirePermission('tasks', 'my_tasks', 'edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.update(id, enterpriseId, dto);
  }

  @Patch(':id/status')
  @RequirePermission('tasks', 'my_tasks', 'edit')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, enterpriseId, dto, user.id);
  }

  @Post(':id/assign')
  @RequirePermission('tasks', 'assignments', 'create')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('assignedTo', ParseIntPipe) assignedTo: number,
  ) {
    return this.tasksService.assign(id, enterpriseId, assignedTo, user.id, user.permissions);
  }

  @Delete(':id')
  @RequirePermission('tasks', 'my_tasks', 'delete')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.tasksService.delete(id, enterpriseId);
  }

  @Get(':id/comments')
  @RequirePermission('tasks', 'my_tasks', 'view')
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.tasksService.getComments(id, enterpriseId);
  }

  @Post(':id/comments')
  @RequirePermission('tasks', 'my_tasks', 'view')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.addComment(id, enterpriseId, dto, user.id);
  }
}

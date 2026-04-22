import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { EnterpriseId, CurrentUser, RequirePermission, RequireEnterprise } from '../../common/decorators';
import {
  CreateNameDto,
  UpdateNameDto,
  CreateDesignationDto,
  UpdateDesignationDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from './dto/masters.dto';

@ApiTags('Employees')
@Controller('employees')
@ApiBearerAuth('JWT-auth')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ============ Departments (MUST be before :id) ============

  @Post('departments/seed-defaults')
  @ApiOperation({ summary: 'Seed default ERP departments and designations' })
  @RequirePermission('employees', 'departments', 'create')
  async seedDefaults(@EnterpriseId() enterpriseId: number) {
    return this.employeesService.seedDefaultDepartmentsAndDesignations(enterpriseId);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  @RequirePermission('employees', 'departments', 'view')
  @ApiQuery({ name: 'limit', required: false })
  async getDepartments(
    @EnterpriseId() enterpriseId: number,
    @Query('limit') limit?: number,
  ) {
    return this.employeesService.getDepartments(enterpriseId, limit);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  @RequirePermission('employees', 'departments', 'create')
  async createDepartment(
    @EnterpriseId() enterpriseId: number,
    @Body() body: CreateNameDto,
  ) {
    return this.employeesService.createDepartment(enterpriseId, body);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  @RequirePermission('employees', 'departments', 'edit')
  async updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: UpdateNameDto,
  ) {
    return this.employeesService.updateDepartment(id, enterpriseId, body);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department' })
  @RequirePermission('employees', 'departments', 'delete')
  async deleteDepartment(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.deleteDepartment(id, enterpriseId);
  }

  // ============ Designations (MUST be before :id) ============

  @Get('designations')
  @ApiOperation({ summary: 'Get all designations' })
  @RequirePermission('employees', 'designations', 'view')
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getDesignations(
    @EnterpriseId() enterpriseId: number,
    @Query('departmentId') departmentId?: number,
    @Query('limit') limit?: number,
  ) {
    return this.employeesService.getDesignations(enterpriseId, departmentId, limit);
  }

  @Post('designations')
  @ApiOperation({ summary: 'Create designation' })
  @RequirePermission('employees', 'designations', 'create')
  async createDesignation(
    @EnterpriseId() enterpriseId: number,
    @Body() body: CreateDesignationDto,
  ) {
    return this.employeesService.createDesignation(enterpriseId, body);
  }

  @Patch('designations/:id')
  @ApiOperation({ summary: 'Update designation' })
  @RequirePermission('employees', 'designations', 'edit')
  async updateDesignation(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: UpdateDesignationDto,
  ) {
    return this.employeesService.updateDesignation(id, enterpriseId, body);
  }

  @Delete('designations/:id')
  @ApiOperation({ summary: 'Delete designation' })
  @RequirePermission('employees', 'designations', 'delete')
  async deleteDesignation(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.deleteDesignation(id, enterpriseId);
  }

  // ============ Employees ============

  @Get('sales-reps')
  @ApiOperation({ summary: 'Get active employees with sales access' })
  @RequireEnterprise()
  async findSalesEmployees(@EnterpriseId() enterpriseId: number) {
    return this.employeesService.findSalesEmployees(enterpriseId);
  }

  @Get('by-permission')
  @ApiOperation({ summary: 'Get employees who have access to a given permission module' })
  @RequirePermission('service_management', 'service_events', 'view')
  async findByPermission(
    @EnterpriseId() enterpriseId: number,
    @Query('module') module: string,
  ) {
    return this.employeesService.findByPermissionModule(enterpriseId, module || 'service_management');
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @RequirePermission('employees', 'all_employees', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll(enterpriseId, page, limit, search);
  }

  @Get('reporting-managers')
  @ApiOperation({ summary: 'Get reporting managers list' })
  @RequirePermission('employees', 'all_employees', 'view')
  async getReportingManagers(@EnterpriseId() enterpriseId: number) {
    return this.employeesService.getReportingManagers(enterpriseId);
  }

  @Post('reporting-managers')
  @ApiOperation({ summary: 'Create reporting manager' })
  @RequirePermission('employees', 'all_employees', 'create')
  async createReportingManager(@EnterpriseId() enterpriseId: number, @Body() body: CreateNameDto) {
    return this.employeesService.createReportingManager(enterpriseId, body);
  }

  @Patch('reporting-managers/:id')
  @ApiOperation({ summary: 'Update reporting manager' })
  @RequirePermission('employees', 'all_employees', 'edit')
  async updateReportingManager(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: UpdateNameDto,
  ) {
    return this.employeesService.updateReportingManager(id, enterpriseId, body);
  }

  @Delete('reporting-managers/:id')
  @ApiOperation({ summary: 'Delete reporting manager' })
  @RequirePermission('employees', 'all_employees', 'delete')
  async deleteReportingManager(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.deleteReportingManager(id, enterpriseId);
  }

  @Get('reporters')
  @ApiOperation({ summary: 'Get designated reporting heads' })
  @RequirePermission('employees', 'all_employees', 'view')
  async getReporters(@EnterpriseId() enterpriseId: number) {
    return this.employeesService.getReporters(enterpriseId);
  }

  @Patch(':id/reporting-head')
  @ApiOperation({ summary: 'Set or unset employee as reporting head' })
  @RequirePermission('employees', 'all_employees', 'edit')
  async setReportingHead(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body('value') value: boolean,
  ) {
    return this.employeesService.setReportingHead(id, enterpriseId, value);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @RequirePermission('employees', 'all_employees', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new employee' })
  @RequirePermission('employees', 'all_employees', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(enterpriseId, createDto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  @RequirePermission('employees', 'all_employees', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, enterpriseId, updateDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee' })
  @RequirePermission('employees', 'all_employees', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.employeesService.delete(id, enterpriseId, user);
  }

  @Get('my-team')
  @ApiOperation({ summary: 'Get team overview for the current manager' })
  async getMyTeam(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.employeesService.getTeamOverview(user?.id, enterpriseId);
  }

  @Get(':id/permissions')
  @RequireEnterprise()
  @ApiOperation({ summary: 'Get employee permissions' })
  @RequirePermission('employees', 'permissions', 'view')
  async getPermissions(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.getPermissions(id, enterpriseId);
  }

  @Patch(':id/permissions')
  @RequireEnterprise()
  @ApiOperation({ summary: 'Update employee permissions' })
  @RequirePermission('employees', 'permissions', 'edit')
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() permissions: any,
  ) {
    return this.employeesService.updatePermissions(id, enterpriseId, permissions, user?.id);
  }
}

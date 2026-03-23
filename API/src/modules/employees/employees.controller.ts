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
import { EnterpriseId, RequirePermission } from '../../common/decorators';

@ApiTags('Employees')
@Controller('employees')
@ApiBearerAuth('JWT-auth')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ============ Departments (MUST be before :id) ============

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
    @Body() body: any,
  ) {
    return this.employeesService.createDepartment(enterpriseId, body);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  @RequirePermission('employees', 'departments', 'edit')
  async updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: any,
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
    @Body() body: any,
  ) {
    return this.employeesService.createDesignation(enterpriseId, body);
  }

  @Patch('designations/:id')
  @ApiOperation({ summary: 'Update designation' })
  @RequirePermission('employees', 'designations', 'edit')
  async updateDesignation(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: any,
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
    @Body() createDto: any,
  ) {
    return this.employeesService.create(enterpriseId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  @RequirePermission('employees', 'all_employees', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: any,
  ) {
    return this.employeesService.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee' })
  @RequirePermission('employees', 'all_employees', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.delete(id, enterpriseId);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get employee permissions' })
  @RequirePermission('employees', 'permissions', 'view')
  async getPermissions(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.employeesService.getPermissions(id, enterpriseId);
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update employee permissions' })
  @RequirePermission('employees', 'permissions', 'edit')
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() permissions: any,
  ) {
    return this.employeesService.updatePermissions(id, enterpriseId, permissions);
  }
}

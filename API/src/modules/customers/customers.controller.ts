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
import { CustomersService } from './customers.service';
import { EnterpriseId, RequirePermission, DataStartDate, CurrentUser, OwnDataOnly, CurrentUserId } from '../../common/decorators';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('Customers')
@Controller('customers')
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @RequirePermission('sales', 'customers', 'view')
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @DataStartDate() dataStartDate: Date | null,
    @OwnDataOnly() ownDataOnly: boolean,
    @CurrentUserId() currentUserId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(enterpriseId, page, limit, search, dataStartDate, ownDataOnly, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @RequirePermission('sales', 'customers', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.customersService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new customer' })
  @RequirePermission('sales', 'customers', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateCustomerDto,
  ) {
    return this.customersService.create(enterpriseId, createDto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @RequirePermission('sales', 'customers', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, enterpriseId, updateDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  @RequirePermission('sales', 'customers', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.customersService.delete(id, enterpriseId, user);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UnitMastersService } from './unit-masters.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';
import { CreateUnitMasterDto } from './dto/create-unit-master.dto';

@ApiTags('Unit Masters')
@Controller('unit-masters')
@ApiBearerAuth('JWT-auth')
export class UnitMastersController {
  constructor(private readonly unitMastersService: UnitMastersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all unit masters' })
  @RequirePermission('configurations', 'unit_masters', 'view')
  async findAll(@EnterpriseId() enterpriseId: number) {
    return this.unitMastersService.findAll(enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unit master by ID' })
  @RequirePermission('configurations', 'unit_masters', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.unitMastersService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new unit master' })
  @RequirePermission('configurations', 'unit_masters', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateUnitMasterDto,
  ) {
    return this.unitMastersService.create(enterpriseId, createDto);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Seed default units' })
  @RequirePermission('configurations', 'unit_masters', 'create')
  async seedDefaults(@EnterpriseId() enterpriseId: number) {
    return this.unitMastersService.seedDefaults(enterpriseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a unit master' })
  @RequirePermission('configurations', 'unit_masters', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateUnitMasterDto>,
  ) {
    return this.unitMastersService.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a unit master' })
  @RequirePermission('configurations', 'unit_masters', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.unitMastersService.delete(id, enterpriseId);
  }
}

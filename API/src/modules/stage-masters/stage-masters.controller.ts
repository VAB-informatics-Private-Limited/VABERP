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
import { StageMastersService } from './stage-masters.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';
import { CreateStageMasterDto } from './dto/create-stage-master.dto';

@ApiTags('Stage Masters')
@Controller('stage-masters')
@ApiBearerAuth('JWT-auth')
export class StageMastersController {
  constructor(private readonly stageMastersService: StageMastersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stage masters' })
  @RequirePermission('configurations', 'stage_masters', 'view')
  async findAll(@EnterpriseId() enterpriseId: number) {
    return this.stageMastersService.findAll(enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stage master by ID' })
  @RequirePermission('configurations', 'stage_masters', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.stageMastersService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new stage master' })
  @RequirePermission('configurations', 'stage_masters', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateStageMasterDto,
  ) {
    return this.stageMastersService.create(enterpriseId, createDto);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Seed default manufacturing stages' })
  @RequirePermission('configurations', 'stage_masters', 'create')
  async seedDefaults(@EnterpriseId() enterpriseId: number) {
    return this.stageMastersService.seedDefaults(enterpriseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a stage master' })
  @RequirePermission('configurations', 'stage_masters', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateStageMasterDto>,
  ) {
    return this.stageMastersService.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stage master' })
  @RequirePermission('configurations', 'stage_masters', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.stageMastersService.delete(id, enterpriseId);
  }
}

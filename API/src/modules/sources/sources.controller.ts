import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SourcesService } from './sources.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@ApiTags('Sources')
@Controller('sources')
@ApiBearerAuth('JWT-auth')
export class SourcesController {
  constructor(private readonly service: SourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all lead sources' })
  @RequirePermission('configurations', 'sources', 'view')
  async findAll(@EnterpriseId() enterpriseId: number) {
    return this.service.findAll(enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead source' })
  @RequirePermission('configurations', 'sources', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateSourceDto,
  ) {
    return this.service.create(enterpriseId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead source' })
  @RequirePermission('configurations', 'sources', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: UpdateSourceDto,
  ) {
    return this.service.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead source' })
  @RequirePermission('configurations', 'sources', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.delete(id, enterpriseId);
  }
}

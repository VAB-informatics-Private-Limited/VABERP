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
import { InterestStatusesService } from './interest-statuses.service';
import { EnterpriseId } from '../../common/decorators';
import { CreateInterestStatusDto } from './dto/create-interest-status.dto';
import { UpdateInterestStatusDto } from './dto/update-interest-status.dto';

@ApiTags('Interest Statuses')
@Controller('interest-statuses')
@ApiBearerAuth('JWT-auth')
export class InterestStatusesController {
  constructor(private readonly service: InterestStatusesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all interest statuses' })
  async findAll(@EnterpriseId() enterpriseId: number) {
    return this.service.findAll(enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new interest status' })
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateInterestStatusDto,
  ) {
    return this.service.create(enterpriseId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an interest status' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: UpdateInterestStatusDto,
  ) {
    return this.service.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an interest status' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.delete(id, enterpriseId);
  }
}

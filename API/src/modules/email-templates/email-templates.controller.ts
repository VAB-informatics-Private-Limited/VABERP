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
import { EmailTemplatesService } from './email-templates.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@ApiTags('Email Templates')
@Controller('email-templates')
@ApiBearerAuth('JWT-auth')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all email templates' })
  @RequirePermission('configurations', 'email_templates', 'view')
  async findAll(@EnterpriseId() enterpriseId: number) {
    return this.service.findAll(enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  @RequirePermission('configurations', 'email_templates', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateEmailTemplateDto,
  ) {
    return this.service.create(enterpriseId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an email template' })
  @RequirePermission('configurations', 'email_templates', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: UpdateEmailTemplateDto,
  ) {
    return this.service.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an email template' })
  @RequirePermission('configurations', 'email_templates', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.delete(id, enterpriseId);
  }
}

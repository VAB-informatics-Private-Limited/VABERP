import {
  Controller,
  Post,
  Body,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService, SendEmailDto } from './email.service';
import { RequirePermission } from '../../common/decorators';

@ApiTags('Email')
@Controller('email')
@ApiBearerAuth('JWT-auth')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @RequirePermission('employees', 'permissions', 'edit')
  @ApiOperation({ summary: 'Send an email (admin-level permission required)' })
  async sendEmail(@Body() dto: SendEmailDto) {
    const result = await this.emailService.sendEmail(dto);
    return {
      message: result.message,
      data: { sent: true },
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if email service is configured' })
  async getStatus() {
    return {
      message: 'Email service status',
      data: { configured: this.emailService.isConfigured() },
    };
  }
}

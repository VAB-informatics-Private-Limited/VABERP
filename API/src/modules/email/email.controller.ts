import {
  Controller,
  Post,
  Body,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService, SendEmailDto } from './email.service';

@ApiTags('Email')
@Controller('email')
@ApiBearerAuth('JWT-auth')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an email' })
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

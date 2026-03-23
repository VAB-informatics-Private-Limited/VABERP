import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailDto {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendEmail(dto: SendEmailDto): Promise<{ message: string }> {
    if (!this.transporter) {
      throw new BadRequestException(
        'Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.',
      );
    }

    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');

    try {
      await this.transporter.sendMail({
        from,
        to: dto.to,
        cc: dto.cc || undefined,
        bcc: dto.bcc || undefined,
        subject: dto.subject,
        html: dto.body.replace(/\n/g, '<br>'),
        text: dto.body,
      });

      return { message: 'Email sent successfully' };
    } catch (error) {
      throw new BadRequestException(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}

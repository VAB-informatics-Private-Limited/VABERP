import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly authKey: string | null;
  private readonly senderId: string;

  constructor(private configService: ConfigService) {
    this.authKey = this.configService.get<string>('SMS_AUTH_KEY') || null;
    this.senderId = this.configService.get<string>('SMS_SENDER_ID') || 'VABINF';
  }

  isConfigured(): boolean {
    return !!this.authKey;
  }

  /**
   * Send a transactional SMS via MSG91.
   * Silently skips if SMS_AUTH_KEY is not configured.
   */
  async sendSms(mobile: string, message: string): Promise<void> {
    if (!this.authKey) return;

    // Normalise to 10-digit number; prepend country code 91
    const digits = mobile.replace(/\D/g, '');
    const normalised = digits.length === 10 ? `91${digits}` : digits;

    const body = JSON.stringify({
      sender: this.senderId,
      route: '4',
      country: '91',
      sms: [
        {
          message,
          to: [normalised],
        },
      ],
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.msg91.com',
        path: '/api/v2/sendsms',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          authkey: this.authKey!,
        },
      };

      const req = https.request(options, (res) => {
        res.resume(); // drain response
        if (res.statusCode !== 200) {
          this.logger.warn(`SMS API returned status ${res.statusCode} for ${normalised}`);
        }
        resolve();
      });

      req.on('error', (err) => {
        this.logger.error(`Failed to send SMS to ${normalised}: ${err.message}`);
        resolve(); // never throw — SMS is best-effort
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Send the same message to multiple mobile numbers.
   */
  async sendBulk(mobiles: string[], message: string): Promise<void> {
    if (!this.authKey || mobiles.length === 0) return;
    await Promise.all(mobiles.map((m) => this.sendSms(m, message)));
  }
}

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceEventsService } from '../service-events/service-events.service';

@Injectable()
export class ServiceScheduler {
  constructor(private readonly serviceEventsService: ServiceEventsService) {}

  // Every day at 9 AM — send SMS reminders for events due within 3 days
  @Cron('0 9 * * *')
  async sendDailyReminders() {
    await this.serviceEventsService.sendDueReminders();
  }

  // Every day at midnight — expire overdue events that were never booked
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOverdueEvents() {
    await this.serviceEventsService.expireOverdue();
  }
}

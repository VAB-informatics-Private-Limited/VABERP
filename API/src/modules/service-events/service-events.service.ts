import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { ServiceEvent } from './entities/service-event.entity';
import { ServiceProduct } from '../service-products/entities/service-product.entity';
import { ServiceRule } from '../product-types/entities/service-rule.entity';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class ServiceEventsService {
  constructor(
    @InjectRepository(ServiceEvent)
    private eventRepo: Repository<ServiceEvent>,
    @InjectRepository(ServiceRule)
    private ruleRepo: Repository<ServiceRule>,
    private smsService: SmsService,
  ) {}

  async generateForProduct(serviceProduct: ServiceProduct): Promise<void> {
    if (!serviceProduct.productTypeId) return;

    const rules = await this.ruleRepo.find({
      where: { productTypeId: serviceProduct.productTypeId, isActive: true },
      order: { dayOffset: 'ASC' },
    });

    if (!rules.length) return;

    const dispatchDate = new Date(serviceProduct.dispatchDate);

    const events = rules.map((rule) => {
      const dueDate = new Date(dispatchDate);
      dueDate.setDate(dueDate.getDate() + rule.dayOffset);

      return this.eventRepo.create({
        enterpriseId: serviceProduct.enterpriseId,
        serviceProductId: serviceProduct.id,
        ruleId: rule.id,
        dueDate,
        eventType: rule.eventType,
        title: rule.title,
        description: rule.description,
        price: rule.price,
        status: 'pending',
        reminderCount: 0,
      });
    });

    await this.eventRepo.save(events);
  }

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    status?: string,
    eventType?: string,
    fromDate?: string,
    toDate?: string,
    serviceProductId?: number,
  ) {
    const query = this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.serviceProduct', 'sp')
      .where('e.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('e.status = :status', { status });
    if (eventType) query.andWhere('e.eventType = :eventType', { eventType });
    if (serviceProductId) query.andWhere('e.serviceProductId = :serviceProductId', { serviceProductId });
    if (fromDate) query.andWhere('e.dueDate >= :fromDate', { fromDate });
    if (toDate) query.andWhere('e.dueDate <= :toDate', { toDate });

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('e.dueDate', 'ASC')
      .getManyAndCount();

    return { message: 'Service events fetched successfully', data, totalRecords: total, page };
  }

  async markBooked(id: number, enterpriseId: number) {
    await this.eventRepo.update({ id, enterpriseId }, { status: 'booked' });
  }

  async markCompleted(id: number, enterpriseId: number) {
    await this.eventRepo.update({ id, enterpriseId }, { status: 'completed' });
  }

  // Called by the scheduler — send SMS for events due within the next N days
  async sendDueReminders(enterpriseId?: number): Promise<void> {
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 3); // remind 3 days before due

    const query = this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.serviceProduct', 'sp')
      .where('e.status IN (:...statuses)', { statuses: ['pending', 'reminded'] })
      .andWhere('e.dueDate <= :cutoff', { cutoff: cutoff.toISOString().split('T')[0] })
      .andWhere('e.dueDate >= :today', { today: today.toISOString().split('T')[0] })
      .andWhere('e.reminderCount < 3');

    if (enterpriseId) {
      query.andWhere('e.enterpriseId = :enterpriseId', { enterpriseId });
    }

    const events = await query.getMany();

    for (const event of events) {
      const sp = event.serviceProduct;
      if (!sp?.customerMobile) continue;

      const dueDateStr = new Date(event.dueDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const message = `Hi ${sp.customerName || 'Customer'}, your ${event.title} is due on ${dueDateStr}. Please call us to schedule the service. Reply STOP to unsubscribe.`;

      try {
        await this.smsService.sendSms(sp.customerMobile, message);
        await this.eventRepo.update(event.id, {
          reminderCount: event.reminderCount + 1,
          lastReminderAt: new Date(),
          status: 'reminded',
        });
      } catch {
        // Best-effort: log but don't fail
      }
    }
  }

  // Called nightly to expire past-due events that were never booked
  async expireOverdue(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.eventRepo
      .createQueryBuilder()
      .update(ServiceEvent)
      .set({ status: 'expired' })
      .where('status IN (:...statuses)', { statuses: ['pending', 'reminded'] })
      .andWhere('dueDate < :today', { today })
      .execute();
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderRule } from './entities/reminder-rule.entity';
import { MaintenanceReminder } from './entities/maintenance-reminder.entity';
import { Machine } from '../machines/entities/machine.entity';

@Injectable()
export class MaintenanceRemindersService {
  constructor(
    @InjectRepository(ReminderRule) private ruleRepo: Repository<ReminderRule>,
    @InjectRepository(MaintenanceReminder) private reminderRepo: Repository<MaintenanceReminder>,
    @InjectRepository(Machine) private machineRepo: Repository<Machine>,
  ) {}

  // ─── Rules ─────────────────────────────────────────────────────────────────

  async getRules(enterpriseId: number, machineId?: number, status?: string) {
    const q = this.ruleRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.machine', 'm')
      .leftJoinAndSelect('r.category', 'cat')
      .where('r.enterpriseId = :enterpriseId', { enterpriseId });
    if (machineId) q.andWhere('r.machineId = :machineId', { machineId });
    if (status) q.andWhere('r.status = :status', { status });
    const data = await q.orderBy('r.name', 'ASC').getMany();
    return { message: 'Reminder rules fetched', data };
  }

  async createRule(enterpriseId: number, dto: any, userId?: number) {
    const rule = this.ruleRepo.create({ ...dto, enterpriseId, createdBy: userId });
    const saved = await this.ruleRepo.save(rule) as unknown as ReminderRule;
    // Immediately generate next reminder(s) for this rule
    await this.generateRemindersForRule(saved);
    return { message: 'Reminder rule created', data: saved };
  }

  async updateRule(id: number, enterpriseId: number, dto: any) {
    const rule = await this.ruleRepo.findOne({ where: { id, enterpriseId } });
    if (!rule) throw new NotFoundException('Reminder rule not found');
    Object.assign(rule, dto);
    return { message: 'Reminder rule updated', data: await this.ruleRepo.save(rule) };
  }

  async deleteRule(id: number, enterpriseId: number) {
    const rule = await this.ruleRepo.findOne({ where: { id, enterpriseId } });
    if (!rule) throw new NotFoundException('Reminder rule not found');
    await this.ruleRepo.remove(rule);
    return { message: 'Reminder rule deleted' };
  }

  // ─── Reminders ─────────────────────────────────────────────────────────────

  async getReminders(enterpriseId: number, machineId?: number, status?: string) {
    const q = this.reminderRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.machine', 'm')
      .leftJoinAndSelect('r.rule', 'rule')
      .where('r.enterpriseId = :enterpriseId', { enterpriseId });
    if (machineId) q.andWhere('r.machineId = :machineId', { machineId });
    if (status) q.andWhere('r.status = :status', { status });
    const data = await q.orderBy('r.dueDate', 'ASC').getMany();
    return { message: 'Reminders fetched', data };
  }

  async snoozeReminder(id: number, enterpriseId: number, snoozeUntil: string) {
    const r = await this.reminderRepo.findOne({ where: { id, enterpriseId } });
    if (!r) throw new NotFoundException('Reminder not found');
    r.status = 'snoozed';
    r.snoozeUntil = new Date(snoozeUntil);
    r.snoozeCount += 1;
    return { message: 'Reminder snoozed', data: await this.reminderRepo.save(r) };
  }

  async cancelReminder(id: number, enterpriseId: number) {
    const r = await this.reminderRepo.findOne({ where: { id, enterpriseId } });
    if (!r) throw new NotFoundException('Reminder not found');
    r.status = 'cancelled';
    return { message: 'Reminder cancelled', data: await this.reminderRepo.save(r) };
  }

  async getDueCount(enterpriseId: number) {
    const today = new Date().toISOString().split('T')[0];
    const [due, overdue] = await Promise.all([
      this.reminderRepo.count({ where: { enterpriseId, status: 'pending' } }),
      this.reminderRepo.createQueryBuilder('r')
        .where('r.enterpriseId = :enterpriseId', { enterpriseId })
        .andWhere('r.status = :status', { status: 'overdue' })
        .getCount(),
    ]);
    return { message: 'Due count fetched', data: { due, overdue } };
  }

  // ─── Scheduler ─────────────────────────────────────────────────────────────

  // Run daily at 6 AM to generate upcoming reminders and mark overdue
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyReminderCheck() {
    const today = new Date();

    // 1. Mark pending reminders as overdue if past due date
    const overdueResult = await this.reminderRepo.createQueryBuilder()
      .update(MaintenanceReminder)
      .set({ status: 'overdue' })
      .where('status = :status', { status: 'pending' })
      .andWhere('due_date < :today', { today: today.toISOString().split('T')[0] })
      .execute();

    // 2. Wake up snoozed reminders whose snooze_until has passed
    await this.reminderRepo.createQueryBuilder()
      .update(MaintenanceReminder)
      .set({ status: 'pending' })
      .where('status = :status', { status: 'snoozed' })
      .andWhere('snooze_until <= :today', { today: today.toISOString().split('T')[0] })
      .execute();

    // 3. For active rules, ensure there's a pending/snoozed reminder in the future
    const activeRules = await this.ruleRepo.find({ where: { status: 'active' } });
    for (const rule of activeRules) {
      await this.generateRemindersForRule(rule);
    }
  }

  private async generateRemindersForRule(rule: ReminderRule) {
    // Find machines this rule applies to
    const machines: Machine[] = [];
    if (rule.machineId) {
      const m = await this.machineRepo.findOne({ where: { id: rule.machineId } });
      if (m) machines.push(m);
    } else if (rule.categoryId) {
      const cats = await this.machineRepo.find({ where: { categoryId: rule.categoryId, enterpriseId: rule.enterpriseId } });
      machines.push(...cats);
    } else {
      const all = await this.machineRepo.find({ where: { enterpriseId: rule.enterpriseId, status: 'active' } });
      machines.push(...all);
    }

    for (const machine of machines) {
      // Skip if already has a pending/snoozed reminder for this rule+machine
      const existing = await this.reminderRepo.findOne({
        where: { ruleId: rule.id, machineId: machine.id, status: 'pending' },
      });
      if (existing) continue;

      // Determine next due date
      let dueDate: Date | null = null;
      if (rule.triggerType === 'time_based' || rule.triggerType === 'both') {
        // Find last completed reminder for this rule+machine to compute next
        const lastReminder = await this.reminderRepo.findOne({
          where: { ruleId: rule.id, machineId: machine.id, status: 'work_order_created' },
          order: { createdDate: 'DESC' },
        });
        const baseDate = lastReminder?.createdDate ?? machine.createdDate ?? new Date();
        dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + (rule.intervalDays ?? 30));
      }

      const reminder = this.reminderRepo.create({
        enterpriseId: rule.enterpriseId,
        ruleId: rule.id,
        machineId: machine.id,
        triggerType: rule.triggerType,
        dueDate,
        status: 'pending',
      });
      await this.reminderRepo.save(reminder);
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrganizerItem } from './entities/organizer-item.entity';
import { OrganizerRecurrenceRule } from './entities/organizer-recurrence-rule.entity';
import { OrganizerContextLink } from './entities/organizer-context-link.entity';
import { OrganizerActivityLog } from './entities/organizer-activity-log.entity';
import { OrganizerTagMaster } from './entities/organizer-tag-master.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrganizerService {
  constructor(
    @InjectRepository(OrganizerItem) private itemRepo: Repository<OrganizerItem>,
    @InjectRepository(OrganizerRecurrenceRule) private ruleRepo: Repository<OrganizerRecurrenceRule>,
    @InjectRepository(OrganizerContextLink) private linkRepo: Repository<OrganizerContextLink>,
    @InjectRepository(OrganizerActivityLog) private logRepo: Repository<OrganizerActivityLog>,
    @InjectRepository(OrganizerTagMaster) private tagRepo: Repository<OrganizerTagMaster>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Tag Master ──────────────────────────────────────────────────────────

  async getTags(enterpriseId: number) {
    return this.tagRepo.find({ where: { enterpriseId }, order: { name: 'ASC' } });
  }

  async createTag(enterpriseId: number, dto: { name: string; color?: string }) {
    const existing = await this.tagRepo.findOne({ where: { enterpriseId, name: dto.name } });
    if (existing) return existing;
    const tag = this.tagRepo.create({ enterpriseId, name: dto.name, color: dto.color ?? 'blue' });
    return this.tagRepo.save(tag);
  }

  async deleteTag(enterpriseId: number, id: number) {
    await this.tagRepo.delete({ id, enterpriseId });
    return { message: 'Tag deleted' };
  }

  // ─── Number Generation ────────────────────────────────────────────────────

  private async generateItemNumber(enterpriseId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORG-${year}-`;
    const last = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.enterpriseId = :eid', { eid: enterpriseId })
      .andWhere('i.itemNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('i.id', 'DESC')
      .getOne();
    const seq = last ? parseInt(last.itemNumber.split('-')[2] || '0', 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  // Determine if the caller has admin-level access to organizer
  private isOrganizerAdmin(permissions: any): boolean {
    if (!permissions) return true; // enterprise owner
    return permissions?.organizer?.assignments?.create === 1;
  }

  async findAll(enterpriseId: number, filters: any = {}, currentUserId?: number, permissions?: any) {
    const { type, status, priority, assignedTo, entityType, entityId, dueBefore, dueAfter, search, page = 1, limit = 30 } = filters;
    const p = Math.max(1, Number(page));
    const l = Math.min(100, Math.max(1, Number(limit)));

    let q = this.itemRepo.createQueryBuilder('i')
      .leftJoinAndSelect('i.contextLinks', 'cl')
      .where('i.enterpriseId = :eid', { eid: enterpriseId });

    // Scope: regular employees only see items assigned to them or created by them
    const isAdmin = this.isOrganizerAdmin(permissions);
    if (!isAdmin && currentUserId) {
      q = q.andWhere('(i.createdBy = :uid OR :uid2 = ANY(i.assignedTo))', { uid: currentUserId, uid2: currentUserId });
    }

    if (type) q = q.andWhere('i.type = :type', { type });
    if (status) q = q.andWhere('i.status = :status', { status });
    if (priority) q = q.andWhere('i.priority = :priority', { priority });
    if (assignedTo) q = q.andWhere(':uid3 = ANY(i.assignedTo)', { uid3: Number(assignedTo) });
    if (dueBefore) q = q.andWhere('i.dueDate <= :dueBefore', { dueBefore });
    if (dueAfter) q = q.andWhere('i.dueDate >= :dueAfter', { dueAfter });
    if (search && String(search).trim()) {
      q = q.andWhere('(i.title ILIKE :search OR i.description ILIKE :search OR i.notes ILIKE :search)', { search: `%${String(search).trim()}%` });
    }

    if (entityType && entityId) {
      q = q.andWhere((sub) => {
        const inner = sub.subQuery()
          .select('cl2.item_id')
          .from(OrganizerContextLink, 'cl2')
          .where('cl2.entity_type = :et', { et: entityType })
          .andWhere('cl2.entity_id = :eid2', { eid2: Number(entityId) })
          .getQuery();
        return `i.id IN ${inner}`;
      });
    }

    const [data, total] = await q
      .orderBy('i.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('i.createdAt', 'DESC')
      .skip((p - 1) * l)
      .take(l)
      .getManyAndCount();

    return { data, total, page: p, limit: l };
  }

  // ─── Detail ───────────────────────────────────────────────────────────────

  async findOne(id: number, enterpriseId: number) {
    const item = await this.itemRepo.findOne({
      where: { id, enterpriseId },
      relations: ['contextLinks', 'activityLog', 'recurrenceRule'],
    });
    if (!item) throw new NotFoundException('Item not found');

    // Sort activity log newest first
    item.activityLog?.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return item;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(enterpriseId: number, dto: any, userId: number) {
    return this.dataSource.transaction(async (em) => {
      const itemNumber = await this.generateItemNumber(enterpriseId);

      const item = em.create(OrganizerItem, {
        enterpriseId,
        itemNumber,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'medium',
        status: 'open',
        assignedTo: dto.assignedTo ?? [],
        createdBy: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
        tags: dto.tags ?? [],
        notes: dto.notes ?? null,
      });
      const saved = await em.save(OrganizerItem, item);

      // Create recurrence rule if recurring
      if (dto.type === 'recurring' && dto.recurrence) {
        const r = dto.recurrence;
        const rule = em.create(OrganizerRecurrenceRule, {
          itemId: saved.id,
          frequency: r.frequency,
          intervalDays: r.intervalDays ?? null,
          daysOfWeek: r.daysOfWeek ?? [],
          dayOfMonth: r.dayOfMonth ?? null,
          endDate: r.endDate ? new Date(r.endDate) : null,
          maxOccurrences: r.maxOccurrences ?? null,
          nextRunDate: saved.dueDate ?? new Date(),
        });
        await em.save(OrganizerRecurrenceRule, rule);
      }

      // Context links
      if (dto.contextLinks?.length) {
        for (const link of dto.contextLinks) {
          const cl = em.create(OrganizerContextLink, {
            itemId: saved.id,
            entityType: link.entityType,
            entityId: link.entityId,
            label: link.label ?? null,
          });
          await em.save(OrganizerContextLink, cl);
        }
      }

      // Activity log
      const log = em.create(OrganizerActivityLog, {
        itemId: saved.id,
        userId,
        action: 'created',
        newValue: dto.title,
      });
      await em.save(OrganizerActivityLog, log);

      return { message: 'Item created', data: saved };
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: number, enterpriseId: number, dto: any, userId: number) {
    const item = await this.itemRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Item not found');

    Object.assign(item, {
      title: dto.title ?? item.title,
      description: dto.description !== undefined ? dto.description : item.description,
      priority: dto.priority ?? item.priority,
      assignedTo: dto.assignedTo ?? item.assignedTo,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : item.dueDate,
      remindAt: dto.remindAt !== undefined ? (dto.remindAt ? new Date(dto.remindAt) : null) : item.remindAt,
      tags: dto.tags ?? item.tags,
      notes: dto.notes !== undefined ? dto.notes : item.notes,
    });

    const saved = await this.itemRepo.save(item as unknown as OrganizerItem);

    // Update context links if provided
    if (dto.contextLinks !== undefined) {
      await this.linkRepo.delete({ itemId: id });
      if (dto.contextLinks.length) {
        const links = dto.contextLinks.map((l: any) => this.linkRepo.create({
          itemId: id,
          entityType: l.entityType,
          entityId: l.entityId,
          label: l.label ?? null,
        }));
        await this.linkRepo.save(links);
      }
    }

    // Log edit
    const log = this.logRepo.create({ itemId: id, userId, action: 'edited' });
    await this.logRepo.save(log);

    return { message: 'Item updated', data: saved };
  }

  // ─── Status Change ────────────────────────────────────────────────────────

  async updateStatus(id: number, enterpriseId: number, status: string, userId: number) {
    const item = await this.itemRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Item not found');

    const oldStatus = item.status;
    item.status = status;
    if (status === 'done') item.completedAt = new Date();
    if (status !== 'snoozed') item.snoozedUntil = null;

    await this.itemRepo.save(item as unknown as OrganizerItem);

    const log = this.logRepo.create({
      itemId: id, userId, action: 'status_changed',
      oldValue: oldStatus, newValue: status,
    });
    await this.logRepo.save(log);

    // Spawn next occurrence for recurring items
    if (status === 'done') await this.spawnNextOccurrence(id, enterpriseId, userId);

    return { message: 'Status updated' };
  }

  // ─── Complete ─────────────────────────────────────────────────────────────

  async complete(id: number, enterpriseId: number, userId: number) {
    return this.updateStatus(id, enterpriseId, 'done', userId);
  }

  // ─── Snooze ───────────────────────────────────────────────────────────────

  async snooze(id: number, enterpriseId: number, snoozeUntil: string, userId: number) {
    const item = await this.itemRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Item not found');

    const snoozeDate = new Date(snoozeUntil);
    item.snoozedUntil = snoozeDate;
    item.remindAt = snoozeDate;
    item.status = 'snoozed';
    await this.itemRepo.save(item as unknown as OrganizerItem);

    const log = this.logRepo.create({
      itemId: id, userId, action: 'snoozed',
      newValue: snoozeUntil,
    });
    await this.logRepo.save(log);

    return { message: 'Item snoozed' };
  }

  // ─── Delete (cancel) ─────────────────────────────────────────────────────

  async remove(id: number, enterpriseId: number) {
    const item = await this.itemRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Item not found');
    item.status = 'cancelled';
    await this.itemRepo.save(item as unknown as OrganizerItem);
    return { message: 'Item cancelled' };
  }

  // ─── Context — items linked to an entity ─────────────────────────────────

  async findForEntity(entityType: string, entityId: number, enterpriseId: number) {
    const links = await this.linkRepo.find({ where: { entityType, entityId } });
    if (!links.length) return [];
    const itemIds = links.map((l) => l.itemId);
    const items = await this.itemRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.contextLinks', 'cl')
      .where('i.id IN (:...ids)', { ids: itemIds })
      .andWhere('i.enterpriseId = :eid', { eid: enterpriseId })
      .orderBy('i.dueDate', 'ASC', 'NULLS LAST')
      .getMany();
    return items;
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard(enterpriseId: number) {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [openTasks, dueToday, overdue, followUpsPending] = await Promise.all([
      this.itemRepo.count({ where: { enterpriseId, status: 'open' } }),
      this.itemRepo.createQueryBuilder('i')
        .where('i.enterpriseId = :eid', { eid: enterpriseId })
        .andWhere('i.dueDate BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
        .andWhere('i.status NOT IN (:...done)', { done: ['done', 'cancelled'] })
        .getCount(),
      this.itemRepo.createQueryBuilder('i')
        .where('i.enterpriseId = :eid', { eid: enterpriseId })
        .andWhere('i.dueDate < :now', { now: todayStart })
        .andWhere('i.status NOT IN (:...done)', { done: ['done', 'cancelled'] })
        .getCount(),
      this.itemRepo.count({ where: { enterpriseId, type: 'follow_up', status: 'open' } }),
    ]);

    return { openTasks, dueToday, overdue, followUpsPending };
  }

  // ─── Spawn next recurring occurrence ─────────────────────────────────────

  private async spawnNextOccurrence(itemId: number, enterpriseId: number, userId: number) {
    const rule = await this.ruleRepo.findOne({ where: { itemId } });
    if (!rule) return;

    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) return;

    // Check limits
    if (rule.maxOccurrences && rule.occurrencesGenerated >= rule.maxOccurrences) return;
    if (rule.endDate && new Date() > new Date(rule.endDate)) return;

    // Calculate next due date
    const base = new Date(rule.nextRunDate);
    let nextDate = new Date(base);

    if (rule.frequency === 'daily') {
      nextDate.setDate(base.getDate() + (rule.intervalDays ?? 1));
    } else if (rule.frequency === 'weekly') {
      nextDate.setDate(base.getDate() + 7 * (rule.intervalDays ?? 1));
    } else if (rule.frequency === 'monthly') {
      nextDate.setMonth(base.getMonth() + 1);
      if (rule.dayOfMonth) nextDate.setDate(rule.dayOfMonth);
    } else if (rule.frequency === 'custom' && rule.intervalDays) {
      nextDate.setDate(base.getDate() + rule.intervalDays);
    }

    // Spawn new item
    const itemNumber = await this.generateItemNumber(enterpriseId);
    const newItem = this.itemRepo.create({
      enterpriseId,
      itemNumber,
      type: item.type,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: 'open',
      assignedTo: item.assignedTo,
      createdBy: userId,
      dueDate: nextDate,
      remindAt: nextDate,
      tags: item.tags,
      notes: item.notes,
    });
    const saved = await this.itemRepo.save(newItem as unknown as OrganizerItem);

    // Clone context links
    const existingLinks = await this.linkRepo.find({ where: { itemId } });
    if (existingLinks.length) {
      const newLinks = existingLinks.map((l) => this.linkRepo.create({
        itemId: saved.id,
        entityType: l.entityType,
        entityId: l.entityId,
        label: l.label,
      }));
      await this.linkRepo.save(newLinks);
    }

    // Create new recurrence rule for the spawned item
    const newRule = this.ruleRepo.create({
      itemId: saved.id,
      frequency: rule.frequency,
      intervalDays: rule.intervalDays,
      daysOfWeek: rule.daysOfWeek,
      dayOfMonth: rule.dayOfMonth,
      endDate: rule.endDate,
      maxOccurrences: rule.maxOccurrences,
      nextRunDate: nextDate,
      occurrencesGenerated: 0,
    });
    await this.ruleRepo.save(newRule as unknown as OrganizerRecurrenceRule);

    // Update old rule stats
    rule.occurrencesGenerated += 1;
    rule.lastRunDate = base;
    rule.nextRunDate = nextDate;
    await this.ruleRepo.save(rule as unknown as OrganizerRecurrenceRule);
  }

  // ─── Cron: fire reminders every minute ───────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async fireReminders() {
    const due = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.remindAt <= :now', { now: new Date() })
      .andWhere('i.status NOT IN (:...done)', { done: ['done', 'cancelled'] })
      .andWhere('(i.snoozedUntil IS NULL OR i.snoozedUntil <= :now2)', { now2: new Date() })
      .getMany();

    for (const item of due) {
      await this.notificationsService.create({
        enterpriseId: item.enterpriseId,
        title: `Reminder: ${item.title}`,
        message: `Your organizer item "${item.title}" is due for attention.`,
        type: 'reminder',
        module: 'organizer',
        link: `/organizer/${item.id}`,
      });

      // Clear remind_at so it doesn't fire again
      item.remindAt = null;
      if (item.status === 'snoozed') item.status = 'open';
      item.snoozedUntil = null;
      await this.itemRepo.save(item as unknown as OrganizerItem);
    }
  }

  // ─── Cron: generate recurring items at 6 AM ──────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateRecurringItems() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueRules = await this.ruleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.item', 'i')
      .where('r.nextRunDate <= :today', { today })
      .getMany();

    for (const rule of dueRules) {
      if (!rule.item) continue;
      await this.spawnNextOccurrence(rule.itemId, rule.item.enterpriseId, rule.item.createdBy);
    }
  }
}

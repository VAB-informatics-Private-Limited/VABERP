import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

export interface CreateNotificationParams {
  enterpriseId: number;
  title: string;
  message: string;
  type: string;
  module: string;
  subModule?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  create(params: CreateNotificationParams) {
    const notification = this.repo.create({
      enterpriseId: params.enterpriseId,
      title: params.title,
      message: params.message,
      type: params.type,
      module: params.module,
      subModule: params.subModule,
      link: params.link,
      isRead: false,
    });
    return this.repo.save(notification).catch(() => {});
  }

  async findAll(enterpriseId: number, page = 1, limit = 20, unreadOnly = false) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.enterpriseId = :enterpriseId', { enterpriseId });

    if (unreadOnly) {
      qb.andWhere('n.isRead = false');
    }

    const [data, total] = await qb
      .orderBy('n.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return { data, total, page: pageNum, limit: limitNum };
  }

  async getCounts(enterpriseId: number) {
    const unread = await this.repo.find({
      where: { enterpriseId, isRead: false },
      select: ['id', 'module', 'subModule'],
    });

    const byModule: Record<string, number> = {};
    const bySubModule: Record<string, number> = {};

    for (const n of unread) {
      byModule[n.module] = (byModule[n.module] || 0) + 1;
      if (n.subModule) {
        bySubModule[n.subModule] = (bySubModule[n.subModule] || 0) + 1;
      }
    }

    return {
      totalUnread: unread.length,
      byModule,
      bySubModule,
    };
  }

  async markRead(id: number, enterpriseId: number) {
    await this.repo.update({ id, enterpriseId }, { isRead: true });
    return { message: 'Notification marked as read' };
  }

  async markAllRead(enterpriseId: number) {
    await this.repo.update({ enterpriseId, isRead: false }, { isRead: true });
    return { message: 'All notifications marked as read' };
  }
}

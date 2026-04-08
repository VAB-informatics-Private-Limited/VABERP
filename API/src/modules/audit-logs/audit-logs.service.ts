import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogParams {
  enterpriseId: number;
  userId?: number;
  userType?: string;
  userName?: string;
  entityType: string;
  entityId: number;
  action: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: AuditLogParams) {
    // Only track employee actions — skip enterprise admin and unauthenticated actions
    if (!params.userType || params.userType !== 'employee') return;

    const entry = this.auditLogRepository.create({
      enterpriseId: params.enterpriseId,
      userId: params.userId,
      userType: params.userType,
      userName: params.userName,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      description: params.description,
      oldValues: params.oldValues,
      newValues: params.newValues,
    });

    return this.auditLogRepository.save(entry);
  }

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 50,
    entityType?: string,
    entityId?: number,
    action?: string,
    fromDate?: string,
    toDate?: string,
    userName?: string,
    userId?: number,
  ) {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.enterpriseId = :enterpriseId', { enterpriseId });

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('log.entityId = :entityId', { entityId });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (fromDate) {
      query.andWhere('log.createdDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('log.createdDate <= :toDate', { toDate });
    }

    if (userName) {
      query.andWhere('log.userName ILIKE :userName', { userName: `%${userName}%` });
    }

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('log.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Audit logs fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }
}

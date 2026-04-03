import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmLead } from './entities/crm-lead.entity';

@Injectable()
export class CrmReportsService {
  constructor(
    @InjectRepository(CrmLead)
    private leadRepository: Repository<CrmLead>,
  ) {}

  async getSummary(enterpriseId: number) {
    const stats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('lead.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy('lead.status')
      .getRawMany();

    const total = await this.leadRepository.count({ where: { enterpriseId } });

    return {
      message: 'CRM summary fetched',
      data: { total, byStatus: stats },
    };
  }

  async getPerformanceStats(enterpriseId: number) {
    const stats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.assignedTo', 'employeeId')
      .addSelect('CONCAT(emp.firstName, \' \', emp.lastName)', 'employeeName')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN lead.status = \'converted\' THEN 1 ELSE 0 END)', 'converted')
      .addSelect('SUM(CASE WHEN lead.status = \'lost\' THEN 1 ELSE 0 END)', 'lost')
      .addSelect('SUM(CASE WHEN lead.status IN (\'new\', \'contacted\', \'interested\', \'follow_up\') THEN 1 ELSE 0 END)', 'active')
      .leftJoin('lead.assignedEmployee', 'emp')
      .where('lead.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('lead.assignedTo IS NOT NULL')
      .groupBy('lead.assignedTo')
      .addGroupBy('emp.firstName')
      .addGroupBy('emp.lastName')
      .orderBy('total', 'DESC')
      .getRawMany();

    const result = stats.map(s => ({
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      total: Number(s.total),
      converted: Number(s.converted),
      lost: Number(s.lost),
      active: Number(s.active),
      conversionRate: s.total > 0 ? Math.round((Number(s.converted) / Number(s.total)) * 100) : 0,
    }));

    return { message: 'Performance stats fetched', data: result };
  }
}

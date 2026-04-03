import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CrmFollowup } from './entities/crm-followup.entity';
import { CrmLead } from './entities/crm-lead.entity';
import { CrmActivityLog } from './entities/crm-activity-log.entity';
import { CreateFollowupDto } from './dto';

@Injectable()
export class CrmFollowupsService {
  constructor(
    @InjectRepository(CrmFollowup)
    private followupRepository: Repository<CrmFollowup>,
    @InjectRepository(CrmLead)
    private leadRepository: Repository<CrmLead>,
    @InjectRepository(CrmActivityLog)
    private activityRepository: Repository<CrmActivityLog>,
    private dataSource: DataSource,
  ) {}

  async getFollowups(leadId: number, enterpriseId: number) {
    const lead = await this.leadRepository.findOne({ where: { id: leadId, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const data = await this.followupRepository.find({
      where: { crmLeadId: leadId, enterpriseId },
      relations: ['createdByEmployee'],
      order: { createdDate: 'DESC' },
    });
    return { message: 'Follow-ups fetched', data };
  }

  async addFollowup(leadId: number, enterpriseId: number, dto: CreateFollowupDto, currentUserId: number) {
    const lead = await this.leadRepository.findOne({ where: { id: leadId, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const followup = queryRunner.manager.create(CrmFollowup, {
        enterpriseId,
        crmLeadId: leadId,
        createdBy: currentUserId,
        followupType: dto.followupType,
        followupDate: new Date(dto.followupDate),
        status: dto.status || lead.status,
        notes: dto.notes,
        nextFollowupDate: dto.nextFollowupDate ? new Date(dto.nextFollowupDate) : null,
        nextFollowupType: dto.nextFollowupType,
      });
      const saved = await queryRunner.manager.save(CrmFollowup, followup);

      // Update lead's next followup date and optionally status
      const leadUpdate: Partial<CrmLead> = {};
      if (dto.nextFollowupDate) {
        leadUpdate.nextFollowupDate = new Date(dto.nextFollowupDate);
      }
      if (dto.status && dto.status !== lead.status) {
        leadUpdate.status = dto.status;
      }
      if (Object.keys(leadUpdate).length > 0) {
        await queryRunner.manager.update(CrmLead, leadId, leadUpdate);
      }

      await queryRunner.manager.save(CrmActivityLog, {
        enterpriseId,
        crmLeadId: leadId,
        performedBy: currentUserId,
        action: 'followup_added',
        newValue: { followupType: dto.followupType, followupDate: dto.followupDate, notes: dto.notes },
        description: `${dto.followupType} follow-up logged`,
      });

      await queryRunner.commitTransaction();
      return { message: 'Follow-up added successfully', data: saved };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
}

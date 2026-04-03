import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CrmLead } from './entities/crm-lead.entity';
import { CrmActivityLog } from './entities/crm-activity-log.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateLeadDto, UpdateLeadDto, UpdateLeadStatusDto } from './dto';
import { PermissionsJson } from '../../common/constants/permissions';

@Injectable()
export class CrmLeadsService {
  constructor(
    @InjectRepository(CrmLead)
    private leadRepository: Repository<CrmLead>,
    @InjectRepository(CrmActivityLog)
    private activityRepository: Repository<CrmActivityLog>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private dataSource: DataSource,
  ) {}

  private getScope(permissions: PermissionsJson): 'admin' | 'manager' | 'sales' {
    if (permissions?.crm?.settings?.edit === 1) return 'admin';
    if (permissions?.crm?.assignments?.create === 1) return 'manager';
    return 'sales';
  }

  async findAll(
    enterpriseId: number,
    currentUserId: number,
    permissions: PermissionsJson,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    assignedTo?: number,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const scope = this.getScope(permissions);

    const query = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedEmployee', 'assignedEmployee')
      .leftJoinAndSelect('lead.customer', 'customer')
      .where('lead.enterpriseId = :enterpriseId', { enterpriseId });

    // Scope-based visibility
    if (scope === 'manager') {
      query.andWhere(
        '(lead.assignedTo = :uid OR lead.assignedTo IN ' +
        '(SELECT id FROM employees WHERE reporting_to = :uid AND enterprise_id = :enterpriseId))',
        { uid: currentUserId },
      );
    } else if (scope === 'sales') {
      query.andWhere('lead.assignedTo = :uid', { uid: currentUserId });
    }

    if (search) {
      query.andWhere(
        '(lead.customerName ILIKE :search OR lead.mobile ILIKE :search OR lead.email ILIKE :search OR lead.businessName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('lead.status = :status', { status });
    }

    if (assignedTo && scope === 'admin') {
      query.andWhere('lead.assignedTo = :assignedTo', { assignedTo });
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('lead.createdDate', 'DESC')
      .getManyAndCount();

    return { message: 'Leads fetched successfully', data, totalRecords: total, page: pageNum, limit: limitNum };
  }

  async findOne(id: number, enterpriseId: number) {
    const lead = await this.leadRepository.findOne({
      where: { id, enterpriseId },
      relations: ['assignedEmployee', 'customer', 'createdByEmployee', 'manager'],
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return { message: 'Lead fetched successfully', data: lead };
  }

  async create(enterpriseId: number, dto: CreateLeadDto, currentUserId: number) {
    const count = await this.leadRepository.count({ where: { enterpriseId } });
    const leadNumber = `CRM-${String(count + 1).padStart(6, '0')}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const lead = queryRunner.manager.create(CrmLead, {
        enterpriseId,
        leadNumber,
        customerName: dto.customerName,
        email: dto.email,
        mobile: dto.mobile,
        businessName: dto.businessName,
        gstNumber: dto.gstNumber,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        pincode: dto.pincode,
        source: dto.source,
        expectedValue: dto.expectedValue,
        requirements: dto.requirements,
        remarks: dto.remarks,
        nextFollowupDate: dto.nextFollowupDate ? new Date(dto.nextFollowupDate) : null,
        assignedTo: dto.assignedTo || null,
        assignedBy: dto.assignedTo ? currentUserId : null,
        createdBy: currentUserId,
        status: 'new',
      });
      const saved = await queryRunner.manager.save(CrmLead, lead);

      await queryRunner.manager.save(CrmActivityLog, {
        enterpriseId,
        crmLeadId: saved.id,
        performedBy: currentUserId,
        action: 'lead_created',
        newValue: { leadNumber, customerName: dto.customerName, status: 'new' },
        description: `Lead ${leadNumber} created`,
      });

      await queryRunner.commitTransaction();
      return { message: 'Lead created successfully', data: saved };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, enterpriseId: number, dto: UpdateLeadDto, currentUserId: number) {
    const lead = await this.leadRepository.findOne({ where: { id, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};
      const updatePayload: Partial<CrmLead> = {};

      const fields: Array<[keyof UpdateLeadDto, keyof CrmLead]> = [
        ['customerName', 'customerName'], ['email', 'email'], ['mobile', 'mobile'],
        ['businessName', 'businessName'], ['gstNumber', 'gstNumber'], ['address', 'address'],
        ['city', 'city'], ['state', 'state'], ['country', 'country'], ['pincode', 'pincode'],
        ['source', 'source'], ['expectedValue', 'expectedValue'], ['requirements', 'requirements'],
        ['remarks', 'remarks'],
      ];

      for (const [dtoKey, entityKey] of fields) {
        if (dto[dtoKey] !== undefined) {
          oldValues[entityKey] = lead[entityKey];
          (updatePayload as Record<string, unknown>)[entityKey] = dto[dtoKey];
          newValues[entityKey] = dto[dtoKey];
        }
      }

      if (dto.nextFollowupDate !== undefined) {
        oldValues['nextFollowupDate'] = lead.nextFollowupDate;
        updatePayload.nextFollowupDate = dto.nextFollowupDate ? new Date(dto.nextFollowupDate) : null;
        newValues['nextFollowupDate'] = dto.nextFollowupDate;
      }

      await queryRunner.manager.update(CrmLead, id, updatePayload);
      await queryRunner.manager.save(CrmActivityLog, {
        enterpriseId, crmLeadId: id, performedBy: currentUserId,
        action: 'lead_updated', oldValue: oldValues, newValue: newValues,
        description: `Lead ${lead.leadNumber} updated`,
      });

      await queryRunner.commitTransaction();
      return { message: 'Lead updated successfully', data: null };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: number, enterpriseId: number, dto: UpdateLeadStatusDto, currentUserId: number) {
    const lead = await this.leadRepository.findOne({ where: { id, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const oldStatus = lead.status;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(CrmLead, id, { status: dto.status });
      await queryRunner.manager.save(CrmActivityLog, {
        enterpriseId, crmLeadId: id, performedBy: currentUserId,
        action: dto.status === 'converted' ? 'converted' : dto.status === 'lost' ? 'lost' : 'status_changed',
        oldValue: { status: oldStatus },
        newValue: { status: dto.status },
        description: `Status changed from "${oldStatus}" to "${dto.status}"`,
      });
      await queryRunner.commitTransaction();
      return { message: 'Status updated successfully', data: null };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: number, enterpriseId: number) {
    const lead = await this.leadRepository.findOne({ where: { id, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');
    await this.leadRepository.delete(id);
    return { message: 'Lead deleted successfully', data: null };
  }

  async getTodayFollowups(enterpriseId: number, currentUserId: number, permissions: PermissionsJson) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scope = this.getScope(permissions);
    const query = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedEmployee', 'assignedEmployee')
      .where('lead.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('lead.nextFollowupDate >= :today', { today })
      .andWhere('lead.nextFollowupDate < :tomorrow', { tomorrow })
      .andWhere('lead.status NOT IN (:...done)', { done: ['converted', 'lost'] });

    if (scope === 'manager') {
      query.andWhere(
        '(lead.assignedTo = :uid OR lead.assignedTo IN (SELECT id FROM employees WHERE reporting_to = :uid AND enterprise_id = :enterpriseId))',
        { uid: currentUserId },
      );
    } else if (scope === 'sales') {
      query.andWhere('lead.assignedTo = :uid', { uid: currentUserId });
    }

    const data = await query.orderBy('lead.nextFollowupDate', 'ASC').getMany();
    return { message: 'Today follow-ups fetched', data };
  }

  async getOverdueFollowups(enterpriseId: number, currentUserId: number, permissions: PermissionsJson) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scope = this.getScope(permissions);
    const query = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedEmployee', 'assignedEmployee')
      .where('lead.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('lead.nextFollowupDate < :today', { today })
      .andWhere('lead.status NOT IN (:...done)', { done: ['converted', 'lost'] });

    if (scope === 'manager') {
      query.andWhere(
        '(lead.assignedTo = :uid OR lead.assignedTo IN (SELECT id FROM employees WHERE reporting_to = :uid AND enterprise_id = :enterpriseId))',
        { uid: currentUserId },
      );
    } else if (scope === 'sales') {
      query.andWhere('lead.assignedTo = :uid', { uid: currentUserId });
    }

    const data = await query.orderBy('lead.nextFollowupDate', 'ASC').getMany();
    return { message: 'Overdue follow-ups fetched', data };
  }

  async getActivityLog(leadId: number, enterpriseId: number) {
    const lead = await this.leadRepository.findOne({ where: { id: leadId, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const data = await this.activityRepository.find({
      where: { crmLeadId: leadId, enterpriseId },
      relations: ['performedByEmployee'],
      order: { createdDate: 'DESC' },
    });
    return { message: 'Activity log fetched', data };
  }
}

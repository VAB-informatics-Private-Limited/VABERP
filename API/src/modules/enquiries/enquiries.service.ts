import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Enquiry } from './entities/enquiry.entity';
import { Followup } from './entities/followup.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CreateEnquiryDto, CreateFollowupDto, FollowupOutcomeDto } from './dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectRepository(Enquiry)
    private enquiryRepository: Repository<Enquiry>,
    @InjectRepository(Followup)
    private followupRepository: Repository<Followup>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    private dataSource: DataSource,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    interestStatus?: string,
    assignedTo?: number,
    fromDate?: string,
    toDate?: string,
    dataStartDate?: Date | null,
    ownDataOnly = false,
    currentUserId?: number,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.customer', 'customer')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'assignedEmployee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.convertedCustomerId IS NULL')
      .andWhere('LOWER(REPLACE(enquiry.interestStatus, \' \', \'_\')) NOT IN (:...closedStatuses)', {
        closedStatuses: ['converted', 'sale_closed'],
      });

    if (search) {
      query.andWhere(
        '(enquiry.customerName ILIKE :search OR enquiry.email ILIKE :search OR enquiry.mobile ILIKE :search OR enquiry.businessName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (interestStatus) {
      query.andWhere('enquiry.interestStatus = :interestStatus', { interestStatus });
    }

    if (assignedTo) {
      query.andWhere('enquiry.assignedTo = :assignedTo', { assignedTo });
    }

    if (ownDataOnly && currentUserId) {
      query.andWhere('enquiry.assignedTo = :currentUserId', { currentUserId });
    }

    // Employee data visibility: only show records from the assigned start date
    const effectiveFromDate = dataStartDate
      ? dataStartDate.toISOString()
      : fromDate;

    if (effectiveFromDate) {
      query.andWhere('enquiry.createdDate >= :fromDate', { fromDate: effectiveFromDate });
    }

    if (toDate && !dataStartDate) {
      query.andWhere('enquiry.createdDate <= :toDate', { toDate });
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('enquiry.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Enquiries fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const enquiry = await this.enquiryRepository.findOne({
      where: { id, enterpriseId },
      relations: ['customer', 'assignedEmployee'],
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    return {
      message: 'Enquiry fetched successfully',
      data: enquiry,
    };
  }

  async create(enterpriseId: number, createDto: CreateEnquiryDto, user?: { id: number; type: string; name?: string }) {
    // Block duplicate phone numbers within the same enterprise
    if (createDto.mobile) {
      const existing = await this.enquiryRepository.findOne({
        where: { enterpriseId, mobile: createDto.mobile },
        select: ['id', 'enquiryNumber', 'customerName'],
      });
      if (existing) {
        throw new ConflictException(
          `An enquiry with mobile number ${createDto.mobile} already exists — ${existing.enquiryNumber} (${existing.customerName})`,
        );
      }
    }

    // Generate enquiry number
    const count = await this.enquiryRepository.count({ where: { enterpriseId } });
    const enquiryNumber = `ENQ-${String(count + 1).padStart(6, '0')}`;

    const enquiry = this.enquiryRepository.create({
      ...createDto,
      enterpriseId,
      enquiryNumber,
    });

    const saved = await this.enquiryRepository.save(enquiry);

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'enquiry',
      entityId: saved.id,
      action: 'create',
      description: `Created enquiry ${saved.enquiryNumber} for "${saved.customerName}"`,
      newValues: { enquiryNumber: saved.enquiryNumber, interestStatus: saved.interestStatus },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return {
      message: 'Enquiry created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateEnquiryDto>, user?: { id: number; type: string; name?: string }) {
    const enquiry = await this.enquiryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    await this.enquiryRepository.update(id, updateDto);

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'enquiry',
      entityId: id,
      action: 'update',
      description: `Updated enquiry for "${enquiry.customerName}"`,
      newValues: updateDto as Record<string, any>,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number, user?: { id: number; type: string; name?: string }) {
    const enquiry = await this.enquiryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    // Block deletion if the enquiry has produced any downstream records
    const linkedQuotations = await this.quotationRepository.find({
      where: { enquiryId: id },
      select: ['quotationNumber'],
    });
    if (linkedQuotations.length > 0) {
      const nums = linkedQuotations.map((q) => q.quotationNumber).filter(Boolean).join(', ');
      throw new BadRequestException(
        `Cannot delete this enquiry. Quotation ${nums || '(linked)'} has already been created for it. Please delete the quotation first.`,
      );
    }

    const linkedSalesOrder = await this.dataSource.query(
      'SELECT sales_order_number FROM sales_orders WHERE enquiry_id = $1 LIMIT 1',
      [id],
    );
    if (linkedSalesOrder.length > 0) {
      throw new BadRequestException(
        `Cannot delete this enquiry. Purchase Order ${linkedSalesOrder[0].sales_order_number || '(linked)'} has already been created for it. Please delete the purchase order first.`,
      );
    }

    const linkedCustomer = await this.customerRepository.findOne({
      where: { sourceEnquiryId: id },
      select: ['customerName'],
    });
    if (linkedCustomer) {
      throw new BadRequestException(
        `Cannot delete this enquiry. It has been converted to customer "${linkedCustomer.customerName}". Please delete the customer first.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Followup, { enquiryId: id });
      await manager.delete(Enquiry, id);
    });

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'enquiry',
      entityId: id,
      action: 'delete',
      description: `Deleted enquiry ${enquiry.enquiryNumber} for "${enquiry.customerName}"`,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return {
      message: 'Enquiry deleted successfully',
      data: null,
    };
  }

  // ========== Follow-ups ==========

  async getFollowups(enquiryId: number, enterpriseId: number) {
    // Verify enquiry exists
    const enquiry = await this.enquiryRepository.findOne({
      where: { id: enquiryId, enterpriseId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    const followups = await this.followupRepository.find({
      where: { enquiryId },
      relations: ['createdByEmployee'],
      order: { createdDate: 'DESC' },
    });

    return {
      message: 'Followups fetched successfully',
      data: followups,
    };
  }

  async addFollowup(enterpriseId: number, createDto: CreateFollowupDto, userId?: number) {
    // Verify enquiry exists
    const enquiry = await this.enquiryRepository.findOne({
      where: { id: createDto.enquiryId, enterpriseId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    // Map remarks -> notes if notes not provided
    const notes = createDto.notes || createDto.remarks || null;

    const enquiryId = createDto.enquiryId!;
    const followup = this.followupRepository.create({
      enquiryId,
      enterpriseId,
      followupType: createDto.followupType || 'Call',
      followupDate: createDto.followupDate ? new Date(createDto.followupDate) : new Date(),
      interestStatus: createDto.interestStatus,
      notes,
      nextFollowupDate: createDto.nextFollowupDate ? new Date(createDto.nextFollowupDate) : undefined,
      nextFollowupType: createDto.nextFollowupType || undefined,
      createdBy: userId,
    } as any);

    const saved = await this.followupRepository.save(followup);

    // Update enquiry's interest status and next followup date
    const enquiryUpdate: any = {
      interestStatus: createDto.interestStatus,
    };
    if (createDto.nextFollowupDate) {
      enquiryUpdate.nextFollowupDate = new Date(createDto.nextFollowupDate);
    }
    await this.enquiryRepository.update(enquiryId, enquiryUpdate);

    return {
      message: 'Followup added successfully',
      data: saved,
    };
  }

  async updateFollowup(followupId: number, enterpriseId: number, updateDto: Partial<CreateFollowupDto>) {
    const followup = await this.followupRepository.findOne({
      where: { id: followupId, enterpriseId },
    });

    if (!followup) {
      throw new NotFoundException('Followup not found');
    }

    const updateData: any = {};
    if (updateDto.interestStatus) updateData.interestStatus = updateDto.interestStatus;
    if (updateDto.notes || updateDto.remarks) updateData.notes = updateDto.notes || updateDto.remarks;
    if (updateDto.followupDate) updateData.followupDate = new Date(updateDto.followupDate);
    if (updateDto.followupType) updateData.followupType = updateDto.followupType;
    if (updateDto.nextFollowupDate) updateData.nextFollowupDate = new Date(updateDto.nextFollowupDate);
    if (updateDto.nextFollowupType) updateData.nextFollowupType = updateDto.nextFollowupType;

    await this.followupRepository.update(followupId, updateData);

    // Also update the parent enquiry's interest status
    if (updateDto.interestStatus || updateDto.nextFollowupDate) {
      const enquiryUpdate: any = {};
      if (updateDto.interestStatus) enquiryUpdate.interestStatus = updateDto.interestStatus;
      if (updateDto.nextFollowupDate) enquiryUpdate.nextFollowupDate = new Date(updateDto.nextFollowupDate);
      await this.enquiryRepository.update(followup.enquiryId, enquiryUpdate);
    }

    return {
      message: 'Followup updated successfully',
      data: { ...followup, ...updateData },
    };
  }

  async getTodayFollowups(enterpriseId: number, assignedTo?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.customer', 'customer')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'assignedEmployee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.nextFollowupDate >= :today', { today })
      .andWhere('enquiry.nextFollowupDate < :tomorrow', { tomorrow })
      .andWhere('enquiry.convertedCustomerId IS NULL')
      .andWhere('LOWER(REPLACE(enquiry.interestStatus, \' \', \'_\')) NOT IN (:...closedStatuses)', {
        closedStatuses: ['not_interested', 'sale_closed', 'converted'],
      });

    if (assignedTo) {
      query.andWhere('enquiry.assignedTo = :assignedTo', { assignedTo });
    }

    const data = await query
      .orderBy('enquiry.nextFollowupDate', 'ASC')
      .getMany();

    return {
      message: "Today's followups fetched successfully",
      data,
      totalRecords: data.length,
    };
  }

  async getAllPendingFollowups(enterpriseId: number, assignedTo?: number) {
    const query = this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.customer', 'customer')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'assignedEmployee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.nextFollowupDate IS NOT NULL')
      .andWhere('enquiry.convertedCustomerId IS NULL')
      .andWhere('LOWER(REPLACE(enquiry.interestStatus, \' \', \'_\')) NOT IN (:...closedStatuses)', {
        closedStatuses: ['not_interested', 'sale_closed', 'converted'],
      });

    if (assignedTo) {
      query.andWhere('enquiry.assignedTo = :assignedTo', { assignedTo });
    }

    const data = await query
      .orderBy('enquiry.nextFollowupDate', 'ASC')
      .getMany();

    return {
      message: 'Pending followups fetched successfully',
      data,
      totalRecords: data.length,
    };
  }

  async getOverdueFollowups(enterpriseId: number, assignedTo?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.customer', 'customer')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'assignedEmployee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.nextFollowupDate < :today', { today })
      .andWhere('enquiry.convertedCustomerId IS NULL')
      .andWhere('LOWER(REPLACE(enquiry.interestStatus, \' \', \'_\')) NOT IN (:...closedStatuses)', {
        closedStatuses: ['not_interested', 'sale_closed', 'converted'],
      });

    if (assignedTo) {
      query.andWhere('enquiry.assignedTo = :assignedTo', { assignedTo });
    }

    const data = await query
      .orderBy('enquiry.nextFollowupDate', 'ASC')
      .getMany();

    return {
      message: 'Overdue followups fetched successfully',
      data,
      totalRecords: data.length,
    };
  }

  async getProspects(enterpriseId: number, page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.customer', 'customer')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'assignedEmployee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.interestStatus IN (:...prospectStatuses)', {
        prospectStatuses: ['hot', 'warm', 'Prospect', 'Quotation Sent'],
      })
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('enquiry.modifiedDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Prospects fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async getPipelineStats(enterpriseId: number) {
    const stats = await this.enquiryRepository
      .createQueryBuilder('enquiry')
      .select('enquiry.interestStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(enquiry.expectedValue)', 'totalValue')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy('enquiry.interestStatus')
      .getRawMany();

    return {
      message: 'Pipeline stats fetched successfully',
      data: stats,
    };
  }

  async updateFollowupOutcome(
    enquiryId: number,
    enterpriseId: number,
    dto: FollowupOutcomeDto,
    userId?: number,
  ) {
    // Validate: follow_up requires nextFollowupDate
    if (dto.outcomeStatus === 'follow_up' && !dto.nextFollowupDate) {
      throw new BadRequestException('Next follow-up date is required when status is follow_up');
    }

    const enquiry = await this.enquiryRepository.findOne({
      where: { id: enquiryId, enterpriseId },
    });
    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    if (enquiry.convertedCustomerId) {
      throw new BadRequestException('This enquiry has already been converted. No further updates allowed.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Log this interaction as a completed followup record
      const completedFollowup = queryRunner.manager.create(Followup, {
        enquiryId,
        enterpriseId,
        followupType: 'Call',
        followupDate: new Date(),
        interestStatus: dto.outcomeStatus,
        notes: dto.remarks || null,
        createdBy: userId,
      } as any);
      await queryRunner.manager.save(Followup, completedFollowup);

      switch (dto.outcomeStatus) {
        case 'sale_closed': {
          // Mark enquiry as sale closed — customer is only created when a quotation is accepted
          await queryRunner.query(
            `UPDATE enquiries SET interest_status = $1, next_followup_date = NULL WHERE id = $2`,
            ['sale_closed', enquiry.id],
          );
          break;
        }

        case 'not_interested': {
          // Close enquiry — use raw query to guarantee NULL is set
          await queryRunner.query(
            `UPDATE enquiries SET interest_status = $1, next_followup_date = NULL WHERE id = $2`,
            ['not_interested', enquiry.id],
          );
          break;
        }

        case 'follow_up': {
          // Create next followup record
          const nextFollowup = queryRunner.manager.create(Followup, {
            enquiryId: enquiry.id,
            enterpriseId,
            followupType: 'Call',
            followupDate: new Date(dto.nextFollowupDate!),
            interestStatus: 'follow_up',
            notes: null,
            createdBy: userId,
          } as any);
          await queryRunner.manager.save(Followup, nextFollowup);

          // Update enquiry with new follow-up date
          await queryRunner.manager.update(Enquiry, enquiry.id, {
            interestStatus: 'follow_up',
            nextFollowupDate: new Date(dto.nextFollowupDate!),
          });
          break;
        }

        case 'not_available': {
          if (dto.nextFollowupDate) {
            // Schedule next followup
            const nextFollowup = queryRunner.manager.create(Followup, {
              enquiryId: enquiry.id,
              enterpriseId,
              followupType: 'Call',
              followupDate: new Date(dto.nextFollowupDate),
              interestStatus: 'follow_up',
              notes: null,
              createdBy: userId,
            } as any);
            await queryRunner.manager.save(Followup, nextFollowup);

            await queryRunner.manager.update(Enquiry, enquiry.id, {
              interestStatus: 'not_available',
              nextFollowupDate: new Date(dto.nextFollowupDate),
            });
          } else {
            // No new date — clear nextFollowupDate so it drops off follow-up lists
            await queryRunner.query(
              `UPDATE enquiries SET interest_status = $1, next_followup_date = NULL WHERE id = $2`,
              ['not_available', enquiry.id],
            );
          }
          break;
        }
      }

      await queryRunner.commitTransaction();

      this.auditLogsService.log({
        enterpriseId,
        userId: userId,
        userType: undefined,
        userName: undefined,
        entityType: 'enquiry',
        entityId: enquiryId,
        action: 'status_change',
        description: `Enquiry outcome updated to "${dto.outcomeStatus}"`,
        newValues: { outcomeStatus: dto.outcomeStatus },
      }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

      return {
        message:
          dto.outcomeStatus === 'sale_closed'
            ? 'Sale closed successfully'
            : dto.outcomeStatus === 'not_interested'
            ? 'Enquiry marked as not interested'
            : dto.outcomeStatus === 'follow_up'
            ? 'Follow-up rescheduled successfully'
            : 'Follow-up updated successfully',
        data: {
          outcomeStatus: dto.outcomeStatus,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getQuotationsByEnquiry(enquiryId: number, enterpriseId: number) {
    const enquiry = await this.enquiryRepository.findOne({
      where: { id: enquiryId, enterpriseId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    const quotations = await this.quotationRepository.find({
      where: { enquiryId, enterpriseId },
      order: { createdDate: 'DESC' },
    });

    return {
      message: 'Quotations fetched successfully',
      data: quotations,
    };
  }

  async checkMobile(mobile: string, enterpriseId: number) {
    const existing = await this.enquiryRepository.findOne({
      where: { mobile, enterpriseId },
      select: ['id', 'customerName'],
    });
    if (existing) {
      return { exists: true, customerName: existing.customerName };
    }
    return { exists: false };
  }

  async convertToCustomer(enquiryId: number, enterpriseId: number) {
    const enquiry = await this.enquiryRepository.findOne({
      where: { id: enquiryId, enterpriseId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    if (enquiry.convertedCustomerId) {
      throw new BadRequestException('This enquiry has already been converted to a customer');
    }

    // Check if customer with same mobile already exists
    let customer: Customer | null = null;
    if (enquiry.mobile) {
      customer = await this.customerRepository.findOne({
        where: { mobile: enquiry.mobile, enterpriseId },
      });
    }

    if (customer) {
      // Link existing customer instead of creating duplicate
      if (!customer.sourceEnquiryId) {
        customer.sourceEnquiryId = enquiry.id;
        await this.customerRepository.save(customer);
      }
    } else {
      // Generate customer number
      const count = await this.customerRepository.count({ where: { enterpriseId } });
      const customerNumber = `CUS-${String(count + 1).padStart(6, '0')}`;

      customer = this.customerRepository.create({
        enterpriseId,
        customerName: enquiry.customerName,
        mobile: enquiry.mobile,
        email: enquiry.email,
        businessName: enquiry.businessName,
        address: enquiry.address,
        city: enquiry.city,
        state: enquiry.state,
        pincode: enquiry.pincode,
        sourceEnquiryId: enquiry.id,
        customerNumber,
        status: 'active',
      });

      const savedResult = await this.customerRepository.save(customer);
      customer = Array.isArray(savedResult) ? savedResult[0] : savedResult;
    }

    // Update enquiry
    enquiry.interestStatus = 'Converted';
    enquiry.convertedCustomerId = customer!.id;
    await this.enquiryRepository.save(enquiry);

    return {
      message: 'Enquiry converted to customer successfully',
      data: {
        enquiry,
        customer,
      },
    };
  }
}

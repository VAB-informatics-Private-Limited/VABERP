import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JobCard } from './entities/job-card.entity';
import { JobCardProgress } from './entities/job-card-progress.entity';
import { JobCardStageHistory } from './entities/job-card-stage-history.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ProcessTemplate } from './entities/process-template.entity';
import { Bom } from './entities/bom.entity';
import { BomItem } from './entities/bom-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLedger } from '../inventory/entities/inventory-ledger.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItem } from '../sales-orders/entities/sales-order-item.entity';
import { StageMaster } from '../stage-masters/entities/stage-master.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { CreateJobCardDto, UpdateStageDto, CreateProcessTemplateDto, CreateBomDto } from './dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';

// Allowed status transitions — strict enforcement
// Stock verification is handled by Inventory module, not Manufacturing
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_process'],
  in_process: ['partially_completed', 'completed_production'],
  partially_completed: ['in_process', 'completed_production'],
  completed_production: ['ready_for_approval'],
  ready_for_approval: ['approved_for_dispatch', 'in_process'],
  approved_for_dispatch: ['dispatched'],
  dispatched: [],
};

// Helper: derive job card status from stage position (first, last, second-to-last, or middle)
function deriveStatusFromStagePosition(_stageIndex: number, _totalStages: number): string {
  // Stages track production progress only.
  // The dispatch workflow (ready_for_approval → approved_for_dispatch → dispatched)
  // is handled separately via the dispatch actions.
  return 'in_process';
}

@Injectable()
export class ManufacturingService {
  constructor(
    @InjectRepository(JobCard)
    private jobCardRepository: Repository<JobCard>,
    @InjectRepository(JobCardProgress)
    private progressRepository: Repository<JobCardProgress>,
    @InjectRepository(JobCardStageHistory)
    private stageHistoryRepository: Repository<JobCardStageHistory>,
    @InjectRepository(ProcessStage)
    private stageRepository: Repository<ProcessStage>,
    @InjectRepository(ProcessTemplate)
    private templateRepository: Repository<ProcessTemplate>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryLedger)
    private ledgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Bom)
    private bomRepository: Repository<Bom>,
    @InjectRepository(BomItem)
    private bomItemRepository: Repository<BomItem>,
    @InjectRepository(SalesOrder)
    private salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(StageMaster)
    private stageMasterRepository: Repository<StageMaster>,
    @InjectRepository(MaterialRequest)
    private materialRequestRepository: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private materialRequestItemRepository: Repository<MaterialRequestItem>,
    @InjectRepository(RawMaterial)
    private rawMaterialRepository: Repository<RawMaterial>,
    @InjectRepository(RawMaterialLedger)
    private rawMaterialLedgerRepository: Repository<RawMaterialLedger>,
    private auditLogsService: AuditLogsService,
    private emailService: EmailService,
    private dataSource: DataSource,
  ) {}

  // ========== Job Cards ==========

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    assignedTo?: number,
    purchaseOrderId?: number,
    currentEmployeeId?: number,
    myTeam = false,
  ) {
    const query = this.jobCardRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.product', 'product')
      .leftJoinAndSelect('job.assignedEmployee', 'assignedEmployee')
      .leftJoin('job.quotation', 'quotation')
      .addSelect(['quotation.id', 'quotation.quotationNumber'])
      .leftJoinAndSelect('job.customer', 'customer')
      .leftJoinAndSelect('job.purchaseOrder', 'purchaseOrder')
      .where('job.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('job.parentJobCardId IS NULL');

    if (search) {
      query.andWhere(
        '(job.jobNumber ILIKE :search OR job.jobName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    if (myTeam && currentEmployeeId) {
      query.andWhere(
        '(job.assignedTo = :uid OR job.assignedTo IN (SELECT id FROM employees WHERE reporting_to = :uid AND enterprise_id = :enterpriseId))',
        { uid: currentEmployeeId, enterpriseId },
      );
    } else if (assignedTo) {
      query.andWhere('job.assignedTo = :assignedTo', { assignedTo });
    }

    if (purchaseOrderId) {
      query.andWhere('job.purchaseOrderId = :purchaseOrderId', { purchaseOrderId });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('job.priority', 'ASC')
      .addOrderBy('job.createdDate', 'DESC')
      .getManyAndCount();

    // Attach stage progress to each job card
    const dataWithStages = await Promise.all(
      data.map(async (jc) => {
        const stageProgress = await this.stageRepository.find({
          where: { jobCardId: jc.id },
          order: { sortOrder: 'ASC', id: 'ASC' },
        });
        return { ...jc, stageProgress };
      }),
    );

    return {
      message: 'Job cards fetched successfully',
      data: dataWithStages,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const jobCard = await this.jobCardRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.product', 'product')
      .leftJoinAndSelect('job.assignedEmployee', 'assignedEmployee')
      .leftJoin('job.quotation', 'quotation')
      .addSelect(['quotation.id', 'quotation.quotationNumber'])
      .leftJoinAndSelect('job.customer', 'customer')
      .where('job.id = :id', { id })
      .andWhere('job.enterpriseId = :enterpriseId', { enterpriseId })
      .getOne();

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    // Compute material status from MR items (if linked to a PO with MR)
    const computedMaterialStatus = await this.computeMaterialStatus(jobCard);
    if (computedMaterialStatus !== jobCard.materialStatus) {
      await this.jobCardRepository.update(id, { materialStatus: computedMaterialStatus });
      jobCard.materialStatus = computedMaterialStatus;
    }

    // Fetch stage progress (dynamic from stage_masters)
    let stageProgress = await this.stageRepository.find({
      where: { jobCardId: id },
      relations: ['assignedEmployee', 'completedByEmployee'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    // Auto-initialize stages if none exist (lazy migration for existing job cards)
    if (stageProgress.length === 0) {
      stageProgress = await this.initializeStagesForJobCard(jobCard);
    }

    // Fetch stage history
    const stageHistory = await this.stageHistoryRepository.find({
      where: { jobCardId: id },
      relations: ['movedByEmployee'],
      order: { createdDate: 'ASC' },
    });

    // Fetch child job cards (one per completed stage)
    const childJobCards = await this.jobCardRepository.find({
      where: { parentJobCardId: id, enterpriseId },
      relations: ['product'],
      order: { stageNumber: 'ASC' },
    });

    // Find linked material request (direct or via PO)
    let linkedMR = await this.materialRequestRepository.findOne({
      where: { jobCardId: id },
    });
    if (!linkedMR && jobCard.purchaseOrderId) {
      const salesOrder = await this.salesOrderRepository.findOne({
        where: { id: jobCard.purchaseOrderId, enterpriseId },
      });
      if (salesOrder?.materialRequestId) {
        linkedMR = await this.materialRequestRepository.findOne({
          where: { id: salesOrder.materialRequestId, enterpriseId },
        });
      }
    }

    return {
      message: 'Job card fetched successfully',
      data: {
        ...jobCard,
        stageProgress,
        stages: stageProgress,
        stageHistory,
        childJobCards,
        materialRequestId: linkedMR?.id || null,
        materialRequestNumber: linkedMR?.requestNumber || null,
        materialRequestStatus: linkedMR?.status || null,
      },
    };
  }

  async create(enterpriseId: number, createDto: CreateJobCardDto, userId?: number) {
    // Generate job number
    const count = await this.jobCardRepository.count({ where: { enterpriseId } });
    const jobNumber = `JOB-${String(count + 1).padStart(6, '0')}`;

    const hasMaterials = createDto.materials && createDto.materials.length > 0;

    const jobCard = this.jobCardRepository.create({
      enterpriseId,
      jobNumber,
      jobName: createDto.jobName,
      description: createDto.description,
      productId: createDto.productId,
      quotationId: createDto.quotationId,
      purchaseOrderId: createDto.purchaseOrderId,
      bomId: createDto.bomId,
      stageMasterId: createDto.stageMasterId,
      customerId: createDto.customerId,
      customerName: createDto.customerName,
      assignedTo: createDto.assignedTo,
      quantity: createDto.quantity,
      unitOfMeasure: createDto.unitOfMeasure,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      expectedCompletion: createDto.expectedCompletion ? new Date(createDto.expectedCompletion) : null,
      priority: createDto.priority || 2,
      notes: createDto.notes,
      status: 'pending',
      productionStage: hasMaterials ? 'PENDING_APPROVAL' : 'MATERIAL_READY',
      materialStatus: hasMaterials ? 'PENDING_INVENTORY' : 'FULLY_ISSUED',
      quantityCompleted: 0,
      dispatchOnHold: false,
    });

    // Save materials to selectedMaterials JSON field (NOT auto-creating MR)
    if (hasMaterials) {
      (jobCard as any).selectedMaterials = createDto.materials;
    }

    const savedResult = await this.jobCardRepository.save(jobCard);
    const savedJobCard = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // Auto-create stage progress from active stage masters
    await this.initializeStagesForJobCard(savedJobCard);

    return this.findOne(savedJobCard.id, enterpriseId);
  }

  /**
   * Send a job card for inventory approval — reads selectedMaterials from the job card
   * and creates a material request for the inventory team.
   */
  async sendJobCardForApproval(jobCardId: number, enterpriseId: number, userId?: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobCardId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    // Check if MR already exists for this job card
    const existingMR = await this.materialRequestRepository.findOne({
      where: { jobCardId: jobCard.id },
    });
    if (existingMR) {
      throw new BadRequestException('A material request already exists for this job card');
    }

    const materials = jobCard.selectedMaterials;
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new BadRequestException('No materials found on this job card to send for approval');
    }

    // Create the material request
    await this.createMaterialRequestForJobCard(jobCard, materials, enterpriseId, userId);

    // Update job card status
    await this.jobCardRepository.update(jobCardId, {
      productionStage: 'WAITING_FOR_MATERIALS',
      materialStatus: 'PENDING_INVENTORY',
    });

    return this.findOne(jobCardId, enterpriseId);
  }

  /**
   * Create a material request from job card materials.
   * For materials not found in inventory, creates new raw material entries.
   */
  async createMaterialRequestForJobCard(
    jobCard: JobCard,
    materials: Array<{ rawMaterialId?: number; itemName: string; requiredQuantity: number; unitOfMeasure?: string }>,
    enterpriseId: number,
    userId?: number,
  ) {
    // Generate MR number
    const mrCount = await this.materialRequestRepository.count({ where: { enterpriseId } });
    const requestNumber = `MR-${String(mrCount + 1).padStart(6, '0')}`;

    const materialRequest = this.materialRequestRepository.create({
      enterpriseId,
      requestNumber,
      requestDate: new Date(),
      jobCardId: jobCard.id,
      requestedBy: userId,
      purpose: `Material request for Job Card: ${jobCard.jobName} (${jobCard.jobNumber})`,
      status: 'pending',
      notes: `Auto-created from job card. Manufacturing cannot start until materials are approved and issued.`,
    });

    const savedMR = await this.materialRequestRepository.save(materialRequest);
    const newMaterialNames: string[] = [];

    for (const mat of materials) {
      let rawMaterialId = mat.rawMaterialId;
      let availableStock = 0;

      if (rawMaterialId) {
        // Existing raw material — fetch current stock
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: rawMaterialId, enterpriseId },
        });
        availableStock = rawMat ? Number(rawMat.availableStock) : 0;
      } else {
        // New material not in inventory — create it with 0 stock
        const rmCount = await this.rawMaterialRepository.count({ where: { enterpriseId } });
        const materialCode = `RM-${String(rmCount + 1).padStart(3, '0')}`;

        const newRawMaterial = this.rawMaterialRepository.create({
          enterpriseId,
          materialCode,
          materialName: mat.itemName,
          unitOfMeasure: mat.unitOfMeasure || 'pcs',
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          minStockLevel: 0,
          status: 'active',
        });
        const savedRM = await this.rawMaterialRepository.save(newRawMaterial);
        rawMaterialId = savedRM.id;
        availableStock = 0;
        newMaterialNames.push(mat.itemName);
      }

      const mrItem = this.materialRequestItemRepository.create({
        materialRequestId: savedMR.id,
        rawMaterialId,
        itemName: mat.itemName,
        quantityRequested: Number(mat.requiredQuantity),
        availableStock,
        unitOfMeasure: mat.unitOfMeasure,
        status: 'pending',
      });
      await this.materialRequestItemRepository.save(mrItem);
    }

    // Send email notification to inventory team
    try {
      if (this.emailService.isConfigured()) {
        const itemLines = materials
          .map((m) => `• ${m.itemName}: ${m.requiredQuantity} ${m.unitOfMeasure || 'units'}${!m.rawMaterialId ? ' ⚠️ NEW — Not in inventory' : ''}`)
          .join('\n');

        let subject = `📋 New Material Request — ${requestNumber} for ${jobCard.jobName}`;
        let body = `A new material request has been created for Job Card: ${jobCard.jobName} (${jobCard.jobNumber}).\n\nRequired Materials:\n${itemLines}\n\nManufacturing cannot start until materials are approved and issued.\nPlease review and approve in the Material Requests section.`;

        if (newMaterialNames.length > 0) {
          subject += ' ⚠️ New Materials';
          body += `\n\n⚠️ NEW MATERIALS ADDED TO INVENTORY:\nThe following materials were not found in inventory and have been added with 0 stock. Please purchase/procure them:\n${newMaterialNames.map(n => `• ${n}`).join('\n')}`;
        }

        await this.emailService.sendEmail({
          to: 'admin@vabenterprise.com',
          subject,
          body,
        });
      }
    } catch (error) {
      console.error('Failed to send material request notification:', error);
    }
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateJobCardDto>) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    const updateData: any = { ...updateDto };
    delete updateData.stages;

    if (updateDto.startDate) {
      updateData.startDate = new Date(updateDto.startDate);
    }
    if (updateDto.expectedCompletion) {
      updateData.expectedCompletion = new Date(updateDto.expectedCompletion);
    }

    await this.jobCardRepository.update(id, updateData);

    return this.findOne(id, enterpriseId);
  }

  async updateStatus(id: number, enterpriseId: number, status: string, userId?: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    // Block if parent PO is on hold
    if (jobCard.purchaseOrderId) {
      const parentPO = await this.salesOrderRepository.findOne({
        where: { id: jobCard.purchaseOrderId },
      });
      if (parentPO && parentPO.status === 'on_hold') {
        throw new BadRequestException(
          'Cannot change job card status — the Purchase Order is currently ON HOLD.' +
          (parentPO.holdReason ? ` Reason: ${parentPO.holdReason}` : ''),
        );
      }
    }

    // Enforce strict transitions
    const allowed = ALLOWED_TRANSITIONS[jobCard.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from '${jobCard.status}' to '${status}'. Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }

    // When starting production (pending → in_process), verify all materials are fully issued
    if (jobCard.status === 'pending' && status === 'in_process') {
      // Check material requests linked directly to this job card
      const directMR = await this.materialRequestRepository.findOne({
        where: { jobCardId: jobCard.id, enterpriseId },
      });

      if (directMR) {
        const mrItems = await this.materialRequestItemRepository.find({
          where: { materialRequestId: directMR.id },
        });

        const unissuedItems = mrItems.filter(
          (item) =>
            item.status !== 'rejected' &&
            Number(item.quantityIssued) < Number(item.quantityRequested),
        );

        if (unissuedItems.length > 0) {
          const itemNames = unissuedItems.map((i) => i.itemName).join(', ');
          throw new BadRequestException(
            `Cannot start production. Materials not fully issued by Inventory: ${itemNames}. Production requires ALL materials to be approved and issued first.`,
          );
        }
      }

      // Also check via sales order (PO flow)
      if (!directMR && jobCard.purchaseOrderId) {
        const salesOrder = await this.salesOrderRepository.findOne({
          where: { id: jobCard.purchaseOrderId, enterpriseId },
        });

        if (salesOrder?.materialRequestId) {
          const mrItems = await this.materialRequestItemRepository.find({
            where: { materialRequestId: salesOrder.materialRequestId },
          });

          const unissuedItems = mrItems.filter(
            (item) =>
              item.status !== 'rejected' &&
              Number(item.quantityIssued) < Number(item.quantityRequested),
          );

          if (unissuedItems.length > 0) {
            const itemNames = unissuedItems.map((i) => i.itemName).join(', ');
            throw new BadRequestException(
              `Cannot start production. Materials not fully issued by Inventory: ${itemNames}. Production requires ALL materials to be issued.`,
            );
          }
        }
      }
    }

    const updateData: any = { status };

    if (status === 'in_process' && !jobCard.startDate) {
      updateData.startDate = new Date();
    }

    if (status === 'completed_production') {
      updateData.actualCompletion = new Date();
      // Increase finished goods inventory
      await this.addFinishedGoodsInventory(jobCard, userId);
    }

    const oldStatus = jobCard.status;
    await this.jobCardRepository.update(id, updateData);

    // Eagerly initialize stages the moment production starts — eliminates race conditions
    // where GET /stages runs concurrently with findOne's lazy initialization
    if (status === 'in_process') {
      const existingStagesCount = await this.stageRepository.count({ where: { jobCardId: id } });
      if (existingStagesCount === 0) {
        await this.initializeStagesForJobCard(jobCard);
      }
    }

    // Audit log
    await this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'JobCard',
      entityId: id,
      action: 'STATUS_CHANGE',
      description: `Status changed from '${oldStatus}' to '${status}'`,
      oldValues: { status: oldStatus },
      newValues: { status },
    });

    return this.findOne(id, enterpriseId);
  }

  // ========== Production Estimate ==========

  async setEstimate(jobId: number, estimatedProductionDays: number, enterpriseId: number, userId?: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    if (!['pending', 'in_process', 'partially_completed'].includes(jobCard.status)) {
      throw new BadRequestException('Production estimate can only be set before or during production');
    }

    await this.jobCardRepository.update(jobId, { estimatedProductionDays });

    await this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'JobCard',
      entityId: jobId,
      action: 'ESTIMATE_SET',
      description: `Estimated production days set to ${estimatedProductionDays}`,
      newValues: { estimatedProductionDays },
    });

    return this.findOne(jobId, enterpriseId);
  }

  // ========== Stock Verification (DEPRECATED) ==========
  // Stock validation is now handled exclusively by the Inventory module.
  // This method is kept for backward compatibility — material issuance is checked in updateStatus.

  async verifyStock(
    jobId: number,
    _dto: { hasStock: boolean; shortageNotes?: string },
    enterpriseId: number,
    userId?: number,
  ) {
    // Material issuance check is enforced in updateStatus
    return this.updateStatus(jobId, enterpriseId, 'in_process', userId);
  }

  // ========== Progress Tracking ==========

  async addProgressUpdate(
    jobId: number,
    dto: { progressDate: string; quantityCompleted: number; remarks?: string },
    enterpriseId: number,
    userId?: number,
  ) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    if (!['in_process', 'partially_completed'].includes(jobCard.status)) {
      throw new BadRequestException('Progress can only be added when job is in_process or partially_completed');
    }

    // Create progress entry
    const progressEntry = this.progressRepository.create({
      enterpriseId,
      jobCardId: jobId,
      progressDate: dto.progressDate,
      quantityCompleted: dto.quantityCompleted,
      remarks: dto.remarks,
      updatedBy: userId,
    });
    await this.progressRepository.save(progressEntry);

    // Accumulate total quantity completed
    const totalCompleted = Number(jobCard.quantityCompleted) + Number(dto.quantityCompleted);
    const totalQty = Number(jobCard.quantity);

    const updateData: any = { quantityCompleted: totalCompleted };

    // Auto-transition based on completion
    const oldStatus = jobCard.status;
    if (totalCompleted >= totalQty) {
      // 100% complete → auto send for approval for dispatch
      updateData.status = 'ready_for_approval';
      updateData.actualCompletion = new Date();
      // Increase finished goods inventory
      await this.addFinishedGoodsInventory(
        { ...jobCard, quantityCompleted: totalCompleted } as JobCard,
        userId,
      );
    } else if (jobCard.status === 'in_process') {
      updateData.status = 'partially_completed';
    }

    await this.jobCardRepository.update(jobId, updateData);

    if (updateData.status && updateData.status !== oldStatus) {
      await this.auditLogsService.log({
        enterpriseId,
        userId,
        entityType: 'JobCard',
        entityId: jobId,
        action: 'PROGRESS_UPDATE',
        description: `Progress: ${dto.quantityCompleted} units. Total: ${totalCompleted}/${totalQty}. Status → ${updateData.status}`,
        oldValues: { status: oldStatus, quantityCompleted: jobCard.quantityCompleted },
        newValues: { status: updateData.status, quantityCompleted: totalCompleted },
      });
    }

    return this.findOne(jobId, enterpriseId);
  }

  async getProgressHistory(jobId: number, enterpriseId: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    const progress = await this.progressRepository.find({
      where: { jobCardId: jobId, enterpriseId },
      relations: ['employee'],
      order: { progressDate: 'DESC', createdDate: 'DESC' },
    });

    return {
      message: 'Progress history fetched successfully',
      data: progress.map((p) => ({
        id: p.id,
        progressDate: p.progressDate,
        quantityCompleted: p.quantityCompleted,
        remarks: p.remarks,
        updatedBy: p.updatedBy,
        updatedByName: p.employee
          ? `${p.employee.firstName || ''} ${p.employee.lastName || ''}`.trim()
          : undefined,
        createdDate: p.createdDate,
      })),
    };
  }

  // ========== Dispatch Actions ==========

  async dispatchAction(
    jobId: number,
    action: 'approve' | 'dispatch' | 'hold' | 'unhold' | 'request_modification',
    enterpriseId: number,
    userId?: number,
    remarks?: string,
    dispatchDate?: string,
  ) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    const oldStatus = jobCard.status;
    const updateData: any = {};

    // Accept legacy statuses: ready_for_dispatch and completed_production map to the new flow
    const approvalStatuses = ['ready_for_approval', 'ready_for_dispatch', 'completed_production'];

    switch (action) {
      case 'approve':
        // Approve for dispatch (from ready_for_approval/ready_for_dispatch/completed_production → approved_for_dispatch)
        if (!approvalStatuses.includes(jobCard.status)) {
          throw new BadRequestException('Job card must be in ready_for_approval status to approve for dispatch');
        }
        updateData.status = 'approved_for_dispatch';
        updateData.productionStage = 'APPROVED_FOR_DISPATCH';
        updateData.dispatchOnHold = false;
        break;

      case 'dispatch':
        // Actually dispatch (from approved_for_dispatch → dispatched)
        if (jobCard.status !== 'approved_for_dispatch') {
          throw new BadRequestException('Job card must be approved_for_dispatch before it can be dispatched');
        }
        updateData.status = 'dispatched';
        updateData.productionStage = 'DISPATCHED';
        updateData.dispatchOnHold = false;
        if (remarks) updateData.notes = remarks;
        if (dispatchDate) {
          updateData.actualCompletion = new Date(dispatchDate);
        } else {
          updateData.actualCompletion = new Date();
        }
        break;

      case 'hold':
        if (!approvalStatuses.includes(jobCard.status) && jobCard.status !== 'approved_for_dispatch') {
          throw new BadRequestException('Job card must be in ready_for_approval or approved_for_dispatch status to hold');
        }
        updateData.dispatchOnHold = true;
        break;

      case 'unhold':
        updateData.dispatchOnHold = false;
        break;

      case 'request_modification':
        if (!approvalStatuses.includes(jobCard.status)) {
          throw new BadRequestException('Job card must be in ready_for_approval status to request modification');
        }
        updateData.status = 'in_process';
        updateData.dispatchOnHold = false;
        break;

      default:
        throw new BadRequestException('Invalid dispatch action');
    }

    await this.jobCardRepository.update(jobId, updateData);

    // When a job card is dispatched, check if ALL parent job cards for this PO are now dispatched
    // If so, update the Sales Order status to 'dispatched'
    if (action === 'dispatch' && jobCard.purchaseOrderId) {
      const allJobCardsForPO = await this.jobCardRepository
        .createQueryBuilder('jc')
        .where('jc.purchaseOrderId = :poId', { poId: jobCard.purchaseOrderId })
        .andWhere('jc.enterpriseId = :enterpriseId', { enterpriseId })
        .andWhere('jc.parentJobCardId IS NULL')
        .getMany();
      const allDispatched = allJobCardsForPO.every(
        jc => jc.id === jobId ? true : jc.status === 'dispatched',
      );
      if (allDispatched) {
        await this.salesOrderRepository.update(jobCard.purchaseOrderId, {
          status: 'dispatched',
        });
        await this.auditLogsService.log({
          enterpriseId,
          userId,
          entityType: 'SalesOrder',
          entityId: jobCard.purchaseOrderId,
          action: 'STATUS_UPDATE',
          description: 'All job cards dispatched — PO status updated to dispatched',
          oldValues: {},
          newValues: { status: 'dispatched' },
        });
      }
    }

    await this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'JobCard',
      entityId: jobId,
      action: `DISPATCH_${action.toUpperCase()}`,
      description: `Dispatch action '${action}' performed`,
      oldValues: { status: oldStatus, dispatchOnHold: jobCard.dispatchOnHold },
      newValues: updateData,
    });

    return this.findOne(jobId, enterpriseId);
  }

  // ========== Stage-Based Workflow (Dynamic from stage_masters) ==========

  /**
   * Initialize stage progress entries for a job card from the stage_masters table.
   * First stage gets status 'in_progress', the rest get 'pending'.
   */
  private async initializeStagesForJobCard(jobCard: JobCard): Promise<ProcessStage[]> {
    const activeStageMasters = await this.stageMasterRepository.find({
      where: { enterpriseId: jobCard.enterpriseId, isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    if (activeStageMasters.length === 0) return [];

    const stageEntities = activeStageMasters.map((sm, index) =>
      this.stageRepository.create({
        enterpriseId: jobCard.enterpriseId,
        jobCardId: jobCard.id,
        stageMasterId: sm.id,
        stageName: sm.stageName,
        description: sm.description,
        sortOrder: sm.sortOrder,
        status: index === 0 ? 'in_progress' : 'pending',
        startTime: index === 0 ? new Date() : undefined,
      }),
    );

    const saved = await this.stageRepository.save(stageEntities);

    // Set job card productionStage to first stage name
    await this.jobCardRepository.update(jobCard.id, {
      productionStage: activeStageMasters[0].stageName,
    });

    return saved;
  }

  /**
   * Complete the current active stage and activate the next one.
   * Enforces sequential order — cannot skip stages.
   */
  async completeCurrentStage(
    jobId: number,
    enterpriseId: number,
    userId?: number,
    notes?: string,
    completedDate?: string,
    description?: string,
  ) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobId, enterpriseId },
    });
    if (!jobCard) throw new NotFoundException('Job card not found');

    // Block stage progression if parent PO is on hold
    if (jobCard.purchaseOrderId) {
      const parentPO = await this.salesOrderRepository.findOne({
        where: { id: jobCard.purchaseOrderId },
      });
      if (parentPO && parentPO.status === 'on_hold') {
        throw new BadRequestException(
          'Cannot progress production — the Purchase Order is currently ON HOLD.' +
          (parentPO.holdReason ? ` Reason: ${parentPO.holdReason}` : ''),
        );
      }
    }

    // Get all stages for this job card
    let stageProgress = await this.stageRepository.find({
      where: { jobCardId: jobId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    // Auto-initialize if no stages
    if (stageProgress.length === 0) {
      stageProgress = await this.initializeStagesForJobCard(jobCard);
      if (stageProgress.length === 0) {
        throw new BadRequestException('No stages configured. Go to Settings > Stage Master to define stages.');
      }
    }

    // Find the current in_progress stage
    const currentStage = stageProgress.find(s => s.status === 'in_progress');
    if (!currentStage) {
      // Check if all completed
      const allCompleted = stageProgress.every(s => s.status === 'completed');
      if (allCompleted) {
        throw new BadRequestException('All stages are already completed');
      }
      // Find first pending and activate it
      const firstPending = stageProgress.find(s => s.status === 'pending');
      if (firstPending) {
        await this.stageRepository.update(firstPending.id, {
          status: 'in_progress',
          startTime: new Date(),
        });
        return this.findOne(jobId, enterpriseId);
      }
      throw new BadRequestException('No active stage to complete');
    }

    // Material check is already enforced when starting production (pending → in_process).
    // No need to re-check here — production is already underway.

    const now = new Date();
    const endTime = completedDate ? new Date(completedDate) : now;

    // Mark current stage as completed
    await this.stageRepository.update(currentStage.id, {
      status: 'completed',
      endTime,
      completedBy: userId,
      notes: notes || currentStage.notes,
      description: description !== undefined ? description : currentStage.description,
      actualHours: currentStage.startTime
        ? Number(((endTime.getTime() - new Date(currentStage.startTime).getTime()) / 3600000).toFixed(2))
        : undefined,
    });

    // Record in stage history
    await this.stageHistoryRepository.save(
      this.stageHistoryRepository.create({
        enterpriseId,
        jobCardId: jobId,
        fromStage: currentStage.stageName,
        toStage: currentStage.stageName,
        movedBy: userId,
        startedAt: currentStage.startTime || now,
        completedAt: endTime,
        notes: notes || `Stage "${currentStage.stageName}" completed`,
      }),
    );

    // Find and activate next stage
    const currentIdx = stageProgress.findIndex(s => s.id === currentStage.id);
    const nextStage = stageProgress[currentIdx + 1];
    const stageNumber = currentIdx + 1;

    // Create a child job card for the completed stage
    const childJobCard = this.jobCardRepository.create({
      enterpriseId,
      parentJobCardId: jobCard.id,
      stageNumber,
      jobNumber: `${jobCard.jobNumber}-${stageNumber}`,
      jobName: `${currentStage.stageName}`,
      description: description || currentStage.description || `${currentStage.stageName} stage completed`,
      productId: jobCard.productId,
      quotationId: jobCard.quotationId,
      purchaseOrderId: jobCard.purchaseOrderId,
      bomId: jobCard.bomId,
      customerId: jobCard.customerId,
      customerName: jobCard.customerName || undefined,
      assignedTo: jobCard.assignedTo,
      quantity: jobCard.quantity,
      unitOfMeasure: jobCard.unitOfMeasure,
      startDate: currentStage.startTime || now,
      actualCompletion: endTime,
      status: 'completed_production',
      priority: jobCard.priority,
      notes: notes || undefined,
      productionStage: currentStage.stageName,
      materialStatus: jobCard.materialStatus,
      quantityCompleted: jobCard.quantity,
      dispatchOnHold: false,
    } as any);
    await this.jobCardRepository.save(childJobCard);

    if (nextStage) {
      await this.stageRepository.update(nextStage.id, {
        status: 'in_progress',
        startTime: now,
      });

      // Update job card productionStage and status
      const newStatus = deriveStatusFromStagePosition(currentIdx + 1, stageProgress.length);
      await this.jobCardRepository.update(jobId, {
        productionStage: nextStage.stageName,
        status: newStatus,
      });

      // Auto-set start date on second stage (production starts)
      if (currentIdx === 0 && !jobCard.startDate) {
        await this.jobCardRepository.update(jobId, { startDate: now as any });
      }
    } else {
      // All stages done — mark job card as production complete
      // Dispatch workflow (ready_for_approval → approved → dispatched) proceeds separately
      await this.jobCardRepository.update(jobId, {
        productionStage: currentStage.stageName,
        status: 'completed_production',
        actualCompletion: now as any,
      });

      // Add finished goods to inventory
      await this.addFinishedGoodsInventory(jobCard, userId);
    }

    // Audit log
    await this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'JobCard',
      entityId: jobId,
      action: 'STAGE_COMPLETED',
      description: `Stage "${currentStage.stageName}" completed → Job Card ${jobCard.jobNumber}-${stageNumber} created${nextStage ? `. Next: "${nextStage.stageName}"` : '. All stages complete.'}`,
    });

    return this.findOne(jobId, enterpriseId);
  }

  /**
   * moveToNextStage — backward compatible alias for completeCurrentStage
   */
  async moveToNextStage(
    jobId: number,
    enterpriseId: number,
    userId?: number,
    notes?: string,
    completedDate?: string,
    description?: string,
  ) {
    return this.completeCurrentStage(jobId, enterpriseId, userId, notes, completedDate, description);
  }

  async getStageHistory(jobId: number, enterpriseId: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    const history = await this.stageHistoryRepository.find({
      where: { jobCardId: jobId },
      relations: ['movedByEmployee'],
      order: { createdDate: 'ASC' },
    });

    return {
      message: 'Stage history fetched successfully',
      data: history.map((h) => ({
        id: h.id,
        fromStage: h.fromStage,
        toStage: h.toStage,
        movedBy: h.movedBy,
        movedByName: h.movedByEmployee
          ? `${h.movedByEmployee.firstName || ''} ${h.movedByEmployee.lastName || ''}`.trim()
          : undefined,
        startedAt: h.startedAt,
        completedAt: h.completedAt,
        notes: h.notes,
        createdDate: h.createdDate,
      })),
    };
  }

  /**
   * Get stage progress for a job card (for PO/PR pages)
   */
  async getStageProgressForJobCards(jobCardIds: number[]) {
    if (jobCardIds.length === 0) return {};

    const allStages = await this.stageRepository.find({
      where: jobCardIds.map(id => ({ jobCardId: id })),
      relations: ['completedByEmployee'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const grouped: Record<number, typeof allStages> = {};
    for (const stage of allStages) {
      if (!grouped[stage.jobCardId]) grouped[stage.jobCardId] = [];
      grouped[stage.jobCardId].push(stage);
    }
    return grouped;
  }

  private async computeMaterialStatus(jobCard: JobCard): Promise<string> {
    // First check for a material request linked directly to this job card
    const directMR = await this.materialRequestRepository.findOne({
      where: { jobCardId: jobCard.id },
    });

    let mrItems: any[] = [];

    if (directMR) {
      mrItems = await this.materialRequestItemRepository.find({
        where: { materialRequestId: directMR.id },
      });
    } else if (jobCard.purchaseOrderId) {
      // Fallback: check via PO's material request
      const po = await this.salesOrderRepository.findOne({
        where: { id: jobCard.purchaseOrderId },
      });

      if (po?.materialRequestId) {
        mrItems = await this.materialRequestItemRepository.find({
          where: { materialRequestId: po.materialRequestId },
        });
      }
    }

    if (mrItems.length === 0) {
      return jobCard.materialStatus || 'PENDING_INVENTORY';
    }

    const hasRecheck = mrItems.some((mi) => mi.status === 'pending' || mi.status === 'rejected');
    if (hasRecheck) {
      return 'REQUESTED_RECHECK';
    }

    const allFullyIssued = mrItems.every(
      (mi) => Number(mi.quantityIssued) >= Number(mi.quantityRequested) && Number(mi.quantityRequested) > 0,
    );
    if (allFullyIssued) {
      return 'FULLY_ISSUED';
    }

    const someIssued = mrItems.some((mi) => Number(mi.quantityIssued) > 0);
    if (someIssued) {
      return 'PARTIALLY_ISSUED';
    }

    return 'PENDING_INVENTORY';
  }

  // ========== Private Helpers ==========

  private async addFinishedGoodsInventory(jobCard: JobCard, userId?: number) {
    if (!jobCard.productId) return;

    try {
      let inventory = await this.inventoryRepository.findOne({
        where: { productId: jobCard.productId, enterpriseId: jobCard.enterpriseId },
      });

      const quantityToAdd = Number(jobCard.quantity);
      const previousStock = inventory ? Number(inventory.currentStock) : 0;
      const newStock = previousStock + quantityToAdd;

      if (inventory) {
        await this.inventoryRepository.update(inventory.id, {
          currentStock: newStock,
          availableStock: newStock - Number(inventory.reservedStock || 0),
          lastRestockDate: new Date() as any,
        });
      } else {
        inventory = await this.inventoryRepository.save(
          this.inventoryRepository.create({
            enterpriseId: jobCard.enterpriseId,
            productId: jobCard.productId,
            currentStock: quantityToAdd,
            reservedStock: 0,
            availableStock: quantityToAdd,
          }),
        );
      }

      await this.ledgerRepository.save(
        this.ledgerRepository.create({
          enterpriseId: jobCard.enterpriseId,
          inventoryId: inventory.id,
          productId: jobCard.productId,
          transactionType: 'IN',
          quantity: quantityToAdd,
          previousStock,
          newStock,
          referenceType: 'MANUFACTURING',
          referenceId: jobCard.id,
          remarks: `Finished goods from Job Card ${jobCard.jobNumber}`,
          createdBy: userId,
        }),
      );
    } catch {
      // Inventory update failure should not block manufacturing workflow
    }
  }

  async delete(id: number, enterpriseId: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    // Delete related records first
    await this.stageHistoryRepository.delete({ jobCardId: id });
    await this.progressRepository.delete({ jobCardId: id });
    await this.stageRepository.delete({ jobCardId: id });
    await this.jobCardRepository.delete(id);

    return {
      message: 'Job card deleted successfully',
      data: null,
    };
  }

  // ========== Process Stages ==========

  async getStages(jobCardId: number, enterpriseId: number) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobCardId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    let stages = await this.stageRepository.find({
      where: { jobCardId },
      relations: ['assignedEmployee', 'completedByEmployee'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    // Auto-initialize if no stages and job card is in production — fallback for race conditions
    if (stages.length === 0 && jobCard.status === 'in_process') {
      const initialized = await this.initializeStagesForJobCard(jobCard);
      // Re-fetch with relations after initialization
      if (initialized.length > 0) {
        stages = await this.stageRepository.find({
          where: { jobCardId },
          relations: ['assignedEmployee', 'completedByEmployee'],
          order: { sortOrder: 'ASC', id: 'ASC' },
        });
      }
    }

    return {
      message: 'Stages fetched successfully',
      data: stages,
    };
  }

  async addStage(enterpriseId: number, jobCardId: number, stageData: any) {
    const jobCard = await this.jobCardRepository.findOne({
      where: { id: jobCardId, enterpriseId },
    });

    if (!jobCard) {
      throw new NotFoundException('Job card not found');
    }

    // Get max sort order
    const maxOrder = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.jobCardId = :jobCardId', { jobCardId })
      .select('MAX(stage.sortOrder)', 'max')
      .getRawOne();

    const stage = this.stageRepository.create({
      enterpriseId,
      jobCardId,
      stageName: stageData.stageName,
      description: stageData.description,
      estimatedHours: stageData.estimatedHours,
      assignedTo: stageData.assignedTo,
      sortOrder: (maxOrder?.max || 0) + 1,
      status: 'pending',
    });

    const saved = await this.stageRepository.save(stage);

    return {
      message: 'Stage added successfully',
      data: saved,
    };
  }

  async updateStage(stageId: number, enterpriseId: number, updateDto: UpdateStageDto) {
    const stage = await this.stageRepository.findOne({
      where: { id: stageId, enterpriseId },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    // If status change is requested, enforce sequential order
    if (updateDto.status && updateDto.status !== stage.status) {
      // Get all stages for this job card
      const allStages = await this.stageRepository.find({
        where: { jobCardId: stage.jobCardId },
        order: { sortOrder: 'ASC' },
      });

      if (updateDto.status === 'in_progress') {
        // All previous stages must be completed
        const previousStages = allStages.filter(s => s.sortOrder < stage.sortOrder);
        const allPrevCompleted = previousStages.every(s => s.status === 'completed');
        if (!allPrevCompleted) {
          throw new BadRequestException(
            `Cannot start "${stage.stageName}" — previous stages are not completed yet.`,
          );
        }
      } else if (updateDto.status === 'completed') {
        // Stage must be in_progress to be completed
        if (stage.status !== 'in_progress') {
          throw new BadRequestException(
            `Cannot complete "${stage.stageName}" — stage must be In Progress first. Current status: ${stage.status}`,
          );
        }
      } else if (updateDto.status === 'skipped') {
        throw new BadRequestException(
          'Skipping stages is not allowed. Stages must be completed in order.',
        );
      }
    }

    const updateData: any = { ...updateDto };

    if (updateDto.startTime) {
      updateData.startTime = new Date(updateDto.startTime);
    }
    if (updateDto.endTime) {
      updateData.endTime = new Date(updateDto.endTime);
    }

    if (updateDto.startTime && updateDto.endTime) {
      const start = new Date(updateDto.startTime);
      const end = new Date(updateDto.endTime);
      updateData.actualHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    await this.stageRepository.update(stageId, updateData);

    const updated = await this.stageRepository.findOne({
      where: { id: stageId },
      relations: ['assignedEmployee', 'completedByEmployee'],
    });

    return {
      message: 'Stage updated successfully',
      data: updated,
    };
  }

  async deleteStage(stageId: number, enterpriseId: number) {
    const stage = await this.stageRepository.findOne({
      where: { id: stageId, enterpriseId },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    await this.stageRepository.delete(stageId);

    return {
      message: 'Stage deleted successfully',
      data: null,
    };
  }

  // ========== Process Templates ==========

  async findAllTemplates(enterpriseId: number, productId?: number) {
    const query = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.product', 'product')
      .where('template.enterpriseId = :enterpriseId', { enterpriseId });

    if (productId) {
      query.andWhere('template.productId = :productId', { productId });
    }

    const data = await query
      .orderBy('template.templateName', 'ASC')
      .getMany();

    return {
      message: 'Process templates fetched successfully',
      data,
    };
  }

  async createTemplate(enterpriseId: number, createDto: CreateProcessTemplateDto) {
    const template = this.templateRepository.create({
      enterpriseId,
      productId: createDto.productId,
      templateName: createDto.templateName,
      description: createDto.description,
      stages: createDto.stages,
    });

    const saved = await this.templateRepository.save(template);

    return {
      message: 'Process template created successfully',
      data: saved,
    };
  }

  async updateTemplate(id: number, enterpriseId: number, updateDto: Partial<CreateProcessTemplateDto>) {
    const template = await this.templateRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!template) {
      throw new NotFoundException('Process template not found');
    }

    await this.templateRepository.update(id, updateDto);

    const updated = await this.templateRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    return {
      message: 'Process template updated successfully',
      data: updated,
    };
  }

  async deleteTemplate(id: number, enterpriseId: number) {
    const template = await this.templateRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!template) {
      throw new NotFoundException('Process template not found');
    }

    await this.templateRepository.delete(id);

    return {
      message: 'Process template deleted successfully',
      data: null,
    };
  }

  async createJobFromTemplate(enterpriseId: number, templateId: number, jobData: CreateJobCardDto) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, enterpriseId },
    });

    if (!template) {
      throw new NotFoundException('Process template not found');
    }

    const stages = template.stages?.map((stage, index) => ({
      stageName: stage.name,
      description: stage.description,
      estimatedHours: stage.estimatedHours,
      sortOrder: stage.sortOrder ?? index,
    })) || [];

    return this.create(enterpriseId, {
      ...jobData,
      stages,
    });
  }

  // ========== BOM Raw Materials Helper ==========

  async getRawMaterialsForBom(enterpriseId: number) {
    const materials = await this.rawMaterialRepository.find({
      where: { enterpriseId, status: 'active' },
      select: ['id', 'materialName', 'unitOfMeasure', 'availableStock', 'category'],
      order: { materialName: 'ASC' },
    });
    return { message: 'Raw materials fetched', data: materials };
  }

  // ========== Purchase Orders for Manufacturing ==========

  async getPurchaseOrdersForManufacturing(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ) {
    const query = this.salesOrderRepository
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.customer', 'customer')
      .where('so.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('so.sentToManufacturing = :sent', { sent: true });

    if (search) {
      query.andWhere(
        '(so.orderNumber ILIKE :search OR so.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('so.status = :status', { status });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [purchaseOrders, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('so.createdDate', 'DESC')
      .getManyAndCount();

    // For each PO, get items, BOM and job card counts
    const data = await Promise.all(
      purchaseOrders.map(async (po) => {
        const poItems = await this.salesOrderItemRepository.find({
          where: { salesOrderId: po.id },
          relations: ['product'],
          order: { sortOrder: 'ASC' },
        });
        const bomCount = await this.bomRepository.count({
          where: { purchaseOrderId: po.id, enterpriseId },
        });
        const jobCardCount = await this.jobCardRepository
          .createQueryBuilder('jc')
          .where('jc.purchaseOrderId = :poId', { poId: po.id })
          .andWhere('jc.enterpriseId = :enterpriseId', { enterpriseId })
          .andWhere('jc.parentJobCardId IS NULL')
          .getCount();
        const jobCards = await this.jobCardRepository
          .createQueryBuilder('jc')
          .select(['jc.id', 'jc.jobNumber', 'jc.status', 'jc.quantity', 'jc.quantityCompleted', 'jc.productId'])
          .where('jc.purchaseOrderId = :poId', { poId: po.id })
          .andWhere('jc.enterpriseId = :enterpriseId', { enterpriseId })
          .andWhere('jc.parentJobCardId IS NULL')
          .getMany();

        let manufacturingStatus = 'no_bom';
        if (bomCount > 0 && jobCardCount === 0) manufacturingStatus = 'bom_created';
        else if (jobCardCount > 0) {
          const allDone = jobCards.every((j) =>
            ['completed_production', 'ready_for_dispatch', 'dispatched'].includes(j.status),
          );
          manufacturingStatus = allDone ? 'completed' : 'in_progress';
        }

        return {
          ...po,
          items: poItems,
          bomCount,
          jobCardCount,
          jobCards,
          manufacturingStatus,
        };
      }),
    );

    return {
      message: 'Purchase orders for manufacturing fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async getPurchaseOrderById(id: number, enterpriseId: number) {
    const po = await this.salesOrderRepository
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.customer', 'customer')
      .where('so.id = :id', { id })
      .andWhere('so.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('so.sentToManufacturing = :sent', { sent: true })
      .getOne();

    if (!po) throw new NotFoundException('Purchase order not found');

    const poItems = await this.salesOrderItemRepository.find({
      where: { salesOrderId: po.id },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });
    const bomCount = await this.bomRepository.count({ where: { purchaseOrderId: po.id, enterpriseId } });
    const jobCardCount = await this.jobCardRepository
      .createQueryBuilder('jc')
      .where('jc.purchaseOrderId = :poId', { poId: po.id })
      .andWhere('jc.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('jc.parentJobCardId IS NULL')
      .getCount();
    const jobCards = await this.jobCardRepository
      .createQueryBuilder('jc')
      .select(['jc.id', 'jc.jobNumber', 'jc.status', 'jc.quantity', 'jc.quantityCompleted', 'jc.productId'])
      .where('jc.purchaseOrderId = :poId', { poId: po.id })
      .andWhere('jc.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('jc.parentJobCardId IS NULL')
      .getMany();

    let manufacturingStatus = 'no_bom';
    if (bomCount > 0 && jobCardCount === 0) manufacturingStatus = 'bom_created';
    else if (jobCardCount > 0) {
      const allDone = jobCards.every((j) =>
        ['completed_production', 'ready_for_dispatch', 'dispatched'].includes(j.status),
      );
      manufacturingStatus = allDone ? 'completed' : 'in_progress';
    }

    return {
      message: 'Purchase order fetched successfully',
      data: { ...po, items: poItems, bomCount, jobCardCount, jobCards, manufacturingStatus },
    };
  }

  // ========== Bill of Materials (BOM) ==========

  async createBom(enterpriseId: number, createDto: CreateBomDto) {
    const po = await this.salesOrderRepository.findOne({
      where: { id: createDto.purchaseOrderId, enterpriseId },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException('BOM requires raw material items. Add the raw materials needed to manufacture this product.');
    }

    // Fetch PO items separately
    const poItems = await this.salesOrderItemRepository.find({
      where: { salesOrderId: po.id },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });

    // Check if BOM already exists for this PO (including empty/orphaned ones)
    const existingBom = await this.bomRepository.findOne({
      where: { purchaseOrderId: po.id, enterpriseId },
    });
    if (existingBom) {
      // If orphaned (no items), delete and recreate
      const existingItems = await this.bomItemRepository.find({ where: { bomId: existingBom.id } });
      if (existingItems.length === 0) {
        await this.bomRepository.delete(existingBom.id);
      } else {
        throw new BadRequestException('BOM already exists for this purchase order');
      }
    }

    // Generate BOM number
    const count = await this.bomRepository.count({ where: { enterpriseId } });
    const bomNumber = `BOM-${String(count + 1).padStart(6, '0')}`;

    const bomQty = parseFloat(
      Math.min(
        Number(createDto.quantity || poItems.reduce((sum: number, i: SalesOrderItem) => sum + Number(i.quantity), 0)),
        99999999,
      ).toFixed(2),
    );

    // Pre-fetch all raw material stocks needed
    const rawMaterialIds = createDto.items.map((i) => i.rawMaterialId).filter(Boolean) as number[];
    const rawMaterials = rawMaterialIds.length
      ? await this.rawMaterialRepository.findByIds(rawMaterialIds)
      : [];
    const rawMatMap = new Map(rawMaterials.map((r) => [r.id, r]));

    const savedBomId = await this.dataSource.transaction(async (manager) => {
      const bom = manager.create(Bom, {
        enterpriseId,
        purchaseOrderId: po.id,
        productId: createDto.productId || poItems[0]?.productId,
        bomNumber,
        quantity: bomQty,
        status: 'pending',
        notes: createDto.notes,
      });

      const savedBom = await manager.save(Bom, bom);

      const bomItems: Partial<BomItem>[] = createDto.items!.map((item, index) => {
        const rawMat = item.rawMaterialId ? rawMatMap.get(item.rawMaterialId) : undefined;
        const availableQuantity = parseFloat(Math.min(Number(rawMat?.availableStock ?? 0), 9999999999999).toFixed(2));
        const requiredQuantity = parseFloat(Math.min(Number(item.requiredQuantity), 9999999999999).toFixed(2));

        return {
          bomId: savedBom.id,
          rawMaterialId: item.rawMaterialId,
          itemName: item.itemName,
          requiredQuantity,
          availableQuantity,
          unitOfMeasure: item.unitOfMeasure,
          status: availableQuantity >= requiredQuantity ? 'available' : 'shortage',
          notes: item.notes,
          sortOrder: item.sortOrder ?? index,
        };
      });

      await manager.save(BomItem, bomItems);

      return savedBom.id;
    });

    return this.getBomById(savedBomId, enterpriseId);
  }

  async getBomById(id: number, enterpriseId: number) {
    const bom = await this.bomRepository.findOne({
      where: { id, enterpriseId },
      relations: ['purchaseOrder', 'product', 'items', 'items.product', 'items.rawMaterial'],
    });

    if (!bom) {
      throw new NotFoundException('BOM not found');
    }

    // Get linked job cards
    const jobCards = await this.jobCardRepository.find({
      where: { bomId: id, enterpriseId },
      relations: ['stageMaster', 'assignedEmployee'],
      order: { createdDate: 'ASC' },
    });

    return {
      message: 'BOM fetched successfully',
      data: {
        ...bom,
        jobCards,
      },
    };
  }

  async getBomByPurchaseOrder(purchaseOrderId: number, enterpriseId: number) {
    const bom = await this.bomRepository.findOne({
      where: { purchaseOrderId, enterpriseId },
    });

    if (!bom) {
      return { message: 'No BOM found for this purchase order', data: null };
    }

    return this.getBomById(bom.id, enterpriseId);
  }

  // DEPRECATED: Stock checking is now handled by the Inventory module.
  // This method is kept for backward compatibility — returns BOM as-is.
  async checkBomStock(bomId: number, enterpriseId: number) {
    return this.getBomById(bomId, enterpriseId);
  }

  async createJobCardsFromBom(
    bomId: number,
    enterpriseId: number,
    jobCardsData: Array<{
      stageMasterId?: number;
      assignedTo?: number;
      quantity?: number;
      startDate?: string;
      expectedCompletion?: string;
      priority?: number;
      notes?: string;
    }>,
    customMaterials?: Array<{
      rawMaterialId?: number;
      itemName: string;
      requiredQuantity: number;
      unitOfMeasure?: string;
    }>,
  ) {
    const bom = await this.bomRepository.findOne({
      where: { id: bomId, enterpriseId },
      relations: ['purchaseOrder', 'product', 'items'],
    });

    if (!bom) {
      throw new NotFoundException('BOM not found');
    }

    // Check for existing job cards
    const existingJcCount = await this.jobCardRepository.count({
      where: { bomId: bom.id, enterpriseId },
    });
    if (existingJcCount > 0) {
      throw new BadRequestException('Job cards already exist for this BOM');
    }

    // Add custom materials to BOM as isCustom items
    if (customMaterials && customMaterials.length > 0) {
      const maxOrder = bom.items.length;
      for (let i = 0; i < customMaterials.length; i++) {
        const cm = customMaterials[i];
        let availableQuantity = 0;

        if (cm.rawMaterialId) {
          const rawMat = await this.rawMaterialRepository.findOne({
            where: { id: cm.rawMaterialId },
          });
          if (rawMat) {
            availableQuantity = Number(rawMat.availableStock);
          }
        }

        const bomItem = this.bomItemRepository.create({
          bomId: bom.id,
          rawMaterialId: cm.rawMaterialId,
          itemName: cm.itemName,
          requiredQuantity: Number(cm.requiredQuantity),
          availableQuantity,
          unitOfMeasure: cm.unitOfMeasure,
          status: availableQuantity >= Number(cm.requiredQuantity) ? 'available' : 'shortage',
          isCustom: true,
          sortOrder: maxOrder + i,
        } as any);
        await this.bomItemRepository.save(bomItem);
      }
    }

    const po = bom.purchaseOrder;
    const poItems = po
      ? await this.salesOrderItemRepository.find({
          where: { salesOrderId: po.id },
          relations: ['product'],
        })
      : [];

    // Create one job card for the BOM
    const jcData = jobCardsData[0] || {};
    const itemName = bom.product?.productName || poItems[0]?.itemName || 'Product';

    const count = await this.jobCardRepository.count({ where: { enterpriseId } });
    const jobNumber = `JOB-${String(count + 1).padStart(6, '0')}`;

    // Determine if custom materials need approval
    const hasCustomMats = customMaterials && customMaterials.length > 0;

    const jobCard = this.jobCardRepository.create({
      enterpriseId,
      jobNumber,
      jobName: `${itemName} - ${bom.bomNumber}`,
      productId: bom.productId || poItems[0]?.productId || undefined,
      purchaseOrderId: po?.id,
      bomId: bom.id,
      customerId: po?.customerId || undefined,
      customerName: po?.customerName || undefined,
      assignedTo: jcData.assignedTo || undefined,
      quantity: Number(bom.quantity),
      startDate: jcData.startDate ? new Date(jcData.startDate) : undefined,
      expectedCompletion: jcData.expectedCompletion ? new Date(jcData.expectedCompletion) : undefined,
      priority: jcData.priority || 3,
      notes: jcData.notes,
      status: 'pending',
      productionStage: hasCustomMats ? 'WAITING_FOR_MATERIALS' : 'PENDING_APPROVAL',
      materialStatus: hasCustomMats ? 'PENDING_INVENTORY' : 'FULLY_ISSUED',
      selectedMaterials: hasCustomMats ? customMaterials : null,
      quantityCompleted: 0,
      dispatchOnHold: false,
    });

    const savedResult = await this.jobCardRepository.save(jobCard);
    const savedJobCard = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // Auto-create stage progress from active stage masters
    await this.initializeStagesForJobCard(savedJobCard);

    // If custom materials exist, auto-create material request for inventory approval
    if (hasCustomMats) {
      await this.createMaterialRequestForJobCard(
        savedJobCard,
        customMaterials,
        enterpriseId,
      );
      // Update production stage to waiting
      await this.jobCardRepository.update(savedJobCard.id, {
        productionStage: 'WAITING_FOR_MATERIALS',
        materialStatus: 'PENDING_INVENTORY',
      });
    }

    // Update BOM status
    await this.bomRepository.update(bomId, { status: 'in_progress' });

    // Audit log
    await this.auditLogsService.log({
      enterpriseId,
      entityType: 'JobCard',
      entityId: savedJobCard.id,
      action: 'JOB_CARD_CREATED',
      description: `Job card ${jobNumber} created from BOM ${bom.bomNumber}${hasCustomMats ? ` — ${customMaterials.length} additional material(s) sent for inventory approval` : ''}`,
    });

    const result = await this.findOne(savedJobCard.id, enterpriseId);
    return {
      message: hasCustomMats
        ? `Job card created — ${customMaterials.length} additional material(s) sent to inventory for approval`
        : `Job card created successfully`,
      data: [result.data],
    };
  }

  // DEPRECATED: Material requests are now created via the "Send for Approval" workflow,
  // not auto-generated from BOM stock checks.

  // DEPRECATED: Shortage tracking is now handled by the Inventory module via Material Requests.
  async getShortageItems(_enterpriseId: number) {
    return {
      message: 'Shortage tracking is handled by Inventory module',
      data: [],
      totalRecords: 0,
    };
  }

  // ========== Per-Item Production & Inventory Re-Request ==========

  async startProductionForItem(
    poId: number,
    itemId: number,
    enterpriseId: number,
    userId?: number,
    force?: boolean,
  ) {
    const po = await this.salesOrderRepository.findOne({
      where: { id: poId, enterpriseId, sentToManufacturing: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const poItem = await this.salesOrderItemRepository.findOne({
      where: { id: itemId, salesOrderId: poId },
      relations: ['product'],
    });
    if (!poItem) throw new NotFoundException('Item not found');

    // Material must be issued by Inventory (not just approved)
    if (!po.materialRequestId) {
      throw new BadRequestException('No material request found. Send for approval first.');
    }

    // Check ALL MR items are fully issued before allowing ANY production
    const allMrItems = await this.materialRequestItemRepository.find({
      where: { materialRequestId: po.materialRequestId },
    });

    const allFullyIssued = allMrItems.every(
      (mi) => Number(mi.quantityIssued) >= Number(mi.quantityRequested) && Number(mi.quantityRequested) > 0,
    );

    if (!allFullyIssued && !force) {
      const notIssued = allMrItems.filter(
        (mi) => Number(mi.quantityIssued) < Number(mi.quantityRequested),
      );
      const names = notIssued.map(mi => mi.itemName).join(', ');
      throw new BadRequestException(
        `Cannot start production. Materials not fully issued by Inventory: ${names}. Production requires ALL materials to be issued.`,
      );
    }

    // Check if job card already exists for this product in this PO
    const existingJc = await this.jobCardRepository.findOne({
      where: { purchaseOrderId: poId, productId: poItem.productId, enterpriseId },
    });
    if (existingJc) {
      throw new BadRequestException(`Job card already exists for this product (${existingJc.jobNumber})`);
    }

    // Get default stage master
    const defaultStage = await this.stageMasterRepository.findOne({
      where: { enterpriseId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    // Auto-create BOM if none exists
    let bomId: number | undefined;
    const existingBom = await this.bomRepository.findOne({
      where: { purchaseOrderId: poId, enterpriseId },
    });
    if (existingBom) {
      bomId = existingBom.id;
    }

    // Create job card
    const result = await this.create(enterpriseId, {
      productId: poItem.productId,
      purchaseOrderId: poId,
      bomId,
      stageMasterId: defaultStage?.id,
      customerName: po.customerName,
      jobName: `${poItem.itemName} - ${po.orderNumber}`,
      quantity: Number(poItem.quantity),
      priority: po.manufacturingPriority || 3,
    });

    const jcId = result.data.id;

    // Start production immediately
    await this.updateStatus(jcId, enterpriseId, 'in_process', userId);

    await this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'JobCard',
      entityId: jcId,
      action: 'START_PRODUCTION_FOR_ITEM',
      description: `Started production for ${poItem.itemName} (Qty: ${poItem.quantity}) from PO ${po.orderNumber}`,
    });

    return this.findOne(jcId, enterpriseId);
  }

  async requestInventoryForItem(
    poId: number,
    itemId: number,
    enterpriseId: number,
    userId?: number,
  ) {
    const po = await this.salesOrderRepository.findOne({
      where: { id: poId, enterpriseId, sentToManufacturing: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const poItem = await this.salesOrderItemRepository.findOne({
      where: { id: itemId, salesOrderId: poId },
      relations: ['product'],
    });
    if (!poItem) throw new NotFoundException('Item not found');

    if (!po.materialRequestId) {
      throw new BadRequestException('No material request found. Send the PO for approval first.');
    }

    // Find the MR item for this product
    const mrItem = await this.materialRequestItemRepository.findOne({
      where: { materialRequestId: po.materialRequestId, productId: poItem.productId },
    });

    if (!mrItem) {
      throw new NotFoundException('Material request item not found for this product');
    }

    // Reset item status to pending for re-review
    await this.materialRequestItemRepository.update(mrItem.id, {
      status: 'pending',
    });

    // Update the overall MR status back to pending
    await this.materialRequestRepository.update(po.materialRequestId, {
      status: 'pending',
    });

    // Also reset PO approval status so inventory can re-review
    await this.salesOrderRepository.update(poId, {
      materialApprovalStatus: 'pending_approval',
    });

    await this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'MaterialRequestItem',
      entityId: mrItem.id,
      action: 'INVENTORY_RECHECK_REQUESTED',
      description: `Manufacturing re-requested inventory for ${poItem.itemName} (Qty: ${poItem.quantity})`,
    });

    return {
      message: `Inventory re-request sent for ${poItem.itemName}`,
      data: { itemId, productId: poItem.productId, status: 'pending' },
    };
  }

  async recheckMaterialStatus(jobCardId: number, enterpriseId: number, userId?: number) {
    const jobCard = await this.jobCardRepository.findOne({ where: { id: jobCardId, enterpriseId } });
    if (!jobCard) throw new NotFoundException('Job card not found');

    // Find the linked MR
    let mr = await this.materialRequestRepository.findOne({ where: { jobCardId } });
    if (!mr && jobCard.purchaseOrderId) {
      const po = await this.salesOrderRepository.findOne({ where: { id: jobCard.purchaseOrderId } });
      if (po?.materialRequestId) {
        mr = await this.materialRequestRepository.findOne({ where: { id: po.materialRequestId } });
      }
    }

    if (!mr) {
      // No MR — just recompute from existing data
      return this.findOne(jobCardId, enterpriseId);
    }

    // Find insufficient items and try to auto-issue them if stock is now available
    const insufficientItems = await this.materialRequestItemRepository.find({
      where: { materialRequestId: mr.id, status: 'insufficient' },
    });

    let autoIssuedCount = 0;

    for (const item of insufficientItems) {
      const qtyNeeded = Number(item.quantityRequested) - Number(item.quantityIssued);
      if (qtyNeeded <= 0) continue;

      // Check current stock
      let available = 0;
      if (item.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({ where: { id: item.rawMaterialId, enterpriseId } });
        available = rawMat ? Number(rawMat.availableStock) : 0;
      } else if (item.productId) {
        const inventory = await this.inventoryRepository.findOne({ where: { productId: item.productId, enterpriseId } });
        available = inventory ? Number(inventory.availableStock) : 0;
      }

      if (available >= qtyNeeded) {
        // Deduct stock and mark as issued
        if (item.rawMaterialId) {
          const rawMat = await this.rawMaterialRepository.findOne({ where: { id: item.rawMaterialId, enterpriseId } });
          if (rawMat) {
            const previousStock = Number(rawMat.currentStock);
            const newStock = previousStock - qtyNeeded;
            await this.rawMaterialRepository.update(rawMat.id, {
              currentStock: newStock,
              availableStock: newStock - Number(rawMat.reservedStock),
            });
            await this.rawMaterialLedgerRepository.save(
              this.rawMaterialLedgerRepository.create({
                enterpriseId,
                rawMaterialId: rawMat.id,
                transactionType: 'issue',
                quantity: qtyNeeded,
                previousStock,
                newStock,
                referenceType: 'material_request',
                referenceId: mr.id,
                remarks: `Auto-issued on material recheck for MR ${mr.requestNumber} — ${item.itemName}`,
                createdBy: userId,
              }),
            );
          }
        } else if (item.productId) {
          const inventory = await this.inventoryRepository.findOne({ where: { productId: item.productId, enterpriseId } });
          if (inventory) {
            const previousStock = Number(inventory.currentStock);
            const newStock = previousStock - qtyNeeded;
            const ledger = this.ledgerRepository.create({
              enterpriseId,
              inventoryId: inventory.id,
              productId: item.productId,
              transactionType: 'OUT',
              quantity: qtyNeeded,
              previousStock,
              newStock,
              referenceType: 'MANUFACTURING',
              referenceId: mr.id,
              remarks: `Auto-issued on material recheck for MR ${mr.requestNumber} — ${item.itemName}`,
              createdBy: userId,
            });
            await this.ledgerRepository.save(ledger);
            await this.inventoryRepository.update(inventory.id, { currentStock: newStock, availableStock: inventory.availableStock - qtyNeeded });
          }
        }

        await this.materialRequestItemRepository.update(item.id, {
          quantityApproved: qtyNeeded,
          quantityIssued: Number(item.quantityIssued) + qtyNeeded,
          status: 'issued',
        });
        autoIssuedCount++;
      }
    }

    // Update MR status if any items were issued
    if (autoIssuedCount > 0) {
      const allItems = await this.materialRequestItemRepository.find({ where: { materialRequestId: mr.id } });
      const allIssuedOrRejected = allItems.every((i) => i.status === 'issued' || i.status === 'rejected');
      if (allIssuedOrRejected) {
        await this.materialRequestRepository.update(mr.id, { status: 'fulfilled' });
      } else {
        const hasIssued = allItems.some((i) => i.status === 'issued');
        if (hasIssued) {
          await this.materialRequestRepository.update(mr.id, { status: 'partially_fulfilled' });
        }
      }
    }

    // Recompute and return the updated job card
    return this.findOne(jobCardId, enterpriseId);
  }

  async deleteBom(id: number, enterpriseId: number) {
    const bom = await this.bomRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!bom) {
      throw new NotFoundException('BOM not found');
    }

    // Check if there are linked job cards
    const jobCardCount = await this.jobCardRepository.count({
      where: { bomId: id, enterpriseId },
    });

    if (jobCardCount > 0) {
      throw new BadRequestException('Cannot delete BOM with linked job cards');
    }

    await this.bomItemRepository.delete({ bomId: id });
    await this.bomRepository.delete(id);

    return {
      message: 'BOM deleted successfully',
      data: null,
    };
  }

  // ========== Manufacturing Workflow: Send for Approval & Edit Details ==========

  async sendForApproval(
    poId: number,
    enterpriseId: number,
    dto: { priority?: number; notes?: string; expectedDelivery?: string; items?: Array<{ itemId: number; itemName?: string; quantity?: number; description?: string; unitOfMeasure?: string }> },
  ) {
    const po = await this.salesOrderRepository.findOne({
      where: { id: poId, enterpriseId, sentToManufacturing: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found or not sent to manufacturing');

    if (po.materialApprovalStatus === 'approved') {
      throw new BadRequestException('This PO is already approved');
    }

    // BOM must exist before sending for approval
    const bom = await this.bomRepository.findOne({
      where: { purchaseOrderId: poId, enterpriseId },
      relations: ['items', 'items.rawMaterial'],
    });
    if (!bom || !bom.items || bom.items.length === 0) {
      throw new BadRequestException('Create a Bill of Materials (BOM) with raw materials before sending for approval');
    }

    // Update PO details
    if (dto.priority !== undefined) po.manufacturingPriority = dto.priority;
    if (dto.notes !== undefined) po.manufacturingNotes = dto.notes;
    if (dto.expectedDelivery) po.expectedDelivery = new Date(dto.expectedDelivery);

    // Create a material request from BOM items (raw materials)
    const count = await this.materialRequestRepository.count({ where: { enterpriseId } });
    const requestNumber = `MR-${String(count + 1).padStart(6, '0')}`;

    const materialRequest = this.materialRequestRepository.create({
      enterpriseId,
      requestNumber,
      requestDate: new Date(),
      salesOrderId: poId,
      purpose: `Manufacturing approval request for PO: ${po.orderNumber} (BOM: ${bom.bomNumber})`,
      status: 'pending',
      notes: dto.notes || `Material approval request for manufacturing. Priority: ${dto.priority === 2 ? 'Urgent' : dto.priority === 1 ? 'High' : 'Normal'}`,
    });

    const savedMR = await this.materialRequestRepository.save(materialRequest);

    // Create MR items from BOM raw materials only (never finished products)
    const rawMaterialItems = bom.items.filter(item => item.rawMaterialId);
    if (rawMaterialItems.length === 0) {
      throw new BadRequestException('BOM has no raw materials. Add raw materials to the BOM before sending for approval.');
    }

    for (const bomItem of rawMaterialItems) {
      const rawMat = await this.rawMaterialRepository.findOne({
        where: { id: bomItem.rawMaterialId, enterpriseId },
      });
      const availableStock = rawMat ? Number(rawMat.availableStock) : 0;

      const mrItem = this.materialRequestItemRepository.create({
        materialRequestId: savedMR.id,
        rawMaterialId: bomItem.rawMaterialId,
        itemName: bomItem.itemName,
        quantityRequested: Number(bomItem.requiredQuantity),
        availableStock,
        unitOfMeasure: bomItem.unitOfMeasure,
        status: 'pending',
      });
      await this.materialRequestItemRepository.save(mrItem);
    }

    // Update PO status
    po.materialApprovalStatus = 'pending_approval';
    po.materialRequestId = savedMR.id;
    await this.salesOrderRepository.save(po);

    // Update BOM status
    await this.bomRepository.update(bom.id, { status: 'pending' });

    return {
      message: 'Sent for inventory approval successfully',
      data: { purchaseOrder: po, materialRequest: savedMR },
    };
  }

  async updateManufacturingDetails(
    poId: number,
    enterpriseId: number,
    dto: { priority?: number; notes?: string; expectedDelivery?: string; items?: Array<{ itemId: number; itemName?: string; quantity?: number; description?: string; unitOfMeasure?: string }> },
  ) {
    const po = await this.salesOrderRepository.findOne({
      where: { id: poId, enterpriseId, sentToManufacturing: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found or not sent to manufacturing');

    if (dto.priority !== undefined) po.manufacturingPriority = dto.priority;
    if (dto.notes !== undefined) po.manufacturingNotes = dto.notes;
    if (dto.expectedDelivery) po.expectedDelivery = new Date(dto.expectedDelivery);
    await this.salesOrderRepository.save(po);

    // Update items if provided
    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const updateData: any = {};
        if (item.itemName !== undefined) updateData.itemName = item.itemName;
        if (item.quantity !== undefined) updateData.quantity = item.quantity;
        if (item.description !== undefined) updateData.description = item.description;
        if (item.unitOfMeasure !== undefined) updateData.unitOfMeasure = item.unitOfMeasure;
        if (Object.keys(updateData).length > 0) {
          await this.salesOrderItemRepository.update(item.itemId, updateData);
        }
      }
    }

    // Refetch with items
    const updatedItems = await this.salesOrderItemRepository.find({
      where: { salesOrderId: poId },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });

    return {
      message: 'Manufacturing details updated successfully',
      data: { ...po, items: updatedItems },
    };
  }
}

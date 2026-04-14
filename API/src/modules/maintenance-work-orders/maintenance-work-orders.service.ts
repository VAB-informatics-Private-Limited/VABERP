import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MaintenanceWorkOrder } from './entities/maintenance-work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { WorkOrderStatusLog } from './entities/work-order-status-log.entity';
import { MaintenanceReminder } from '../maintenance-reminders/entities/maintenance-reminder.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { BomLine } from '../maintenance-bom/entities/bom-line.entity';

@Injectable()
export class MaintenanceWorkOrdersService {
  constructor(
    @InjectRepository(MaintenanceWorkOrder) private woRepo: Repository<MaintenanceWorkOrder>,
    @InjectRepository(WorkOrderPart) private partRepo: Repository<WorkOrderPart>,
    @InjectRepository(WorkOrderStatusLog) private statusLogRepo: Repository<WorkOrderStatusLog>,
    @InjectRepository(MaintenanceReminder) private reminderRepo: Repository<MaintenanceReminder>,
    @InjectRepository(RawMaterial) private rawMaterialRepo: Repository<RawMaterial>,
    @InjectRepository(BomLine) private bomLineRepo: Repository<BomLine>,
    private dataSource: DataSource,
  ) {}

  private async nextWorkOrderNo(enterpriseId: number): Promise<string> {
    const count = await this.woRepo.count({ where: { enterpriseId } });
    return `WO-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(
    enterpriseId: number,
    page = 1, limit = 20,
    machineId?: number, status?: string, serviceType?: string,
    currentUserId?: number, permissions?: any,
  ) {
    const q = this.woRepo.createQueryBuilder('wo')
      .leftJoinAndSelect('wo.machine', 'm')
      .leftJoinAndSelect('wo.assignedTechnician', 'tech')
      .where('wo.enterpriseId = :enterpriseId', { enterpriseId });

    // Scope: regular employees only see work orders assigned to them
    const isAdmin = !permissions || permissions?.machinery_management?.work_orders?.edit === 1;
    if (!isAdmin && currentUserId) {
      q.andWhere('wo.assignedTechnicianId = :uid', { uid: currentUserId });
    }

    if (machineId) q.andWhere('wo.machineId = :machineId', { machineId });
    if (status) q.andWhere('wo.status = :status', { status });
    if (serviceType) q.andWhere('wo.serviceType = :serviceType', { serviceType });
    const [data, total] = await q.skip((page - 1) * limit).take(limit)
      .orderBy('wo.createdDate', 'DESC').getManyAndCount();
    return { message: 'Work orders fetched', data, totalRecords: total, page };
  }

  async findOne(id: number, enterpriseId: number) {
    const wo = await this.woRepo.findOne({
      where: { id, enterpriseId },
      relations: ['machine', 'assignedTechnician', 'parts', 'parts.rawMaterial', 'statusLogs', 'statusLogs.changedByEmployee'],
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return { message: 'Work order fetched', data: wo };
  }

  async create(enterpriseId: number, dto: any, userId?: number) {
    return this.dataSource.transaction(async (em) => {
      const workOrderNo = await this.nextWorkOrderNo(enterpriseId);
      const wo = em.create(MaintenanceWorkOrder, {
        ...dto,
        enterpriseId,
        workOrderNo,
        status: 'created',
        createdBy: userId,
      });
      const savedWo = await em.save(wo);

      // Auto-populate parts from BOM template if provided
      if (dto.bomTemplateId) {
        const lines = await this.bomLineRepo.find({ where: { templateId: dto.bomTemplateId } });
        for (const line of lines) {
          const part = em.create(WorkOrderPart, {
            enterpriseId,
            workOrderId: savedWo.id,
            rawMaterialId: line.rawMaterialId,
            quantityRequired: line.quantityRequired,
            unit: line.unit,
            source: 'bom_auto',
            status: 'pending',
          });
          await em.save(part);
        }
      }

      // If created from a reminder, link it
      if (dto.reminderId) {
        await em.update(MaintenanceReminder, { id: dto.reminderId }, {
          status: 'work_order_created',
          workOrderId: savedWo.id,
        });
      }

      // Log status
      await em.save(WorkOrderStatusLog, {
        workOrderId: savedWo.id,
        fromStatus: null,
        toStatus: 'created',
        changedBy: userId,
      });

      return { message: 'Work order created', data: savedWo };
    });
  }

  async update(id: number, enterpriseId: number, dto: any) {
    const wo = await this.woRepo.findOne({ where: { id, enterpriseId } });
    if (!wo) throw new NotFoundException('Work order not found');
    Object.assign(wo, dto);
    return { message: 'Work order updated', data: await this.woRepo.save(wo) };
  }

  async changeStatus(id: number, enterpriseId: number, newStatus: string, userId?: number, reason?: string) {
    const wo = await this.woRepo.findOne({ where: { id, enterpriseId } });
    if (!wo) throw new NotFoundException('Work order not found');
    const fromStatus = wo.status;
    wo.status = newStatus;

    if (newStatus === 'in_progress' && !wo.actualStart) {
      wo.actualStart = new Date();
    }
    if (newStatus === 'completed' && !wo.actualEnd) {
      wo.actualEnd = new Date();
    }
    if (newStatus === 'on_hold') {
      wo.onHoldReason = reason ?? null;
    }

    await this.woRepo.save(wo);

    await this.statusLogRepo.save(this.statusLogRepo.create({
      workOrderId: id,
      fromStatus,
      toStatus: newStatus,
      changedBy: userId,
      reason,
    }));

    return { message: `Status changed to ${newStatus}`, data: wo };
  }

  async closureVerify(id: number, enterpriseId: number, userId: number) {
    const wo = await this.woRepo.findOne({ where: { id, enterpriseId } });
    if (!wo) throw new NotFoundException('Work order not found');
    if (wo.status !== 'completed') throw new BadRequestException('Work order must be completed before closure verification');
    wo.status = 'closed';
    wo.closureVerifiedBy = userId;
    wo.closureVerifiedAt = new Date();
    await this.woRepo.save(wo);

    await this.statusLogRepo.save(this.statusLogRepo.create({
      workOrderId: id,
      fromStatus: 'completed',
      toStatus: 'closed',
      changedBy: userId,
    }));

    return { message: 'Work order closed', data: wo };
  }

  // ─── Parts ─────────────────────────────────────────────────────────────────

  async addPart(workOrderId: number, enterpriseId: number, dto: any) {
    const wo = await this.woRepo.findOne({ where: { id: workOrderId, enterpriseId } });
    if (!wo) throw new NotFoundException('Work order not found');
    const part = this.partRepo.create({
      ...dto, workOrderId, enterpriseId, source: 'manual_add', status: 'pending',
    });
    return { message: 'Part added', data: await this.partRepo.save(part) };
  }

  async reservePart(partId: number, enterpriseId: number) {
    return this.dataSource.transaction(async (em) => {
      const part = await em.findOne(WorkOrderPart, { where: { id: partId, enterpriseId } });
      if (!part) throw new NotFoundException('Part not found');
      const mat = await em.findOne(RawMaterial, { where: { id: part.rawMaterialId } });
      if (!mat) throw new NotFoundException('Raw material not found');

      const available = Number(mat.currentStock) - Number(mat.reservedStock ?? 0);
      if (available < Number(part.quantityRequired)) {
        throw new BadRequestException(`Insufficient stock. Available: ${available}, Required: ${part.quantityRequired}`);
      }

      // Reserve in raw_materials
      await em.update(RawMaterial, { id: mat.id }, {
        reservedStock: Number(mat.reservedStock ?? 0) + Number(part.quantityRequired),
      });

      part.quantityReserved = Number(part.quantityRequired);
      part.status = 'reserved';
      return { message: 'Part reserved', data: await em.save(part) };
    });
  }

  async consumePart(partId: number, enterpriseId: number, quantityConsumed: number) {
    return this.dataSource.transaction(async (em) => {
      const part = await em.findOne(WorkOrderPart, { where: { id: partId, enterpriseId } });
      if (!part) throw new NotFoundException('Part not found');
      const mat = await em.findOne(RawMaterial, { where: { id: part.rawMaterialId } });
      if (!mat) throw new NotFoundException('Raw material not found');

      // Deduct from stock and release reservation
      const consumed = Number(quantityConsumed);
      const reserved = Number(part.quantityReserved);
      await em.update(RawMaterial, { id: mat.id }, {
        currentStock: Number(mat.currentStock) - consumed,
        reservedStock: Math.max(0, Number(mat.reservedStock ?? 0) - reserved),
      });

      part.quantityConsumed = consumed;
      part.status = consumed >= Number(part.quantityRequired) ? 'consumed' : 'partial';
      return { message: 'Part consumed', data: await em.save(part) };
    });
  }

  async removePart(partId: number, enterpriseId: number) {
    return this.dataSource.transaction(async (em) => {
      const part = await em.findOne(WorkOrderPart, { where: { id: partId, enterpriseId } });
      if (!part) throw new NotFoundException('Part not found');

      // Release any reservation
      if (part.quantityReserved > 0) {
        await em.decrement(RawMaterial, { id: part.rawMaterialId }, 'reservedStock', Number(part.quantityReserved));
      }

      await em.remove(part);
      return { message: 'Part removed' };
    });
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboardStats(enterpriseId: number) {
    const [total, open, inProgress, completed, overdue] = await Promise.all([
      this.woRepo.count({ where: { enterpriseId } }),
      this.woRepo.count({ where: { enterpriseId, status: 'created' } }),
      this.woRepo.count({ where: { enterpriseId, status: 'in_progress' } }),
      this.woRepo.count({ where: { enterpriseId, status: 'completed' } }),
      this.woRepo.createQueryBuilder('wo')
        .where('wo.enterpriseId = :enterpriseId', { enterpriseId })
        .andWhere('wo.status NOT IN (:...closed)', { closed: ['completed', 'closed', 'cancelled'] })
        .andWhere('wo.scheduledEnd < NOW()')
        .getCount(),
    ]);
    return { message: 'Stats fetched', data: { total, open, inProgress, completed, overdue } };
  }
}

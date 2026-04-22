import { Injectable, NotFoundException, BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { WasteDisposalTransaction } from './entities/waste-disposal-transaction.entity';
import { WasteDisposalLine } from './entities/waste-disposal-line.entity';
import { WasteInventory } from '../waste-inventory/entities/waste-inventory.entity';
import { WasteInventoryLog } from '../waste-inventory/entities/waste-inventory-log.entity';
import { WasteParty } from '../waste-parties/entities/waste-party.entity';

@Injectable()
export class WasteDisposalService {
  constructor(
    @InjectRepository(WasteDisposalTransaction) private txnRepo: Repository<WasteDisposalTransaction>,
    @InjectRepository(WasteDisposalLine) private lineRepo: Repository<WasteDisposalLine>,
    @InjectRepository(WasteInventory) private inventoryRepo: Repository<WasteInventory>,
    @InjectRepository(WasteInventoryLog) private logRepo: Repository<WasteInventoryLog>,
    @InjectRepository(WasteParty) private partyRepo: Repository<WasteParty>,
    private dataSource: DataSource,
  ) {}

  async getTransactions(enterpriseId: number, page = 1, limit = 20, filters: any = {}) {
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 20)));

    const q = this.txnRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.party', 'p')
      .leftJoinAndSelect('t.lines', 'l')
      .leftJoinAndSelect('l.category', 'cat')
      .where('t.enterpriseId = :enterpriseId', { enterpriseId });

    if (filters.status) q.andWhere('t.status = :status', { status: filters.status });
    if (filters.partyId) q.andWhere('t.partyId = :partyId', { partyId: filters.partyId });
    if (filters.transactionType) q.andWhere('t.transactionType = :type', { type: filters.transactionType });
    if (filters.from) q.andWhere('t.scheduledDate >= :from', { from: filters.from });
    if (filters.to) q.andWhere('t.scheduledDate <= :to', { to: filters.to });

    const [data, total] = await q
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .orderBy('t.createdDate', 'DESC')
      .getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return { message: 'Transactions fetched', data, totalRecords: total, page: safePage, pageSize: safeLimit, totalPages };
  }

  async getTransaction(id: number, enterpriseId: number) {
    const t = await this.txnRepo.findOne({
      where: { id, enterpriseId },
      relations: ['party', 'lines', 'lines.inventory', 'lines.category', 'lines.inventory.source'],
    });
    if (!t) throw new NotFoundException('Transaction not found');
    return { message: 'Transaction fetched', data: t };
  }

  async createTransaction(enterpriseId: number, dto: any, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const party = await manager.findOne(WasteParty, { where: { id: dto.partyId, enterpriseId } });
      if (!party) throw new NotFoundException('Party not found');

      const transactionNo = await this.generateTransactionNo(enterpriseId);

      const txn = manager.create(WasteDisposalTransaction, {
        enterpriseId,
        transactionNo,
        partyId: dto.partyId,
        transactionType: dto.transactionType ?? 'disposal',
        disposalMethod: dto.disposalMethod,
        scheduledDate: new Date(dto.scheduledDate),
        status: 'draft',
        manifestNumber: dto.manifestNumber,
        vehicleNumber: dto.vehicleNumber,
        driverName: dto.driverName,
        notes: dto.notes,
        createdBy: userId,
      });
      const saved = await manager.save(WasteDisposalTransaction, txn) as unknown as WasteDisposalTransaction;

      // Create lines and reserve inventory
      if (dto.lines && dto.lines.length > 0) {
        for (const lineDto of dto.lines) {
          await this.addLineInternal(saved.id, enterpriseId, lineDto, userId, manager);
        }
      }

      // Reload with relations
      const result = await manager.findOne(WasteDisposalTransaction, {
        where: { id: saved.id },
        relations: ['party', 'lines', 'lines.inventory', 'lines.category'],
      });
      return { message: 'Transaction created', data: result };
    });
  }

  async updateTransaction(id: number, enterpriseId: number, dto: any) {
    const txn = await this.txnRepo.findOne({ where: { id, enterpriseId } });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (!['draft'].includes(txn.status)) {
      throw new BadRequestException('Only draft transactions can be edited');
    }
    const allowed = ['scheduledDate', 'disposalMethod', 'manifestNumber', 'vehicleNumber', 'driverName', 'notes'];
    allowed.forEach(k => { if (dto[k] !== undefined) (txn as any)[k] = dto[k]; });
    return { message: 'Transaction updated', data: await this.txnRepo.save(txn) };
  }

  async confirm(id: number, enterpriseId: number, userId?: number) {
    const txn = await this.txnRepo.findOne({
      where: { id, enterpriseId },
      relations: ['lines', 'lines.inventory', 'lines.inventory.category', 'party'],
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== 'draft') throw new BadRequestException('Only draft transactions can be confirmed');
    if (!txn.lines || txn.lines.length === 0) throw new BadRequestException('Transaction has no line items');

    // Hazardous compliance check
    for (const line of txn.lines) {
      const cat = line.inventory?.category;
      if (cat?.requiresManifest) {
        if (!txn.party.handlesHazardous) {
          throw new BadRequestException(`Party '${txn.party.companyName}' is not certified to handle hazardous waste`);
        }
        if (txn.party.certExpiryDate && new Date(txn.party.certExpiryDate) < new Date(txn.scheduledDate)) {
          throw new BadRequestException(`Party certification expired before scheduled date`);
        }
        if (!txn.manifestNumber) {
          throw new BadRequestException('Manifest number is required for hazardous waste disposal');
        }
      }
    }

    txn.status = 'confirmed';
    txn.approvedBy = userId ?? null;
    return { message: 'Transaction confirmed', data: await this.txnRepo.save(txn) };
  }

  async complete(id: number, enterpriseId: number, dto: any, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const txn = await manager.findOne(WasteDisposalTransaction, {
        where: { id, enterpriseId },
        relations: ['lines'],
      });
      if (!txn) throw new NotFoundException('Transaction not found');
      if (!['confirmed', 'in_transit'].includes(txn.status)) {
        throw new BadRequestException('Transaction must be confirmed or in_transit to complete');
      }

      let totalQty = 0, totalRevenue = 0, totalCost = 0;

      for (const lineUpdate of (dto.lines ?? [])) {
        const line = txn.lines.find(l => l.id === lineUpdate.id);
        if (!line) continue;

        const actualQty = parseFloat(lineUpdate.quantityActual ?? line.quantityRequested);
        const rate = parseFloat(lineUpdate.rate ?? line.rate ?? '0');

        // Revenue or cost based on transaction type
        let lineRevenue = 0, lineCost = 0;
        if (txn.transactionType === 'sale') {
          lineRevenue = actualQty * rate;
        } else {
          lineCost = actualQty * rate;
        }

        line.quantityActual = actualQty;
        line.rate = rate;
        line.revenue = lineRevenue;
        line.cost = lineCost;
        await manager.save(WasteDisposalLine, line);

        // Deduct from inventory
        await this.deductInventory(line.inventoryId, enterpriseId, line.quantityRequested, actualQty, id, userId, manager);

        totalQty += actualQty;
        totalRevenue += lineRevenue;
        totalCost += lineCost;
      }

      txn.status = 'completed';
      txn.completedDate = new Date();
      txn.totalQuantity = totalQty;
      txn.totalRevenue = totalRevenue;
      txn.totalCost = totalCost;
      await manager.save(WasteDisposalTransaction, txn);

      return { message: 'Transaction completed', data: txn };
    });
  }

  async cancel(id: number, enterpriseId: number, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const txn = await manager.findOne(WasteDisposalTransaction, {
        where: { id, enterpriseId },
        relations: ['lines'],
      });
      if (!txn) throw new NotFoundException('Transaction not found');
      if (['completed', 'in_transit'].includes(txn.status)) {
        throw new ConflictException('Cannot cancel a completed or in-transit transaction');
      }

      // Release all reservations
      for (const line of txn.lines) {
        await this.releaseReservation(line.inventoryId, enterpriseId, line.quantityRequested, id, userId, manager);
      }

      txn.status = 'cancelled';
      await manager.save(WasteDisposalTransaction, txn);
      return { message: 'Transaction cancelled' };
    });
  }

  async addLine(transactionId: number, enterpriseId: number, dto: any, userId?: number) {
    const txn = await this.txnRepo.findOne({ where: { id: transactionId, enterpriseId } });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== 'draft') throw new BadRequestException('Can only add lines to draft transactions');

    return this.dataSource.transaction(async (manager) => {
      await this.addLineInternal(transactionId, enterpriseId, dto, userId, manager);
      await this.recalcTotals(transactionId, manager);
      const result = await manager.findOne(WasteDisposalTransaction, {
        where: { id: transactionId },
        relations: ['lines', 'lines.inventory', 'lines.category'],
      });
      return { message: 'Line added', data: result };
    });
  }

  async removeLine(transactionId: number, lineId: number, enterpriseId: number, userId?: number) {
    const txn = await this.txnRepo.findOne({ where: { id: transactionId, enterpriseId } });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== 'draft') throw new BadRequestException('Can only remove lines from draft transactions');

    return this.dataSource.transaction(async (manager) => {
      const line = await manager.findOne(WasteDisposalLine, { where: { id: lineId, transactionId } });
      if (!line) throw new NotFoundException('Line not found');
      await this.releaseReservation(line.inventoryId, enterpriseId, line.quantityRequested, transactionId, userId, manager);
      await manager.remove(WasteDisposalLine, line);
      await this.recalcTotals(transactionId, manager);
      return { message: 'Line removed' };
    });
  }

  async getDashboard(enterpriseId: number) {
    const [total, draft, confirmed, inTransit, completed, cancelled] = await Promise.all([
      this.txnRepo.count({ where: { enterpriseId } }),
      this.txnRepo.count({ where: { enterpriseId, status: 'draft' } }),
      this.txnRepo.count({ where: { enterpriseId, status: 'confirmed' } }),
      this.txnRepo.count({ where: { enterpriseId, status: 'in_transit' } }),
      this.txnRepo.count({ where: { enterpriseId, status: 'completed' } }),
      this.txnRepo.count({ where: { enterpriseId, status: 'cancelled' } }),
    ]);

    const fin = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.totalRevenue)', 'revenue')
      .addSelect('SUM(t.totalCost)', 'cost')
      .where('t.enterpriseId = :enterpriseId AND t.status = :status', { enterpriseId, status: 'completed' })
      .getRawOne();

    return {
      message: 'Dashboard fetched',
      data: {
        total, draft, confirmed, inTransit, completed, cancelled,
        totalRevenue: parseFloat(fin?.revenue ?? '0'),
        totalCost: parseFloat(fin?.cost ?? '0'),
        netValue: parseFloat(fin?.revenue ?? '0') - parseFloat(fin?.cost ?? '0'),
      },
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async addLineInternal(transactionId: number, enterpriseId: number, dto: any, userId: number | undefined, manager: EntityManager) {
    const inventory = await manager.findOne(WasteInventory, {
      where: { id: dto.inventoryId, enterpriseId },
      relations: ['category'],
    });
    if (!inventory) throw new NotFoundException(`Inventory item ${dto.inventoryId} not found`);
    if (['fully_disposed', 'expired', 'quarantined'].includes(inventory.status)) {
      throw new BadRequestException(`Batch ${inventory.batchNo} has status '${inventory.status}' and cannot be disposed`);
    }
    if (Number(inventory.quantityAvailable) < parseFloat(dto.quantityRequested)) {
      throw new UnprocessableEntityException(
        `Insufficient quantity in batch ${inventory.batchNo}. Available: ${inventory.quantityAvailable} ${inventory.unit}`
      );
    }

    // Reserve
    await this.reserveInventory(dto.inventoryId, enterpriseId, parseFloat(dto.quantityRequested), transactionId, userId, manager);

    const line = manager.create(WasteDisposalLine, {
      transactionId,
      inventoryId: dto.inventoryId,
      categoryId: inventory.categoryId,
      quantityRequested: parseFloat(dto.quantityRequested),
      unit: inventory.unit,
      rate: dto.rate ?? null,
      notes: dto.notes,
    });
    await manager.save(WasteDisposalLine, line);
  }

  private async reserveInventory(inventoryId: number, enterpriseId: number, qty: number, txnId: number, userId: number | undefined, manager: EntityManager) {
    const result = await manager
      .createQueryBuilder()
      .update(WasteInventory)
      .set({
        quantityAvailable: () => `quantity_available - ${qty}`,
        quantityReserved: () => `quantity_reserved + ${qty}`,
        status: () => `CASE WHEN (quantity_available - ${qty}) = 0 THEN 'reserved' ELSE status END`,
      })
      .where('id = :id AND enterprise_id = :enterpriseId AND quantity_available >= :qty', { id: inventoryId, enterpriseId, qty })
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new UnprocessableEntityException('Insufficient available quantity — possible concurrent reservation');
    }

    const inv = await manager.findOne(WasteInventory, { where: { id: inventoryId, enterpriseId } });
    await manager.save(WasteInventoryLog, manager.create(WasteInventoryLog, {
      inventoryId,
      action: 'reserved',
      quantityDelta: -qty,
      quantityAfter: Number(inv?.quantityAvailable ?? 0),
      referenceType: 'disposal_transaction',
      referenceId: txnId,
      performedBy: userId,
    }));
  }

  private async releaseReservation(inventoryId: number, enterpriseId: number, qty: number, txnId: number, userId: number | undefined, manager: EntityManager) {
    await manager
      .createQueryBuilder()
      .update(WasteInventory)
      .set({
        quantityAvailable: () => `quantity_available + ${qty}`,
        quantityReserved: () => `GREATEST(quantity_reserved - ${qty}, 0)`,
        status: () => `CASE WHEN status = 'reserved' THEN 'available' ELSE status END`,
      })
      .where('id = :id AND enterprise_id = :enterpriseId', { id: inventoryId, enterpriseId })
      .execute();

    const inv = await manager.findOne(WasteInventory, { where: { id: inventoryId, enterpriseId } });
    await manager.save(WasteInventoryLog, manager.create(WasteInventoryLog, {
      inventoryId,
      action: 'reservation_released',
      quantityDelta: qty,
      quantityAfter: Number(inv?.quantityAvailable ?? 0),
      referenceType: 'disposal_transaction',
      referenceId: txnId,
      performedBy: userId,
    }));
  }

  private async deductInventory(inventoryId: number, enterpriseId: number, reservedQty: number, actualQty: number, txnId: number, userId: number | undefined, manager: EntityManager) {
    const returnQty = reservedQty - actualQty;
    await manager
      .createQueryBuilder()
      .update(WasteInventory)
      .set({
        quantityReserved: () => `GREATEST(quantity_reserved - ${reservedQty}, 0)`,
        quantityAvailable: () => `quantity_available + ${returnQty}`,
        status: () => `CASE
          WHEN (quantity_available + ${returnQty}) = 0 AND (quantity_reserved - ${reservedQty}) <= 0 THEN 'fully_disposed'
          WHEN quantity_generated > 0 AND (quantity_available + ${returnQty}) < quantity_generated THEN 'partially_disposed'
          ELSE status END`,
      })
      .where('id = :id AND enterprise_id = :enterpriseId', { id: inventoryId, enterpriseId })
      .execute();

    const inv = await manager.findOne(WasteInventory, { where: { id: inventoryId, enterpriseId } });
    await manager.save(WasteInventoryLog, manager.create(WasteInventoryLog, {
      inventoryId,
      action: 'disposed',
      quantityDelta: -actualQty,
      quantityAfter: Number(inv?.quantityAvailable ?? 0),
      referenceType: 'disposal_transaction',
      referenceId: txnId,
      performedBy: userId,
      notes: `Disposed ${actualQty} (reserved ${reservedQty})`,
    }));
  }

  private async recalcTotals(transactionId: number, manager: EntityManager) {
    const result = await manager
      .createQueryBuilder(WasteDisposalLine, 'l')
      .select('SUM(l.quantityRequested)', 'qty')
      .addSelect('SUM(l.revenue)', 'rev')
      .addSelect('SUM(l.cost)', 'cost')
      .where('l.transactionId = :transactionId', { transactionId })
      .getRawOne();

    await manager.update(WasteDisposalTransaction, transactionId, {
      totalQuantity: parseFloat(result?.qty ?? '0'),
      totalRevenue: parseFloat(result?.rev ?? '0'),
      totalCost: parseFloat(result?.cost ?? '0'),
    });
  }

  private async generateTransactionNo(enterpriseId: number): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.txnRepo
      .createQueryBuilder('t')
      .where('t.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('t.transactionNo LIKE :prefix', { prefix: `WDT-${year}-%` })
      .orderBy('t.id', 'DESC')
      .getOne();

    let seq = 1;
    if (last) {
      const parts = last.transactionNo.split('-');
      seq = parseInt(parts[parts.length - 1]) + 1;
    }
    return `WDT-${year}-${String(seq).padStart(5, '0')}`;
  }
}

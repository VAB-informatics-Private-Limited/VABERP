import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WasteCategory } from './entities/waste-category.entity';
import { WasteSource } from './entities/waste-source.entity';
import { WasteInventory } from './entities/waste-inventory.entity';
import { WasteInventoryLog } from './entities/waste-inventory-log.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WasteInventoryService {
  constructor(
    @InjectRepository(WasteCategory) private categoryRepo: Repository<WasteCategory>,
    @InjectRepository(WasteSource) private sourceRepo: Repository<WasteSource>,
    @InjectRepository(WasteInventory) private inventoryRepo: Repository<WasteInventory>,
    @InjectRepository(WasteInventoryLog) private logRepo: Repository<WasteInventoryLog>,
    private dataSource: DataSource,
  ) {}

  // ─── Categories ──────────────────────────────────────────────────────────────

  async getCategories(enterpriseId: number) {
    const data = await this.categoryRepo.find({
      where: { enterpriseId, isActive: true },
      order: { name: 'ASC' },
    });
    return { message: 'Categories fetched', data };
  }

  async createCategory(enterpriseId: number, dto: any) {
    const existing = await this.categoryRepo.findOne({ where: { enterpriseId, code: dto.code } });
    if (existing) throw new ConflictException(`Category code '${dto.code}' already exists`);
    const cat = this.categoryRepo.create({ ...dto, enterpriseId });
    return { message: 'Category created', data: await this.categoryRepo.save(cat) };
  }

  async updateCategory(id: number, enterpriseId: number, dto: any) {
    const cat = await this.categoryRepo.findOne({ where: { id, enterpriseId } });
    if (!cat) throw new NotFoundException('Category not found');
    Object.assign(cat, dto);
    return { message: 'Category updated', data: await this.categoryRepo.save(cat) };
  }

  async deleteCategory(id: number, enterpriseId: number) {
    const cat = await this.categoryRepo.findOne({ where: { id, enterpriseId } });
    if (!cat) throw new NotFoundException('Category not found');
    cat.isActive = false;
    await this.categoryRepo.save(cat);
    return { message: 'Category deactivated' };
  }

  // ─── Sources ─────────────────────────────────────────────────────────────────

  async getSources(enterpriseId: number) {
    const data = await this.sourceRepo.find({
      where: { enterpriseId, isActive: true },
      order: { name: 'ASC' },
    });
    return { message: 'Sources fetched', data };
  }

  async createSource(enterpriseId: number, dto: any) {
    const src = this.sourceRepo.create({ ...dto, enterpriseId });
    return { message: 'Source created', data: await this.sourceRepo.save(src) };
  }

  async updateSource(id: number, enterpriseId: number, dto: any) {
    const src = await this.sourceRepo.findOne({ where: { id, enterpriseId } });
    if (!src) throw new NotFoundException('Source not found');
    Object.assign(src, dto);
    return { message: 'Source updated', data: await this.sourceRepo.save(src) };
  }

  // ─── Inventory ───────────────────────────────────────────────────────────────

  async getInventory(enterpriseId: number, page = 1, limit = 20, filters: any = {}) {
    const q = this.inventoryRepo.createQueryBuilder('wi')
      .leftJoinAndSelect('wi.category', 'cat')
      .leftJoinAndSelect('wi.source', 'src')
      .where('wi.enterpriseId = :enterpriseId', { enterpriseId });

    if (filters.status) q.andWhere('wi.status = :status', { status: filters.status });
    if (filters.categoryId) q.andWhere('wi.categoryId = :categoryId', { categoryId: filters.categoryId });
    if (filters.sourceId) q.andWhere('wi.sourceId = :sourceId', { sourceId: filters.sourceId });
    if (filters.search) q.andWhere('(wi.batchNo ILIKE :s OR wi.storageLocation ILIKE :s)', { s: `%${filters.search}%` });
    if (filters.classification) q.andWhere('cat.classification = :cls', { cls: filters.classification });

    const [data, total] = await q
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('wi.createdDate', 'DESC')
      .getManyAndCount();

    return { message: 'Inventory fetched', data, totalRecords: total, page };
  }

  async getInventoryItem(id: number, enterpriseId: number) {
    const item = await this.inventoryRepo.findOne({
      where: { id, enterpriseId },
      relations: ['category', 'source'],
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const logs = await this.logRepo.find({
      where: { inventoryId: id },
      order: { createdDate: 'DESC' },
      take: 50,
    });

    return { message: 'Inventory item fetched', data: { ...item, logs } };
  }

  async createInventory(enterpriseId: number, dto: any, userId?: number) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId, enterpriseId } });
    if (!category) throw new NotFoundException('Category not found');

    // Duplicate check: same category + source + storage_date
    if (dto.sourceId && !dto.force) {
      const today = dto.storageDate ?? new Date().toISOString().split('T')[0];
      const dup = await this.inventoryRepo.findOne({
        where: {
          enterpriseId,
          categoryId: dto.categoryId,
          sourceId: dto.sourceId,
          storageDate: today as any,
          status: 'available',
        },
      });
      if (dup) {
        return {
          message: 'Possible duplicate entry',
          duplicate: true,
          existing: dup,
          statusCode: 409,
        };
      }
    }

    const batchNo = await this.generateBatchNo(enterpriseId);
    const storageDate = dto.storageDate ? new Date(dto.storageDate) : new Date();
    const expiryAlertDate = category.maxStorageDays
      ? new Date(new Date(storageDate).setDate(new Date(storageDate).getDate() + category.maxStorageDays))
      : null;

    // Hazardous manifest requirement
    if (category.requiresManifest && !dto.manifestNumber) {
      throw new BadRequestException('Manifest number is required for this hazardous waste category');
    }

    const item = this.inventoryRepo.create({
      ...dto,
      enterpriseId,
      batchNo,
      unit: dto.unit ?? category.unit,
      quantityAvailable: dto.quantityGenerated,
      quantityReserved: 0,
      storageDate,
      expiryAlertDate,
      status: 'available',
      enteredBy: userId,
    });

    const saved = await this.inventoryRepo.save(item) as unknown as WasteInventory;

    await this.logRepo.save(this.logRepo.create({
      inventoryId: saved.id,
      action: 'generated',
      quantityDelta: saved.quantityGenerated,
      quantityAfter: saved.quantityAvailable,
      performedBy: userId,
      notes: `Batch ${batchNo} created`,
    }));

    return { message: 'Inventory entry created', data: saved };
  }

  async updateInventory(id: number, enterpriseId: number, dto: any) {
    const item = await this.inventoryRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.status === 'fully_disposed') throw new BadRequestException('Cannot edit a fully disposed batch');

    const allowed = ['storageLocation', 'manifestNumber', 'notes', 'estimatedValue', 'hazardLevel'];
    allowed.forEach(k => { if (dto[k] !== undefined) (item as any)[k] = dto[k]; });

    return { message: 'Inventory updated', data: await this.inventoryRepo.save(item) };
  }

  async quarantine(id: number, enterpriseId: number, notes: string, userId?: number) {
    const item = await this.inventoryRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    if (['fully_disposed', 'quarantined'].includes(item.status)) {
      throw new BadRequestException(`Cannot quarantine item with status: ${item.status}`);
    }
    const prev = Number(item.quantityAvailable);
    item.status = 'quarantined';
    await this.inventoryRepo.save(item);
    await this.logRepo.save(this.logRepo.create({
      inventoryId: id,
      action: 'quarantined',
      quantityDelta: 0,
      quantityAfter: prev,
      performedBy: userId,
      notes,
    }));
    return { message: 'Batch quarantined' };
  }

  async writeOff(id: number, enterpriseId: number, dto: any, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(WasteInventory, { where: { id, enterpriseId } });
      if (!item) throw new NotFoundException('Inventory item not found');
      if (item.quantityAvailable <= 0) throw new BadRequestException('No available quantity to write off');

      const written = Number(item.quantityAvailable);
      item.quantityAvailable = 0;
      item.status = 'fully_disposed';
      await manager.save(WasteInventory, item);

      await manager.save(WasteInventoryLog, manager.create(WasteInventoryLog, {
        inventoryId: id,
        action: 'written_off',
        quantityDelta: -written,
        quantityAfter: 0,
        referenceType: 'manual',
        performedBy: userId,
        notes: dto.notes ?? 'Manual write-off',
      }));

      return { message: 'Batch written off', data: { written } };
    });
  }

  async getInventoryLog(id: number, enterpriseId: number) {
    const item = await this.inventoryRepo.findOne({ where: { id, enterpriseId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    const data = await this.logRepo.find({
      where: { inventoryId: id },
      order: { createdDate: 'DESC' },
    });
    return { message: 'Log fetched', data };
  }

  async getDashboard(enterpriseId: number) {
    const [total, available, reserved, partiallyDisposed, fullyDisposed, quarantined, expired] = await Promise.all([
      this.inventoryRepo.count({ where: { enterpriseId } }),
      this.inventoryRepo.count({ where: { enterpriseId, status: 'available' } }),
      this.inventoryRepo.count({ where: { enterpriseId, status: 'reserved' } }),
      this.inventoryRepo.count({ where: { enterpriseId, status: 'partially_disposed' } }),
      this.inventoryRepo.count({ where: { enterpriseId, status: 'fully_disposed' } }),
      this.inventoryRepo.count({ where: { enterpriseId, status: 'quarantined' } }),
      this.inventoryRepo.count({ where: { enterpriseId, status: 'expired' } }),
    ]);

    // Total available weight
    const qtyResult = await this.inventoryRepo
      .createQueryBuilder('wi')
      .select('SUM(wi.quantityAvailable)', 'totalAvailable')
      .addSelect('SUM(wi.quantityGenerated)', 'totalGenerated')
      .where('wi.enterpriseId = :enterpriseId', { enterpriseId })
      .getRawOne();

    // Expiring soon (within 7 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const expiringSoon = await this.inventoryRepo
      .createQueryBuilder('wi')
      .where('wi.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('wi.expiryAlertDate <= :soon', { soon: soon.toISOString().split('T')[0] })
      .andWhere("wi.status NOT IN ('fully_disposed','expired')")
      .getCount();

    return {
      message: 'Dashboard fetched',
      data: {
        total, available, reserved, partiallyDisposed, fullyDisposed, quarantined, expired, expiringSoon,
        totalAvailableQty: parseFloat(qtyResult?.totalAvailable ?? '0'),
        totalGeneratedQty: parseFloat(qtyResult?.totalGenerated ?? '0'),
      },
    };
  }

  // ─── Scheduler ───────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async markExpiredBatches() {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.inventoryRepo
      .createQueryBuilder()
      .update(WasteInventory)
      .set({ status: 'expired' })
      .where('status IN (:...statuses)', { statuses: ['available', 'partially_disposed'] })
      .andWhere('expiry_alert_date < :today', { today })
      .andWhere('expiry_alert_date IS NOT NULL')
      .execute();

    if (result.affected && result.affected > 0) {
      const expired = await this.inventoryRepo.find({ where: { status: 'expired' } });
      for (const item of expired) {
        const existing = await this.logRepo.findOne({
          where: { inventoryId: item.id, action: 'expired' },
        });
        if (!existing) {
          await this.logRepo.save(this.logRepo.create({
            inventoryId: item.id,
            action: 'expired',
            quantityDelta: 0,
            quantityAfter: Number(item.quantityAvailable),
            notes: 'Auto-expired by system',
          }));
        }
      }
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async generateBatchNo(enterpriseId: number): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.inventoryRepo
      .createQueryBuilder('wi')
      .where('wi.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('wi.batchNo LIKE :prefix', { prefix: `WST-${year}-%` })
      .orderBy('wi.id', 'DESC')
      .getOne();

    let seq = 1;
    if (last) {
      const parts = last.batchNo.split('-');
      seq = parseInt(parts[parts.length - 1]) + 1;
    }
    return `WST-${year}-${String(seq).padStart(5, '0')}`;
  }
}

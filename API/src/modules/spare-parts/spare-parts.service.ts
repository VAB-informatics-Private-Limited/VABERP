import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { SparePart } from './entities/spare-part.entity';
import { MachineSpareMap } from './entities/machine-spare-map.entity';
import { MachineSpare } from './entities/machine-spare.entity';
import { Machine } from '../machines/entities/machine.entity';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { SuggestSparesDto } from './dto/suggest-spares.dto';
import { MachineSpareItemDto } from './dto/save-machine-spares.dto';
import { UpsertMapDto } from './dto/upsert-map.dto';

@Injectable()
export class SparePartsService {
  constructor(
    @InjectRepository(SparePart) private sparePartRepo: Repository<SparePart>,
    @InjectRepository(MachineSpareMap) private mapRepo: Repository<MachineSpareMap>,
    @InjectRepository(MachineSpare) private machineSpareRepo: Repository<MachineSpare>,
    @InjectRepository(Machine) private machineRepo: Repository<Machine>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  // ─── Spare Parts CRUD ────────────────────────────────────────────────────

  async listSpareParts(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    supplierId?: number,
  ) {
    const q = this.sparePartRepo.createQueryBuilder('sp')
      .leftJoinAndSelect('sp.supplier', 's')
      .where('sp.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) q.andWhere('sp.status = :status', { status });
    if (supplierId) q.andWhere('sp.supplierId = :supplierId', { supplierId });
    if (search) {
      q.andWhere(
        '(sp.name ILIKE :s OR sp.partCode ILIKE :s OR sp.oemPartNo ILIKE :s OR sp.altPartNo ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [data, total] = await q
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('sp.name', 'ASC')
      .getManyAndCount();

    return { message: 'Spare parts fetched', data, totalRecords: total, page };
  }

  async getSparePart(id: number, enterpriseId: number) {
    const sp = await this.sparePartRepo.findOne({
      where: { id, enterpriseId },
      relations: ['supplier'],
    });
    if (!sp) throw new NotFoundException('Spare part not found');
    return { message: 'Spare part fetched', data: sp };
  }

  async createSparePart(enterpriseId: number, dto: CreateSparePartDto, userId?: number) {
    const exists = await this.sparePartRepo.findOne({
      where: { enterpriseId, partCode: dto.partCode },
    });
    if (exists) throw new ConflictException('Part code already exists');

    const sp = this.sparePartRepo.create({ ...dto, enterpriseId, createdBy: userId });
    const saved = await this.sparePartRepo.save(sp);
    return { message: 'Spare part created', data: saved };
  }

  async updateSparePart(id: number, enterpriseId: number, dto: UpdateSparePartDto) {
    const sp = await this.sparePartRepo.findOne({ where: { id, enterpriseId } });
    if (!sp) throw new NotFoundException('Spare part not found');
    Object.assign(sp, dto);
    const saved = await this.sparePartRepo.save(sp);
    return { message: 'Spare part updated', data: saved };
  }

  async deleteSparePart(id: number, enterpriseId: number) {
    const sp = await this.sparePartRepo.findOne({ where: { id, enterpriseId } });
    if (!sp) throw new NotFoundException('Spare part not found');

    // Block deletion if still attached to any machine (defensive; DB also enforces RESTRICT)
    const inUse = await this.machineSpareRepo.count({ where: { sparePartId: id, enterpriseId } });
    if (inUse > 0) {
      throw new ConflictException(
        `Spare part is attached to ${inUse} machine(s). Remove attachments first.`,
      );
    }

    await this.sparePartRepo.remove(sp);
    return { message: 'Spare part deleted' };
  }

  // ─── Template (machine_spare_map) ────────────────────────────────────────

  async listMap(enterpriseId: number, modelNumber?: string, categoryId?: number) {
    const q = this.mapRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.sparePart', 'sp')
      .leftJoinAndSelect('m.category', 'cat')
      .where('m.enterpriseId = :enterpriseId', { enterpriseId });

    if (modelNumber) q.andWhere('m.modelNumber = :modelNumber', { modelNumber });
    if (categoryId) q.andWhere('m.categoryId = :categoryId', { categoryId });

    const data = await q.orderBy('m.priority', 'ASC').addOrderBy('sp.name', 'ASC').getMany();
    return { message: 'Template mappings fetched', data };
  }

  async upsertMap(enterpriseId: number, dto: UpsertMapDto, userId?: number) {
    if (!dto.modelNumber && !dto.categoryId) {
      throw new BadRequestException('Either modelNumber or categoryId must be provided');
    }

    // Validate spare part belongs to enterprise
    const sp = await this.sparePartRepo.findOne({
      where: { id: dto.sparePartId, enterpriseId },
    });
    if (!sp) throw new NotFoundException('Spare part not found');

    // Try find existing row at same scope
    const where = dto.modelNumber
      ? { enterpriseId, modelNumber: dto.modelNumber, sparePartId: dto.sparePartId }
      : { enterpriseId, categoryId: dto.categoryId!, sparePartId: dto.sparePartId };

    const existing = await this.mapRepo.findOne({ where: where as any });

    if (existing) {
      Object.assign(existing, {
        defaultQuantity: dto.defaultQuantity ?? existing.defaultQuantity,
        isMandatory: dto.isMandatory ?? existing.isMandatory,
        notes: dto.notes ?? existing.notes,
        priority: dto.priority ?? existing.priority,
      });
      const saved = await this.mapRepo.save(existing);
      return { message: 'Template mapping updated', data: saved };
    }

    const row = this.mapRepo.create({
      enterpriseId,
      sparePartId: dto.sparePartId,
      modelNumber: dto.modelNumber ?? null,
      categoryId: dto.categoryId ?? null,
      defaultQuantity: dto.defaultQuantity ?? 1,
      isMandatory: dto.isMandatory ?? false,
      notes: dto.notes ?? null,
      priority: dto.priority ?? 100,
      createdBy: userId,
    });
    const saved = await this.mapRepo.save(row);
    return { message: 'Template mapping created', data: saved };
  }

  async upsertMapBulk(enterpriseId: number, items: UpsertMapDto[], userId?: number) {
    const results: MachineSpareMap[] = [];
    for (const item of items) {
      const r = await this.upsertMap(enterpriseId, item, userId);
      results.push(r.data as MachineSpareMap);
    }
    return { message: `Upserted ${results.length} template mappings`, data: results };
  }

  async deleteMap(id: number, enterpriseId: number) {
    const row = await this.mapRepo.findOne({ where: { id, enterpriseId } });
    if (!row) throw new NotFoundException('Template mapping not found');
    await this.mapRepo.remove(row);
    return { message: 'Template mapping deleted' };
  }

  // ─── Suggestion (model-first, category fallback) ─────────────────────────

  async suggestForNewMachine(enterpriseId: number, dto: SuggestSparesDto) {
    if (!dto.modelNumber && !dto.categoryId) {
      return { message: 'No scope provided', data: { source: 'none', items: [] } };
    }

    // 1. Try model-based template first
    if (dto.modelNumber) {
      const rows = await this.mapRepo.createQueryBuilder('m')
        .innerJoinAndSelect('m.sparePart', 'sp')
        .where('m.enterpriseId = :eid', { eid: enterpriseId })
        .andWhere('m.modelNumber = :mn', { mn: dto.modelNumber })
        .andWhere('sp.status = :active', { active: 'active' })
        .orderBy('m.priority', 'ASC')
        .addOrderBy('sp.name', 'ASC')
        .getMany();

      if (rows.length) {
        return {
          message: 'Suggestions from model template',
          data: { source: 'model', items: rows.map(this.toSuggestionRow) },
        };
      }
    }

    // 2. Fallback to category
    if (dto.categoryId) {
      const rows = await this.mapRepo.createQueryBuilder('m')
        .innerJoinAndSelect('m.sparePart', 'sp')
        .where('m.enterpriseId = :eid', { eid: enterpriseId })
        .andWhere('m.categoryId = :cid', { cid: dto.categoryId })
        .andWhere('sp.status = :active', { active: 'active' })
        .orderBy('m.priority', 'ASC')
        .addOrderBy('sp.name', 'ASC')
        .getMany();

      if (rows.length) {
        return {
          message: 'Suggestions from category template',
          data: { source: 'category', items: rows.map(this.toSuggestionRow) },
        };
      }
    }

    return { message: 'No template found', data: { source: 'none', items: [] } };
  }

  private toSuggestionRow = (m: MachineSpareMap) => ({
    sparePartId: m.sparePartId,
    partCode: m.sparePart?.partCode,
    name: m.sparePart?.name,
    unit: m.sparePart?.unit,
    defaultQuantity: Number(m.defaultQuantity),
    isMandatory: m.isMandatory,
    notes: m.notes,
    currentStock: Number(m.sparePart?.currentStock ?? 0),
    manufacturer: m.sparePart?.manufacturer,
    oemPartNo: m.sparePart?.oemPartNo,
  });

  // ─── Per-machine spare parts ─────────────────────────────────────────────

  async listMachineSpares(machineId: number, enterpriseId: number) {
    const machine = await this.machineRepo.findOne({ where: { id: machineId, enterpriseId } });
    if (!machine) throw new NotFoundException('Machine not found');

    const data = await this.machineSpareRepo.find({
      where: { machineId, enterpriseId },
      relations: ['sparePart'],
      order: { createdDate: 'ASC' },
    });
    return { message: 'Machine spares fetched', data };
  }

  async saveMachineSpares(
    machineId: number,
    enterpriseId: number,
    items: MachineSpareItemDto[],
    userId?: number,
  ) {
    const machine = await this.machineRepo.findOne({ where: { id: machineId, enterpriseId } });
    if (!machine) throw new NotFoundException('Machine not found');

    // De-duplicate within payload (last write wins per sparePartId)
    const byId = new Map<number, MachineSpareItemDto>();
    for (const it of items ?? []) {
      if (!it.sparePartId || !it.quantity || it.quantity <= 0) continue;
      byId.set(it.sparePartId, it);
    }
    const clean = [...byId.values()];

    // Validate every spare_part_id belongs to this enterprise and is active
    if (clean.length) {
      const ids = clean.map((c) => c.sparePartId);
      const valid = await this.sparePartRepo.count({
        where: { id: In(ids), enterpriseId, status: 'active' },
      });
      if (valid !== ids.length) {
        throw new BadRequestException('One or more spare parts are invalid or discontinued');
      }
    }

    return this.dataSource.transaction(async (trx) => {
      await trx.getRepository(MachineSpare).delete({ machineId, enterpriseId });

      if (!clean.length) {
        return { message: 'Machine spares cleared', data: [] };
      }

      const rows = clean.map((it) =>
        trx.getRepository(MachineSpare).create({
          enterpriseId,
          machineId,
          sparePartId: it.sparePartId,
          quantity: it.quantity,
          source: it.source ?? 'manual',
          notes: it.notes ?? null,
          createdBy: userId,
        }),
      );
      const saved = await trx.getRepository(MachineSpare).save(rows);
      return { message: 'Machine spares saved', data: saved };
    });
  }

  async addMachineSpare(
    machineId: number,
    enterpriseId: number,
    item: MachineSpareItemDto,
    userId?: number,
  ) {
    const machine = await this.machineRepo.findOne({ where: { id: machineId, enterpriseId } });
    if (!machine) throw new NotFoundException('Machine not found');

    const sp = await this.sparePartRepo.findOne({
      where: { id: item.sparePartId, enterpriseId, status: 'active' },
    });
    if (!sp) throw new NotFoundException('Spare part not found or discontinued');

    const existing = await this.machineSpareRepo.findOne({
      where: { machineId, sparePartId: item.sparePartId },
    });
    if (existing) {
      existing.quantity = item.quantity;
      if (item.notes !== undefined) existing.notes = item.notes ?? null;
      const saved = await this.machineSpareRepo.save(existing);
      return { message: 'Machine spare updated', data: saved };
    }

    const row = this.machineSpareRepo.create({
      enterpriseId,
      machineId,
      sparePartId: item.sparePartId,
      quantity: item.quantity,
      source: item.source ?? 'manual',
      notes: item.notes ?? null,
      createdBy: userId,
    });
    const saved = await this.machineSpareRepo.save(row);
    return { message: 'Machine spare added', data: saved };
  }

  async updateMachineSpare(
    machineId: number,
    enterpriseId: number,
    sparePartId: number,
    dto: { quantity?: number; notes?: string },
  ) {
    const row = await this.machineSpareRepo.findOne({
      where: { machineId, sparePartId, enterpriseId },
    });
    if (!row) throw new NotFoundException('Machine spare not found');
    if (dto.quantity !== undefined) {
      if (dto.quantity <= 0) throw new BadRequestException('Quantity must be positive');
      row.quantity = dto.quantity;
    }
    if (dto.notes !== undefined) row.notes = dto.notes ?? null;
    const saved = await this.machineSpareRepo.save(row);
    return { message: 'Machine spare updated', data: saved };
  }

  async deleteMachineSpare(machineId: number, enterpriseId: number, sparePartId: number) {
    const row = await this.machineSpareRepo.findOne({
      where: { machineId, sparePartId, enterpriseId },
    });
    if (!row) throw new NotFoundException('Machine spare not found');
    await this.machineSpareRepo.remove(row);
    return { message: 'Machine spare removed' };
  }

  async saveAsTemplate(
    machineId: number,
    enterpriseId: number,
    scope: 'model' | 'category',
    userId?: number,
  ) {
    const machine = await this.machineRepo.findOne({ where: { id: machineId, enterpriseId } });
    if (!machine) throw new NotFoundException('Machine not found');

    if (scope === 'model' && !machine.modelNumber) {
      throw new BadRequestException('Machine has no model number to use as template scope');
    }
    if (scope === 'category' && !machine.categoryId) {
      throw new BadRequestException('Machine has no category to use as template scope');
    }

    const spares = await this.machineSpareRepo.find({ where: { machineId, enterpriseId } });
    if (!spares.length) {
      return { message: 'No spares to save as template', data: { upserted: 0 } };
    }

    let upserted = 0;
    await this.dataSource.transaction(async (trx) => {
      const repo = trx.getRepository(MachineSpareMap);
      for (const s of spares) {
        const where = scope === 'model'
          ? { enterpriseId, modelNumber: machine.modelNumber!, sparePartId: s.sparePartId }
          : { enterpriseId, categoryId: machine.categoryId!, sparePartId: s.sparePartId };

        const existing = await repo.findOne({ where: where as any });
        if (existing) {
          existing.defaultQuantity = s.quantity;
          await repo.save(existing);
        } else {
          const row = repo.create({
            enterpriseId,
            sparePartId: s.sparePartId,
            modelNumber: scope === 'model' ? machine.modelNumber : null,
            categoryId: scope === 'category' ? machine.categoryId : null,
            defaultQuantity: s.quantity,
            createdBy: userId,
          });
          await repo.save(row);
        }
        upserted++;
      }
    });

    const scopeLabel = scope === 'model'
      ? `model ${machine.modelNumber}`
      : `category #${machine.categoryId}`;
    return { message: `Saved ${upserted} parts as template for ${scopeLabel}`, data: { upserted } };
  }
}

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from './entities/machine.entity';
import { MachineCategory } from './entities/machine-category.entity';
import { MachineMeterLog } from './entities/machine-meter-log.entity';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine) private machineRepo: Repository<Machine>,
    @InjectRepository(MachineCategory) private categoryRepo: Repository<MachineCategory>,
    @InjectRepository(MachineMeterLog) private meterRepo: Repository<MachineMeterLog>,
  ) {}

  // ─── Categories ────────────────────────────────────────────────────────────

  async getCategories(enterpriseId: number) {
    const data = await this.categoryRepo.find({
      where: { enterpriseId },
      order: { name: 'ASC' },
    });
    return { message: 'Categories fetched', data };
  }

  async createCategory(enterpriseId: number, dto: any) {
    const cat = this.categoryRepo.create({ ...dto, enterpriseId });
    const saved = await this.categoryRepo.save(cat);
    return { message: 'Category created', data: saved };
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
    await this.categoryRepo.remove(cat);
    return { message: 'Category deleted' };
  }

  // ─── Machines ──────────────────────────────────────────────────────────────

  async findAll(enterpriseId: number, page = 1, limit = 20, search?: string, status?: string, categoryId?: number) {
    const q = this.machineRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'cat')
      .where('m.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) q.andWhere('m.status = :status', { status });
    if (categoryId) q.andWhere('m.categoryId = :categoryId', { categoryId });
    if (search) q.andWhere('(m.name ILIKE :s OR m.machineCode ILIKE :s OR m.serialNumber ILIKE :s)', { s: `%${search}%` });

    const [data, total] = await q.skip((page - 1) * limit).take(limit).orderBy('m.createdDate', 'DESC').getManyAndCount();
    return { message: 'Machines fetched', data, totalRecords: total, page };
  }

  async findOne(id: number, enterpriseId: number) {
    const m = await this.machineRepo.findOne({
      where: { id, enterpriseId },
      relations: ['category', 'meterLogs'],
    });
    if (!m) throw new NotFoundException('Machine not found');
    return { message: 'Machine fetched', data: m };
  }

  async create(enterpriseId: number, dto: any, userId?: number) {
    // Ensure unique machine code within enterprise
    const existing = await this.machineRepo.findOne({ where: { machineCode: dto.machineCode, enterpriseId } });
    if (existing) throw new ConflictException('Machine code already exists');

    const m = this.machineRepo.create({ ...dto, enterpriseId, createdBy: userId });
    return { message: 'Machine created', data: await this.machineRepo.save(m) };
  }

  async update(id: number, enterpriseId: number, dto: any) {
    const m = await this.machineRepo.findOne({ where: { id, enterpriseId } });
    if (!m) throw new NotFoundException('Machine not found');
    Object.assign(m, dto);
    return { message: 'Machine updated', data: await this.machineRepo.save(m) };
  }

  async delete(id: number, enterpriseId: number) {
    const m = await this.machineRepo.findOne({ where: { id, enterpriseId } });
    if (!m) throw new NotFoundException('Machine not found');
    await this.machineRepo.remove(m);
    return { message: 'Machine deleted' };
  }

  // ─── Meter Readings ────────────────────────────────────────────────────────

  async updateMeterReading(id: number, enterpriseId: number, dto: { readingValue: number; readingDate: string; notes?: string }, userId?: number) {
    const m = await this.machineRepo.findOne({ where: { id, enterpriseId } });
    if (!m) throw new NotFoundException('Machine not found');

    // Log the reading
    const log = this.meterRepo.create({
      machineId: id, enterpriseId,
      readingValue: dto.readingValue,
      readingDate: new Date(dto.readingDate),
      recordedBy: userId,
      source: 'manual',
      notes: dto.notes,
    });
    await this.meterRepo.save(log);

    // Update current reading on machine
    if (dto.readingValue > m.currentMeterReading) {
      await this.machineRepo.update(id, { currentMeterReading: dto.readingValue });
    }

    return { message: 'Meter reading recorded', data: log };
  }

  async getMeterLogs(machineId: number, enterpriseId: number) {
    const data = await this.meterRepo.find({
      where: { machineId, enterpriseId },
      order: { readingDate: 'DESC' },
      take: 50,
    });
    return { message: 'Meter logs fetched', data };
  }

  async getDashboardStats(enterpriseId: number) {
    const [total, active, underMaintenance, decommissioned] = await Promise.all([
      this.machineRepo.count({ where: { enterpriseId } }),
      this.machineRepo.count({ where: { enterpriseId, status: 'active' } }),
      this.machineRepo.count({ where: { enterpriseId, status: 'under_maintenance' } }),
      this.machineRepo.count({ where: { enterpriseId, status: 'decommissioned' } }),
    ]);
    return { message: 'Stats fetched', data: { total, active, underMaintenance, decommissioned } };
  }
}

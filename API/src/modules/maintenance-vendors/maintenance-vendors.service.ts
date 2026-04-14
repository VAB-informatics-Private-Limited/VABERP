import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { MaintenanceVendor } from './entities/maintenance-vendor.entity';
import { AmcContract } from './entities/amc-contract.entity';
import { VendorPerformanceLog } from './entities/vendor-performance-log.entity';

@Injectable()
export class MaintenanceVendorsService {
  constructor(
    @InjectRepository(MaintenanceVendor) private vendorRepo: Repository<MaintenanceVendor>,
    @InjectRepository(AmcContract) private amcRepo: Repository<AmcContract>,
    @InjectRepository(VendorPerformanceLog) private perfRepo: Repository<VendorPerformanceLog>,
  ) {}

  async findAll(enterpriseId: number, page = 1, limit = 20, search?: string, status?: string) {
    const q = this.vendorRepo.createQueryBuilder('v')
      .where('v.enterpriseId = :enterpriseId', { enterpriseId });
    if (status) q.andWhere('v.status = :status', { status });
    if (search) q.andWhere('(v.companyName ILIKE :s OR v.phone ILIKE :s OR v.email ILIKE :s)', { s: `%${search}%` });
    const [data, total] = await q.skip((page - 1) * limit).take(limit).orderBy('v.companyName', 'ASC').getManyAndCount();
    return { message: 'Vendors fetched', data, totalRecords: total, page };
  }

  async findOne(id: number, enterpriseId: number) {
    const v = await this.vendorRepo.findOne({
      where: { id, enterpriseId },
      relations: ['amcContracts', 'amcContracts.machine'],
    });
    if (!v) throw new NotFoundException('Vendor not found');
    return { message: 'Vendor fetched', data: v };
  }

  async create(enterpriseId: number, dto: any) {
    const v = this.vendorRepo.create({ ...dto, enterpriseId });
    return { message: 'Vendor created', data: await this.vendorRepo.save(v) };
  }

  async update(id: number, enterpriseId: number, dto: any) {
    const v = await this.vendorRepo.findOne({ where: { id, enterpriseId } });
    if (!v) throw new NotFoundException('Vendor not found');
    Object.assign(v, dto);
    return { message: 'Vendor updated', data: await this.vendorRepo.save(v) };
  }

  async delete(id: number, enterpriseId: number) {
    const v = await this.vendorRepo.findOne({ where: { id, enterpriseId } });
    if (!v) throw new NotFoundException('Vendor not found');
    await this.vendorRepo.remove(v);
    return { message: 'Vendor deleted' };
  }

  // ─── AMC Contracts ─────────────────────────────────────────────────────────

  async getAmcContracts(enterpriseId: number, vendorId?: number) {
    const q = this.amcRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.vendor', 'v')
      .leftJoinAndSelect('a.machine', 'm')
      .leftJoinAndSelect('a.category', 'cat')
      .where('a.enterpriseId = :enterpriseId', { enterpriseId });
    if (vendorId) q.andWhere('a.vendorId = :vendorId', { vendorId });
    const data = await q.orderBy('a.endDate', 'ASC').getMany();
    return { message: 'AMC contracts fetched', data };
  }

  async createAmcContract(enterpriseId: number, dto: any) {
    const amc = this.amcRepo.create({ ...dto, enterpriseId });
    return { message: 'AMC contract created', data: await this.amcRepo.save(amc) };
  }

  async updateAmcContract(id: number, enterpriseId: number, dto: any) {
    const amc = await this.amcRepo.findOne({ where: { id, enterpriseId } });
    if (!amc) throw new NotFoundException('AMC contract not found');
    Object.assign(amc, dto);
    return { message: 'AMC contract updated', data: await this.amcRepo.save(amc) };
  }

  async terminateAmcContract(id: number, enterpriseId: number) {
    const amc = await this.amcRepo.findOne({ where: { id, enterpriseId } });
    if (!amc) throw new NotFoundException('AMC contract not found');
    amc.status = 'terminated';
    return { message: 'AMC contract terminated', data: await this.amcRepo.save(amc) };
  }

  // Find active AMC for a machine + vendor
  async findActiveAmc(enterpriseId: number, vendorId: number, machineId: number): Promise<AmcContract | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.amcRepo.findOne({
      where: { enterpriseId, vendorId, machineId, status: 'active' },
    });
  }

  // ─── Performance ───────────────────────────────────────────────────────────

  async getPerformance(vendorId: number, enterpriseId: number) {
    const logs = await this.perfRepo.find({
      where: { vendorId, enterpriseId },
      order: { createdDate: 'DESC' },
      take: 20,
    });
    const avgScore = logs.length
      ? logs.reduce((s, l) => s + (l.qualityScore ?? 0), 0) / logs.filter(l => l.qualityScore).length
      : 0;
    const totalDelays = logs.reduce((s, l) => s + (l.delayDays ?? 0), 0);
    return { message: 'Performance fetched', data: { logs, avgScore, totalDelays } };
  }

  async logPerformance(enterpriseId: number, dto: any, userId?: number) {
    const log = this.perfRepo.create({ ...dto, enterpriseId, ratedBy: userId });
    const saved = await this.perfRepo.save(log);

    // Recompute vendor rating from last 10 quality scores
    const recent = await this.perfRepo.find({
      where: { vendorId: dto.vendorId, enterpriseId },
      order: { createdDate: 'DESC' },
      take: 10,
    });
    const scored = recent.filter(l => l.qualityScore != null);
    if (scored.length > 0) {
      const avg = scored.reduce((s, l) => s + l.qualityScore!, 0) / scored.length;
      await this.vendorRepo.update(dto.vendorId, { rating: avg });
    }

    return { message: 'Performance logged', data: saved };
  }

  async getExpiringAmcs(enterpriseId: number, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const data = await this.amcRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.vendor', 'v')
      .leftJoinAndSelect('a.machine', 'm')
      .where('a.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('a.status = :status', { status: 'active' })
      .andWhere('a.endDate <= :cutoff', { cutoff: cutoff.toISOString().split('T')[0] })
      .getMany();
    return { message: 'Expiring AMCs fetched', data };
  }
}

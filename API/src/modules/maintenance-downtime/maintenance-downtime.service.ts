import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DowntimeLog } from './entities/downtime-log.entity';

@Injectable()
export class MaintenanceDowntimeService {
  constructor(
    @InjectRepository(DowntimeLog) private downtimeRepo: Repository<DowntimeLog>,
  ) {}

  async findAll(enterpriseId: number, machineId?: number, from?: string, to?: string) {
    const q = this.downtimeRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.machine', 'm')
      .where('d.enterpriseId = :enterpriseId', { enterpriseId });
    if (machineId) q.andWhere('d.machineId = :machineId', { machineId });
    if (from) q.andWhere('d.downtimeStart >= :from', { from });
    if (to) q.andWhere('d.downtimeStart <= :to', { to });
    const data = await q.orderBy('d.downtimeStart', 'DESC').getMany();
    return { message: 'Downtime logs fetched', data };
  }

  async findOne(id: number, enterpriseId: number) {
    const d = await this.downtimeRepo.findOne({
      where: { id, enterpriseId },
      relations: ['machine'],
    });
    if (!d) throw new NotFoundException('Downtime log not found');
    return { message: 'Downtime log fetched', data: d };
  }

  async create(enterpriseId: number, dto: any, userId?: number) {
    const logData: any = { ...dto, enterpriseId, loggedBy: userId };
    // Auto-calculate duration if both start and end provided
    if (dto.downtimeStart && dto.downtimeEnd) {
      const start = new Date(dto.downtimeStart);
      const end = new Date(dto.downtimeEnd);
      logData.durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    const log = this.downtimeRepo.create(logData);
    return { message: 'Downtime log created', data: await this.downtimeRepo.save(log) };
  }

  async update(id: number, enterpriseId: number, dto: any) {
    const d = await this.downtimeRepo.findOne({ where: { id, enterpriseId } });
    if (!d) throw new NotFoundException('Downtime log not found');
    Object.assign(d, dto);
    // Recalculate duration
    if (d.downtimeStart && d.downtimeEnd) {
      const start = new Date(d.downtimeStart);
      const end = new Date(d.downtimeEnd);
      (d as any).durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    return { message: 'Downtime log updated', data: await this.downtimeRepo.save(d) };
  }

  async delete(id: number, enterpriseId: number) {
    const d = await this.downtimeRepo.findOne({ where: { id, enterpriseId } });
    if (!d) throw new NotFoundException('Downtime log not found');
    await this.downtimeRepo.remove(d);
    return { message: 'Downtime log deleted' };
  }

  async getStats(enterpriseId: number, machineId?: number, from?: string, to?: string) {
    const q = this.downtimeRepo.createQueryBuilder('d')
      .where('d.enterpriseId = :enterpriseId', { enterpriseId });
    if (machineId) q.andWhere('d.machineId = :machineId', { machineId });
    if (from) q.andWhere('d.downtimeStart >= :from', { from });
    if (to) q.andWhere('d.downtimeStart <= :to', { to });

    const logs = await q.getMany();
    const totalEvents = logs.length;
    const totalMinutes = logs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
    const byReason: Record<string, number> = {};
    for (const l of logs) {
      byReason[l.reasonCode] = (byReason[l.reasonCode] ?? 0) + (l.durationMinutes ?? 0);
    }
    return { message: 'Downtime stats fetched', data: { totalEvents, totalMinutes, byReason } };
  }
}

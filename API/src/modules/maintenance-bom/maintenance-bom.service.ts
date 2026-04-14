import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BomTemplate } from './entities/bom-template.entity';
import { BomLine } from './entities/bom-line.entity';

@Injectable()
export class MaintenanceBomService {
  constructor(
    @InjectRepository(BomTemplate) private templateRepo: Repository<BomTemplate>,
    @InjectRepository(BomLine) private lineRepo: Repository<BomLine>,
  ) {}

  async findAll(enterpriseId: number, machineId?: number, categoryId?: number, serviceType?: string) {
    const q = this.templateRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.machine', 'm')
      .leftJoinAndSelect('t.category', 'cat')
      .leftJoinAndSelect('t.lines', 'l')
      .leftJoinAndSelect('l.rawMaterial', 'rm')
      .where('t.enterpriseId = :enterpriseId', { enterpriseId });
    if (machineId) q.andWhere('t.machineId = :machineId', { machineId });
    if (categoryId) q.andWhere('t.categoryId = :categoryId', { categoryId });
    if (serviceType) q.andWhere('t.serviceType = :serviceType', { serviceType });
    const data = await q.orderBy('t.name', 'ASC').getMany();
    return { message: 'BOM templates fetched', data };
  }

  async findOne(id: number, enterpriseId: number) {
    const t = await this.templateRepo.findOne({
      where: { id, enterpriseId },
      relations: ['machine', 'category', 'lines', 'lines.rawMaterial'],
    });
    if (!t) throw new NotFoundException('BOM template not found');
    return { message: 'BOM template fetched', data: t };
  }

  async create(enterpriseId: number, dto: any, userId?: number) {
    const { lines, ...rest } = dto;
    const template = this.templateRepo.create({ ...rest, enterpriseId, createdBy: userId });
    const saved = await this.templateRepo.save(template) as unknown as BomTemplate;

    if (lines?.length) {
      const lineEntities = lines.map((l: any) =>
        this.lineRepo.create({ ...l, templateId: saved.id, enterpriseId }),
      );
      await this.lineRepo.save(lineEntities);
      (saved as any).lines = lineEntities;
    }

    return { message: 'BOM template created', data: saved };
  }

  async update(id: number, enterpriseId: number, dto: any) {
    const t = await this.templateRepo.findOne({ where: { id, enterpriseId } });
    if (!t) throw new NotFoundException('BOM template not found');
    const { lines, ...rest } = dto;
    Object.assign(t, rest);
    const saved = await this.templateRepo.save(t);

    if (lines !== undefined) {
      // Replace all lines
      await this.lineRepo.delete({ templateId: id });
      if (lines.length) {
        const lineEntities = lines.map((l: any) =>
          this.lineRepo.create({ ...l, templateId: id, enterpriseId }),
        );
        await this.lineRepo.save(lineEntities);
      }
    }

    return { message: 'BOM template updated', data: saved };
  }

  async delete(id: number, enterpriseId: number) {
    const t = await this.templateRepo.findOne({ where: { id, enterpriseId } });
    if (!t) throw new NotFoundException('BOM template not found');
    await this.templateRepo.remove(t);
    return { message: 'BOM template deleted' };
  }

  // Return lines for a template (used when creating work order)
  async getLines(templateId: number, enterpriseId: number) {
    const t = await this.templateRepo.findOne({ where: { id: templateId, enterpriseId } });
    if (!t) throw new NotFoundException('BOM template not found');
    const data = await this.lineRepo.find({
      where: { templateId },
      relations: ['rawMaterial'],
    });
    return { message: 'BOM lines fetched', data };
  }
}

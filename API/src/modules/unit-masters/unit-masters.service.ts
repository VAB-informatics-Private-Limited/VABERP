import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitMaster } from './entities/unit-master.entity';
import { CreateUnitMasterDto } from './dto/create-unit-master.dto';

@Injectable()
export class UnitMastersService {
  constructor(
    @InjectRepository(UnitMaster)
    private unitMasterRepository: Repository<UnitMaster>,
  ) {}

  async findAll(enterpriseId: number) {
    const data = await this.unitMasterRepository.find({
      where: { enterpriseId },
      order: { sortOrder: 'ASC', unitName: 'ASC' },
    });

    return {
      message: 'Unit masters fetched successfully',
      data,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const unit = await this.unitMasterRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!unit) {
      throw new NotFoundException('Unit master not found');
    }

    return {
      message: 'Unit master fetched successfully',
      data: unit,
    };
  }

  async create(enterpriseId: number, createDto: CreateUnitMasterDto) {
    // Auto-calculate sort order if not provided
    if (createDto.sortOrder === undefined) {
      const maxOrder = await this.unitMasterRepository
        .createQueryBuilder('unit')
        .where('unit.enterpriseId = :enterpriseId', { enterpriseId })
        .select('MAX(unit.sortOrder)', 'max')
        .getRawOne();
      createDto.sortOrder = (maxOrder?.max || 0) + 1;
    }

    const unit = this.unitMasterRepository.create({
      enterpriseId,
      ...createDto,
    });

    const saved = await this.unitMasterRepository.save(unit);

    return {
      message: 'Unit master created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateUnitMasterDto>) {
    const unit = await this.unitMasterRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!unit) {
      throw new NotFoundException('Unit master not found');
    }

    await this.unitMasterRepository.update(id, updateDto);

    const updated = await this.unitMasterRepository.findOne({ where: { id } });

    return {
      message: 'Unit master updated successfully',
      data: updated,
    };
  }

  async delete(id: number, enterpriseId: number) {
    const unit = await this.unitMasterRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!unit) {
      throw new NotFoundException('Unit master not found');
    }

    await this.unitMasterRepository.delete(id);

    return {
      message: 'Unit master deleted successfully',
      data: null,
    };
  }

  async seedDefaults(enterpriseId: number) {
    const existing = await this.unitMasterRepository.count({ where: { enterpriseId } });
    if (existing > 0) {
      return { message: 'Default units already exist', data: null };
    }

    const defaults = [
      { unitName: 'Pieces', shortName: 'Pcs', sortOrder: 1 },
      { unitName: 'Numbers', shortName: 'Nos', sortOrder: 2 },
      { unitName: 'Kilograms', shortName: 'Kg', sortOrder: 3 },
      { unitName: 'Grams', shortName: 'g', sortOrder: 4 },
      { unitName: 'Litres', shortName: 'Ltr', sortOrder: 5 },
      { unitName: 'Millilitres', shortName: 'ml', sortOrder: 6 },
      { unitName: 'Meters', shortName: 'Mtr', sortOrder: 7 },
      { unitName: 'Centimeters', shortName: 'cm', sortOrder: 8 },
      { unitName: 'Millimeters', shortName: 'mm', sortOrder: 9 },
      { unitName: 'Feet', shortName: 'Ft', sortOrder: 10 },
      { unitName: 'Inches', shortName: 'In', sortOrder: 11 },
      { unitName: 'Set', shortName: 'Set', sortOrder: 12 },
      { unitName: 'Pair', shortName: 'Pair', sortOrder: 13 },
      { unitName: 'Box', shortName: 'Box', sortOrder: 14 },
      { unitName: 'Carton', shortName: 'Carton', sortOrder: 15 },
      { unitName: 'Roll', shortName: 'Roll', sortOrder: 16 },
      { unitName: 'Sheet', shortName: 'Sheet', sortOrder: 17 },
      { unitName: 'Bundle', shortName: 'Bundle', sortOrder: 18 },
      { unitName: 'Packet', shortName: 'Packet', sortOrder: 19 },
      { unitName: 'Dozen', shortName: 'Dozen', sortOrder: 20 },
    ];

    const units = defaults.map((d) =>
      this.unitMasterRepository.create({ enterpriseId, ...d, isActive: true }),
    );

    const saved = await this.unitMasterRepository.save(units);

    return {
      message: 'Default units seeded successfully',
      data: saved,
    };
  }
}

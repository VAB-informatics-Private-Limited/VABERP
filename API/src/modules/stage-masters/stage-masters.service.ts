import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageMaster } from './entities/stage-master.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { CreateStageMasterDto } from './dto/create-stage-master.dto';

@Injectable()
export class StageMastersService {
  constructor(
    @InjectRepository(StageMaster)
    private stageMasterRepository: Repository<StageMaster>,
    @InjectRepository(JobCard)
    private jobCardRepository: Repository<JobCard>,
  ) {}

  async findAll(enterpriseId: number) {
    const data = await this.stageMasterRepository.find({
      where: { enterpriseId },
      order: { sortOrder: 'ASC', stageName: 'ASC' },
    });

    return {
      message: 'Stage masters fetched successfully',
      data,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const stage = await this.stageMasterRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!stage) {
      throw new NotFoundException('Stage master not found');
    }

    return {
      message: 'Stage master fetched successfully',
      data: stage,
    };
  }

  async create(enterpriseId: number, createDto: CreateStageMasterDto) {
    // Auto-calculate sort order if not provided
    if (createDto.sortOrder === undefined) {
      const maxOrder = await this.stageMasterRepository
        .createQueryBuilder('stage')
        .where('stage.enterpriseId = :enterpriseId', { enterpriseId })
        .select('MAX(stage.sortOrder)', 'max')
        .getRawOne();
      createDto.sortOrder = (maxOrder?.max || 0) + 1;
    }

    const stage = this.stageMasterRepository.create({
      enterpriseId,
      ...createDto,
    });

    const saved = await this.stageMasterRepository.save(stage);

    return {
      message: 'Stage master created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateStageMasterDto>) {
    const stage = await this.stageMasterRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!stage) {
      throw new NotFoundException('Stage master not found');
    }

    await this.stageMasterRepository.update(id, updateDto);

    const updated = await this.stageMasterRepository.findOne({ where: { id } });

    return {
      message: 'Stage master updated successfully',
      data: updated,
    };
  }

  async delete(id: number, enterpriseId: number) {
    const stage = await this.stageMasterRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!stage) {
      throw new NotFoundException('Stage master not found');
    }

    // Nullify references in job cards before deleting
    await this.jobCardRepository
      .createQueryBuilder()
      .update(JobCard)
      .set({ stageMasterId: null as any })
      .where('stageMasterId = :id', { id })
      .execute();

    await this.stageMasterRepository.delete(id);

    return {
      message: 'Stage master deleted successfully',
      data: null,
    };
  }

  async seedDefaults(enterpriseId: number) {
    const existing = await this.stageMasterRepository.count({ where: { enterpriseId } });
    if (existing > 0) {
      return { message: 'Default stages already exist', data: null };
    }

    const defaults = [
      { stageName: 'Material Received', sortOrder: 1 },
      { stageName: 'Manufacturing Started', sortOrder: 2 },
      { stageName: 'Manufacturing Done', sortOrder: 3 },
      { stageName: 'Assembly Started', sortOrder: 4 },
      { stageName: 'Assembly Done', sortOrder: 5 },
      { stageName: 'Testing', sortOrder: 6 },
      { stageName: 'Packing', sortOrder: 7 },
      { stageName: 'Dispatch', sortOrder: 8 },
    ];

    const stages = defaults.map((d) =>
      this.stageMasterRepository.create({ enterpriseId, ...d, isActive: true }),
    );

    const saved = await this.stageMasterRepository.save(stages);

    return {
      message: 'Default stages seeded successfully',
      data: saved,
    };
  }
}

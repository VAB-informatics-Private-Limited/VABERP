import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestStatus } from './entities/interest-status.entity';
import { CreateInterestStatusDto } from './dto/create-interest-status.dto';
import { UpdateInterestStatusDto } from './dto/update-interest-status.dto';

@Injectable()
export class InterestStatusesService {
  constructor(
    @InjectRepository(InterestStatus)
    private statusRepository: Repository<InterestStatus>,
  ) {}

  async findAll(enterpriseId: number) {
    const data = await this.statusRepository.find({
      where: { enterpriseId },
      order: { sequenceOrder: 'ASC' },
    });

    return {
      message: 'Interest statuses fetched successfully',
      data,
    };
  }

  async create(enterpriseId: number, createDto: CreateInterestStatusDto) {
    const status = this.statusRepository.create({
      ...createDto,
      enterpriseId,
    });

    const saved = await this.statusRepository.save(status);

    return {
      message: 'Interest status created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: UpdateInterestStatusDto) {
    const status = await this.statusRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!status) {
      throw new NotFoundException('Interest status not found');
    }

    if (updateDto.statusName !== undefined) status.statusName = updateDto.statusName;
    if (updateDto.statusCode !== undefined) status.statusCode = updateDto.statusCode;
    if (updateDto.color !== undefined) status.color = updateDto.color;
    if (updateDto.sequenceOrder !== undefined) status.sequenceOrder = updateDto.sequenceOrder;
    if (updateDto.isActive !== undefined) status.isActive = updateDto.isActive;

    const saved = await this.statusRepository.save(status);

    return {
      message: 'Interest status updated successfully',
      data: saved,
    };
  }

  async delete(id: number, enterpriseId: number) {
    const status = await this.statusRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!status) {
      throw new NotFoundException('Interest status not found');
    }

    await this.statusRepository.delete(id);

    return {
      message: 'Interest status deleted successfully',
      data: null,
    };
  }
}

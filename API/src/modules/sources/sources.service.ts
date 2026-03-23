import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Source } from './entities/source.entity';
import { Enquiry } from '../enquiries/entities/enquiry.entity';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(Source)
    private sourceRepository: Repository<Source>,
    @InjectRepository(Enquiry)
    private enquiryRepository: Repository<Enquiry>,
  ) {}

  async findAll(enterpriseId: number) {
    const data = await this.sourceRepository.find({
      where: { enterpriseId },
      order: { sequenceOrder: 'ASC' },
    });

    return {
      message: 'Sources fetched successfully',
      data,
    };
  }

  async create(enterpriseId: number, createDto: CreateSourceDto) {
    const source = this.sourceRepository.create({
      ...createDto,
      enterpriseId,
    });

    const saved = await this.sourceRepository.save(source);

    return {
      message: 'Source created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: UpdateSourceDto) {
    const source = await this.sourceRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    if (updateDto.sourceName !== undefined) source.sourceName = updateDto.sourceName;
    if (updateDto.sourceCode !== undefined) source.sourceCode = updateDto.sourceCode;
    if (updateDto.sequenceOrder !== undefined) source.sequenceOrder = updateDto.sequenceOrder;
    if (updateDto.isActive !== undefined) source.isActive = updateDto.isActive;

    const saved = await this.sourceRepository.save(source);

    return {
      message: 'Source updated successfully',
      data: saved,
    };
  }

  async delete(id: number, enterpriseId: number) {
    const source = await this.sourceRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    // Check if source is in use by any enquiry
    const inUseCount = await this.enquiryRepository.count({
      where: { enterpriseId, source: source.sourceName },
    });

    if (inUseCount > 0) {
      throw new BadRequestException(
        `Cannot delete source "${source.sourceName}" because it is used by ${inUseCount} enquiry(ies). Deactivate it instead.`,
      );
    }

    await this.sourceRepository.delete(id);

    return {
      message: 'Source deleted successfully',
      data: null,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
  ) {}

  async findAll(enterpriseId: number) {
    const data = await this.templateRepository.find({
      where: { enterpriseId },
      order: { createdDate: 'DESC' },
    });

    return {
      message: 'Email templates fetched successfully',
      data,
    };
  }

  async create(enterpriseId: number, createDto: CreateEmailTemplateDto) {
    const template = this.templateRepository.create({
      ...createDto,
      enterpriseId,
    });

    const saved = await this.templateRepository.save(template);

    return {
      message: 'Email template created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: UpdateEmailTemplateDto) {
    const template = await this.templateRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    if (updateDto.templateName !== undefined) template.templateName = updateDto.templateName;
    if (updateDto.templateType !== undefined) template.templateType = updateDto.templateType;
    if (updateDto.subject !== undefined) template.subject = updateDto.subject;
    if (updateDto.body !== undefined) template.body = updateDto.body;
    if (updateDto.isActive !== undefined) template.isActive = updateDto.isActive;

    const saved = await this.templateRepository.save(template);

    return {
      message: 'Email template updated successfully',
      data: saved,
    };
  }

  async delete(id: number, enterpriseId: number) {
    const template = await this.templateRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    await this.templateRepository.delete(id);

    return {
      message: 'Email template deleted successfully',
      data: null,
    };
  }
}

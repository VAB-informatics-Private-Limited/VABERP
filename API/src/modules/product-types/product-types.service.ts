import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from './entities/product-type.entity';
import { ServiceRule } from './entities/service-rule.entity';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';

@Injectable()
export class ProductTypesService {
  constructor(
    @InjectRepository(ProductType)
    private productTypeRepo: Repository<ProductType>,
    @InjectRepository(ServiceRule)
    private serviceRuleRepo: Repository<ServiceRule>,
  ) {}

  async findAll(enterpriseId: number) {
    const data = await this.productTypeRepo.find({
      where: { enterpriseId },
      relations: ['serviceRules'],
      order: { name: 'ASC' },
    });
    return { message: 'Product types fetched successfully', data };
  }

  async findOne(id: number, enterpriseId: number) {
    const productType = await this.productTypeRepo.findOne({
      where: { id, enterpriseId },
      relations: ['serviceRules'],
    });
    if (!productType) throw new NotFoundException('Product type not found');
    return { message: 'Product type fetched successfully', data: productType };
  }

  async create(enterpriseId: number, dto: CreateProductTypeDto) {
    const productType = this.productTypeRepo.create({
      enterpriseId,
      name: dto.name,
      warrantyMonths: dto.warrantyMonths ?? 12,
      description: dto.description,
    });
    const saved = await this.productTypeRepo.save(productType);

    if (dto.serviceRules?.length) {
      const rules = dto.serviceRules.map((r) =>
        this.serviceRuleRepo.create({ ...r, productTypeId: saved.id }),
      );
      await this.serviceRuleRepo.save(rules);
    }

    return this.findOne(saved.id, enterpriseId);
  }

  async update(id: number, enterpriseId: number, dto: UpdateProductTypeDto) {
    const productType = await this.productTypeRepo.findOne({ where: { id, enterpriseId } });
    if (!productType) throw new NotFoundException('Product type not found');

    Object.assign(productType, {
      name: dto.name ?? productType.name,
      warrantyMonths: dto.warrantyMonths ?? productType.warrantyMonths,
      description: dto.description ?? productType.description,
      status: dto.status ?? productType.status,
    });
    await this.productTypeRepo.save(productType);

    // Replace service rules if provided
    if (dto.serviceRules !== undefined) {
      await this.serviceRuleRepo.delete({ productTypeId: id });
      if (dto.serviceRules.length) {
        const rules = dto.serviceRules.map((r) =>
          this.serviceRuleRepo.create({ ...r, productTypeId: id }),
        );
        await this.serviceRuleRepo.save(rules);
      }
    }

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const productType = await this.productTypeRepo.findOne({ where: { id, enterpriseId } });
    if (!productType) throw new NotFoundException('Product type not found');
    await this.productTypeRepo.remove(productType);
    return { message: 'Product type deleted successfully' };
  }

  async findRules(productTypeId: number, enterpriseId: number) {
    const pt = await this.productTypeRepo.findOne({ where: { id: productTypeId, enterpriseId } });
    if (!pt) throw new NotFoundException('Product type not found');
    const rules = await this.serviceRuleRepo.find({
      where: { productTypeId },
      order: { dayOffset: 'ASC' },
    });
    return { message: 'Service rules fetched successfully', data: rules };
  }
}

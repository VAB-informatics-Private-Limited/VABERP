import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async findAll(enterpriseId: number, page = 1, limit = 20, status?: string) {
    const query = this.supplierRepository
      .createQueryBuilder('s')
      .where('s.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('s.status = :status', { status });

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('s.createdDate', 'DESC')
      .getManyAndCount();

    return { message: 'Suppliers fetched successfully', data, totalRecords: total, page: pageNum, limit: limitNum };
  }

  async findOne(id: number, enterpriseId: number) {
    const supplier = await this.supplierRepository.findOne({ where: { id, enterpriseId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return { message: 'Supplier fetched successfully', data: supplier };
  }

  async create(enterpriseId: number, dto: CreateSupplierDto) {
    const count = await this.supplierRepository.count({ where: { enterpriseId } });
    const supplierCode = `SUP-${String(count + 1).padStart(6, '0')}`;

    const supplier = this.supplierRepository.create({
      enterpriseId,
      supplierCode,
      supplierName: dto.supplierName,
      contactPerson: dto.contactPerson,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      gstNumber: dto.gstNumber,
      paymentTerms: dto.paymentTerms,
      status: dto.status || 'active',
      notes: dto.notes,
    });

    const saved = await this.supplierRepository.save(supplier);
    return { message: 'Supplier created successfully', data: Array.isArray(saved) ? saved[0] : saved };
  }

  async update(id: number, enterpriseId: number, dto: Partial<CreateSupplierDto>) {
    const supplier = await this.supplierRepository.findOne({ where: { id, enterpriseId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    await this.supplierRepository.update(id, dto);
    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const supplier = await this.supplierRepository.findOne({ where: { id, enterpriseId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    await this.supplierRepository.delete(id);
    return { message: 'Supplier deleted successfully', data: null };
  }
}

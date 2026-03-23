import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async findAll(enterpriseId: number, page = 1, limit = 20, search?: string, dataStartDate?: Date | null) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(customer.customerName ILIKE :search OR customer.mobile ILIKE :search OR customer.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dataStartDate) {
      query.andWhere('customer.createdDate >= :dataStartDate', { dataStartDate });
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('customer.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Customers fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      message: 'Customer fetched successfully',
      data: customer,
    };
  }

  async create(enterpriseId: number, createDto: any) {
    const customer = this.customerRepository.create({
      ...createDto,
      enterpriseId,
    });

    const savedCustomer = await this.customerRepository.save(customer);

    return {
      message: 'Customer created successfully',
      data: savedCustomer,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: any) {
    const customer = await this.customerRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Sanitize: only allow known entity fields
    const allowedFields = [
      'customerName', 'businessName', 'mobile', 'email',
      'address', 'city', 'state', 'pincode',
      'gstNumber', 'contactPerson', 'status',
    ];
    const sanitized: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateDto[field] !== undefined) {
        sanitized[field] = updateDto[field];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return this.findOne(id, enterpriseId);
    }

    try {
      Object.assign(customer, sanitized);
      await this.customerRepository.save(customer);
    } catch (error) {
      throw new BadRequestException('Failed to update customer: ' + (error?.message || 'Unknown error'));
    }

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.customerRepository.delete(id);

    return {
      message: 'Customer deleted successfully',
      data: null,
    };
  }
}

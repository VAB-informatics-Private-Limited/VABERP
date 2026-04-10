import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceProduct } from './entities/service-product.entity';
import { ServiceEventsService } from '../service-events/service-events.service';
import { CreateServiceProductDto } from './dto/create-service-product.dto';
import { UpdateServiceProductDto } from './dto/update-service-product.dto';
import { ProductTypesService } from '../product-types/product-types.service';

@Injectable()
export class ServiceProductsService {
  constructor(
    @InjectRepository(ServiceProduct)
    private repo: Repository<ServiceProduct>,
    private serviceEventsService: ServiceEventsService,
    private productTypesService: ProductTypesService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    productTypeId?: number,
  ) {
    const query = this.repo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.customer', 'customer')
      .leftJoinAndSelect('sp.productType', 'productType')
      .leftJoinAndSelect('sp.product', 'product')
      .where('sp.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('sp.status = :status', { status });
    if (productTypeId) query.andWhere('sp.productTypeId = :productTypeId', { productTypeId });
    if (search) {
      query.andWhere(
        '(sp.customerName ILIKE :search OR sp.serialNumber ILIKE :search OR sp.customerMobile ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('sp.createdDate', 'DESC')
      .getManyAndCount();

    return { message: 'Service products fetched successfully', data, totalRecords: total, page };
  }

  async findOne(id: number, enterpriseId: number) {
    const sp = await this.repo.findOne({
      where: { id, enterpriseId },
      relations: ['customer', 'productType', 'productType.serviceRules', 'product', 'serviceEvents', 'serviceBookings'],
    });
    if (!sp) throw new NotFoundException('Service product not found');
    return { message: 'Service product fetched successfully', data: sp };
  }

  async create(enterpriseId: number, dto: CreateServiceProductDto, userId?: number) {
    // Compute warranty end date from product type if not provided
    let warrantyEndDate = dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null;
    const warrantyStartDate = dto.warrantyStartDate
      ? new Date(dto.warrantyStartDate)
      : new Date(dto.dispatchDate);

    if (!warrantyEndDate && dto.productTypeId) {
      try {
        const ptResult = await this.productTypesService.findOne(dto.productTypeId, enterpriseId);
        const pt = ptResult.data;
        warrantyEndDate = new Date(warrantyStartDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + (pt.warrantyMonths ?? 12));
      } catch {
        // ProductType not found — skip auto-calculation
      }
    }

    const sp = this.repo.create({
      enterpriseId,
      customerId: dto.customerId,
      productId: dto.productId,
      productTypeId: dto.productTypeId,
      serialNumber: dto.serialNumber,
      modelNumber: dto.modelNumber,
      dispatchDate: new Date(dto.dispatchDate),
      warrantyStartDate,
      warrantyEndDate,
      customerName: dto.customerName,
      customerMobile: dto.customerMobile,
      customerAddress: dto.customerAddress,
      notes: dto.notes,
      createdBy: userId,
    });

    const saved = await this.repo.save(sp);

    // Auto-generate lifecycle events from product type rules
    await this.serviceEventsService.generateForProduct(saved);

    return this.findOne(saved.id, enterpriseId);
  }

  async update(id: number, enterpriseId: number, dto: UpdateServiceProductDto) {
    const sp = await this.repo.findOne({ where: { id, enterpriseId } });
    if (!sp) throw new NotFoundException('Service product not found');

    const wasProductTypeNull = !sp.productTypeId;
    Object.assign(sp, dto);
    await this.repo.save(sp);

    // If product type was just assigned for the first time, generate lifecycle events
    if (wasProductTypeNull && dto.productTypeId) {
      const updated = await this.repo.findOne({ where: { id, enterpriseId } });
      await this.serviceEventsService.generateForProduct(updated!);
    }

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const sp = await this.repo.findOne({ where: { id, enterpriseId } });
    if (!sp) throw new NotFoundException('Service product not found');
    await this.repo.remove(sp);
    return { message: 'Service product deleted successfully' };
  }

  // Called from manufacturing dispatch hook
  async createFromJobCard(jobCard: {
    id: number;
    enterpriseId: number;
    customerId: number | null;
    customerName: string | null;
    productId: number | null;
    actualCompletion?: Date | null;
  }): Promise<void> {
    try {
      const dispatchDate = jobCard.actualCompletion ?? new Date();

      // Check if a record already exists for this job card
      const existing = await this.repo.findOne({
        where: { jobCardId: jobCard.id, enterpriseId: jobCard.enterpriseId },
      });
      if (existing) return;

      const sp = this.repo.create({
        enterpriseId: jobCard.enterpriseId,
        customerId: jobCard.customerId,
        productId: jobCard.productId,
        customerName: jobCard.customerName,
        dispatchDate,
        jobCardId: jobCard.id,
        status: 'active',
      });

      const saved = await this.repo.save(sp);

      // Generate lifecycle events if product type is known (can be assigned later)
      if (saved.productTypeId) {
        await this.serviceEventsService.generateForProduct(saved);
      }
    } catch {
      // Best-effort: don't fail the dispatch if service product creation fails
    }
  }

  async getRevenueSummary(enterpriseId: number) {
    const totalProducts = await this.repo.count({ where: { enterpriseId, status: 'active' } });

    const stats = await this.repo.manager.query(`
      SELECT
        COUNT(DISTINCT sb.id) FILTER (WHERE sb.status = 'completed') AS completed_bookings,
        COUNT(DISTINCT sb.id) FILTER (WHERE sb.status NOT IN ('completed','cancelled')) AS pending_bookings,
        COALESCE(SUM(sb.service_charge) FILTER (WHERE sb.status = 'completed'), 0) AS total_revenue,
        COUNT(DISTINCT se.id) FILTER (WHERE se.status IN ('pending','reminded')) AS pending_reminders
      FROM service_products sp
      LEFT JOIN service_bookings sb ON sb.service_product_id = sp.id AND sb.enterprise_id = $1
      LEFT JOIN service_events se ON se.service_product_id = sp.id AND se.enterprise_id = $1
      WHERE sp.enterprise_id = $1
    `, [enterpriseId]);

    return {
      message: 'Revenue summary fetched successfully',
      data: {
        totalProducts,
        completedBookings: parseInt(stats[0]?.completed_bookings ?? '0'),
        pendingBookings: parseInt(stats[0]?.pending_bookings ?? '0'),
        totalRevenue: parseFloat(stats[0]?.total_revenue ?? '0'),
        pendingReminders: parseInt(stats[0]?.pending_reminders ?? '0'),
      },
    };
  }
}

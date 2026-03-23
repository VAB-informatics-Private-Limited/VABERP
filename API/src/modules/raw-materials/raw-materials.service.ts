import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { RawMaterial, RawMaterialStatus } from './entities/raw-material.entity';
import { RawMaterialLedger } from './entities/raw-material-ledger.entity';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto, StockAdjustmentDto } from './dto/update-raw-material.dto';

@Injectable()
export class RawMaterialsService {
  constructor(
    @InjectRepository(RawMaterial)
    private rawMaterialRepo: Repository<RawMaterial>,
    @InjectRepository(RawMaterialLedger)
    private ledgerRepo: Repository<RawMaterialLedger>,
  ) {}

  async findAll(
    enterpriseId: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string,
  ) {
    const where: any = { enterpriseId };

    if (search) {
      where.materialName = ILike(`%${search}%`);
    }
    if (category) {
      where.category = category;
    }

    const [data, totalRecords] = await this.rawMaterialRepo.findAndCount({
      where,
      order: { createdDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, totalRecords, page, limit };
  }

  async findOne(enterpriseId: number, id: number) {
    const material = await this.rawMaterialRepo.findOne({
      where: { id, enterpriseId },
    });
    if (!material) {
      throw new NotFoundException('Raw material not found');
    }

    const ledger = await this.ledgerRepo.find({
      where: { rawMaterialId: id, enterpriseId },
      order: { createdDate: 'DESC' },
      take: 50,
    });

    return { ...material, ledger };
  }

  async create(enterpriseId: number, dto: CreateRawMaterialDto) {
    // Generate material code
    const lastMaterial = await this.rawMaterialRepo
      .createQueryBuilder('rm')
      .where('rm.enterprise_id = :enterpriseId', { enterpriseId })
      .orderBy('rm.id', 'DESC')
      .getOne();

    let nextCode = 'RM-001';
    if (lastMaterial && lastMaterial.materialCode) {
      const lastNum = parseInt(lastMaterial.materialCode.replace('RM-', ''), 10);
      nextCode = `RM-${String(lastNum + 1).padStart(3, '0')}`;
    }

    const material = this.rawMaterialRepo.create({
      ...dto,
      enterpriseId,
      materialCode: nextCode,
      availableStock: dto.currentStock || 0,
    });

    const saved = await this.rawMaterialRepo.save(material);

    // If initial stock provided, create ledger entry
    if (dto.currentStock && dto.currentStock > 0) {
      await this.ledgerRepo.save(
        this.ledgerRepo.create({
          enterpriseId,
          rawMaterialId: saved.id,
          transactionType: 'purchase',
          quantity: dto.currentStock,
          previousStock: 0,
          newStock: dto.currentStock,
          referenceType: 'manual',
          remarks: 'Initial stock entry',
        }),
      );
    }

    return saved;
  }

  async bulkCreate(enterpriseId: number, items: CreateRawMaterialDto[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Get last material code
    const lastMaterial = await this.rawMaterialRepo
      .createQueryBuilder('rm')
      .where('rm.enterprise_id = :enterpriseId', { enterpriseId })
      .orderBy('rm.id', 'DESC')
      .getOne();

    let lastNum = 0;
    if (lastMaterial && lastMaterial.materialCode) {
      lastNum = parseInt(lastMaterial.materialCode.replace('RM-', ''), 10) || 0;
    }

    const results: RawMaterial[] = [];

    for (const dto of items) {
      lastNum++;
      const materialCode = `RM-${String(lastNum).padStart(3, '0')}`;

      const material = this.rawMaterialRepo.create({
        ...dto,
        enterpriseId,
        materialCode,
        availableStock: dto.currentStock || 0,
      });

      const saved = await this.rawMaterialRepo.save(material);

      if (dto.currentStock && dto.currentStock > 0) {
        await this.ledgerRepo.save(
          this.ledgerRepo.create({
            enterpriseId,
            rawMaterialId: saved.id,
            transactionType: 'purchase',
            quantity: dto.currentStock,
            previousStock: 0,
            newStock: dto.currentStock,
            referenceType: 'manual',
            remarks: 'Initial stock entry (bulk)',
          }),
        );
      }

      results.push(saved);
    }

    return results;
  }

  async update(enterpriseId: number, id: number, dto: UpdateRawMaterialDto) {
    const material = await this.rawMaterialRepo.findOne({
      where: { id, enterpriseId },
    });
    if (!material) {
      throw new NotFoundException('Raw material not found');
    }

    Object.assign(material, dto);
    return this.rawMaterialRepo.save(material);
  }

  async remove(enterpriseId: number, id: number) {
    const material = await this.rawMaterialRepo.findOne({
      where: { id, enterpriseId },
    });
    if (!material) {
      throw new NotFoundException('Raw material not found');
    }

    material.status = RawMaterialStatus.INACTIVE;
    return this.rawMaterialRepo.save(material);
  }

  async stockAdjustment(
    enterpriseId: number,
    id: number,
    dto: StockAdjustmentDto,
    userId?: number,
  ) {
    const material = await this.rawMaterialRepo.findOne({
      where: { id, enterpriseId },
    });
    if (!material) {
      throw new NotFoundException('Raw material not found');
    }

    const previousStock = Number(material.currentStock);
    let newStock: number;

    if (dto.type === 'issue') {
      if (dto.quantity > Number(material.availableStock)) {
        throw new BadRequestException('Insufficient available stock');
      }
      newStock = previousStock - dto.quantity;
    } else {
      // purchase, return, adjustment
      newStock = previousStock + dto.quantity;
    }

    material.currentStock = newStock;
    material.availableStock = newStock - Number(material.reservedStock);

    await this.rawMaterialRepo.save(material);

    const ledgerEntry = this.ledgerRepo.create({
      enterpriseId,
      rawMaterialId: id,
      transactionType: dto.type,
      quantity: dto.quantity,
      previousStock,
      newStock,
      referenceType: 'manual',
      remarks: dto.remarks,
      createdBy: userId,
    });

    await this.ledgerRepo.save(ledgerEntry);

    return material;
  }

  async getCategories(enterpriseId: number) {
    const result = await this.rawMaterialRepo
      .createQueryBuilder('rm')
      .select('DISTINCT rm.category', 'category')
      .where('rm.enterprise_id = :enterpriseId', { enterpriseId })
      .andWhere('rm.category IS NOT NULL')
      .getRawMany();

    return result.map((r) => r.category).filter(Boolean);
  }

  async getLedger(
    enterpriseId: number,
    page: number = 1,
    limit: number = 50,
    rawMaterialId?: number,
    transactionType?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { enterpriseId };

    if (rawMaterialId) {
      where.rawMaterialId = rawMaterialId;
    }
    if (transactionType) {
      where.transactionType = transactionType;
    }

    const findOptions: any = {
      where,
      relations: ['rawMaterial'],
      order: { createdDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    };

    if (startDate || endDate) {
      if (startDate && endDate) {
        where.createdDate = Between(new Date(startDate), new Date(endDate));
      } else if (startDate) {
        where.createdDate = MoreThanOrEqual(new Date(startDate));
      } else if (endDate) {
        where.createdDate = LessThanOrEqual(new Date(endDate));
      }
    }

    const [data, totalRecords] = await this.ledgerRepo.findAndCount(findOptions);

    return { data, totalRecords, page, limit };
  }
}

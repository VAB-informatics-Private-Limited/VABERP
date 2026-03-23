import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryLedger } from './entities/inventory-ledger.entity';
import { Product } from '../products/entities/product.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { CreateInventoryDto, CreateLedgerEntryDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryLedger)
    private ledgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
    @InjectRepository(MaterialRequestItem)
    private mrItemRepository: Repository<MaterialRequestItem>,
  ) {}

  async findAll(
    enterpriseId: number, page = 1, limit = 20, search?: string, lowStockOnly = false,
    categoryId?: number, subcategoryId?: number, availability?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .where('inventory.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(product.productName ILIKE :search OR product.productCode ILIKE :search OR product.hsnCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId: Number(categoryId) });
    }

    if (subcategoryId) {
      query.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId: Number(subcategoryId) });
    }

    if (lowStockOnly) {
      query.andWhere('inventory.currentStock <= inventory.minStockLevel');
    }

    if (availability) {
      switch (availability) {
        case 'low_stock':
          query.andWhere('inventory.currentStock <= inventory.minStockLevel AND inventory.currentStock > 0');
          break;
        case 'out_of_stock':
          query.andWhere('inventory.currentStock = 0');
          break;
        case 'overstocked':
          query.andWhere('inventory.maxStockLevel > 0 AND inventory.currentStock >= inventory.maxStockLevel');
          break;
        case 'in_stock':
          query.andWhere('inventory.currentStock > inventory.minStockLevel');
          break;
      }
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('inventory.modifiedDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Inventory fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, enterpriseId },
      relations: ['product'],
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    return {
      message: 'Inventory fetched successfully',
      data: inventory,
    };
  }

  async findByProduct(productId: number, enterpriseId: number) {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId, enterpriseId },
      relations: ['product'],
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found for this product');
    }

    return {
      message: 'Inventory fetched successfully',
      data: inventory,
    };
  }

  async create(enterpriseId: number, createDto: CreateInventoryDto) {
    // Verify product exists and belongs to enterprise
    const product = await this.productRepository.findOne({
      where: { id: createDto.productId, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if inventory already exists for this product — update it instead of rejecting
    const existing = await this.inventoryRepository.findOne({
      where: { productId: createDto.productId, enterpriseId },
    });

    if (existing) {
      // Update the existing inventory record
      if (createDto.currentStock !== undefined) existing.currentStock = createDto.currentStock;
      if (createDto.minStockLevel !== undefined) existing.minStockLevel = createDto.minStockLevel;
      if (createDto.maxStockLevel !== undefined) existing.maxStockLevel = createDto.maxStockLevel;
      if (createDto.warehouseLocation !== undefined) existing.warehouseLocation = createDto.warehouseLocation;
      existing.availableStock = existing.currentStock - (existing.reservedStock || 0);

      const saved = await this.inventoryRepository.save(existing);
      return {
        message: 'Inventory updated successfully',
        data: saved,
      };
    }

    const inventory = this.inventoryRepository.create({
      ...createDto,
      enterpriseId,
      availableStock: (createDto.currentStock || 0) - (createDto.reservedStock || 0),
    });

    const saved = await this.inventoryRepository.save(inventory);

    return {
      message: 'Inventory created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateInventoryDto>) {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    // Recalculate available stock if current or reserved stock changed
    const currentStock = updateDto.currentStock ?? inventory.currentStock;
    const reservedStock = updateDto.reservedStock ?? inventory.reservedStock;
    const availableStock = currentStock - reservedStock;

    await this.inventoryRepository.update(id, {
      ...updateDto,
      availableStock,
    });

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    // Delete related ledger entries
    await this.ledgerRepository.delete({ inventoryId: id });
    await this.inventoryRepository.delete(id);

    return {
      message: 'Inventory deleted successfully',
      data: null,
    };
  }

  // ========== Ledger Operations ==========

  async addStock(enterpriseId: number, createDto: CreateLedgerEntryDto, user?: { id: number; type: string }) {
    // Find or create inventory for product
    let inventory = await this.inventoryRepository.findOne({
      where: { productId: createDto.productId, enterpriseId },
    });

    if (!inventory) {
      // Create new inventory record
      const product = await this.productRepository.findOne({
        where: { id: createDto.productId, enterpriseId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      inventory = this.inventoryRepository.create({
        productId: createDto.productId,
        enterpriseId,
        currentStock: 0,
        reservedStock: 0,
        availableStock: 0,
        minStockLevel: product.minStockLevel || 0,
      });

      const savedResult = await this.inventoryRepository.save(inventory);
      inventory = Array.isArray(savedResult) ? savedResult[0] : savedResult;
    }

    const previousStock = inventory!.currentStock;
    let newStock: number;

    switch (createDto.transactionType) {
      case 'IN':
      case 'RETURN':
        newStock = previousStock + createDto.quantity;
        break;
      case 'OUT':
        if (inventory!.availableStock < createDto.quantity) {
          throw new BadRequestException('Insufficient stock available');
        }
        newStock = previousStock - createDto.quantity;
        break;
      case 'ADJUSTMENT':
        newStock = createDto.quantity; // Direct set for adjustments
        break;
      default:
        throw new BadRequestException('Invalid transaction type');
    }

    // Resolve the user's display name
    let createdByName: string | undefined;
    if (user) {
      if (user.type === 'employee') {
        const employee = await this.employeeRepository.findOne({ where: { id: user.id } });
        if (employee) {
          createdByName = `${employee.firstName} ${employee.lastName}`.trim();
        }
      } else if (user.type === 'enterprise') {
        const enterprise = await this.enterpriseRepository.findOne({ where: { id: user.id } });
        if (enterprise) {
          createdByName = enterprise.businessName || enterprise.contactPerson || enterprise.email;
        }
      }
    }

    // Create ledger entry
    const ledgerEntry = this.ledgerRepository.create({
      enterpriseId,
      inventoryId: inventory!.id,
      productId: createDto.productId,
      transactionType: createDto.transactionType,
      quantity: createDto.quantity,
      previousStock,
      newStock,
      referenceType: createDto.referenceType || 'MANUAL',
      referenceId: createDto.referenceId,
      remarks: createDto.remarks,
      createdBy: user?.id,
      createdByName,
    });

    await this.ledgerRepository.save(ledgerEntry);

    // Update inventory
    await this.inventoryRepository.update(inventory!.id, {
      currentStock: newStock,
      availableStock: newStock - inventory!.reservedStock,
      lastRestockDate: createDto.transactionType === 'IN' ? new Date() : inventory!.lastRestockDate,
    });

    const updatedInventory = await this.inventoryRepository.findOne({
      where: { id: inventory!.id },
      relations: ['product'],
    });

    // Auto-update pending material request items when stock is received
    if (createDto.transactionType === 'IN' || createDto.transactionType === 'RETURN' || createDto.transactionType === 'ADJUSTMENT') {
      await this.updateMaterialRequestItems(createDto.productId, newStock - inventory!.reservedStock);
    }

    return {
      message: 'Stock updated successfully',
      data: {
        inventory: updatedInventory,
        ledgerEntry,
      },
    };
  }

  private async updateMaterialRequestItems(productId: number, newAvailableStock: number) {
    const pendingItems = await this.mrItemRepository.find({
      where: { productId, status: In(['pending', 'approved']) },
    });

    for (const item of pendingItems) {
      await this.mrItemRepository.update(item.id, {
        availableStock: newAvailableStock,
      });
    }
  }

  async getLedger(enterpriseId: number, productId?: number, page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.ledgerRepository
      .createQueryBuilder('ledger')
      .leftJoinAndSelect('ledger.product', 'product')
      .where('ledger.enterpriseId = :enterpriseId', { enterpriseId });

    if (productId) {
      query.andWhere('ledger.productId = :productId', { productId });
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('ledger.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Inventory ledger fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async updatePriority(id: number, enterpriseId: number, priority: string) {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const validPriorities = ['none', 'low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      throw new BadRequestException(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    await this.inventoryRepository.update(id, { priority });

    return this.findOne(id, enterpriseId);
  }

  async updatePriorityByProduct(productId: number, enterpriseId: number, priority: string) {
    const validPriorities = ['none', 'low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      throw new BadRequestException(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    let inventory = await this.inventoryRepository.findOne({
      where: { productId, enterpriseId },
    });

    if (!inventory) {
      // Create inventory record if it doesn't exist
      const product = await this.productRepository.findOne({
        where: { id: productId, enterpriseId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      inventory = await this.inventoryRepository.save(
        this.inventoryRepository.create({
          productId,
          enterpriseId,
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          priority,
        }),
      );

      return {
        message: 'Priority updated successfully',
        data: await this.inventoryRepository.findOne({
          where: { id: inventory.id },
          relations: ['product'],
        }),
      };
    }

    await this.inventoryRepository.update(inventory.id, { priority });

    return {
      message: 'Priority updated successfully',
      data: await this.inventoryRepository.findOne({
        where: { id: inventory.id },
        relations: ['product'],
      }),
    };
  }

  async getPriorityItems(enterpriseId: number) {
    const items = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('inventory.priority != :none', { none: 'none' })
      .orderBy(
        `CASE inventory.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END`,
        'ASC',
      )
      .getMany();

    return {
      message: 'Priority items fetched successfully',
      data: items,
      totalRecords: items.length,
    };
  }

  async getLowStockAlerts(enterpriseId: number) {
    const alerts = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('inventory.currentStock <= inventory.minStockLevel')
      .orderBy('inventory.currentStock', 'ASC')
      .getMany();

    return {
      message: 'Low stock alerts fetched successfully',
      data: alerts,
      totalRecords: alerts.length,
    };
  }
}

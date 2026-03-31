import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLedger } from '../inventory/entities/inventory-ledger.entity';
import { Indent } from '../indents/entities/indent.entity';
import { IndentItem } from '../indents/entities/indent-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { IndentsService } from '../indents/indents.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(MaterialRequest)
    private mrRepository: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private mrItemRepository: Repository<MaterialRequestItem>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryLedger)
    private ledgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Indent)
    private indentRepository: Repository<Indent>,
    @InjectRepository(IndentItem)
    private indentItemRepository: Repository<IndentItem>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(RawMaterial)
    private rawMaterialRepository: Repository<RawMaterial>,
    @InjectRepository(RawMaterialLedger)
    private rawMaterialLedgerRepository: Repository<RawMaterialLedger>,
    private indentsService: IndentsService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(enterpriseId: number, page = 1, limit = 20, status?: string) {
    const query = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.createdByEmployee', 'createdBy')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .where('po.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('po.status = :status', { status });

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('po.createdDate', 'DESC')
      .getManyAndCount();

    return { message: 'Purchase orders fetched successfully', data, totalRecords: total, page: pageNum, limit: limitNum };
  }

  async findOne(id: number, enterpriseId: number) {
    const po = await this.poRepository.findOne({
      where: { id, enterpriseId },
      relations: ['createdByEmployee', 'approvedByEmployee', 'supplier', 'indent'],
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const items = await this.poItemRepository.find({
      where: { purchaseOrderId: id },
      relations: ['product', 'rawMaterial'],
      order: { sortOrder: 'ASC' },
    });

    return { message: 'Purchase order fetched successfully', data: { ...po, items } };
  }

  async create(enterpriseId: number, dto: CreatePurchaseOrderDto, userId?: number) {
    let subTotal = 0;
    let taxAmount = 0;
    const calculatedItems = dto.items.map((item) => {
      const itemSub = item.quantity * (item.unitPrice || 0);
      const itemTax = (itemSub * (item.taxPercent || 0)) / 100;
      subTotal += itemSub;
      taxAmount += itemTax;
      return { ...item, lineTotal: itemSub + itemTax };
    });

    const po = this.poRepository.create({
      enterpriseId,
      poNumber: 'DRAFT',
      materialRequestId: dto.materialRequestId,
      indentId: (dto as any).indentId,
      supplierId: (dto as any).supplierId,
      supplierName: dto.supplierName,
      supplierContact: dto.supplierContact,
      supplierEmail: dto.supplierEmail,
      supplierAddress: dto.supplierAddress,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
      subTotal,
      taxAmount,
      grandTotal: subTotal + taxAmount,
      notes: dto.notes,
      status: 'draft',
      createdBy: userId,
    });

    const savedResult = await this.poRepository.save(po);
    const savedPo = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // Use the DB-assigned auto-increment ID for the PO number — guarantees uniqueness
    const poNumber = `PO-${String(savedPo.id).padStart(6, '0')}`;
    await this.poRepository.update(savedPo.id, { poNumber });
    savedPo.poNumber = poNumber;

    const itemEntities = calculatedItems.map((item, idx) =>
      this.poItemRepository.create({
        ...item,
        purchaseOrderId: savedPo.id,
        sortOrder: item.sortOrder ?? idx,
      }),
    );
    await this.poItemRepository.save(itemEntities);

    const createResult = await this.findOne(savedPo.id, enterpriseId);
    this.auditLogsService.log({
      action: 'create',
      entityType: 'purchase_order',
      entityId: savedPo.id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return createResult;
  }

  async createFromMaterialRequest(mrId: number, enterpriseId: number, supplierName: string, userId?: number) {
    const mr = await this.mrRepository.findOne({ where: { id: mrId, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');

    const mrItems = await this.mrItemRepository.find({ where: { materialRequestId: mrId } });
    const unfulfilled = mrItems.filter((i) => Number(i.quantityApproved) > Number(i.quantityIssued));

    if (unfulfilled.length === 0) {
      throw new BadRequestException('No unfulfilled items to order');
    }

    const dto: CreatePurchaseOrderDto = {
      materialRequestId: mrId,
      supplierName,
      items: unfulfilled.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        quantity: Number(item.quantityApproved) - Number(item.quantityIssued),
        unitOfMeasure: item.unitOfMeasure,
      })),
    };

    return this.create(enterpriseId, dto, userId);
  }

  async createFromIndent(
    indentId: number,
    enterpriseId: number,
    dto: {
      supplierId?: number;
      items: { indentItemId: number; quantity: number; unitPrice?: number; taxPercent?: number }[];
      expectedDelivery?: string;
      notes?: string;
    },
    userId?: number,
  ) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    let supplier: any = null;
    if (dto.supplierId) {
      supplier = await this.supplierRepository.findOne({ where: { id: dto.supplierId, enterpriseId } });
      if (!supplier) throw new NotFoundException('Supplier not found');
    }

    // Build PO items from indent items
    const poItems: PurchaseOrderItemDto[] = [];
    for (const item of dto.items) {
      const indentItem = await this.indentItemRepository.findOne({
        where: { id: item.indentItemId, indentId },
        relations: ['rawMaterial'],
      });
      if (!indentItem) throw new NotFoundException(`Indent item ${item.indentItemId} not found`);

      poItems.push({
        productId: undefined,
        rawMaterialId: indentItem.rawMaterialId,
        indentItemId: indentItem.id,
        itemName: indentItem.itemName,
        quantity: item.quantity,
        unitOfMeasure: indentItem.unitOfMeasure,
        unitPrice: item.unitPrice || 0,
        taxPercent: item.taxPercent || 0,
      });
    }

    let subTotal = 0;
    let taxAmount = 0;
    const calculatedItems = poItems.map((item) => {
      const itemSub = item.quantity * (item.unitPrice || 0);
      const itemTax = (itemSub * (item.taxPercent || 0)) / 100;
      subTotal += itemSub;
      taxAmount += itemTax;
      return { ...item, lineTotal: itemSub + itemTax };
    });

    const po = this.poRepository.create({
      enterpriseId,
      poNumber: 'DRAFT',
      indentId,
      supplierId: supplier?.id || undefined,
      supplierName: supplier?.supplierName || 'TBD',
      supplierContact: supplier?.contactPerson || undefined,
      supplierEmail: supplier?.email || undefined,
      supplierAddress: supplier?.address || undefined,
      materialRequestId: indent.materialRequestId,
      orderDate: new Date(),
      expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
      subTotal,
      taxAmount,
      grandTotal: subTotal + taxAmount,
      notes: dto.notes,
      status: 'draft',
      createdBy: userId,
    });

    const savedResult = await this.poRepository.save(po);
    const savedPo = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // Use the DB-assigned auto-increment ID for the PO number — guarantees uniqueness
    const poNumber = `PO-${String(savedPo.id).padStart(6, '0')}`;
    await this.poRepository.update(savedPo.id, { poNumber });

    const itemEntities = calculatedItems.map((item, idx) =>
      this.poItemRepository.create({
        purchaseOrderId: savedPo.id,
        productId: item.productId || undefined,
        rawMaterialId: item.rawMaterialId || undefined,
        indentItemId: item.indentItemId || undefined,
        itemName: item.itemName,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice || 0,
        taxPercent: item.taxPercent || 0,
        lineTotal: item.lineTotal,
        sortOrder: idx,
      }),
    );
    await this.poItemRepository.save(itemEntities);

    // Update indent item ordered quantities
    for (const item of dto.items) {
      await this.indentsService.updateItemOrderedQty(item.indentItemId, item.quantity);
    }

    const createFromIndentResult = await this.findOne(savedPo.id, enterpriseId);
    this.auditLogsService.log({
      action: 'create',
      entityType: 'purchase_order',
      entityId: savedPo.id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return createFromIndentResult;
  }

  async approve(id: number, enterpriseId: number, userId?: number) {
    const po = await this.poRepository.findOne({ where: { id, enterpriseId } });
    if (!po) throw new NotFoundException('Purchase order not found');

    await this.poRepository.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvedDate: new Date(),
    });

    const approveResult = await this.findOne(id, enterpriseId);
    this.auditLogsService.log({
      action: 'update',
      entityType: 'purchase_order',
      entityId: id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return approveResult;
  }

  async receive(id: number, enterpriseId: number, userId?: number) {
    const result = await this.findOne(id, enterpriseId);
    const po = result.data;

    const itemsToReceive = po.items.filter((i: any) => i.quantityReceived < i.quantity);
    if (itemsToReceive.length === 0) {
      throw new BadRequestException('All items already received');
    }

    for (const item of itemsToReceive) {
      const qtyToReceive = item.quantity - (item.quantityReceived || 0);

      if (item.rawMaterialId) {
        // Receive raw materials — update raw_materials stock + ledger
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: item.rawMaterialId, enterpriseId },
        });
        if (rawMat) {
          const previousStock = Number(rawMat.currentStock);
          const newStock = previousStock + qtyToReceive;

          await this.rawMaterialRepository.update(rawMat.id, {
            currentStock: newStock,
            availableStock: newStock - Number(rawMat.reservedStock),
          });

          await this.rawMaterialLedgerRepository.save(
            this.rawMaterialLedgerRepository.create({
              enterpriseId,
              rawMaterialId: rawMat.id,
              transactionType: 'purchase_receive',
              quantity: qtyToReceive,
              previousStock,
              newStock,
              referenceType: 'purchase_order',
              referenceId: po.id,
              remarks: `Received from PO ${po.poNumber}`,
              createdBy: userId,
            }),
          );
        }

        // Update indent item received quantity if linked
        if (item.indentItemId) {
          await this.indentsService.updateItemReceivedQty(item.indentItemId, qtyToReceive);
        }
      } else if (item.productId) {
        // Receive products — existing inventory logic
        let inventory = await this.inventoryRepository.findOne({
          where: { productId: item.productId, enterpriseId },
        });

        if (!inventory) {
          inventory = this.inventoryRepository.create({
            productId: item.productId,
            enterpriseId,
            currentStock: 0,
            reservedStock: 0,
            availableStock: 0,
          });
          const savedResult = await this.inventoryRepository.save(inventory);
          inventory = Array.isArray(savedResult) ? savedResult[0] : savedResult;
        }

        const ledger = this.ledgerRepository.create({
          enterpriseId,
          inventoryId: inventory!.id,
          productId: item.productId,
          transactionType: 'IN',
          quantity: qtyToReceive,
          previousStock: inventory!.currentStock,
          newStock: inventory!.currentStock + qtyToReceive,
          referenceType: 'PURCHASE',
          referenceId: po.id,
          remarks: `Received from PO ${po.poNumber}`,
          createdBy: userId,
        });
        await this.ledgerRepository.save(ledger);

        await this.inventoryRepository.update(inventory!.id, {
          currentStock: inventory!.currentStock + qtyToReceive,
          availableStock: inventory!.availableStock + qtyToReceive,
          lastRestockDate: new Date(),
        });
      }

      // Update PO item
      await this.poItemRepository.update(item.id, {
        quantityReceived: item.quantity,
      });
    }

    await this.poRepository.update(id, { status: 'received' });

    const receiveResult = await this.findOne(id, enterpriseId);
    this.auditLogsService.log({
      action: 'receive',
      entityType: 'purchase_order',
      entityId: id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return receiveResult;
  }

  async updateETA(id: number, enterpriseId: number, expectedDelivery: string) {
    const po = await this.poRepository.findOne({ where: { id, enterpriseId } });
    if (!po) throw new NotFoundException('Purchase order not found');

    await this.poRepository.update(id, {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    });

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number, user?: { id: number; type: string; name?: string }) {
    const po = await this.poRepository.findOne({ where: { id, enterpriseId } });
    if (!po) throw new NotFoundException('Purchase order not found');

    await this.poItemRepository.delete({ purchaseOrderId: id });
    await this.poRepository.delete(id);

    this.auditLogsService.log({
      action: 'delete',
      entityType: 'purchase_order',
      entityId: id,
      userId: user?.id,
      enterpriseId,
    }).catch(() => {});

    return { message: 'Purchase order deleted successfully', data: null };
  }
}

// Internal type for building PO items from indent
interface PurchaseOrderItemDto {
  productId?: number;
  rawMaterialId?: number;
  indentItemId?: number;
  itemName: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice?: number;
  taxPercent?: number;
  lineTotal?: number;
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indent } from './entities/indent.entity';
import { IndentItem } from './entities/indent-item.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';

export interface InsufficientItem {
  mrItemId: number;
  rawMaterialId?: number;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  unitOfMeasure?: string;
}

@Injectable()
export class IndentsService {
  constructor(
    @InjectRepository(Indent)
    private indentRepository: Repository<Indent>,
    @InjectRepository(IndentItem)
    private indentItemRepository: Repository<IndentItem>,
    @InjectRepository(MaterialRequest)
    private mrRepository: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private mrItemRepository: Repository<MaterialRequestItem>,
    @InjectRepository(RawMaterial)
    private rawMaterialRepository: Repository<RawMaterial>,
    @InjectRepository(RawMaterialLedger)
    private rawMaterialLedgerRepository: Repository<RawMaterialLedger>,
    @InjectRepository(GoodsReceipt)
    private grnRepository: Repository<GoodsReceipt>,
    @InjectRepository(GoodsReceiptItem)
    private grnItemRepository: Repository<GoodsReceiptItem>,
    @InjectRepository(PurchaseOrder)
    private poRepository: Repository<PurchaseOrder>,
  ) {}

  async createFromInventory(
    enterpriseId: number,
    items: { rawMaterialId: number; quantity: number; notes?: string }[],
    userId?: number,
    notes?: string,
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const count = await this.indentRepository.count({ where: { enterpriseId } });
    const indentNumber = `IND-${String(count + 1).padStart(6, '0')}`;

    const indent = this.indentRepository.create({
      enterpriseId,
      indentNumber,
      requestedBy: userId,
      requestDate: new Date(),
      source: 'inventory',
      status: 'pending',
      notes: notes || 'Individual Order from Inventory',
    });

    const savedResult = await this.indentRepository.save(indent);
    const savedIndent = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    for (const item of items) {
      const rawMat = await this.rawMaterialRepository.findOne({
        where: { id: item.rawMaterialId, enterpriseId },
      });
      if (!rawMat) {
        throw new NotFoundException(`Raw material with ID ${item.rawMaterialId} not found`);
      }

      const available = Number(rawMat.availableStock);
      const indentItem = this.indentItemRepository.create({
        indentId: savedIndent.id,
        rawMaterialId: rawMat.id,
        itemName: rawMat.materialName,
        requiredQuantity: item.quantity,
        availableQuantity: available,
        shortageQuantity: item.quantity,
        unitOfMeasure: rawMat.unitOfMeasure,
        status: 'pending',
        notes: item.notes,
      });
      await this.indentItemRepository.save(indentItem);
    }

    return this.findOne(savedIndent.id, enterpriseId);
  }

  async createFromMaterialRequest(
    mrId: number,
    insufficientItems: InsufficientItem[],
    enterpriseId: number,
    userId?: number,
  ) {
    if (insufficientItems.length === 0) {
      throw new BadRequestException('No insufficient items to create indent');
    }

    const mr = await this.mrRepository.findOne({ where: { id: mrId, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');

    const count = await this.indentRepository.count({ where: { enterpriseId } });
    const indentNumber = `IND-${String(count + 1).padStart(6, '0')}`;

    const indent = this.indentRepository.create({
      enterpriseId,
      indentNumber,
      materialRequestId: mrId,
      salesOrderId: mr.salesOrderId || undefined,
      requestedBy: userId,
      requestDate: new Date(),
      status: 'pending',
    });

    const savedResult = await this.indentRepository.save(indent);
    const savedIndent = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    for (const item of insufficientItems) {
      const indentItem = this.indentItemRepository.create({
        indentId: savedIndent.id,
        materialRequestItemId: item.mrItemId,
        rawMaterialId: item.rawMaterialId,
        itemName: item.itemName,
        requiredQuantity: item.requiredQuantity,
        availableQuantity: item.availableQuantity,
        shortageQuantity: item.shortageQuantity,
        unitOfMeasure: item.unitOfMeasure,
        status: 'pending',
      });
      await this.indentItemRepository.save(indentItem);
    }

    // Link indent back to material request
    await this.mrRepository.update(mrId, { indentId: savedIndent.id });

    return this.findOne(savedIndent.id, enterpriseId);
  }

  async findAll(enterpriseId: number, page = 1, limit = 20, status?: string, source?: string) {
    const query = this.indentRepository
      .createQueryBuilder('indent')
      .leftJoinAndSelect('indent.materialRequest', 'mr')
      .leftJoinAndSelect('indent.salesOrder', 'so')
      .leftJoinAndSelect('indent.requestedByEmployee', 'requestedBy')
      .where('indent.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('indent.status = :status', { status });
    if (source) query.andWhere('indent.source = :source', { source });

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('indent.createdDate', 'DESC')
      .getManyAndCount();

    // Load items and purchase orders for each indent
    const dataWithItems = await Promise.all(
      data.map(async (indent) => {
        const items = await this.indentItemRepository.find({
          where: { indentId: indent.id },
          relations: ['rawMaterial'],
        });
        const purchaseOrders = await this.poRepository.find({
          where: { indentId: indent.id },
          select: ['id', 'poNumber', 'status', 'supplierName', 'grandTotal'],
          order: { id: 'ASC' },
        });
        return { ...indent, items, purchaseOrders };
      }),
    );

    return { message: 'Indents fetched successfully', data: dataWithItems, totalRecords: total, page: pageNum, limit: limitNum };
  }

  async findOne(id: number, enterpriseId: number) {
    const indent = await this.indentRepository.findOne({
      where: { id, enterpriseId },
      relations: ['materialRequest', 'salesOrder', 'requestedByEmployee'],
    });
    if (!indent) throw new NotFoundException('Indent not found');

    const items = await this.indentItemRepository.find({
      where: { indentId: id },
      relations: ['rawMaterial'],
    });

    const purchaseOrders = await this.poRepository.find({
      where: { indentId: id },
      select: ['id', 'poNumber', 'status', 'supplierName', 'grandTotal'],
      order: { id: 'ASC' },
    });

    return { message: 'Indent fetched successfully', data: { ...indent, items, purchaseOrders } };
  }

  async getByMaterialRequest(mrId: number, enterpriseId: number) {
    const indent = await this.indentRepository.findOne({
      where: { materialRequestId: mrId, enterpriseId },
      relations: ['materialRequest', 'salesOrder', 'requestedByEmployee'],
    });
    if (!indent) throw new NotFoundException('No indent found for this material request');

    const items = await this.indentItemRepository.find({
      where: { indentId: indent.id },
      relations: ['rawMaterial'],
    });

    return { message: 'Indent fetched successfully', data: { ...indent, items } };
  }

  async updateItemOrderedQty(indentItemId: number, qty: number) {
    const item = await this.indentItemRepository.findOne({ where: { id: indentItemId } });
    if (!item) throw new NotFoundException('Indent item not found');

    const newOrderedQty = Number(item.orderedQuantity) + qty;
    await this.indentItemRepository.update(indentItemId, {
      orderedQuantity: newOrderedQty,
      status: newOrderedQty >= Number(item.shortageQuantity) ? 'ordered' : 'pending',
    });

    // Update parent indent status
    await this.recalcIndentStatus(item.indentId);
  }

  async updateItemReceivedQty(indentItemId: number, qty: number) {
    const item = await this.indentItemRepository.findOne({ where: { id: indentItemId } });
    if (!item) throw new NotFoundException('Indent item not found');

    const newReceivedQty = Number(item.receivedQuantity) + qty;
    await this.indentItemRepository.update(indentItemId, {
      receivedQuantity: newReceivedQty,
      status: newReceivedQty >= Number(item.shortageQuantity) ? 'received' : 'ordered',
    });

    // Update parent indent status
    await this.recalcIndentStatus(item.indentId);
  }

  /**
   * Auto-detect shortage items from MR by checking current stock levels.
   * Creates indent with items where available stock < requested qty.
   */
  async createFromMrShortage(mrId: number, enterpriseId: number, userId?: number) {
    const mr = await this.mrRepository.findOne({ where: { id: mrId, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');

    // Check if indent already exists for this MR
    const existing = await this.indentRepository.findOne({ where: { materialRequestId: mrId, enterpriseId } });
    if (existing) {
      throw new BadRequestException(`Indent ${existing.indentNumber} already exists for this MR`);
    }

    const mrItems = await this.mrItemRepository.find({ where: { materialRequestId: mrId } });
    const shortageItems: InsufficientItem[] = [];

    for (const item of mrItems) {
      let available = 0;
      if (item.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({ where: { id: item.rawMaterialId, enterpriseId } });
        available = rawMat ? Number(rawMat.availableStock) : 0;
      }

      const requested = Number(item.quantityRequested);
      if (available < requested) {
        shortageItems.push({
          mrItemId: item.id,
          rawMaterialId: item.rawMaterialId,
          itemName: item.itemName,
          requiredQuantity: requested,
          availableQuantity: available,
          shortageQuantity: requested - available,
          unitOfMeasure: item.unitOfMeasure,
        });
      }
    }

    if (shortageItems.length === 0) {
      throw new BadRequestException('All items have sufficient stock — no indent needed');
    }

    return this.createFromMaterialRequest(mrId, shortageItems, enterpriseId, userId);
  }

  async updateItem(
    indentId: number,
    itemId: number,
    enterpriseId: number,
    dto: { shortageQuantity?: number; notes?: string },
  ) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    const item = await this.indentItemRepository.findOne({ where: { id: itemId, indentId } });
    if (!item) throw new NotFoundException('Indent item not found');

    const updateData: any = {};
    if (dto.shortageQuantity !== undefined) updateData.shortageQuantity = dto.shortageQuantity;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    await this.indentItemRepository.update(itemId, updateData);
    return this.findOne(indentId, enterpriseId);
  }

  async removeItem(indentId: number, itemId: number, enterpriseId: number) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    const item = await this.indentItemRepository.findOne({ where: { id: itemId, indentId } });
    if (!item) throw new NotFoundException('Indent item not found');

    await this.indentItemRepository.delete(itemId);

    // Check if any items remain
    const remaining = await this.indentItemRepository.count({ where: { indentId } });
    if (remaining === 0) {
      await this.indentRepository.update(indentId, { status: 'cancelled' });
    }

    return this.findOne(indentId, enterpriseId);
  }

  async cancel(id: number, enterpriseId: number) {
    const indent = await this.indentRepository.findOne({ where: { id, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    await this.indentRepository.update(id, { status: 'cancelled' });
    return this.findOne(id, enterpriseId);
  }

  /**
   * Receive goods for indent items — updates raw material stock + ledger + indent received qty.
   * Called from indent detail page when procurement team marks goods as received.
   */
  async receiveGoods(
    indentId: number,
    enterpriseId: number,
    items: { indentItemId: number; receivedQuantity: number }[],
    userId?: number,
  ) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    const receivedItems: { itemName: string; quantity: number }[] = [];

    for (const input of items) {
      if (input.receivedQuantity <= 0) continue;

      const item = await this.indentItemRepository.findOne({
        where: { id: input.indentItemId, indentId },
      });
      if (!item) throw new NotFoundException(`Indent item ${input.indentItemId} not found`);

      const alreadyReceived = Number(item.receivedQuantity);
      const shortage = Number(item.shortageQuantity);
      const maxReceivable = shortage - alreadyReceived;
      const qtyToReceive = Math.min(input.receivedQuantity, maxReceivable);
      if (qtyToReceive <= 0) continue;

      // Update raw material stock
      if (item.rawMaterialId) {
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
              referenceType: 'indent',
              referenceId: indentId,
              remarks: `Received via Indent ${indent.indentNumber}`,
              createdBy: userId,
            }),
          );
        }
      }

      // Update indent item received quantity
      const newReceivedQty = alreadyReceived + qtyToReceive;
      await this.indentItemRepository.update(item.id, {
        receivedQuantity: newReceivedQty,
        status: newReceivedQty >= shortage ? 'received' : 'ordered',
      });

      receivedItems.push({ itemName: item.itemName, quantity: qtyToReceive });
    }

    if (receivedItems.length === 0) {
      throw new BadRequestException('No items to receive');
    }

    await this.recalcIndentStatus(indentId);

    // For inventory-sourced indents, auto-close when all items are received
    const updatedIndent = await this.indentRepository.findOne({ where: { id: indentId } });
    if (updatedIndent?.source === 'inventory') {
      const allItems = await this.indentItemRepository.find({ where: { indentId } });
      const allFullyReceived = allItems.every(
        (i) => Number(i.receivedQuantity) >= Number(i.shortageQuantity),
      );
      if (allFullyReceived) {
        await this.indentRepository.update(indentId, { status: 'closed' });
      }
    }

    const result = await this.findOne(indentId, enterpriseId);
    return {
      ...result,
      receivedItems,
    };
  }

  /**
   * Release to inventory — rechecks the linked MR so inventory team can re-approve
   * the previously insufficient items (now that stock has been received).
   */
  async releaseToInventory(indentId: number, enterpriseId: number, userId?: number) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    if (!indent.materialRequestId) {
      throw new BadRequestException('No material request linked to this indent');
    }

    // Get indent items that have been received
    const indentItems = await this.indentItemRepository.find({ where: { indentId } });
    const receivedItems = indentItems.filter(
      (i) => Number(i.receivedQuantity) > 0,
    );

    if (receivedItems.length === 0) {
      throw new BadRequestException('No items have been received yet');
    }

    // For each received indent item, update the linked MR item
    const updatedMrItems: string[] = [];
    for (const indentItem of receivedItems) {
      if (!indentItem.materialRequestItemId) continue;

      const mrItem = await this.mrItemRepository.findOne({
        where: { id: indentItem.materialRequestItemId },
      });
      if (!mrItem) continue;

      // Refresh available stock from raw material
      let latestStock = 0;
      if (indentItem.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: indentItem.rawMaterialId, enterpriseId },
        });
        latestStock = rawMat ? Number(rawMat.availableStock) : 0;
      }

      // Update MR item: reset to pending so inventory can re-approve
      await this.mrItemRepository.update(mrItem.id, {
        availableStock: latestStock,
        status: 'pending',
        notes: `Procurement fulfilled — ${Number(indentItem.receivedQuantity)} received via ${indent.indentNumber}. Ready for approval.`,
      });

      updatedMrItems.push(indentItem.itemName);
    }

    // Reset MR status to pending so inventory team sees it
    if (updatedMrItems.length > 0) {
      await this.mrRepository
        .createQueryBuilder()
        .update(MaterialRequest)
        .set({ status: 'pending' })
        .where('id = :id', { id: indent.materialRequestId })
        .execute();

      // Clear approved_by and approved_date
      await this.mrRepository
        .createQueryBuilder()
        .update(MaterialRequest)
        .set({ approvedDate: null as any, approvedBy: null as any })
        .where('id = :id', { id: indent.materialRequestId })
        .execute();
    }

    // Update indent status to closed if all received
    const allReceived = indentItems.every(
      (i) => Number(i.receivedQuantity) >= Number(i.shortageQuantity),
    );
    if (allReceived) {
      await this.indentRepository.update(indentId, { status: 'closed' });
    }

    const result = await this.findOne(indentId, enterpriseId);
    return {
      ...result,
      releasedItems: updatedMrItems,
      materialRequestId: indent.materialRequestId,
      message: `Released ${updatedMrItems.length} items to inventory. Material Request is now pending re-approval.`,
    };
  }

  /**
   * Release ALL required items to inventory — auto-approves and auto-issues
   * all MR items in one step. Manufacturing will see FULLY_ISSUED immediately.
   */
  async releaseAllItems(indentId: number, enterpriseId: number, userId?: number) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    if (!indent.materialRequestId) {
      throw new BadRequestException('No material request linked to this indent');
    }

    // Get all indent items
    const indentItems = await this.indentItemRepository.find({ where: { indentId } });
    const receivedItems = indentItems.filter((i) => Number(i.receivedQuantity) > 0);

    if (receivedItems.length === 0) {
      throw new BadRequestException('No items have been received yet');
    }

    // Create a pending GRN for inventory team to confirm — stock is NOT updated here
    const grnCount = await this.grnRepository.count({ where: { enterpriseId } });
    const grnNumber = `GRN-${String(grnCount + 1).padStart(6, '0')}`;

    const grn = await this.grnRepository.save(
      this.grnRepository.create({
        enterpriseId,
        grnNumber,
        indentId,
        status: 'pending',
        releasedBy: userId,
      }),
    );

    const grnItems: Array<{ name: string; qty: number; unit?: string }> = [];
    for (const indentItem of receivedItems) {
      await this.grnItemRepository.save(
        this.grnItemRepository.create({
          grnId: grn.id,
          indentItemId: indentItem.id,
          rawMaterialId: indentItem.rawMaterialId,
          itemName: indentItem.itemName,
          unitOfMeasure: indentItem.unitOfMeasure,
          expectedQty: indentItem.receivedQuantity,
        }),
      );
      grnItems.push({ name: indentItem.itemName, qty: Number(indentItem.receivedQuantity), unit: indentItem.unitOfMeasure });
    }

    const result = await this.findOne(indentId, enterpriseId);
    return {
      ...result,
      grnId: grn.id,
      grnNumber: grn.grnNumber,
      releasedItems: grnItems,
      skippedItems: [],
      materialRequestId: indent.materialRequestId,
      message: `${grnItems.length} item(s) released to inventory. GRN ${grnNumber} is pending confirmation by the inventory team.`,
    };
  }

  private async recalcIndentStatus(indentId: number) {
    const items = await this.indentItemRepository.find({ where: { indentId } });

    const allReceived = items.every((i) => i.status === 'received');
    const allOrdered = items.every((i) => i.status === 'ordered' || i.status === 'received');
    const someOrdered = items.some((i) => i.status === 'ordered' || i.status === 'received');

    let status = 'pending';
    if (allReceived) {
      status = 'closed';
    } else if (allOrdered) {
      status = 'fully_ordered';
    } else if (someOrdered) {
      status = 'partially_ordered';
    }

    await this.indentRepository.update(indentId, { status });
  }
}

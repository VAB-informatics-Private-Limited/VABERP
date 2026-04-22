import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
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
    private auditLogsService: AuditLogsService,
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

    const created = await this.findOne(savedIndent.id, enterpriseId);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: savedIndent.id,
      action: 'create',
      description: `Indent ${indentNumber} created from inventory`,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return created;
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

    const created = await this.findOne(savedIndent.id, enterpriseId);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: savedIndent.id,
      action: 'create',
      description: `Indent ${indentNumber} created from material request #${mrId}`,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return created;
  }

  async findAll(enterpriseId: number, page = 1, limit = 20, status?: string, source?: string) {
    const query = this.indentRepository
      .createQueryBuilder('indent')
      .leftJoinAndSelect('indent.materialRequest', 'mr')
      .leftJoinAndSelect('indent.salesOrder', 'so')
      .leftJoinAndSelect('indent.requestedByEmployee', 'requestedBy')
      .where('indent.enterpriseId = :enterpriseId', { enterpriseId });

    if (status === 'grn_rejected') {
      // Catch: entire GRN rejected OR confirmed GRNs that have items with rejected_qty > 0
      query.andWhere(`(
        EXISTS (
          SELECT 1 FROM goods_receipts g
          WHERE g.indent_id = indent.id
            AND g.status = 'rejected'
        )
        OR EXISTS (
          SELECT 1 FROM goods_receipts g
          JOIN goods_receipt_items gi ON gi.grn_id = g.id
          WHERE g.indent_id = indent.id
            AND g.status IN ('confirmed', 'partially_confirmed')
            AND gi.rejected_qty > 0
        )
        OR EXISTS (
          SELECT 1 FROM indent_items ii
          WHERE ii.indent_id = indent.id
            AND ii.status = 'grn_rejected'
        )
      )`);
    } else if (status) {
      query.andWhere('indent.status = :status', { status });
    }
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

  async updateETA(id: number, enterpriseId: number, expectedDelivery: string) {
    const indent = await this.indentRepository.findOne({ where: { id, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');
    await this.indentRepository.update(id, {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    });
    return this.findOne(id, enterpriseId);
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

    const grn = await this.grnRepository.findOne({
      where: { indentId: id },
      select: ['id', 'grnNumber', 'status', 'releasedBy', 'receivedBy', 'receivedDate'],
      order: { id: 'DESC' },
    });

    // Attach latest GRN item info to each indent item (look across ALL GRNs, not just the latest)
    // This ensures returned/rejected info survives even after a new GRN is created
    const enrichedItems: any[] = await Promise.all(
      items.map(async (item) => {
        const latestGrnItem = await this.grnItemRepository.findOne({
          where: { indentItemId: item.id },
          order: { id: 'DESC' },
        });
        if (latestGrnItem) {
          return {
            ...item,
            grnRejectionReason: latestGrnItem.rejectionReason,
            grnRejectedQty: Number(latestGrnItem.rejectedQty) > 0 ? Number(latestGrnItem.rejectedQty) : undefined,
            grnRejectionNotes: latestGrnItem.notes,
            grnRtvStatus: latestGrnItem.rtvStatus,    // null | 'pending' | 'returned'
            grnItemStatus: latestGrnItem.status,       // 'pending' | 'confirmed' | 'partial' | 'rejected'
          };
        }
        return item;
      }),
    );

    // Parent indent info (when this is a replacement)
    let parentIndent: { id: number; indentNumber: string; status: string } | null = null;
    if (indent.parentIndentId) {
      const p = await this.indentRepository.findOne({ where: { id: indent.parentIndentId } });
      if (p) parentIndent = { id: p.id, indentNumber: p.indentNumber, status: p.status };
    }

    // Child replacement indents
    const replacementIndents = await this.indentRepository.find({
      where: { parentIndentId: id, enterpriseId } as any,
      select: ['id', 'indentNumber', 'status', 'createdDate'] as any,
      order: { id: 'ASC' },
    });

    return {
      message: 'Indent fetched successfully',
      data: {
        ...indent,
        items: enrichedItems,
        purchaseOrders,
        grn: grn || null,
        parentIndent,
        replacementIndents: replacementIndents.map((r) => ({
          id: r.id,
          indentNumber: r.indentNumber,
          status: r.status,
          createdDate: r.createdDate,
        })),
      },
    };
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

    this.auditLogsService.log({
      enterpriseId,
      entityType: 'indent',
      entityId: indentId,
      action: 'update',
      description: `Indent item #${itemId} updated`,
      newValues: updateData,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

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

    this.auditLogsService.log({
      enterpriseId,
      entityType: 'indent',
      entityId: indentId,
      action: 'delete',
      description: `Indent item #${itemId} removed`,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return this.findOne(indentId, enterpriseId);
  }

  async cancel(id: number, enterpriseId: number, userId?: number) {
    const indent = await this.indentRepository.findOne({ where: { id, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    await this.indentRepository.update(id, { status: 'cancelled' });

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: id,
      action: 'status_change',
      description: `Indent ${indent.indentNumber} cancelled`,
      newValues: { status: 'cancelled' },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

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

      // Only record received quantity on the indent item — stock update happens on GRN confirmation
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

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: indentId,
      action: 'receive',
      description: `Goods received for indent: ${receivedItems.map((i) => `${i.itemName} x${i.quantity}`).join(', ')}`,
      newValues: { receivedItems },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

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

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: indentId,
      action: 'release',
      description: `Indent released to inventory: ${updatedMrItems.join(', ')}`,
      newValues: { releasedItems: updatedMrItems },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

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

    // Get all indent items
    const indentItems = await this.indentItemRepository.find({ where: { indentId } });
    const receivedItems = indentItems.filter((i) => Number(i.receivedQuantity) > 0);

    if (receivedItems.length === 0) {
      throw new BadRequestException('No items have been received yet');
    }

    // Block only if the latest GRN is still pending confirmation
    const existingGrn = await this.grnRepository.findOne({ where: { indentId }, order: { id: 'DESC' } });
    if (existingGrn && existingGrn.status === 'pending') {
      throw new BadRequestException(`GRN ${existingGrn.grnNumber} is pending confirmation by inventory. Wait for them to confirm before re-releasing.`);
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
      // Skip items already successfully confirmed in a previous GRN (accepted qty > 0)
      const prevGrnItem = await this.grnItemRepository.findOne({
        where: { indentItemId: indentItem.id },
        order: { id: 'DESC' },
      });
      if (prevGrnItem && prevGrnItem.status !== 'rejected') {
        continue; // already accepted — don't create duplicate GRN entry
      }

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

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: indentId,
      action: 'release',
      description: `Indent released — GRN ${grnNumber} created with ${grnItems.length} item(s)`,
      newValues: { grnId: grn.id, grnNumber, releasedItems: grnItems },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

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

  async createReplacementIndent(
    parentIndentId: number,
    enterpriseId: number,
    rejectionReason?: string,
    userId?: number,
  ) {
    const parent = await this.indentRepository.findOne({
      where: { id: parentIndentId, enterpriseId },
    });
    if (!parent) throw new NotFoundException('Indent not found');

    const allItems = await this.indentItemRepository.find({ where: { indentId: parentIndentId } });
    // Items that were rejected: grn_rejected status OR received less than shortage
    const rejectedItems = allItems.filter(
      (i) => i.status === 'grn_rejected' || Number(i.receivedQuantity) < Number(i.shortageQuantity),
    );

    if (rejectedItems.length === 0) {
      throw new BadRequestException('No rejected items found in this indent to create a replacement');
    }

    const count = await this.indentRepository.count({ where: { enterpriseId } });
    const indentNumber = `IND-${String(count + 1).padStart(6, '0')}`;

    const replacement = this.indentRepository.create({
      enterpriseId,
      indentNumber,
      materialRequestId: parent.materialRequestId || undefined,
      salesOrderId: parent.salesOrderId || undefined,
      requestedBy: userId,
      requestDate: new Date(),
      source: 'replacement',
      status: 'pending',
      parentIndentId: parentIndentId,
      isReplacement: true,
      rejectionReason: rejectionReason || null,
      notes: `Replacement for rejected items from ${parent.indentNumber}${rejectionReason ? `. Reason: ${rejectionReason}` : ''}`,
    } as any);

    const saved = await this.indentRepository.save(replacement);
    const savedIndent = Array.isArray(saved) ? saved[0] : saved;

    for (const item of rejectedItems) {
      const alreadyReceived = Number(item.receivedQuantity);
      const shortage = Number(item.shortageQuantity);
      const qtyNeeded = shortage - alreadyReceived > 0 ? shortage - alreadyReceived : shortage;

      await this.indentItemRepository.save(
        this.indentItemRepository.create({
          indentId: savedIndent.id,
          rawMaterialId: item.rawMaterialId || undefined,
          materialRequestItemId: item.materialRequestItemId || undefined,
          itemName: item.itemName,
          requiredQuantity: qtyNeeded,
          availableQuantity: 0,
          shortageQuantity: qtyNeeded,
          unitOfMeasure: item.unitOfMeasure,
          status: 'pending',
          notes: `Replacement for rejected item from ${parent.indentNumber}`,
        }),
      );
    }

    const created = await this.findOne(savedIndent.id, enterpriseId);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'indent',
      entityId: savedIndent.id,
      action: 'create',
      description: `Replacement indent ${indentNumber} created for parent indent #${parentIndentId}`,
      newValues: { parentIndentId, rejectionReason },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return created;
  }

  async reissueRejectedToInventory(indentId: number, enterpriseId: number, userId?: number) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    const allItems = await this.indentItemRepository.find({ where: { indentId } });
    const rejectedItems = allItems.filter((i) => i.status === 'grn_rejected');

    if (rejectedItems.length === 0) {
      throw new BadRequestException('No GRN-rejected items found to re-issue');
    }

    // Mark rejected items as received at their shortage quantity
    // The supplier has re-delivered; procurement is releasing them to inventory for fresh confirmation
    for (const item of rejectedItems) {
      await this.indentItemRepository.update(item.id, {
        receivedQuantity: item.shortageQuantity,
        orderedQuantity: item.shortageQuantity,
        status: 'received',
      });
    }

    await this.recalcIndentStatus(indentId);

    // Create a new pending GRN for inventory team to confirm
    return this.releaseAllItems(indentId, enterpriseId, userId);
  }

  async reorderRejectedItems(indentId: number, enterpriseId: number) {
    const indent = await this.indentRepository.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    const allItems = await this.indentItemRepository.find({ where: { indentId } });

    // Items that need re-ordering: received less than what was required
    // This covers both full rejections (grn_rejected) and partial rejections (received < shortage)
    const itemsToReset = allItems.filter(
      (i) => Number(i.receivedQuantity) < Number(i.shortageQuantity),
    );

    if (itemsToReset.length === 0) {
      throw new BadRequestException('All items have been fully received — nothing to re-order');
    }

    const mrItemIdsToReset: number[] = [];
    for (const item of itemsToReset) {
      const alreadyReceived = Number(item.receivedQuantity);
      const remaining = Number(item.shortageQuantity) - alreadyReceived;
      await this.indentItemRepository.update(item.id, {
        // For partial deliveries: reduce shortage to only what's still needed
        // For full rejections (receivedQty=0): shortage stays the same
        shortageQuantity: remaining > 0 ? remaining : Number(item.shortageQuantity),
        receivedQuantity: 0,
        orderedQuantity: 0,
        status: 'pending',
      });
      if (item.materialRequestItemId) {
        mrItemIdsToReset.push(item.materialRequestItemId);
      }
    }

    // Reset linked MR items so they can be re-issued when fresh stock arrives
    for (const mrItemId of mrItemIdsToReset) {
      await this.mrItemRepository.update(mrItemId, {
        quantityApproved: 0,
        quantityIssued: 0,
        status: 'pending',
        notes: 'Reset for re-order — previous delivery rejected or short',
      });
    }

    // Recalculate MR overall status if there's a linked MR
    const indentRecord = await this.indentRepository.findOne({ where: { id: indentId } });
    if (indentRecord?.materialRequestId) {
      const allMrItems = await this.mrItemRepository.find({
        where: { materialRequestId: indentRecord.materialRequestId },
      });
      const allDone = allMrItems.every((i) => i.status === 'issued' || i.status === 'rejected');
      await this.mrRepository.update(indentRecord.materialRequestId, {
        status: allDone ? 'fulfilled' : 'partially_fulfilled',
      });
    }

    await this.recalcIndentStatus(indentId);

    const result = await this.findOne(indentId, enterpriseId);

    this.auditLogsService.log({
      enterpriseId,
      entityType: 'indent',
      entityId: indentId,
      action: 'status_change',
      description: `${itemsToReset.length} item(s) reset for re-ordering`,
      newValues: { reorderedCount: itemsToReset.length },
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return {
      ...result,
      message: `${itemsToReset.length} item(s) reset for re-ordering. Receive fresh stock from the supplier, then release to inventory again.`,
      reorderedCount: itemsToReset.length,
    };
  }

  private async recalcIndentStatus(indentId: number) {
    const items = await this.indentItemRepository.find({ where: { indentId } });
    const active = items.filter((i) => i.status !== 'cancelled');

    // grn_rejected items need re-ordering — treated as pending for status calc
    const allReceived = active.every((i) => i.status === 'received');
    const allOrdered = active.every(
      (i) => i.status === 'ordered' || i.status === 'received' || i.status === 'grn_rejected',
    );
    const someOrdered = active.some((i) => i.status === 'ordered' || i.status === 'received');

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

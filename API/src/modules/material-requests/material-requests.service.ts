import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestItem } from './entities/material-request-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLedger } from '../inventory/entities/inventory-ledger.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { CreateMaterialRequestDto, ApproveMaterialRequestDto } from './dto/create-material-request.dto';
import { EmailService } from '../email/email.service';
import { IndentsService, InsufficientItem } from '../indents/indents.service';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class MaterialRequestsService {
  constructor(
    @InjectRepository(MaterialRequest)
    private mrRepository: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private mrItemRepository: Repository<MaterialRequestItem>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryLedger)
    private ledgerRepository: Repository<InventoryLedger>,
    @InjectRepository(SalesOrder)
    private salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(RawMaterial)
    private rawMaterialRepository: Repository<RawMaterial>,
    @InjectRepository(RawMaterialLedger)
    private rawMaterialLedgerRepository: Repository<RawMaterialLedger>,
    @InjectRepository(JobCard)
    private jobCardRepository: Repository<JobCard>,
    private emailService: EmailService,
    @Inject(forwardRef(() => IndentsService))
    private indentsService: IndentsService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(enterpriseId: number, page = 1, limit = 20, status?: string) {
    const query = this.mrRepository
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.requestedByEmployee', 'requestedBy')
      .leftJoinAndSelect('mr.jobCard', 'jobCard')
      .where('mr.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('mr.status = :status', { status });

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('mr.createdDate', 'DESC')
      .getManyAndCount();

    // Load items with product details for each MR
    const dataWithItems = await Promise.all(
      data.map(async (mr) => {
        const items = await this.mrItemRepository.find({
          where: { materialRequestId: mr.id },
          relations: ['product', 'rawMaterial'],
        });
        return { ...mr, items };
      }),
    );

    return { message: 'Material requests fetched successfully', data: dataWithItems, totalRecords: total, page: pageNum, limit: limitNum };
  }

  async updateETA(id: number, enterpriseId: number, expectedDelivery: string) {
    const mr = await this.mrRepository.findOne({ where: { id, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');
    await this.mrRepository.update(id, {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    });
    return this.findOne(id, enterpriseId);
  }

  async findOne(id: number, enterpriseId: number) {
    const mr = await this.mrRepository.findOne({
      where: { id, enterpriseId },
      relations: ['requestedByEmployee', 'approvedByEmployee', 'jobCard', 'salesOrder'],
    });
    if (!mr) throw new NotFoundException('Material request not found');

    const items = await this.mrItemRepository.find({
      where: { materialRequestId: id },
      relations: ['product', 'rawMaterial'],
    });

    return { message: 'Material request fetched successfully', data: { ...mr, items } };
  }

  async create(enterpriseId: number, dto: CreateMaterialRequestDto, userId?: number) {
    const count = await this.mrRepository.count({ where: { enterpriseId } });
    const requestNumber = `MR-${String(count + 1).padStart(6, '0')}`;

    const mr = this.mrRepository.create({
      enterpriseId,
      requestNumber,
      requestDate: new Date(),
      jobCardId: dto.jobCardId,
      salesOrderId: (dto as any).salesOrderId,
      requestedBy: userId,
      purpose: dto.purpose,
      notes: dto.notes,
      status: 'pending',
    });

    const savedResult = await this.mrRepository.save(mr);
    const savedMr = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // Save items with available stock (from raw materials or inventory)
    for (const item of dto.items) {
      let availableStock = 0;

      if (item.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: item.rawMaterialId, enterpriseId },
        });
        availableStock = rawMat ? Number(rawMat.availableStock) : 0;
      } else {
        const inventory = await this.inventoryRepository.findOne({
          where: { productId: item.productId, enterpriseId },
        });
        availableStock = inventory?.availableStock || 0;
      }

      const mrItem = this.mrItemRepository.create({
        materialRequestId: savedMr.id,
        productId: item.productId,
        rawMaterialId: item.rawMaterialId,
        itemName: item.itemName,
        quantityRequested: item.quantityRequested,
        availableStock,
        unitOfMeasure: item.unitOfMeasure,
        notes: item.notes,
        status: 'pending',
      });
      await this.mrItemRepository.save(mrItem);
    }

    const createResult = await this.findOne(savedMr.id, enterpriseId);
    this.auditLogsService.log({
      action: 'create',
      entityType: 'material_request',
      entityId: savedMr.id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return createResult;
  }

  async approve(id: number, enterpriseId: number, dto: ApproveMaterialRequestDto, userId?: number) {
    const mr = await this.mrRepository.findOne({ where: { id, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');

    // Process each item: approve what's available, mark insufficient items
    const insufficientForIndent: InsufficientItem[] = [];

    for (const approval of dto.items) {
      const mrItem = await this.mrItemRepository.findOne({ where: { id: approval.itemId } });
      if (!mrItem) continue;

      if (approval.status === 'approved' && approval.quantityApproved > 0) {
        // Check current stock
        let available = 0;
        if (mrItem.rawMaterialId) {
          const rawMat = await this.rawMaterialRepository.findOne({
            where: { id: mrItem.rawMaterialId, enterpriseId },
          });
          available = rawMat ? Number(rawMat.availableStock) : 0;
        } else {
          const inventory = await this.inventoryRepository.findOne({
            where: { productId: mrItem.productId, enterpriseId },
          });
          available = inventory?.availableStock ?? 0;
        }

        if (available >= approval.quantityApproved) {
          // Sufficient stock — approve and deduct
          const updateData: any = {
            quantityApproved: approval.quantityApproved,
            status: 'approved',
          };
          if (approval.notes !== undefined) updateData.notes = approval.notes;
          await this.mrItemRepository.update(approval.itemId, updateData);

          // Deduct stock
          if (mrItem.rawMaterialId) {
            const rawMat = await this.rawMaterialRepository.findOne({
              where: { id: mrItem.rawMaterialId, enterpriseId },
            });
            if (rawMat) {
              const previousStock = Number(rawMat.currentStock);
              const newStock = previousStock - approval.quantityApproved;
              await this.rawMaterialRepository.update(rawMat.id, {
                currentStock: newStock,
                availableStock: newStock - Number(rawMat.reservedStock),
              });
              await this.rawMaterialLedgerRepository.save(
                this.rawMaterialLedgerRepository.create({
                  enterpriseId,
                  rawMaterialId: rawMat.id,
                  transactionType: 'issue',
                  quantity: approval.quantityApproved,
                  previousStock,
                  newStock,
                  referenceType: 'material_request',
                  referenceId: mr.id,
                  remarks: `Stock reserved on approval for MR ${mr.requestNumber} — ${mrItem.itemName}`,
                  createdBy: userId,
                }),
              );
            }
          } else {
            const inventory = await this.inventoryRepository.findOne({
              where: { productId: mrItem.productId, enterpriseId },
            });
            if (inventory) {
              const ledger = this.ledgerRepository.create({
                enterpriseId,
                inventoryId: inventory.id,
                productId: mrItem.productId,
                transactionType: 'OUT',
                quantity: approval.quantityApproved,
                previousStock: inventory.currentStock,
                newStock: inventory.currentStock - approval.quantityApproved,
                referenceType: 'MANUFACTURING',
                referenceId: mr.id,
                remarks: `Stock reserved on approval for MR ${mr.requestNumber} — ${mrItem.itemName}`,
                createdBy: userId,
              });
              await this.ledgerRepository.save(ledger);
              await this.inventoryRepository.update(inventory.id, {
                currentStock: inventory.currentStock - approval.quantityApproved,
                availableStock: inventory.availableStock - approval.quantityApproved,
              });
            }
          }
        } else {
          // Insufficient stock — mark as insufficient and collect for indent
          const updateData: any = {
            quantityApproved: 0,
            status: 'insufficient',
          };
          if (approval.notes !== undefined) {
            updateData.notes = approval.notes;
          } else {
            updateData.notes = `Insufficient stock: requested ${approval.quantityApproved}, available ${available}`;
          }
          await this.mrItemRepository.update(approval.itemId, updateData);

          insufficientForIndent.push({
            mrItemId: mrItem.id,
            rawMaterialId: mrItem.rawMaterialId,
            itemName: mrItem.itemName,
            requiredQuantity: approval.quantityApproved,
            availableQuantity: available,
            shortageQuantity: approval.quantityApproved - available,
            unitOfMeasure: mrItem.unitOfMeasure,
          });
        }
      } else if (approval.status === 'rejected') {
        // Rejected — update as before
        const updateData: any = {
          quantityApproved: 0,
          status: 'rejected',
        };
        if (approval.notes !== undefined) updateData.notes = approval.notes;
        await this.mrItemRepository.update(approval.itemId, updateData);
      } else {
        // Any other status update
        const updateData: any = {
          quantityApproved: approval.quantityApproved,
          status: approval.status,
        };
        if (approval.notes !== undefined) updateData.notes = approval.notes;
        await this.mrItemRepository.update(approval.itemId, updateData);
      }
    }

    // Create indent for insufficient items
    let indentData = null;
    if (insufficientForIndent.length > 0) {
      const indentResult = await this.indentsService.createFromMaterialRequest(
        id, insufficientForIndent, enterpriseId, userId,
      );
      indentData = indentResult.data;
    }

    // Calculate new MR status
    const allItems = await this.mrItemRepository.find({ where: { materialRequestId: id } });
    const approvedCount = allItems.filter((i) => i.status === 'approved').length;
    const rejectedCount = allItems.filter((i) => i.status === 'rejected').length;
    const insufficientCount = allItems.filter((i) => i.status === 'insufficient').length;

    let newStatus = 'pending';
    if (approvedCount === allItems.length) {
      newStatus = 'approved';
    } else if (approvedCount > 0) {
      newStatus = 'partially_approved';
    } else if (insufficientCount > 0 && rejectedCount === 0) {
      newStatus = 'partially_approved'; // All insufficient but not rejected — sent to procurement
    } else if (rejectedCount === allItems.length) {
      newStatus = 'rejected';
    } else {
      newStatus = 'partially_approved';
    }

    await this.mrRepository.update(id, {
      status: newStatus,
      approvedBy: userId,
      approvedDate: new Date(),
    });

    // If this MR is linked to a sales order (manufacturing approval flow), update the PO status
    if (mr.salesOrderId) {
      const approvalStatus = (newStatus === 'approved' || newStatus === 'partially_approved') ? 'approved' : 'rejected';
      await this.salesOrderRepository.update(mr.salesOrderId, {
        materialApprovalStatus: approvalStatus,
      });
    }

    const result = await this.findOne(id, enterpriseId);
    this.auditLogsService.log({
      action: 'status_change',
      entityType: 'material_request',
      entityId: id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return {
      ...result,
      indent: indentData,
      insufficientCount,
    };
  }

  private async issueOneItem(mr: any, item: any, enterpriseId: number, userId?: number) {
    const qtyToIssue = Number(item.quantityApproved) - Number(item.quantityIssued);
    if (qtyToIssue <= 0) {
      throw new BadRequestException(`Item "${item.itemName}" is already fully issued`);
    }

    // Stock was already deducted during the approve step, so we just mark as issued.
    // No need to re-validate stock here — approval already reserved the materials.

    // Update item
    await this.mrItemRepository.update(item.id, {
      quantityIssued: Number(item.quantityIssued) + qtyToIssue,
      status: 'issued',
    });
  }

  private async checkAndUpdateMrStatus(id: number) {
    const allItems = await this.mrItemRepository.find({ where: { materialRequestId: id } });
    const allIssuedOrRejected = allItems.every(
      (i) => i.status === 'issued' || i.status === 'rejected',
    );
    if (allIssuedOrRejected) {
      await this.mrRepository.update(id, { status: 'fulfilled' });
      // Auto-update any linked job cards that are still waiting for materials
      await this.updateLinkedJobCardsOnFulfill(id);
    } else {
      const hasPartiallyIssued = allItems.some((i) => i.status === 'partially_issued');
      const hasIssued = allItems.some((i) => i.status === 'issued');
      if (hasPartiallyIssued || (hasIssued && !allIssuedOrRejected)) {
        await this.mrRepository.update(id, { status: 'partially_fulfilled' });
      }
    }
  }

  private async updateLinkedJobCardsOnFulfill(mrId: number) {
    try {
      const mr = await this.mrRepository.findOne({ where: { id: mrId } });
      if (!mr) return;

      // Find job cards linked via job_card_id or via sales_order_id that are waiting for materials
      const waitingStatuses = ['WAITING_FOR_MATERIALS', 'REQUESTED_RECHECK', 'PENDING_INVENTORY'];

      if (mr.jobCardId) {
        const jc = await this.jobCardRepository.findOne({ where: { id: mr.jobCardId } });
        if (jc && waitingStatuses.includes(jc.productionStage)) {
          await this.jobCardRepository.update(jc.id, {
            productionStage: 'PENDING_APPROVAL',
            materialStatus: 'FULLY_ISSUED',
          });
        }
      }

      if (mr.salesOrderId) {
        const linkedJcs = await this.jobCardRepository.find({
          where: { purchaseOrderId: mr.salesOrderId },
        });
        for (const jc of linkedJcs) {
          if (waitingStatuses.includes(jc.productionStage as string)) {
            await this.jobCardRepository.update(jc.id, {
              productionStage: 'PENDING_APPROVAL',
              materialStatus: 'FULLY_ISSUED',
            });
          }
        }
      }
    } catch (err) {
      // Non-blocking — don't fail the issue operation if this update fails
      console.error('Failed to update linked job cards after MR fulfilled:', err);
    }
  }

  async issue(id: number, enterpriseId: number, userId?: number) {
    const result = await this.findOne(id, enterpriseId);
    const mr = result.data;

    const approvedItems = mr.items.filter((i: any) => i.status === 'approved' && Number(i.quantityIssued) < Number(i.quantityApproved));

    if (approvedItems.length === 0) {
      throw new BadRequestException('No approved items to issue');
    }

    for (const item of approvedItems) {
      await this.issueOneItem(mr, item, enterpriseId, userId);
    }

    await this.checkAndUpdateMrStatus(id);

    // Notify manufacturing side about issued materials
    await this.notifyManufacturingOnIssue(mr, approvedItems);

    const issueResult = await this.findOne(id, enterpriseId);
    this.auditLogsService.log({
      action: 'issue',
      entityType: 'material_request',
      entityId: id,
      userId,
      enterpriseId,
    }).catch(() => {});
    return issueResult;
  }

  async issueItem(id: number, itemId: number, enterpriseId: number, userId?: number) {
    const result = await this.findOne(id, enterpriseId);
    const mr = result.data;

    const item = mr.items.find((i: any) => i.id === itemId);
    if (!item) {
      throw new BadRequestException('Item not found in this material request');
    }

    // Allow issuing when status is 'issued' but there's still remaining qty vs requested
    if (item.status === 'issued' && Number(item.quantityIssued) < Number(item.quantityRequested)) {
      // Auto-increase approved qty to match requested, then issue remaining
      const remaining = Number(item.quantityRequested) - Number(item.quantityIssued);

      // Validate stock before issuing
      if (item.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: item.rawMaterialId, enterpriseId },
        });
        if (!rawMat || Number(rawMat.availableStock) < remaining) {
          const available = rawMat ? Number(rawMat.availableStock) : 0;
          throw new BadRequestException(
            `Insufficient stock for "${item.itemName}". Required: ${remaining}, Available: ${available}. Cannot issue until stock is available.`,
          );
        }
      }

      await this.mrItemRepository.update(itemId, {
        quantityApproved: Number(item.quantityRequested),
        quantityIssued: Number(item.quantityRequested),
        status: 'issued',
      });
      await this.checkAndUpdateMrStatus(id);
      await this.notifyManufacturingOnIssue(mr, [{ ...item, quantityIssued: remaining, itemName: item.itemName }]);
      return this.findOne(id, enterpriseId);
    }

    if (item.status !== 'approved' && item.status !== 'partially_issued') {
      throw new BadRequestException(`Item "${item.itemName}" is not approved (status: ${item.status})`);
    }

    await this.issueOneItem(mr, item, enterpriseId, userId);
    await this.checkAndUpdateMrStatus(id);

    // Notify manufacturing side about the issued item
    await this.notifyManufacturingOnIssue(mr, [item]);

    return this.findOne(id, enterpriseId);
  }

  /**
   * Issue a partial quantity of a single material item.
   * Allows inventory to issue materials incrementally.
   */
  async issuePartialItem(
    id: number,
    itemId: number,
    quantity: number,
    enterpriseId: number,
    userId?: number,
  ) {
    const result = await this.findOne(id, enterpriseId);
    const mr = result.data;

    const item = mr.items.find((i: any) => i.id === itemId);
    if (!item) {
      throw new BadRequestException('Item not found in this material request');
    }

    // Allow partial issuing when status is 'issued' but quantity_issued < quantity_requested
    const isIssuedButRemaining = item.status === 'issued' && Number(item.quantityIssued) < Number(item.quantityRequested);

    if (!isIssuedButRemaining && item.status !== 'approved' && item.status !== 'partially_issued') {
      throw new BadRequestException(
        `Item "${item.itemName}" must be approved before issuing (current: ${item.status})`,
      );
    }

    // Calculate remaining based on requested qty (not just approved)
    const maxRemaining = Number(item.quantityRequested) - Number(item.quantityIssued);
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }
    if (quantity > maxRemaining) {
      throw new BadRequestException(
        `Cannot issue ${quantity}. Remaining to issue: ${maxRemaining}`,
      );
    }

    // Validate stock before issuing
    if (item.rawMaterialId) {
      const rawMat = await this.rawMaterialRepository.findOne({
        where: { id: item.rawMaterialId, enterpriseId },
      });
      if (!rawMat || Number(rawMat.availableStock) < quantity) {
        const available = rawMat ? Number(rawMat.availableStock) : 0;
        throw new BadRequestException(
          `Insufficient stock for "${item.itemName}". Required: ${quantity}, Available: ${available}. Cannot issue until stock is available.`,
        );
      }
    }

    const newIssuedQty = Number(item.quantityIssued) + quantity;
    const fullyIssued = newIssuedQty >= Number(item.quantityRequested);

    // Auto-increase approved qty if needed
    const newApprovedQty = Math.max(Number(item.quantityApproved), newIssuedQty);

    await this.mrItemRepository.update(itemId, {
      quantityApproved: newApprovedQty,
      quantityIssued: newIssuedQty,
      status: fullyIssued ? 'issued' : 'partially_issued',
    });

    await this.checkAndUpdateMrStatus(id);

    // Notify manufacturing
    await this.notifyManufacturingOnIssue(mr, [
      { ...item, quantityIssued: quantity, itemName: item.itemName },
    ]);

    return this.findOne(id, enterpriseId);
  }

  /**
   * Recheck stock for rejected items — refresh available_stock from inventory.
   * If stock is now available, reset item to 'pending' so inventory can re-approve.
   */
  async recheck(id: number, enterpriseId: number) {
    const mr = await this.mrRepository.findOne({ where: { id, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');

    // Get all items for this MR
    const items = await this.mrItemRepository.find({
      where: { materialRequestId: id },
    });

    // Find rejected items OR items with 0 available stock that were not issued
    const recheckableItems = items.filter(
      (i) => i.status === 'rejected' || (i.status === 'pending' && Number(i.availableStock) === 0),
    );

    if (recheckableItems.length === 0) {
      throw new BadRequestException('No rejected items to recheck');
    }

    const nowAvailable: { itemName: string; available: number; requested: number }[] = [];
    const stillUnavailable: string[] = [];

    for (const item of recheckableItems) {
      let latestStock = 0;

      if (item.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: item.rawMaterialId, enterpriseId },
        });
        latestStock = rawMat ? Number(rawMat.availableStock) : 0;
      } else {
        const inventory = await this.inventoryRepository.findOne({
          where: { productId: item.productId, enterpriseId },
        });
        latestStock = inventory?.availableStock ?? 0;
      }

      // Update the available_stock on the item regardless
      await this.mrItemRepository.update(item.id, {
        availableStock: latestStock,
      });

      // If stock is now sufficient (at least some available), reset to pending
      if (latestStock > 0) {
        await this.mrItemRepository.update(item.id, {
          status: 'pending',
          notes: `Stock rechecked — ${latestStock} now available`,
          quantityApproved: 0,
        });
        nowAvailable.push({
          itemName: item.itemName,
          available: latestStock,
          requested: Number(item.quantityRequested),
        });
      } else {
        stillUnavailable.push(item.itemName);
      }
    }

    // If any items became available, update MR status back to pending using query builder to set NULL
    if (nowAvailable.length > 0) {
      await this.mrRepository
        .createQueryBuilder()
        .update(MaterialRequest)
        .set({
          status: 'pending',
        })
        .where('id = :id', { id })
        .execute();

      // Set approved_by and approved_date to NULL separately (TypeORM update ignores undefined)
      await this.mrRepository
        .createQueryBuilder()
        .update(MaterialRequest)
        .set({ approvedDate: null as any, approvedBy: null as any })
        .where('id = :id', { id })
        .execute();
    }

    return {
      ...(await this.findOne(id, enterpriseId)),
      recheckResult: {
        totalRechecked: recheckableItems.length,
        nowAvailable: nowAvailable.length,
        stillUnavailable,
        items: nowAvailable,
      },
    };
  }

  /**
   * Refresh available stock for ALL items in the MR from raw_materials/inventory.
   * Unlike recheck(), this updates every item regardless of status.
   */
  async refreshStock(id: number, enterpriseId: number) {
    const mr = await this.mrRepository.findOne({ where: { id, enterpriseId } });
    if (!mr) throw new NotFoundException('Material request not found');

    const items = await this.mrItemRepository.find({
      where: { materialRequestId: id },
    });

    const updatedItems: { itemName: string; previousStock: number; currentStock: number }[] = [];

    for (const item of items) {
      let latestStock = 0;

      if (item.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: item.rawMaterialId, enterpriseId },
        });
        latestStock = rawMat ? Number(rawMat.availableStock) : 0;
      } else if (item.productId) {
        const inventory = await this.inventoryRepository.findOne({
          where: { productId: item.productId, enterpriseId },
        });
        latestStock = inventory?.availableStock ?? 0;
      }

      const previousStock = Number(item.availableStock);
      if (latestStock !== previousStock) {
        await this.mrItemRepository.update(item.id, {
          availableStock: latestStock,
        });
        updatedItems.push({
          itemName: item.itemName,
          previousStock,
          currentStock: latestStock,
        });
      }
    }

    const result = await this.findOne(id, enterpriseId);
    return {
      ...result,
      refreshResult: {
        totalItems: items.length,
        updatedCount: updatedItems.length,
        updatedItems,
      },
    };
  }

  /**
   * Manufacturing team confirms they have received the issued materials.
   */
  async confirmReceived(id: number, enterpriseId: number, user?: { id: number; type: string; name?: string }) {
    const result = await this.findOne(id, enterpriseId);
    const mr = result.data;

    const hasIssuedItems = mr.items.some((i: any) =>
      ['issued', 'partially_issued'].includes(i.status),
    );
    if (!hasIssuedItems) {
      throw new BadRequestException('No issued materials to confirm receipt for');
    }

    await this.mrRepository.update(id, {
      confirmedReceived: true,
      confirmedReceivedAt: new Date(),
    });

    const receivedResult = await this.findOne(id, enterpriseId);
    this.auditLogsService.log({
      action: 'receive',
      entityType: 'material_request',
      entityId: id,
      userId: user?.id,
      enterpriseId,
    }).catch(() => {});
    return receivedResult;
  }

  /**
   * Send email to manufacturing team when materials are issued
   */
  private async notifyManufacturingOnIssue(mr: any, issuedItems: any[]) {
    try {
      if (!this.emailService.isConfigured()) return;

      const itemLines = issuedItems
        .map((i) => `• ${i.itemName}: ${Number(i.quantityApproved)} ${i.unitOfMeasure || 'units'}`)
        .join('\n');

      await this.emailService.sendEmail({
        to: 'admin@vabenterprise.com',
        subject: `✅ Materials Issued — ${mr.requestNumber}`,
        body: `Materials have been issued for ${mr.requestNumber}.\n\nIssued Items:\n${itemLines}\n\nPurpose: ${mr.purpose || 'N/A'}\n\nThe materials are now ready for pickup/use. Manufacturing can proceed.`,
      });
    } catch (error) {
      console.error('Failed to send manufacturing notification:', error);
      // Non-blocking — don't fail the issue operation
    }
  }
}

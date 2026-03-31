import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { IndentItem } from '../indents/entities/indent-item.entity';
import { Indent } from '../indents/entities/indent.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectRepository(GoodsReceipt)
    private grnRepository: Repository<GoodsReceipt>,
    @InjectRepository(GoodsReceiptItem)
    private grnItemRepository: Repository<GoodsReceiptItem>,
    @InjectRepository(RawMaterial)
    private rawMaterialRepository: Repository<RawMaterial>,
    @InjectRepository(RawMaterialLedger)
    private rawMaterialLedgerRepository: Repository<RawMaterialLedger>,
    @InjectRepository(MaterialRequest)
    private mrRepository: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private mrItemRepository: Repository<MaterialRequestItem>,
    @InjectRepository(IndentItem)
    private indentItemRepository: Repository<IndentItem>,
    @InjectRepository(Indent)
    private indentRepository: Repository<Indent>,
    @InjectRepository(PurchaseOrder)
    private poRepository: Repository<PurchaseOrder>,
  ) {}

  async findAll(enterpriseId: number, status?: string, page = 1, limit = 20) {
    const qb = this.grnRepository
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.releasedByEmployee', 'releasedBy')
      .leftJoinAndSelect('grn.receivedByEmployee', 'receivedBy')
      .leftJoinAndSelect('grn.indent', 'indent')
      .leftJoinAndSelect('grn.items', 'items')
      .where('grn.enterpriseId = :enterpriseId', { enterpriseId })
      .orderBy('grn.createdDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('grn.status = :status', { status });
    }

    const [data, totalRecords] = await qb.getManyAndCount();
    return { message: 'Goods receipts fetched', data, totalRecords, page, limit };
  }

  async findOne(id: number, enterpriseId: number) {
    const grn = await this.grnRepository.findOne({
      where: { id, enterpriseId },
      relations: ['items', 'items.rawMaterial', 'releasedByEmployee', 'receivedByEmployee', 'indent'],
    });
    if (!grn) throw new NotFoundException('Goods receipt not found');

    // Attach PO info (supplier, PO number) from the original purchase order for this indent
    let linkedPo: { poNumber?: string; supplierName?: string; supplierId?: number } = {};
    if (grn.indentId) {
      const originalPo = await this.poRepository.findOne({
        where: { indentId: grn.indentId, enterpriseId },
        order: { id: 'ASC' }, // oldest PO = the original one
      });
      if (originalPo) {
        linkedPo = {
          poNumber: originalPo.poNumber,
          supplierName: originalPo.supplierName,
          supplierId: originalPo.supplierId,
        };
      }
    }

    return { message: 'Goods receipt fetched', data: { ...grn, ...linkedPo } };
  }

  async confirmReceipt(
    id: number,
    enterpriseId: number,
    dto: {
      receivedBy: number;
      items: {
        grnItemId: number;
        confirmedQty: number;
        acceptedQty?: number;
        rejectedQty?: number;
        rejectionReason?: string;
        notes?: string;
      }[];
      notes?: string;
    },
    userId?: number,
  ) {
    const grn = await this.grnRepository.findOne({
      where: { id, enterpriseId },
      relations: ['items'],
    });
    if (!grn) throw new NotFoundException('Goods receipt not found');
    if (grn.status === 'confirmed') throw new BadRequestException('Goods receipt already confirmed');

    for (const input of dto.items) {
      const grnItem = grn.items.find((i) => i.id === input.grnItemId);
      if (!grnItem) continue;

      const confirmedQty = Number(input.confirmedQty) || 0;

      // acceptedQty defaults to confirmedQty if not provided (backward compat)
      const acceptedQty = input.acceptedQty !== undefined ? Number(input.acceptedQty) : confirmedQty;
      const rejectedQty = confirmedQty - acceptedQty;

      if (acceptedQty > confirmedQty) {
        throw new BadRequestException(`Accepted qty (${acceptedQty}) cannot exceed received qty (${confirmedQty}) for item ${grnItem.itemName}`);
      }

      if (confirmedQty <= 0) {
        await this.grnItemRepository.update(grnItem.id, {
          status: 'rejected',
          confirmedQty: 0,
          acceptedQty: 0,
          rejectedQty: 0,
          notes: input.notes,
        });
        continue;
      }

      const expectedQty = Number(grnItem.expectedQty);

      // Update raw material stock — only accepted qty enters inventory
      if (grnItem.rawMaterialId && acceptedQty > 0) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: grnItem.rawMaterialId, enterpriseId },
        });
        if (rawMat) {
          const previousStock = Number(rawMat.currentStock);
          const newStock = previousStock + acceptedQty;

          await this.rawMaterialRepository.update(rawMat.id, {
            currentStock: newStock,
            availableStock: newStock - Number(rawMat.reservedStock),
          });

          const remarksBase = `GRN ${grn.grnNumber}: received ${confirmedQty}, accepted ${acceptedQty}`;
          const rejectedNote = rejectedQty > 0
            ? `, rejected ${rejectedQty}${input.rejectionReason ? ` (${input.rejectionReason})` : ''}`
            : '';

          await this.rawMaterialLedgerRepository.save(
            this.rawMaterialLedgerRepository.create({
              enterpriseId,
              rawMaterialId: rawMat.id,
              transactionType: 'purchase_receive',
              quantity: acceptedQty,
              previousStock,
              newStock,
              referenceType: 'grn',
              referenceId: grn.id,
              remarks: remarksBase + rejectedNote + ` of ${expectedQty} expected`,
              createdBy: userId,
            }),
          );
        }
      }

      // Item status: confirmed / partial / rejected
      const itemStatus =
        acceptedQty === 0 ? 'rejected' :
        acceptedQty >= expectedQty && rejectedQty === 0 ? 'confirmed' : 'partial';

      const updatePayload: any = {
        confirmedQty,
        acceptedQty,
        rejectedQty,
        rejectionReason: rejectedQty > 0 ? (input.rejectionReason || undefined) : undefined,
        status: itemStatus,
        notes: input.notes,
      };
      // RTV status: set 'pending' when there are rejected/damaged items to return
      if (rejectedQty > 0) updatePayload.rtvStatus = 'pending';

      await this.grnItemRepository.update(grnItem.id, updatePayload);

      // Update the linked indent item — use acceptedQty for stock tracking
      if (grnItem.indentItemId) {
        const indentItem = await this.indentItemRepository.findOne({ where: { id: grnItem.indentItemId } });
        if (indentItem) {
          const shortage = Number(indentItem.shortageQuantity);
          const indentItemStatus =
            acceptedQty === 0 ? 'grn_rejected'
            : acceptedQty >= shortage ? 'received'
            : 'partial';
          await this.indentItemRepository.update(indentItem.id, {
            receivedQuantity: acceptedQty,
            status: indentItemStatus,
          });

          // Update the linked MR item
          if (indentItem.materialRequestItemId) {
            const mrItem = await this.mrItemRepository.findOne({
              where: { id: indentItem.materialRequestItemId },
            });
            if (mrItem) {
              if (acceptedQty === 0) {
                // All units rejected — nothing was issued
                await this.mrItemRepository.update(mrItem.id, {
                  quantityApproved: 0,
                  quantityIssued: 0,
                  status: 'rejected',
                  notes: `All ${rejectedQty} unit(s) rejected in GRN ${grn.grnNumber}${input.rejectionReason ? `: ${input.rejectionReason}` : ''}`,
                });
              } else {
                const qtyToIssue = Math.min(Number(mrItem.quantityRequested), acceptedQty);
                await this.mrItemRepository.update(mrItem.id, {
                  quantityApproved: qtyToIssue,
                  quantityIssued: qtyToIssue,
                  status: 'issued',
                  notes: `Issued from GRN ${grn.grnNumber} — accepted ${acceptedQty}${rejectedQty > 0 ? `, rejected ${rejectedQty}` : ''}`,
                });
              }
            }
          }
        }
      }
    }

    // Recalculate GRN overall status
    const updatedItems = await this.grnItemRepository.find({ where: { grnId: grn.id } });
    const allDone = updatedItems.every((i) => ['confirmed', 'rejected', 'partial'].includes(i.status));
    // 'confirmed' = all items fully accepted (no partial, no rejected)
    // 'partially_confirmed' = all items processed but some were partial/rejected, OR some still pending
    const allFullyAccepted = updatedItems.every((i) => i.status === 'confirmed');
    const anyConfirmed = updatedItems.some((i) => i.status === 'confirmed' || i.status === 'partial');
    const newStatus = allFullyAccepted ? 'confirmed' : allDone && anyConfirmed ? 'partially_confirmed' : anyConfirmed ? 'partially_confirmed' : 'pending';

    await this.grnRepository.update(grn.id, {
      status: newStatus,
      receivedBy: dto.receivedBy,
      receivedDate: new Date() as any,
      notes: dto.notes,
    });

    // Post-confirmation flows
    if (grn.indentId) {
      const indent = await this.indentRepository.findOne({ where: { id: grn.indentId, enterpriseId } });
      if (indent?.materialRequestId) {
        const allMrItems = await this.mrItemRepository.find({
          where: { materialRequestId: indent.materialRequestId },
        });
        const allIssued = allMrItems.every((i) => i.status === 'issued' || i.status === 'rejected');
        await this.mrRepository.update(indent.materialRequestId, {
          status: allIssued ? 'fulfilled' : 'partially_fulfilled',
          approvedBy: userId,
          approvedDate: new Date(),
        });
      }

      // Auto-reset short-delivery (partial) indent items and create follow-up draft PO
      const allIndentItems = await this.indentItemRepository.find({ where: { indentId: grn.indentId } });
      const partialIndentItems = allIndentItems.filter((i) => i.status === 'partial');

      if (partialIndentItems.length > 0) {
        // Reset each partial item so procurement can re-order the remaining qty
        for (const item of partialIndentItems) {
          const remaining = Number(item.shortageQuantity) - Number(item.receivedQuantity);
          if (remaining > 0) {
            await this.indentItemRepository.update(item.id, {
              shortageQuantity: remaining,
              receivedQuantity: 0,
              orderedQuantity: 0,
              status: 'pending',
            });
          }
        }

      }

      // Close indent if all items confirmed
      const refreshedIndentItems = await this.indentItemRepository.find({ where: { indentId: grn.indentId } });
      const allReceived = refreshedIndentItems.every(
        (i) => Number(i.receivedQuantity) >= Number(i.shortageQuantity),
      );
      if (allReceived) {
        await this.indentRepository.update(grn.indentId, { status: 'closed' });
      }
    }

    const result = await this.findOne(id, enterpriseId);
    return {
      ...result,
      message:
        newStatus === 'confirmed'
          ? `GRN ${grn.grnNumber} confirmed. Stock updated and accepted items issued to manufacturing.`
          : `GRN ${grn.grnNumber} partially confirmed. Stock updated for accepted items.`,
    };
  }

  async rejectReceipt(id: number, enterpriseId: number, notes?: string) {
    const grn = await this.grnRepository.findOne({ where: { id, enterpriseId } });
    if (!grn) throw new NotFoundException('Goods receipt not found');
    if (grn.status !== 'pending') throw new BadRequestException('Only pending GRNs can be rejected');
    await this.grnRepository.update(grn.id, { status: 'rejected', notes });
    return { message: 'Goods receipt rejected. Items returned to procurement.', data: grn };
  }

  async markItemReturned(
    grnId: number,
    itemId: number,
    enterpriseId: number,
    userId?: number,
  ) {
    const grn = await this.grnRepository.findOne({ where: { id: grnId, enterpriseId } });
    if (!grn) throw new NotFoundException('Goods receipt not found');

    const grnItem = await this.grnItemRepository.findOne({
      where: { id: itemId, grnId },
    });
    if (!grnItem) throw new NotFoundException('GRN item not found');
    if (grnItem.rtvStatus !== 'pending') {
      throw new BadRequestException('Item is not pending return to vendor');
    }

    await this.grnItemRepository.update(itemId, { rtvStatus: 'returned' });

    // Reset the linked indent item to pending so procurement can track remaining qty with supplier
    if (grnItem.indentItemId) {
      const indentItem = await this.indentItemRepository.findOne({ where: { id: grnItem.indentItemId } });
      if (indentItem) {
        const rejectedQty = Number(grnItem.rejectedQty);
        const reasonLabel = grnItem.rejectionReason
          ? { damaged: 'Damaged', defective: 'Defective', incorrect_item: 'Incorrect Item', other: 'Other' }[grnItem.rejectionReason] || grnItem.rejectionReason
          : 'rejected';
        await this.indentItemRepository.update(indentItem.id, {
          shortageQuantity: rejectedQty,
          receivedQuantity: 0,
          orderedQuantity: 0,
          status: 'pending',
          notes: `Returned to vendor — ${reasonLabel}. ${rejectedQty} unit(s) need replacement delivery from supplier.`,
        });

        // Reset the linked MR item back to pending
        if (indentItem.materialRequestItemId) {
          const mrItem = await this.mrItemRepository.findOne({ where: { id: indentItem.materialRequestItemId } });
          if (mrItem) {
            await this.mrItemRepository.update(mrItem.id, {
              quantityApproved: 0,
              quantityIssued: 0,
              status: 'pending',
              notes: 'Reset for re-delivery — item returned to vendor',
            });
            // Recalculate MR overall status
            const allMrItems = await this.mrItemRepository.find({ where: { materialRequestId: mrItem.materialRequestId } });
            const allIssued = allMrItems.every((i) => i.status === 'issued' || i.status === 'rejected');
            await this.mrRepository.update(mrItem.materialRequestId, {
              status: allIssued ? 'fulfilled' : 'partially_fulfilled',
            });
          }
        }

        // Recalculate indent overall status
        const allIndentItems = await this.indentItemRepository.find({ where: { indentId: indentItem.indentId } });
        const allReceived = allIndentItems.every((i) => i.status === 'received');
        const anyOrderedOrReceived = allIndentItems.some((i) => ['ordered', 'received'].includes(i.status));
        const newIndentStatus = allReceived ? 'closed' : anyOrderedOrReceived ? 'partially_ordered' : 'pending';
        await this.indentRepository.update(indentItem.indentId, { status: newIndentStatus });
      }
    }

    const result = await this.findOne(grnId, enterpriseId);
    return {
      ...result,
      message: `Item marked as returned to vendor. Procurement can now re-order the replacement.`,
    };
  }
}

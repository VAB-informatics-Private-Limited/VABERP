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
    return { message: 'Goods receipt fetched', data: grn };
  }

  async confirmReceipt(
    id: number,
    enterpriseId: number,
    dto: {
      receivedBy: number;
      items: { grnItemId: number; confirmedQty: number; notes?: string }[];
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

      if (input.confirmedQty <= 0) {
        await this.grnItemRepository.update(grnItem.id, {
          status: 'rejected',
          confirmedQty: 0,
          notes: input.notes,
        });
        continue;
      }

      const confirmedQty = Number(input.confirmedQty);
      const expectedQty = Number(grnItem.expectedQty);

      // Update raw material stock
      if (grnItem.rawMaterialId) {
        const rawMat = await this.rawMaterialRepository.findOne({
          where: { id: grnItem.rawMaterialId, enterpriseId },
        });
        if (rawMat) {
          // Step 1: Correct procurement's stock entry
          // procurement already did currentStock += expectedQty via receiveGoods()
          // We reverse that and apply the correct received qty
          const correctionQty = confirmedQty - expectedQty; // negative if under-delivered
          const stockAfterCorrection = Number(rawMat.currentStock) + correctionQty;

          if (correctionQty !== 0) {
            await this.rawMaterialLedgerRepository.save(
              this.rawMaterialLedgerRepository.create({
                enterpriseId,
                rawMaterialId: rawMat.id,
                transactionType: 'adjustment',
                quantity: correctionQty,
                previousStock: Number(rawMat.currentStock),
                newStock: stockAfterCorrection,
                referenceType: 'grn',
                referenceId: grn.id,
                remarks: `GRN ${grn.grnNumber} stock correction: procurement claimed ${expectedQty}, inventory confirmed ${confirmedQty}`,
                createdBy: userId,
              }),
            );
            await this.rawMaterialRepository.update(rawMat.id, {
              currentStock: stockAfterCorrection,
              availableStock: stockAfterCorrection - Number(rawMat.reservedStock),
            });
          }

          // Step 2: Issue confirmed qty to manufacturing (deduct from stock)
          if (confirmedQty > 0) {
            const stockAfterIssue = stockAfterCorrection - confirmedQty;
            await this.rawMaterialRepository.update(rawMat.id, {
              currentStock: stockAfterIssue,
              availableStock: stockAfterIssue - Number(rawMat.reservedStock),
            });
            await this.rawMaterialLedgerRepository.save(
              this.rawMaterialLedgerRepository.create({
                enterpriseId,
                rawMaterialId: rawMat.id,
                transactionType: 'issue',
                quantity: confirmedQty,
                previousStock: stockAfterCorrection,
                newStock: stockAfterIssue,
                referenceType: 'grn',
                referenceId: grn.id,
                remarks: `Issued via GRN ${grn.grnNumber} — confirmed by inventory and released to manufacturing`,
                createdBy: userId,
              }),
            );
          }
        }
      }

      const itemStatus =
        confirmedQty === 0 ? 'rejected' :
        confirmedQty >= expectedQty ? 'confirmed' : 'partial';
      await this.grnItemRepository.update(grnItem.id, {
        confirmedQty,
        status: itemStatus,
        notes: input.notes,
      });

      // Update the linked indent item
      if (grnItem.indentItemId) {
        const indentItem = await this.indentItemRepository.findOne({ where: { id: grnItem.indentItemId } });
        if (indentItem) {
          await this.indentItemRepository.update(indentItem.id, {
            receivedQuantity: confirmedQty,
            status: confirmedQty >= Number(indentItem.shortageQuantity) ? 'received' : 'ordered',
          });

          // Update the linked MR item
          if (indentItem.materialRequestItemId) {
            const mrItem = await this.mrItemRepository.findOne({
              where: { id: indentItem.materialRequestItemId },
            });
            if (mrItem) {
              const qtyToIssue = Math.min(Number(mrItem.quantityRequested), confirmedQty);
              await this.mrItemRepository.update(mrItem.id, {
                quantityApproved: qtyToIssue,
                quantityIssued: qtyToIssue,
                status: 'issued',
                notes: `Issued from GRN ${grn.grnNumber} — confirmed by inventory`,
              });
            }
          }
        }
      }
    }

    // Recalculate GRN overall status
    const updatedItems = await this.grnItemRepository.find({ where: { grnId: grn.id } });
    const allDone = updatedItems.every((i) => i.status === 'confirmed' || i.status === 'rejected');
    const anyConfirmed = updatedItems.some((i) => i.status === 'confirmed' || i.status === 'partial');
    const newStatus = allDone ? 'confirmed' : anyConfirmed ? 'partially_confirmed' : 'pending';

    await this.grnRepository.update(grn.id, {
      status: newStatus,
      receivedBy: dto.receivedBy,
      receivedDate: new Date() as any,
      notes: dto.notes,
    });

    // Update Material Request status
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

        // Close indent if all items confirmed
        const allIndentItems = await this.indentItemRepository.find({ where: { indentId: indent.id } });
        const allReceived = allIndentItems.every(
          (i) => Number(i.receivedQuantity) >= Number(i.shortageQuantity),
        );
        if (allReceived) {
          await this.indentRepository.update(indent.id, { status: 'closed' });
        }
      }
    }

    const result = await this.findOne(id, enterpriseId);
    return {
      ...result,
      message:
        newStatus === 'confirmed'
          ? `GRN ${grn.grnNumber} fully confirmed. All items issued to manufacturing.`
          : `GRN ${grn.grnNumber} partially confirmed. Stock updated for confirmed items.`,
    };
  }

  async rejectReceipt(id: number, enterpriseId: number, notes?: string) {
    const grn = await this.grnRepository.findOne({ where: { id, enterpriseId } });
    if (!grn) throw new NotFoundException('Goods receipt not found');
    if (grn.status !== 'pending') throw new BadRequestException('Only pending GRNs can be rejected');
    await this.grnRepository.update(grn.id, { status: 'rejected', notes });
    return { message: 'Goods receipt rejected. Items returned to procurement.', data: grn };
  }
}

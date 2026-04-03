import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { Enquiry } from '../enquiries/entities/enquiry.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { EmailService } from '../email/email.service';
import { CreateSalesOrderDto, SalesOrderItemDto, UpdateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderVersion } from './entities/sales-order-version.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SalesOrdersService {
  constructor(
    @InjectRepository(SalesOrder)
    private soRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private soItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private quotationItemRepository: Repository<QuotationItem>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(JobCard)
    private jobCardRepository: Repository<JobCard>,
    @InjectRepository(SalesOrderVersion)
    private soVersionRepository: Repository<SalesOrderVersion>,
    @InjectRepository(Enquiry)
    private enquiryRepository: Repository<Enquiry>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
    private emailService: EmailService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    dataStartDate?: Date | null,
    ownDataOnly = false,
    currentUserId?: number,
  ) {
    const query = this.soRepository
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.customer', 'customer')
      .leftJoinAndSelect('so.createdByEmployee', 'createdByEmployee')
      .where('so.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(so.orderNumber ILIKE :search OR so.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) {
      query.andWhere('so.status = :status', { status });
    }
    if (dataStartDate) {
      query.andWhere('so.createdDate >= :dataStartDate', { dataStartDate });
    }
    if (ownDataOnly && currentUserId) {
      // Show SOs the employee created directly OR SOs generated from a quotation they created
      query.andWhere(
        '(so.createdBy = :currentUserId OR ' +
        '(so.quotationId IS NOT NULL AND EXISTS (' +
        '  SELECT 1 FROM quotations q WHERE q.id = so.quotation_id AND q.created_by = :currentUserId' +
        ')))',
        { currentUserId },
      );
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('so.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Sales orders fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async updateETA(id: number, enterpriseId: number, expectedDelivery: string) {
    const so = await this.soRepository.findOne({ where: { id, enterpriseId } });
    if (!so) throw new NotFoundException('Sales order not found');
    await this.soRepository.update(id, {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    });
    return this.findOne(id, enterpriseId);
  }

  async findOne(id: number, enterpriseId: number) {
    const so = await this.soRepository.findOne({
      where: { id, enterpriseId },
      relations: ['customer', 'quotation', 'enquiry', 'createdByEmployee', 'updatedByEmployee'],
    });

    if (!so) {
      throw new NotFoundException('Sales order not found');
    }

    const items = await this.soItemRepository.find({
      where: { salesOrderId: id },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });

    const versions = await this.soVersionRepository.find({
      where: { salesOrderId: id },
      relations: ['changedByEmployee'],
      order: { versionNumber: 'DESC' },
    });

    return {
      message: 'Sales order fetched successfully',
      data: { ...so, items, versions },
    };
  }

  async create(enterpriseId: number, createDto: CreateSalesOrderDto, userId?: number) {
    const count = await this.soRepository.count({ where: { enterpriseId } });
    const orderNumber = `SO-${String(count + 1).padStart(6, '0')}`;

    let subTotal = 0;
    let taxAmount = 0;
    const calculatedItems = createDto.items.map((item) => {
      const itemSub = item.quantity * item.unitPrice;
      const itemTax = (itemSub * (item.taxPercent || 0)) / 100;
      subTotal += itemSub;
      taxAmount += itemTax;
      return { ...item, taxAmount: itemTax, lineTotal: itemSub + itemTax };
    });

    const grandTotal = subTotal + taxAmount;

    const so = this.soRepository.create({
      enterpriseId,
      orderNumber,
      orderDate: createDto.orderDate ? new Date(createDto.orderDate) : new Date(),
      expectedDelivery: createDto.expectedDelivery ? new Date(createDto.expectedDelivery) : null,
      customerId: createDto.customerId,
      quotationId: createDto.quotationId,
      enquiryId: createDto.enquiryId,
      customerName: createDto.customerName,
      billingAddress: createDto.billingAddress,
      shippingAddress: createDto.shippingAddress,
      subTotal,
      taxAmount,
      discountAmount: 0,
      grandTotal,
      notes: createDto.notes,
      status: 'confirmed',
      createdBy: userId,
    });

    const savedResult = await this.soRepository.save(so);
    const savedSo = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    const itemEntities = calculatedItems.map((item, idx) =>
      this.soItemRepository.create({
        ...item,
        salesOrderId: savedSo.id,
        sortOrder: item.sortOrder ?? idx,
      }),
    );
    await this.soItemRepository.save(itemEntities);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'sales_order',
      entityId: savedSo.id,
      action: 'create',
      description: `Created sales order ${orderNumber}`,
    }).catch(() => {});

    return this.findOne(savedSo.id, enterpriseId);
  }

  async createFromQuotation(quotationId: number, enterpriseId: number, userId?: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, enterpriseId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const items = await this.quotationItemRepository.find({
      where: { quotationId },
      order: { sortOrder: 'ASC' },
    });

    const createDto: CreateSalesOrderDto = {
      customerId: quotation.customerId,
      quotationId: quotation.id,
      enquiryId: quotation.enquiryId,
      customerName: quotation.customerName,
      billingAddress: quotation.billingAddress,
      shippingAddress: quotation.shippingAddress,
      notes: quotation.notes,
      items: items.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: Number(item.unitPrice),
        taxPercent: Number(item.taxPercent),
        sortOrder: item.sortOrder,
      })),
    };

    return this.create(enterpriseId, createDto, userId);
  }

  async updateStatus(id: number, enterpriseId: number, status: string, holdReason?: string, user?: { id: number; type: string; name?: string }) {
    const so = await this.soRepository.findOne({ where: { id, enterpriseId } });
    if (!so) throw new NotFoundException('Sales order not found');

    const oldStatus = so.status;

    const updateData: any = { status };

    if (status === 'cancelled') {
      // Halt all linked job cards
      await this.jobCardRepository
        .createQueryBuilder()
        .update(JobCard)
        .set({ dispatchOnHold: true })
        .where('sales_order_id = :soId', { soId: id })
        .execute();

      // Revert linked enquiry to Follow Up so a new quotation can be created
      if (so.enquiryId) {
        await this.enquiryRepository.update(so.enquiryId, {
          interestStatus: 'Follow Up',
        });
      }

      // Send email notification if order was already sent to manufacturing
      if (so.sentToManufacturing && this.emailService.isConfigured()) {
        const jobCards = await this.jobCardRepository
          .createQueryBuilder('jc')
          .leftJoinAndSelect('jc.assignedEmployee', 'employee')
          .where('jc.sales_order_id = :soId', { soId: id })
          .getMany();

        const assigneeEmails = [
          ...new Set(
            jobCards
              .map((jc: any) => jc.assignedEmployee?.email)
              .filter(Boolean) as string[],
          ),
        ];

        const enterprise = await this.enterpriseRepository.findOne({
          where: { id: so.enterpriseId },
        });

        const toEmails = [
          ...(enterprise?.email ? [enterprise.email] : []),
          ...assigneeEmails,
        ].filter(Boolean);

        const emailBody = `Dear Manufacturing Team,

Purchase Order ${so.orderNumber} for customer ${so.customerName} has been CANCELLED.

Please stop all further processing immediately. No additional work should be done on this order.

Order Details:
- PO Number: ${so.orderNumber}
- Customer: ${so.customerName}
- Grand Total: ₹${Number(so.grandTotal).toFixed(2)}

This is an automated notification.`;

        for (const email of toEmails) {
          try {
            await this.emailService.sendEmail({
              to: email,
              subject: `CANCELLED: Purchase Order ${so.orderNumber}`,
              body: emailBody,
            });
          } catch (_) {
            // Non-blocking — log but don't fail the cancellation
          }
        }
      }
    } else if (status === 'on_hold') {
      // Store hold reason (optional) and pause all related job cards
      updateData.holdReason = holdReason || null;
      updateData.holdAcknowledged = false;
      await this.jobCardRepository
        .createQueryBuilder()
        .update(JobCard)
        .set({ dispatchOnHold: true })
        .where('sales_order_id = :soId', { soId: id })
        .execute();
    } else if (so.status === 'on_hold') {
      // Resuming from hold — clear reason and unhold all job cards
      updateData.holdReason = null;
      updateData.holdAcknowledged = false;
      await this.jobCardRepository
        .createQueryBuilder()
        .update(JobCard)
        .set({ dispatchOnHold: false })
        .where('sales_order_id = :soId', { soId: id })
        .execute();
    }

    await this.soRepository.update(id, updateData);

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'sales_order',
      entityId: id,
      action: 'status_change',
      description: `Status changed from "${oldStatus}" to "${status}" on sales order`,
      newValues: { oldStatus, newStatus: status },
    }).catch(() => {});

    return this.findOne(id, enterpriseId);
  }

  async acknowledgeHold(id: number, enterpriseId: number) {
    const so = await this.soRepository.findOne({ where: { id, enterpriseId } });
    if (!so) throw new NotFoundException('Sales order not found');
    if (so.status !== 'on_hold') throw new BadRequestException('Order is not on hold');

    await this.soRepository.update(id, { holdAcknowledged: true });

    return { message: 'Hold acknowledged by manufacturing', data: null };
  }

  async sendToManufacturing(id: number, enterpriseId: number, userId?: number) {
    const result = await this.findOne(id, enterpriseId);
    const so = result.data;

    if (!so) throw new NotFoundException('Sales order not found');

    // Only mark as sent to manufacturing — do NOT create job cards here.
    // Job cards are created later via BOM after inventory approval.
    await this.soRepository.update(id, { status: 'sent_to_manufacturing', sentToManufacturing: true });

    return {
      message: 'Purchase order transferred to manufacturing successfully',
      data: { salesOrder: { ...so, status: 'sent_to_manufacturing', sentToManufacturing: true } },
    };
  }

  async createInvoice(
    id: number,
    enterpriseId: number,
    userId?: number,
    dto?: { amount?: number; invoiceDate?: string; notes?: string; paymentMethod?: string },
  ) {
    const result = await this.findOne(id, enterpriseId);
    const so = result.data;

    if (!so) throw new NotFoundException('Sales order not found');

    const grandTotal = Number(so.grandTotal || 0);
    const alreadyInvoiced = Number(so.invoicedAmount || 0);
    const remainingToInvoice = grandTotal - alreadyInvoiced;

    // ── Guard: already fully invoiced ──────────────────────────────────────
    if (remainingToInvoice <= 0 && grandTotal > 0) {
      throw new BadRequestException(
        `This purchase order has already been fully invoiced (₹${grandTotal.toFixed(2)}).`,
      );
    }

    // ── Validate the user-provided amount ──────────────────────────────────
    if (!dto?.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException('Invoice amount must be greater than 0.');
    }

    const invoiceAmount = Number(dto.amount);

    if (invoiceAmount > remainingToInvoice + 0.01) {
      throw new BadRequestException(
        `Invoice amount (₹${invoiceAmount.toFixed(2)}) exceeds the remaining balance (₹${remainingToInvoice.toFixed(2)}).`,
      );
    }

    // ── Load HSN/SAC codes from the source quotation items ─────────────────
    // SO items don't carry hsnCode; quotation items do.
    const hsnBySortOrder = new Map<number, string>();
    const hsnByIndex: string[] = [];
    if (so.quotationId) {
      const quotItems = await this.quotationItemRepository.find({
        where: { quotationId: so.quotationId },
        order: { sortOrder: 'ASC' },
      });
      quotItems.forEach((q) => hsnBySortOrder.set(q.sortOrder, q.hsnCode || ''));
      quotItems.forEach((q) => hsnByIndex.push(q.hsnCode || ''));
    }

    // ── Proportional ratio: scale each item's amounts to match invoice amount ─
    const ratio = grandTotal > 0 ? invoiceAmount / grandTotal : 1;
    const scaledSubTotal = Number(so.subTotal || 0) * ratio;
    const scaledTaxAmount = Number(so.taxAmount || 0) * ratio;

    const count = await this.invoiceRepository.count({ where: { enterpriseId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    // Status: 'fully_paid' only when this invoice completes the PO; otherwise 'partially_paid'
    const isFullPayment = invoiceAmount >= remainingToInvoice - 0.01;
    const invoiceStatus = isFullPayment ? 'fully_paid' : 'partially_paid';

    const invoice = this.invoiceRepository.create({
      enterpriseId,
      invoiceNumber,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
      customerId: so.customerId,
      quotationId: so.quotationId,
      salesOrderId: so.id,
      customerName: so.customerName,
      billingAddress: so.billingAddress,
      subTotal: scaledSubTotal,
      discountType: undefined,
      discountValue: 0,
      discountAmount: 0,
      taxAmount: scaledTaxAmount,
      shippingCharges: 0,
      grandTotal: invoiceAmount,
      totalPaid: invoiceAmount,
      balanceDue: 0,
      notes: dto.notes || so.notes || undefined,
      status: invoiceStatus,
      createdBy: userId,
    });

    const savedResult = await this.invoiceRepository.save(invoice);
    const savedInvoice = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // ── Create invoice items (proportionally scaled from SO line items) ────
    const soItems: any[] = (so as any).items || [];
    if (soItems.length > 0) {
      const itemEntities = soItems.map((item: any, idx: number) => {
        const hsnCode = hsnBySortOrder.get(item.sortOrder) ?? hsnByIndex[idx] ?? '';
        return this.invoiceItemRepository.create({
          invoiceId: savedInvoice.id,
          productId: item.productId || undefined,
          itemName: item.itemName,
          description: item.description || undefined,
          hsnCode: hsnCode || undefined,
          quantity: item.quantity,
          unitOfMeasure: item.unitOfMeasure || undefined,
          unitPrice: Number(item.unitPrice),
          discountPercent: 0,
          taxPercent: Number(item.taxPercent),
          taxAmount: Number(item.taxAmount) * ratio,
          lineTotal: Number(item.lineTotal) * ratio,
          sortOrder: item.sortOrder ?? idx,
        });
      });
      await this.invoiceItemRepository.save(itemEntities);
    }

    // ── Create payment record (audit trail + history) ─────────────────────
    const paymentCount = await this.paymentRepository.count({ where: { enterpriseId } });
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(6, '0')}`;
    const payment = this.paymentRepository.create({
      enterpriseId,
      invoiceId: savedInvoice.id,
      paymentNumber,
      paymentDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
      amount: invoiceAmount,
      paymentMethod: dto.paymentMethod || 'other',
      notes: dto.notes || undefined,
      receivedBy: userId,
      status: 'completed',
    });
    await this.paymentRepository.save(payment);

    // ── Recalculate invoiced_amount from actual invoice sum (always accurate) ──
    const { sum } = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.grand_total), 0)', 'sum')
      .where('inv.salesOrderId = :id', { id })
      .getRawOne();
    await this.soRepository.update(id, { invoicedAmount: Number(sum) });

    return {
      message: 'Invoice created from sales order',
      data: savedInvoice,
    };
  }

  private buildSnapshot(so: SalesOrder, items: SalesOrderItem[]): Record<string, unknown> {
    return {
      orderDate: so.orderDate,
      expectedDelivery: so.expectedDelivery,
      customerName: so.customerName,
      billingAddress: so.billingAddress,
      shippingAddress: so.shippingAddress,
      subTotal: Number(so.subTotal),
      discountAmount: Number(so.discountAmount),
      taxAmount: Number(so.taxAmount),
      grandTotal: Number(so.grandTotal),
      notes: so.notes,
      status: so.status,
      items: items.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: Number(item.unitPrice),
        taxPercent: Number(item.taxPercent),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
    };
  }

  private detectChanges(
    oldItems: SalesOrderItem[],
    newItems: SalesOrderItemDto[],
    oldSo: SalesOrder,
    dto: UpdateSalesOrderDto,
  ): string {
    const changes: string[] = [];

    // Header field changes
    if (dto.expectedDelivery !== undefined && dto.expectedDelivery !== (oldSo.expectedDelivery?.toString() || null)) {
      changes.push(`Updated expected delivery`);
    }
    if (dto.billingAddress !== undefined && dto.billingAddress !== oldSo.billingAddress) {
      changes.push(`Updated billing address`);
    }
    if (dto.shippingAddress !== undefined && dto.shippingAddress !== oldSo.shippingAddress) {
      changes.push(`Updated shipping address`);
    }
    if (dto.notes !== undefined && dto.notes !== oldSo.notes) {
      changes.push(`Updated notes`);
    }

    // Build lookup of old items by name for comparison
    const oldByName = new Map<string, SalesOrderItem>();
    for (const item of oldItems) {
      oldByName.set(item.itemName, item);
    }
    const newNames = new Set(newItems.map((i) => i.itemName));

    // Detect removed items
    for (const item of oldItems) {
      if (!newNames.has(item.itemName)) {
        changes.push(`Removed item "${item.itemName}"`);
      }
    }

    // Detect added and modified items
    for (const newItem of newItems) {
      const oldItem = oldByName.get(newItem.itemName);
      if (!oldItem) {
        changes.push(`Added item "${newItem.itemName}"`);
      } else {
        const diffs: string[] = [];
        if (newItem.quantity !== oldItem.quantity) {
          diffs.push(`quantity from ${oldItem.quantity} to ${newItem.quantity}`);
        }
        if (Number(newItem.unitPrice) !== Number(oldItem.unitPrice)) {
          diffs.push(`unit price from ${Number(oldItem.unitPrice)} to ${newItem.unitPrice}`);
        }
        if (Number(newItem.taxPercent || 0) !== Number(oldItem.taxPercent || 0)) {
          diffs.push(`tax% from ${Number(oldItem.taxPercent || 0)} to ${newItem.taxPercent || 0}`);
        }
        if (diffs.length > 0) {
          changes.push(`Updated ${diffs.join(', ')} of "${newItem.itemName}"`);
        }
      }
    }

    return changes.length > 0 ? changes.join('; ') : 'No significant changes detected';
  }

  async update(id: number, enterpriseId: number, dto: UpdateSalesOrderDto, userId?: number) {
    const so = await this.soRepository.findOne({ where: { id, enterpriseId } });
    if (!so) throw new NotFoundException('Sales order not found');

    if (['cancelled', 'delivered'].includes(so.status)) {
      throw new BadRequestException(
        `Cannot edit a purchase order with status "${so.status}".`,
      );
    }

    // Load current items for snapshot + change detection
    const currentItems = await this.soItemRepository.find({
      where: { salesOrderId: id },
      order: { sortOrder: 'ASC' },
    });

    // 1. Snapshot current state as a version
    const snapshot = this.buildSnapshot(so, currentItems);
    const changeSummary = this.detectChanges(currentItems, dto.items, so, dto);

    const version = this.soVersionRepository.create({
      salesOrderId: id,
      versionNumber: so.currentVersion,
      snapshot,
      changeSummary,
      changeNotes: dto.changeNotes || undefined,
      changedBy: userId || undefined,
    } as any);
    await this.soVersionRepository.save(version);

    // 2. Delete old items and insert new ones
    await this.soItemRepository.delete({ salesOrderId: id });

    let subTotal = 0;
    let taxAmount = 0;
    const calculatedItems = dto.items.map((item) => {
      const itemSub = item.quantity * item.unitPrice;
      const itemTax = (itemSub * (item.taxPercent || 0)) / 100;
      subTotal += itemSub;
      taxAmount += itemTax;
      return { ...item, taxAmount: itemTax, lineTotal: itemSub + itemTax };
    });
    const grandTotal = subTotal + taxAmount;

    const itemEntities = calculatedItems.map((item, idx) =>
      this.soItemRepository.create({
        ...item,
        salesOrderId: id,
        sortOrder: item.sortOrder ?? idx,
      }),
    );
    await this.soItemRepository.save(itemEntities);

    // 3. Update SO header
    await this.soRepository.update(id, {
      expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : so.expectedDelivery,
      billingAddress: dto.billingAddress ?? so.billingAddress,
      shippingAddress: dto.shippingAddress ?? so.shippingAddress,
      notes: dto.notes ?? so.notes,
      subTotal,
      taxAmount,
      discountAmount: 0,
      grandTotal,
      currentVersion: so.currentVersion + 1,
      updatedBy: userId || undefined,
    });

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'sales_order',
      entityId: id,
      action: 'update',
      description: `Updated sales order ${so.orderNumber}: ${changeSummary}`,
    }).catch(() => {});

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const so = await this.soRepository.findOne({ where: { id, enterpriseId } });
    if (!so) throw new NotFoundException('Sales order not found');

    // Stamp the linked quotation so UI can show "PO Cancelled" with timestamp
    const linkedQuotation = await this.quotationRepository.findOne({
      where: { salesOrderId: id, enterpriseId },
    });
    if (linkedQuotation) {
      await this.quotationRepository.update(linkedQuotation.id, {
        poCancelledAt: new Date(),
        cancelledPoNumber: so.orderNumber,
        salesOrderId: null,
      });
    }

    await this.soItemRepository.delete({ salesOrderId: id });
    await this.soRepository.delete(id);

    return { message: 'Sales order deleted successfully', data: null };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { CreateInvoiceDto, InvoiceItemDto, RecordPaymentDto } from './dto/create-invoice.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private itemRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private quotationItemRepository: Repository<QuotationItem>,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    customerId?: number,
    fromDate?: string,
    toDate?: string,
  ) {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.createdByEmployee', 'createdByEmployee')
      .leftJoinAndSelect('invoice.payments', 'payments')
      .leftJoinAndSelect('invoice.salesOrder', 'salesOrder')
      .where('invoice.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR invoice.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('invoice.status = :status', { status });
    }

    if (customerId) {
      query.andWhere('invoice.customerId = :customerId', { customerId });
    }

    if (fromDate) {
      query.andWhere('invoice.invoiceDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('invoice.invoiceDate <= :toDate', { toDate });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('invoice.createdDate', 'DESC')
      .getManyAndCount();

    // Recompute balanceDue from grandTotal - totalPaid to handle stale stored values
    const normalized = data.map((inv) => ({
      ...inv,
      totalPaid: Number(inv.totalPaid),
      balanceDue: Number(inv.grandTotal) - Number(inv.totalPaid),
    }));

    return {
      message: 'Invoices fetched successfully',
      data: normalized,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, enterpriseId },
      relations: ['customer', 'quotation', 'createdByEmployee', 'salesOrder'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const items = await this.itemRepository.find({
      where: { invoiceId: id },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });

    const payments = await this.paymentRepository.find({
      where: { invoiceId: id },
      relations: ['receivedByEmployee'],
      order: { createdDate: 'DESC' },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Number(invoice.grandTotal) - totalPaid;

    return {
      message: 'Invoice fetched successfully',
      data: {
        ...invoice,
        totalPaid,
        balanceDue,
        items,
        payments,
      },
    };
  }

  async create(enterpriseId: number, createDto: CreateInvoiceDto, userId?: number) {
    const count = await this.invoiceRepository.count({ where: { enterpriseId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    const { subTotal, taxAmount, items } = this.calculateTotals(createDto.items);

    let discountAmount = 0;
    if (createDto.discountType === 'percentage' && createDto.discountValue) {
      discountAmount = (subTotal * createDto.discountValue) / 100;
    } else if (createDto.discountType === 'amount' && createDto.discountValue) {
      discountAmount = createDto.discountValue;
    }

    const grandTotal = subTotal - discountAmount + taxAmount + (createDto.shippingCharges || 0);

    const invoice = this.invoiceRepository.create({
      enterpriseId,
      invoiceNumber,
      invoiceDate: createDto.invoiceDate ? new Date(createDto.invoiceDate) : new Date(),
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      customerId: createDto.customerId,
      quotationId: createDto.quotationId,
      salesOrderId: createDto.salesOrderId,
      customerName: createDto.customerName,
      billingAddress: createDto.billingAddress,
      subTotal,
      discountType: createDto.discountType,
      discountValue: createDto.discountValue || 0,
      discountAmount,
      taxAmount,
      shippingCharges: createDto.shippingCharges || 0,
      grandTotal,
      totalPaid: 0,
      balanceDue: grandTotal,
      termsConditions: createDto.termsConditions,
      notes: createDto.notes,
      status: 'unpaid',
      createdBy: userId,
    });

    const savedResult = await this.invoiceRepository.save(invoice);
    const savedInvoice = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    const itemEntities = items.map((item, index) =>
      this.itemRepository.create({
        ...item,
        invoiceId: savedInvoice.id,
        sortOrder: item.sortOrder ?? index,
      }),
    );
    await this.itemRepository.save(itemEntities);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'invoice',
      entityId: savedInvoice.id,
      action: 'create',
      description: `Created invoice ${invoiceNumber}${createDto.customerName ? ' for "' + createDto.customerName + '"' : ''}`,
      newValues: { invoiceNumber, grandTotal },
    }).catch(() => {});

    return this.findOne(savedInvoice.id, enterpriseId);
  }

  async createFromQuotation(quotationId: number, enterpriseId: number, userId?: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, enterpriseId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const quotationItems = await this.quotationItemRepository.find({
      where: { quotationId },
      order: { sortOrder: 'ASC' },
    });

    const createDto: CreateInvoiceDto = {
      customerId: quotation.customerId,
      quotationId: quotation.id,
      customerName: quotation.customerName,
      billingAddress: quotation.billingAddress,
      discountType: quotation.discountType,
      discountValue: Number(quotation.discountValue),
      shippingCharges: Number(quotation.shippingCharges),
      termsConditions: quotation.termsConditions,
      notes: quotation.notes,
      items: quotationItems.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxPercent: Number(item.taxPercent),
        sortOrder: item.sortOrder,
      })),
    };

    return this.create(enterpriseId, createDto, userId);
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateInvoiceDto>, userId?: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (Number(invoice.totalPaid) > 0) {
      throw new BadRequestException('Cannot edit an invoice that has received payments');
    }

    let updateData: any = { ...updateDto };
    delete updateData.items;

    if (updateDto.items) {
      const { subTotal, taxAmount, items } = this.calculateTotals(updateDto.items);

      let discountAmount = 0;
      const discountType = updateDto.discountType ?? invoice.discountType;
      const discountValue = updateDto.discountValue ?? invoice.discountValue;

      if (discountType === 'percentage' && discountValue) {
        discountAmount = (subTotal * Number(discountValue)) / 100;
      } else if (discountType === 'amount' && discountValue) {
        discountAmount = Number(discountValue);
      }

      const shippingCharges = updateDto.shippingCharges ?? invoice.shippingCharges;
      const grandTotal = subTotal - discountAmount + taxAmount + Number(shippingCharges || 0);

      updateData = {
        ...updateData,
        subTotal,
        taxAmount,
        discountAmount,
        grandTotal,
        balanceDue: grandTotal,
      };

      await this.itemRepository.delete({ invoiceId: id });
      const itemEntities = items.map((item, index) =>
        this.itemRepository.create({
          ...item,
          invoiceId: id,
          sortOrder: item.sortOrder ?? index,
        }),
      );
      await this.itemRepository.save(itemEntities);
    }

    if (updateDto.invoiceDate) {
      updateData.invoiceDate = new Date(updateDto.invoiceDate);
    }
    if (updateDto.dueDate) {
      updateData.dueDate = new Date(updateDto.dueDate);
    }

    await this.invoiceRepository.update(id, updateData);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'invoice',
      entityId: id,
      action: 'update',
      description: `Updated invoice`,
    }).catch(() => {});

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentCount = await this.paymentRepository.count({ where: { invoiceId: id } });
    if (paymentCount > 0) {
      throw new BadRequestException('Cannot delete an invoice that has payments. Cancel it instead.');
    }

    await this.itemRepository.delete({ invoiceId: id });
    await this.invoiceRepository.delete(id);

    this.auditLogsService.log({
      enterpriseId,
      entityType: 'invoice',
      entityId: id,
      action: 'delete',
      description: `Deleted invoice ${invoice.invoiceNumber}`,
    }).catch(() => {});

    return {
      message: 'Invoice deleted successfully',
      data: null,
    };
  }

  async recordPayment(invoiceId: number, enterpriseId: number, dto: RecordPaymentDto, userId?: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, enterpriseId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Cannot record payment for a cancelled invoice');
    }

    if (invoice.status === 'fully_paid') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const balanceDue = Number(invoice.balanceDue);
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (dto.amount > balanceDue) {
      throw new BadRequestException(`Payment amount cannot exceed balance due (${balanceDue})`);
    }

    // Generate payment number
    const paymentCount = await this.paymentRepository.count({ where: { enterpriseId } });
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(6, '0')}`;

    const payment = this.paymentRepository.create({
      enterpriseId,
      invoiceId,
      paymentNumber,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      receivedBy: userId,
      status: 'completed',
    });

    await this.paymentRepository.save(payment);

    // Update invoice totals
    const newTotalPaid = Number(invoice.totalPaid) + dto.amount;
    const newBalanceDue = Number(invoice.grandTotal) - newTotalPaid;
    const newStatus = newBalanceDue <= 0 ? 'fully_paid' : 'partially_paid';

    await this.invoiceRepository.update(invoiceId, {
      totalPaid: newTotalPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
    });

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'invoice',
      entityId: invoiceId,
      action: 'payment',
      description: `Recorded payment ${paymentNumber} of ${dto.amount} for invoice ${invoice.invoiceNumber}`,
      newValues: { amount: dto.amount, paymentMethod: dto.paymentMethod, paymentNumber, newStatus },
    }).catch(() => {});

    return this.findOne(invoiceId, enterpriseId);
  }

  async getPayments(invoiceId: number, enterpriseId: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, enterpriseId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const payments = await this.paymentRepository.find({
      where: { invoiceId },
      relations: ['receivedByEmployee'],
      order: { createdDate: 'DESC' },
    });

    return {
      message: 'Payments fetched successfully',
      data: payments,
    };
  }

  async getCustomerBalance(customerName: string, enterpriseId: number) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.grandTotal)', 'totalInvoiced')
      .addSelect('SUM(invoice.totalPaid)', 'totalPaid')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .where('invoice.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('LOWER(invoice.customerName) = LOWER(:customerName)', { customerName })
      .andWhere("invoice.status != 'cancelled'")
      .getRawOne();

    const totalInvoiced = Number(result?.totalInvoiced || 0);
    const totalPaid = Number(result?.totalPaid || 0);
    const totalBalance = totalInvoiced - totalPaid;
    const invoiceCount = Number(result?.invoiceCount || 0);

    return {
      message: 'Customer balance fetched successfully',
      data: { customerName, totalInvoiced, totalPaid, totalBalance, invoiceCount },
    };
  }

  async getAllPayments(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .where('payment.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(payment.paymentNumber ILIKE :search OR invoice.invoiceNumber ILIKE :search OR invoice.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (fromDate) {
      query.andWhere('payment.paymentDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('payment.paymentDate <= :toDate', { toDate });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('payment.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Payments fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  private calculateTotals(items: InvoiceItemDto[]) {
    let subTotal = 0;
    let taxAmount = 0;

    const calculatedItems = items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemSubtotal * (item.discountPercent || 0)) / 100;
      const afterDiscount = itemSubtotal - itemDiscount;
      const itemTax = (afterDiscount * (item.taxPercent || 0)) / 100;
      const lineTotal = afterDiscount + itemTax;

      subTotal += afterDiscount;
      taxAmount += itemTax;

      return {
        ...item,
        taxAmount: itemTax,
        lineTotal,
      };
    });

    return { subTotal, taxAmount, items: calculatedItems };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProformaInvoice } from './entities/proforma-invoice.entity';
import { ProformaInvoiceItem } from './entities/proforma-invoice-item.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItem } from '../sales-orders/entities/sales-order-item.entity';
import { CreateProformaInvoiceDto, ProformaInvoiceItemDto } from './dto/create-proforma-invoice.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ProformaInvoicesService {
  constructor(
    @InjectRepository(ProformaInvoice)
    private piRepository: Repository<ProformaInvoice>,
    @InjectRepository(ProformaInvoiceItem)
    private itemRepository: Repository<ProformaInvoiceItem>,
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private quotationItemRepository: Repository<QuotationItem>,
    @InjectRepository(SalesOrder)
    private soRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private soItemRepository: Repository<SalesOrderItem>,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ) {
    const query = this.piRepository
      .createQueryBuilder('pi')
      .leftJoinAndSelect('pi.customer', 'customer')
      .leftJoinAndSelect('pi.createdByEmployee', 'createdByEmployee')
      .where('pi.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(pi.piNumber ILIKE :search OR pi.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('pi.status = :status', { status });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('pi.createdDate', 'DESC')
      .getManyAndCount();

    return { message: 'Proforma invoices fetched', data, totalRecords: total, page: pageNum, limit: limitNum };
  }

  async findOne(id: number, enterpriseId: number) {
    const pi = await this.piRepository.findOne({
      where: { id, enterpriseId },
      relations: ['items', 'customer', 'createdByEmployee', 'quotation', 'salesOrder'],
    });

    if (!pi) {
      throw new NotFoundException('Proforma invoice not found');
    }

    return { message: 'Proforma invoice fetched', data: pi };
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

    const createDto: CreateProformaInvoiceDto = {
      quotationId: quotation.id,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      email: (quotation as any).email,
      mobile: (quotation as any).mobile,
      billingAddress: quotation.billingAddress,
      shippingAddress: quotation.shippingAddress,
      discountType: quotation.discountType,
      discountValue: Number(quotation.discountValue),
      shippingCharges: Number(quotation.shippingCharges),
      termsConditions: quotation.termsConditions,
      notes: quotation.notes,
      items: quotationItems.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        taxPercent: Number(item.taxPercent || 0),
        sortOrder: item.sortOrder,
      })),
    };

    return this.create(enterpriseId, createDto, userId);
  }

  async create(enterpriseId: number, createDto: CreateProformaInvoiceDto, userId?: number) {
    const count = await this.piRepository.count({ where: { enterpriseId } });
    const piNumber = `PI-${String(count + 1).padStart(6, '0')}`;

    const { subTotal, taxAmount, items } = this.calculateTotals(createDto.items);

    let discountAmount = 0;
    if (createDto.discountType === 'percentage' && createDto.discountValue) {
      discountAmount = (subTotal * createDto.discountValue) / 100;
    } else if (createDto.discountType === 'amount' && createDto.discountValue) {
      discountAmount = createDto.discountValue;
    }

    const grandTotal = subTotal - discountAmount + taxAmount + (createDto.shippingCharges || 0);

    const pi = this.piRepository.create({
      enterpriseId,
      piNumber,
      piDate: createDto.piDate ? new Date(createDto.piDate) : new Date(),
      quotationId: createDto.quotationId ?? null,
      customerId: createDto.customerId ?? null,
      customerName: createDto.customerName,
      email: createDto.email ?? null,
      mobile: createDto.mobile ?? null,
      billingAddress: createDto.billingAddress ?? null,
      shippingAddress: createDto.shippingAddress ?? null,
      subTotal,
      discountType: createDto.discountType ?? null,
      discountValue: createDto.discountValue ?? 0,
      discountAmount,
      taxAmount,
      shippingCharges: createDto.shippingCharges ?? 0,
      grandTotal,
      notes: createDto.notes ?? null,
      termsConditions: createDto.termsConditions ?? null,
      status: 'draft',
      createdBy: userId ?? null,
    });

    const savedResult = await this.piRepository.save(pi);
    const savedPi = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    const itemEntities = items.map((item, index) =>
      this.itemRepository.create({
        piId: savedPi.id,
        productId: item.productId ?? null,
        itemName: item.itemName,
        hsnCode: item.hsnCode ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        taxPercent: item.taxPercent ?? 0,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        sortOrder: item.sortOrder ?? index,
      }),
    );
    await this.itemRepository.save(itemEntities);

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'proforma_invoice',
      entityId: savedPi.id,
      action: 'create',
      description: `Created proforma invoice ${piNumber} for "${createDto.customerName}"`,
      newValues: { piNumber, grandTotal },
    }).catch(() => {});

    return this.findOne(savedPi.id, enterpriseId);
  }

  async updateStatus(id: number, enterpriseId: number, status: string, userId?: number) {
    const pi = await this.piRepository.findOne({ where: { id, enterpriseId } });

    if (!pi) {
      throw new NotFoundException('Proforma invoice not found');
    }

    if (pi.status === 'converted') {
      throw new BadRequestException('Cannot change status of a converted proforma invoice');
    }

    if (status !== 'sent') {
      throw new BadRequestException('Status can only be updated to "sent"');
    }

    await this.piRepository.update(id, { status, updatedBy: userId ?? null });

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'proforma_invoice',
      entityId: id,
      action: 'update',
      description: `Proforma invoice ${pi.piNumber} status updated to ${status}`,
      newValues: { status },
    }).catch(() => {});

    return this.findOne(id, enterpriseId);
  }

  async convertToSalesOrder(piId: number, enterpriseId: number, userId?: number) {
    const pi = await this.piRepository.findOne({
      where: { id: piId, enterpriseId },
      relations: ['items'],
    });

    if (!pi) {
      throw new NotFoundException('Proforma invoice not found');
    }

    if (pi.status === 'converted') {
      throw new BadRequestException('This proforma invoice has already been converted to a Sales Order');
    }

    const count = await this.soRepository.count({ where: { enterpriseId } });
    const orderNumber = `PR-${String(count + 1).padStart(4, '0')}`;

    let subTotal = 0;
    let taxAmount = 0;
    const soItems = pi.items.map((item) => {
      const afterDiscount =
        Number(item.unitPrice) * Number(item.quantity) -
        (Number(item.unitPrice) * Number(item.quantity) * Number(item.discountPercent || 0)) / 100;
      const itemTax = (afterDiscount * Number(item.taxPercent || 0)) / 100;
      subTotal += afterDiscount;
      taxAmount += itemTax;
      return { item, lineTotal: afterDiscount + itemTax, taxAmount: itemTax };
    });

    let discountAmount = 0;
    if (pi.discountType === 'percentage' && pi.discountValue) {
      discountAmount = (subTotal * Number(pi.discountValue)) / 100;
    } else if (pi.discountType === 'amount' && pi.discountValue) {
      discountAmount = Number(pi.discountValue);
    }

    const grandTotal = subTotal - discountAmount + taxAmount + Number(pi.shippingCharges || 0);

    const so = this.soRepository.create({
      enterpriseId,
      orderNumber,
      orderDate: new Date(),
      customerId: pi.customerId ?? undefined,
      quotationId: pi.quotationId ?? undefined,
      customerName: pi.customerName,
      billingAddress: pi.billingAddress ?? undefined,
      shippingAddress: pi.shippingAddress ?? undefined,
      subTotal,
      discountAmount,
      taxAmount,
      grandTotal,
      notes: pi.notes ?? undefined,
      status: 'confirmed',
      createdBy: userId ?? undefined,
    });

    const savedResult = await this.soRepository.save(so);
    const savedSo = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    const soItemEntities = soItems.map(({ item, lineTotal, taxAmount: ita }, idx) =>
      this.soItemRepository.create({
        salesOrderId: savedSo.id,
        productId: item.productId ?? undefined,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxPercent: Number(item.taxPercent),
        taxAmount: ita,
        lineTotal,
        sortOrder: item.sortOrder ?? idx,
      }),
    );
    await this.soItemRepository.save(soItemEntities);

    await this.piRepository.update(piId, {
      status: 'converted',
      salesOrderId: savedSo.id,
      updatedBy: userId ?? null,
    });

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'proforma_invoice',
      entityId: piId,
      action: 'convert',
      description: `Proforma invoice ${pi.piNumber} converted to Sales Order ${savedSo.orderNumber}`,
      newValues: { status: 'converted', salesOrderId: savedSo.id, orderNumber: savedSo.orderNumber },
    }).catch(() => {});

    return this.findOne(piId, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const pi = await this.piRepository.findOne({ where: { id, enterpriseId } });

    if (!pi) {
      throw new NotFoundException('Proforma invoice not found');
    }

    if (pi.status === 'converted') {
      throw new BadRequestException('Cannot delete a converted proforma invoice');
    }

    await this.piRepository.remove(pi);

    return { message: 'Proforma invoice deleted successfully' };
  }

  private calculateTotals(items: ProformaInvoiceItemDto[]) {
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

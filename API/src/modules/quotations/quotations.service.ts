import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationVersion } from './entities/quotation-version.entity';
import { Enquiry } from '../enquiries/entities/enquiry.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItem } from '../sales-orders/entities/sales-order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateQuotationDto, QuotationItemDto } from './dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private itemRepository: Repository<QuotationItem>,
    @InjectRepository(QuotationVersion)
    private versionRepository: Repository<QuotationVersion>,
    @InjectRepository(Enquiry)
    private enquiryRepository: Repository<Enquiry>,
    @InjectRepository(SalesOrder)
    private soRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private soItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private auditLogsService: AuditLogsService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
    dataStartDate?: Date | null,
    ownDataOnly = false,
    currentUserId?: number,
    managerUserId?: number,
  ) {
    const query = this.quotationRepository
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.customer', 'customer')
      .leftJoinAndSelect('quotation.enquiry', 'enquiry')
      .leftJoinAndSelect('quotation.createdByEmployee', 'createdByEmployee')
      .where('quotation.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(quotation.quotationNumber ILIKE :search OR quotation.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('quotation.status = :status', { status });
    }

    if (fromDate) {
      query.andWhere('quotation.quotationDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('quotation.quotationDate <= :toDate', { toDate });
    }

    if (dataStartDate) {
      query.andWhere('quotation.quotationDate >= :dataStartDate', { dataStartDate });
    }
    if (ownDataOnly && currentUserId) {
      query.andWhere('quotation.createdBy = :currentUserId', { currentUserId });
    } else if (managerUserId) {
      // Manager sees own records + all direct reports' records
      query.andWhere(
        `(quotation.createdBy = :managerUserId OR quotation.createdBy IN (SELECT e.id FROM employees e WHERE e.reporting_to = :managerUserId AND e.enterprise_id = :enterpriseId))`,
        { managerUserId, enterpriseId },
      );
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('quotation.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Quotations fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async updateETA(id: number, enterpriseId: number, expectedDelivery: string) {
    const quotation = await this.quotationRepository.findOne({ where: { id, enterpriseId } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    await this.quotationRepository.update(id, {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
    });
    return this.findOne(id, enterpriseId);
  }

  async findOne(id: number, enterpriseId: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id, enterpriseId },
      relations: ['customer', 'enquiry', 'createdByEmployee', 'updatedByEmployee'],
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const items = await this.itemRepository.find({
      where: { quotationId: id },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });

    // Fetch full version history, newest first, with the name of who changed it
    const versions = await this.versionRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.changedByEmployee', 'emp')
      .where('v.quotationId = :id', { id })
      .orderBy('v.versionNumber', 'DESC')
      .getMany();

    return {
      message: 'Quotation fetched successfully',
      data: {
        ...quotation,
        items,
        versions,
      },
    };
  }

  async checkMobileExists(enterpriseId: number, mobile: string) {
    const existing = await this.quotationRepository.findOne({
      where: { enterpriseId, mobile },
      select: ['id', 'quotationNumber', 'customerName', 'quotationDate'],
    });
    if (existing) {
      return {
        exists: true,
        quotationNumber: existing.quotationNumber,
        customerName: existing.customerName,
      };
    }
    return { exists: false };
  }

  async create(enterpriseId: number, createDto: CreateQuotationDto, userId?: number) {
    const count = await this.quotationRepository.count({ where: { enterpriseId } });
    const quotationNumber = `QTN-${String(count + 1).padStart(6, '0')}`;

    const { subTotal, taxAmount, items } = this.calculateTotals(createDto.items);

    let discountAmount = 0;
    if (createDto.discountType === 'percentage' && createDto.discountValue) {
      discountAmount = (subTotal * createDto.discountValue) / 100;
    } else if (createDto.discountType === 'amount' && createDto.discountValue) {
      discountAmount = createDto.discountValue;
    }

    const grandTotal = subTotal - discountAmount + taxAmount + (createDto.shippingCharges || 0);

    const quotation = this.quotationRepository.create({
      enterpriseId,
      quotationNumber,
      quotationDate: createDto.quotationDate ? new Date(createDto.quotationDate) : new Date(),
      validUntil: createDto.validUntil ? new Date(createDto.validUntil) : null,
      expectedDelivery: createDto.expectedDelivery ? new Date(createDto.expectedDelivery) : null,
      customerId: createDto.customerId,
      enquiryId: createDto.enquiryId,
      customerName: createDto.customerName,
      email: createDto.email,
      mobile: createDto.mobile,
      billingAddress: createDto.billingAddress,
      shippingAddress: createDto.shippingAddress,
      subTotal,
      discountType: createDto.discountType,
      discountValue: createDto.discountValue || 0,
      discountAmount,
      taxAmount,
      shippingCharges: createDto.shippingCharges || 0,
      grandTotal,
      termsConditions: createDto.termsConditions,
      notes: createDto.notes,
      status: createDto.status || 'draft',
      createdBy: userId,
      currentVersion: 1,
    });

    const savedResult = await this.quotationRepository.save(quotation);
    const savedQuotation = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    const itemEntities = items.map((item, index) =>
      this.itemRepository.create({
        ...item,
        quotationId: savedQuotation.id,
        sortOrder: item.sortOrder ?? index,
      }),
    );
    await this.itemRepository.save(itemEntities);

    if (createDto.enquiryId) {
      await this.enquiryRepository.update(createDto.enquiryId, {
        interestStatus: 'Quotation Sent',
      });
    }

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'quotation',
      entityId: savedQuotation.id,
      action: 'create',
      description: `Created quotation ${savedQuotation.quotationNumber} for "${savedQuotation.customerName}"`,
      newValues: { status: savedQuotation.status, grandTotal: Number(savedQuotation.grandTotal) },
    }).catch(() => {});

    return this.findOne(savedQuotation.id, enterpriseId);
  }

  async update(
    id: number,
    enterpriseId: number,
    updateDto: Partial<CreateQuotationDto>,
    userId?: number,
    changeNotes?: string,
  ) {
    const quotation = await this.quotationRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.isLocked) {
      throw new BadRequestException(
        'This quotation has been accepted and converted to a Sales Order. It can no longer be edited.',
      );
    }

    // ── 1. Snapshot the current state BEFORE applying any changes ──────────
    const currentItems = await this.itemRepository.find({
      where: { quotationId: id },
      order: { sortOrder: 'ASC' },
    });

    const snapshot = this.buildSnapshot(quotation, currentItems);

    await this.versionRepository
      .createQueryBuilder()
      .insert()
      .into(QuotationVersion)
      .values({
        quotationId: id,
        versionNumber: quotation.currentVersion,
        snapshot: snapshot as any,
        changedBy: userId ?? undefined,
        changeNotes: changeNotes ?? undefined,
      })
      .orIgnore()
      .execute();
    // ──────────────────────────────────────────────────────────────────────

    // ── 2. Recalculate totals and rebuild items if provided ────────────────
    let updateData: any = { ...updateDto };
    delete updateData.items;

    if (updateDto.items) {
      const { subTotal, taxAmount, items } = this.calculateTotals(updateDto.items);

      let discountAmount = 0;
      const discountType = updateDto.discountType ?? quotation.discountType;
      const discountValue = updateDto.discountValue ?? quotation.discountValue;

      if (discountType === 'percentage' && discountValue) {
        discountAmount = (subTotal * Number(discountValue)) / 100;
      } else if (discountType === 'amount' && discountValue) {
        discountAmount = Number(discountValue);
      }

      const shippingCharges = updateDto.shippingCharges ?? quotation.shippingCharges;
      const grandTotal = subTotal - discountAmount + taxAmount + Number(shippingCharges || 0);

      updateData = { ...updateData, subTotal, taxAmount, discountAmount, grandTotal };

      await this.itemRepository.delete({ quotationId: id });
      const itemEntities = items.map((item, index) =>
        this.itemRepository.create({
          ...item,
          quotationId: id,
          sortOrder: item.sortOrder ?? index,
        }),
      );
      await this.itemRepository.save(itemEntities);
    }

    if (updateDto.quotationDate) {
      updateData.quotationDate = new Date(updateDto.quotationDate);
    }
    if (updateDto.validUntil) {
      updateData.validUntil = new Date(updateDto.validUntil);
    }
    if (updateDto.expectedDelivery !== undefined) {
      updateData.expectedDelivery = updateDto.expectedDelivery ? new Date(updateDto.expectedDelivery) : null;
    }

    // ── 3. Persist update + bump version number ────────────────────────────
    // If the quotation was previously rejected, revising it resets to draft
    if (quotation.status === 'rejected') {
      updateData.status = 'draft';
    }

    await this.quotationRepository.update(id, {
      ...updateData,
      updatedBy: userId ?? null,
      currentVersion: () => 'current_version + 1',
    });
    // ──────────────────────────────────────────────────────────────────────

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'quotation',
      entityId: id,
      action: 'update',
      description: `Updated quotation ${quotation.quotationNumber}`,
    }).catch(() => {});

    return this.findOne(id, enterpriseId);
  }

  async acceptQuotation(id: number, enterpriseId: number, userId?: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.isLocked) {
      throw new BadRequestException('Quotation is already accepted.');
    }

    // ── 1. Create Sales Order from this quotation ──────────────────────────
    const items = await this.itemRepository.find({
      where: { quotationId: id },
      order: { sortOrder: 'ASC' },
    });

    const count = await this.soRepository.count({ where: { enterpriseId } });
    const orderNumber = `PR-${String(count + 1).padStart(4, '0')}`;

    let subTotal = 0;
    let taxAmount = 0;
    const soItems = items.map((item) => {
      const afterDiscount =
        Number(item.unitPrice) * item.quantity -
        (Number(item.unitPrice) * item.quantity * Number(item.discountPercent || 0)) / 100;
      const itemTax = (afterDiscount * Number(item.taxPercent || 0)) / 100;
      subTotal += afterDiscount;
      taxAmount += itemTax;
      return { item, lineTotal: afterDiscount + itemTax, taxAmount: itemTax };
    });

    let discountAmount = 0;
    if (quotation.discountType === 'percentage' && quotation.discountValue) {
      discountAmount = (subTotal * Number(quotation.discountValue)) / 100;
    } else if (quotation.discountType === 'amount' && quotation.discountValue) {
      discountAmount = Number(quotation.discountValue);
    }

    const grandTotal = subTotal - discountAmount + taxAmount + Number(quotation.shippingCharges || 0);

    const so = this.soRepository.create({
      enterpriseId,
      orderNumber,
      orderDate: new Date(),
      customerId: quotation.customerId,
      quotationId: quotation.id,
      enquiryId: quotation.enquiryId,
      customerName: quotation.customerName,
      billingAddress: quotation.billingAddress,
      shippingAddress: quotation.shippingAddress,
      subTotal,
      discountAmount,
      taxAmount,
      grandTotal,
      notes: quotation.notes,
      status: 'confirmed',
      createdBy: userId,
    });

    const savedResult = await this.soRepository.save(so);
    const savedSo = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    const soItemEntities = soItems.map(({ item, lineTotal, taxAmount: ita }, idx) =>
      this.soItemRepository.create({
        salesOrderId: savedSo.id,
        productId: item.productId,
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: Number(item.unitPrice),
        taxPercent: Number(item.taxPercent),
        taxAmount: ita,
        lineTotal,
        sortOrder: item.sortOrder ?? idx,
      }),
    );
    await this.soItemRepository.save(soItemEntities);

    // ── 2. Lock the quotation and link the Sales Order ─────────────────────
    await this.quotationRepository.update(id, {
      status: 'accepted',
      isLocked: true,
      salesOrderId: savedSo.id,
    });

    this.auditLogsService.log({
      enterpriseId,
      userId,
      entityType: 'quotation',
      entityId: id,
      action: 'convert',
      description: `Quotation ${quotation.quotationNumber} accepted and converted to Sales Order ${savedSo.orderNumber}`,
      newValues: { status: 'accepted', salesOrderId: savedSo.id, orderNumber: savedSo.orderNumber },
    }).catch(() => {});

    this.notificationsService.create({
      enterpriseId,
      title: 'Quotation Converted to Purchase Order',
      message: `Quotation ${quotation.quotationNumber} was accepted and converted to Purchase Order ${savedSo.orderNumber}.`,
      type: 'quotation_accepted',
      module: 'orders',
      subModule: 'purchase-orders',
      link: `/purchase-orders/${savedSo.id}`,
    });

    // ── 3. Update linked enquiry and auto-convert to customer ─────────────
    if (quotation.enquiryId) {
      const enquiry = await this.enquiryRepository.findOne({
        where: { id: quotation.enquiryId },
      });

      if (enquiry && !enquiry.convertedCustomerId) {
        // Find or create customer from enquiry data
        let customer: Customer | null = null;
        if (enquiry.mobile) {
          customer = await this.customerRepository.findOne({
            where: { mobile: enquiry.mobile, enterpriseId },
          });
        }

        if (!customer) {
          const count = await this.customerRepository.count({ where: { enterpriseId } });
          const customerNumber = `CUS-${String(count + 1).padStart(6, '0')}`;
          const newCustomer = this.customerRepository.create({
            enterpriseId,
            customerName: enquiry.customerName,
            mobile: enquiry.mobile,
            email: enquiry.email,
            businessName: enquiry.businessName,
            address: enquiry.address,
            city: enquiry.city,
            state: enquiry.state,
            pincode: enquiry.pincode,
            sourceEnquiryId: enquiry.id,
            customerNumber,
            status: 'active',
          });
          const savedCustomer = await this.customerRepository.save(newCustomer);
          customer = Array.isArray(savedCustomer) ? savedCustomer[0] : savedCustomer;
        } else if (!customer.sourceEnquiryId) {
          await this.customerRepository.update(customer.id, { sourceEnquiryId: enquiry.id });
        }

        // Mark enquiry as converted
        await this.enquiryRepository.update(quotation.enquiryId, {
          interestStatus: 'Converted',
          convertedCustomerId: customer!.id,
        });
      } else if (enquiry) {
        await this.enquiryRepository.update(quotation.enquiryId, {
          interestStatus: 'Sale Closed',
        });
      }
    }

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const quotation = await this.quotationRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    // Versions are deleted automatically via onDelete: CASCADE on the FK.
    // Items must still be removed manually (no cascade configured there).
    await this.itemRepository.delete({ quotationId: id });
    await this.quotationRepository.delete(id);

    this.auditLogsService.log({
      enterpriseId,
      entityType: 'quotation',
      entityId: id,
      action: 'delete',
      description: `Deleted quotation ${quotation.quotationNumber}`,
    }).catch(() => {});

    return {
      message: 'Quotation deleted successfully',
      data: null,
    };
  }

  async updateStatus(id: number, enterpriseId: number, status: string, userId?: number, rejectionReason?: string) {
    const quotation = await this.quotationRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (status === 'rejected') {
      // Save snapshot of current state as a rejected version
      const currentItems = await this.itemRepository.find({
        where: { quotationId: id },
        order: { sortOrder: 'ASC' },
      });
      const snapshot = this.buildSnapshot(quotation, currentItems);

      const versionEntity = new QuotationVersion();
      versionEntity.quotationId = id;
      versionEntity.versionNumber = quotation.currentVersion;
      versionEntity.snapshot = snapshot;
      if (userId !== undefined) versionEntity.changedBy = userId;
      versionEntity.changeNotes = `[REJECTED] ${rejectionReason || ''}`.trim();
      await this.versionRepository.save(versionEntity);

      // Update status only — do NOT bump version here.
      // Version increments when the salesperson actually revises the content.
      await this.quotationRepository.update(id, {
        status: 'rejected',
      });

      this.auditLogsService.log({
        enterpriseId,
        userId,
        entityType: 'quotation',
        entityId: id,
        action: 'status_change',
        description: `Quotation ${quotation.quotationNumber} rejected${rejectionReason ? ': ' + rejectionReason : ''}`,
        newValues: { status: 'rejected', rejectionReason },
      }).catch(() => {});

      if (quotation.enquiryId) {
        await this.enquiryRepository.update(quotation.enquiryId, {
          interestStatus: 'Follow Up',
        });
      }
    } else {
      await this.quotationRepository.update(id, { status });

      this.auditLogsService.log({
        enterpriseId,
        userId,
        entityType: 'quotation',
        entityId: id,
        action: 'status_change',
        description: `Quotation ${quotation.quotationNumber} status changed to "${status}"`,
        newValues: { status },
      }).catch(() => {});

      if (status === 'accepted' && quotation.enquiryId) {
        await this.enquiryRepository.update(quotation.enquiryId, {
          interestStatus: 'Sale Closed',
        });
      }
    }

    return this.findOne(id, enterpriseId);
  }

  async duplicate(id: number, enterpriseId: number, userId?: number) {
    const original = await this.findOne(id, enterpriseId);

    if (!original.data) {
      throw new NotFoundException('Quotation not found');
    }

    const createDto: CreateQuotationDto = {
      customerId: original.data.customerId,
      customerName: original.data.customerName,
      email: original.data.email,
      mobile: original.data.mobile,
      billingAddress: original.data.billingAddress,
      shippingAddress: original.data.shippingAddress,
      discountType: original.data.discountType,
      discountValue: Number(original.data.discountValue),
      shippingCharges: Number(original.data.shippingCharges),
      termsConditions: original.data.termsConditions,
      notes: original.data.notes,
      items: original.data.items.map((item: QuotationItem) => ({
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

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Builds a plain-object snapshot of the quotation header and its items.
   * This is stored as JSONB in quotation_versions.snapshot.
   */
  private buildSnapshot(
    quotation: Quotation,
    items: QuotationItem[],
  ): Record<string, unknown> {
    return {
      quotationDate: quotation.quotationDate,
      validUntil: quotation.validUntil,
      customerName: quotation.customerName,
      email: quotation.email,
      mobile: quotation.mobile,
      billingAddress: quotation.billingAddress,
      shippingAddress: quotation.shippingAddress,
      subTotal: Number(quotation.subTotal),
      discountType: quotation.discountType,
      discountValue: Number(quotation.discountValue),
      discountAmount: Number(quotation.discountAmount),
      taxAmount: Number(quotation.taxAmount),
      shippingCharges: Number(quotation.shippingCharges),
      grandTotal: Number(quotation.grandTotal),
      termsConditions: quotation.termsConditions,
      notes: quotation.notes,
      status: quotation.status,
      items: items.map((item) => ({
        productId: item.productId,
        itemName: item.itemName,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxPercent: Number(item.taxPercent),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
    };
  }

  private calculateTotals(items: QuotationItemDto[]) {
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

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rfq } from './entities/rfq.entity';
import { RfqVendor } from './entities/rfq-vendor.entity';
import { RfqVendorItem } from './entities/rfq-vendor-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Indent } from '../indents/entities/indent.entity';
import { IndentItem } from '../indents/entities/indent-item.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class RfqsService {
  constructor(
    @InjectRepository(Rfq) private rfqRepo: Repository<Rfq>,
    @InjectRepository(RfqVendor) private vendorRepo: Repository<RfqVendor>,
    @InjectRepository(RfqVendorItem) private itemRepo: Repository<RfqVendorItem>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(Indent) private indentRepo: Repository<Indent>,
    @InjectRepository(IndentItem) private indentItemRepo: Repository<IndentItem>,
    private emailService: EmailService,
  ) {}

  async createFromIndent(
    indentId: number,
    enterpriseId: number,
    supplierIds?: number[],
    notes?: string,
    userId?: number,
    vendorItems?: { supplierId: number; indentItemIds: number[] }[],
  ) {
    // Resolve the list of supplier IDs from whichever payload was sent
    const resolvedSupplierIds: number[] = vendorItems
      ? vendorItems.map((vi) => vi.supplierId)
      : (supplierIds || []);

    if (resolvedSupplierIds.length === 0)
      throw new BadRequestException('Select at least one vendor');

    const indent = await this.indentRepo.findOne({ where: { id: indentId, enterpriseId } });
    if (!indent) throw new NotFoundException('Indent not found');

    const existing = await this.rfqRepo.findOne({ where: { indentId, enterpriseId } });
    if (existing) throw new BadRequestException('An RFQ already exists for this indent');

    const count = await this.rfqRepo.count({ where: { enterpriseId } });
    const rfqNumber = `RFQ-${String(count + 1).padStart(6, '0')}`;

    const rfq = await this.rfqRepo.save(
      this.rfqRepo.create({ enterpriseId, rfqNumber, indentId, status: 'draft', notes, createdBy: userId }),
    );

    const allIndentItems = await this.indentItemRepo.find({ where: { indentId } });

    // Build a quick lookup: supplierId → allowed indentItemIds (null = all items)
    const vendorItemMap = vendorItems
      ? new Map(vendorItems.map((vi) => [vi.supplierId, new Set(vi.indentItemIds)]))
      : null;

    for (const supplierId of resolvedSupplierIds) {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId, enterpriseId } });
      if (!supplier) continue;

      const vendor = await this.vendorRepo.save(
        this.vendorRepo.create({ rfqId: rfq.id, supplierId, status: 'pending' }),
      );

      const allowedItemIds = vendorItemMap?.get(supplierId);
      const itemsForVendor = allowedItemIds
        ? allIndentItems.filter((item) => allowedItemIds.has(item.id))
        : allIndentItems;

      for (const item of itemsForVendor) {
        await this.itemRepo.save(
          this.itemRepo.create({ rfqVendorId: vendor.id, indentItemId: item.id }),
        );
      }
    }

    return this.findByIndent(indentId, enterpriseId);
  }

  async addVendors(
    rfqId: number,
    enterpriseId: number,
    vendorItems: { supplierId: number; indentItemIds: number[] }[],
  ) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId, enterpriseId } });
    if (!rfq) throw new NotFoundException('RFQ not found');
    if (!vendorItems || vendorItems.length === 0)
      throw new BadRequestException('Select at least one vendor');

    const allIndentItems = await this.indentItemRepo.find({ where: { indentId: rfq.indentId } });
    const itemSet = new Set(allIndentItems.map((i) => i.id));

    for (const vi of vendorItems) {
      let vendor = await this.vendorRepo.findOne({ where: { rfqId, supplierId: vi.supplierId } });
      if (!vendor) {
        const supplier = await this.supplierRepo.findOne({ where: { id: vi.supplierId, enterpriseId } });
        if (!supplier) continue;
        vendor = await this.vendorRepo.save(
          this.vendorRepo.create({ rfqId, supplierId: vi.supplierId, status: 'pending' }),
        );
      }

      for (const itemId of vi.indentItemIds) {
        if (!itemSet.has(itemId)) continue;
        const existing = await this.itemRepo.findOne({
          where: { rfqVendorId: vendor.id, indentItemId: itemId },
        });
        if (!existing) {
          await this.itemRepo.save(
            this.itemRepo.create({ rfqVendorId: vendor.id, indentItemId: itemId }),
          );
        }
      }
    }

    return this.findByIndent(rfq.indentId, enterpriseId);
  }

  async sendEmails(rfqId: number, enterpriseId: number) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId, enterpriseId } });
    if (!rfq) throw new NotFoundException('RFQ not found');

    const indent = await this.indentRepo.findOne({ where: { id: rfq.indentId } });
    const indentItems = await this.indentItemRepo.find({ where: { indentId: rfq.indentId } });
    const vendors = await this.vendorRepo.find({
      where: { rfqId },
      relations: ['supplier'],
    });

    const itemsTable = indentItems
      .map((i) => `  • ${i.itemName} — Qty: ${i.shortageQuantity} ${i.unitOfMeasure || ''}`.trim())
      .join('\n');

    let emailsSent = 0;
    for (const vendor of vendors) {
      if (!vendor.supplier?.email) continue;

      const body =
        `Dear ${vendor.supplier.contactPerson || vendor.supplier.supplierName},\n\n` +
        `We request your best quotation for the following materials under RFQ ${rfq.rfqNumber}:\n\n` +
        `${itemsTable}\n\n` +
        `Please provide your unit price per item, applicable taxes, and expected delivery time.\n\n` +
        `RFQ Number: ${rfq.rfqNumber}\n` +
        `Indent Reference: ${indent?.indentNumber || ''}\n\n` +
        `Kindly reply at your earliest convenience.\n\n` +
        `Regards,\nProcurement Team`;

      await this.emailService.sendEmail({
        to: vendor.supplier.email,
        subject: `Request for Quotation – ${rfq.rfqNumber}`,
        body,
      });

      await this.vendorRepo.update(vendor.id, { emailSentAt: new Date() });
      emailsSent++;
    }

    await this.rfqRepo.update(rfq.id, { status: 'sent', sentDate: new Date() });

    return { message: `RFQ emails sent to ${emailsSent} vendor(s)`, rfqNumber: rfq.rfqNumber };
  }

  async findById(rfqId: number, enterpriseId: number) {
    const rfq = await this.rfqRepo.findOne({
      where: { id: rfqId, enterpriseId },
      relations: ['indent'],
    });
    if (!rfq) throw new NotFoundException('RFQ not found');

    const vendors = await this.vendorRepo.find({
      where: { rfqId },
      relations: ['supplier', 'items', 'items.indentItem'],
      order: { id: 'ASC' },
    });

    const indentItems = await this.indentItemRepo.find({ where: { indentId: rfq.indentId } });

    // Build price comparison rows
    const respondedVendors = vendors.filter((v) => v.status === 'responded');
    const rows = indentItems.map((item) => {
      const vendorPrices: Record<number, { unitPrice: number | null; taxPercent: number | null; lineTotal: number | null }> = {};
      for (const vendor of vendors) {
        const vi = vendor.items.find((i) => i.indentItemId === item.id);
        const up = vi?.unitPrice ? Number(vi.unitPrice) : null;
        const tax = vi?.taxPercent ? Number(vi.taxPercent) : null;
        const lineTotal = up !== null ? up * Number(item.shortageQuantity) * (1 + (tax || 0) / 100) : null;
        vendorPrices[vendor.id] = { unitPrice: up, taxPercent: tax, lineTotal };
      }
      return {
        indentItemId: item.id,
        itemName: item.itemName,
        quantity: Number(item.shortageQuantity),
        unit: item.unitOfMeasure,
        vendorPrices,
      };
    });

    // Grand totals per vendor
    const vendorTotals: Record<number, number> = {};
    for (const v of vendors) {
      vendorTotals[v.id] = rows.reduce((sum, row) => sum + (row.vendorPrices[v.id]?.lineTotal || 0), 0);
    }

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      indentId: rfq.indentId,
      indentNumber: (rfq.indent as any)?.indentNumber,
      status: rfq.status,
      notes: rfq.notes,
      sentDate: rfq.sentDate,
      createdDate: rfq.createdDate,
      vendors: vendors.map((v) => ({
        id: v.id,
        supplierId: v.supplierId,
        supplierName: v.supplier?.supplierName,
        supplierEmail: v.supplier?.email,
        contactPerson: v.supplier?.contactPerson,
        phone: v.supplier?.phone,
        status: v.status,
        emailSentAt: v.emailSentAt,
        quotePdfPath: v.quotePdfPath,
        deliveryDays: v.deliveryDays ?? null,
        notes: v.notes,
        grandTotal: vendorTotals[v.id] || 0,
        items: v.items.map((i) => ({
          id: i.id,
          indentItemId: i.indentItemId,
          itemName: i.indentItem?.itemName,
          quantity: Number(i.indentItem?.shortageQuantity ?? 0),
          unit: i.indentItem?.unitOfMeasure,
          unitPrice: i.unitPrice ? Number(i.unitPrice) : null,
          taxPercent: i.taxPercent ? Number(i.taxPercent) : null,
          lineTotal: i.unitPrice && i.indentItem?.shortageQuantity
            ? Number(i.unitPrice) * Number(i.indentItem.shortageQuantity) * (1 + (i.taxPercent ? Number(i.taxPercent) : 0) / 100)
            : null,
        })),
      })),
      rows,
      indentItems: indentItems.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        quantity: Number(i.shortageQuantity),
        unit: i.unitOfMeasure,
      })),
    };
  }

  async findAll(enterpriseId: number, status?: string, page = 1, pageSize = 20) {
    const where: any = { enterpriseId };
    if (status) where.status = status;

    const [rfqs, total] = await this.rfqRepo.findAndCount({
      where,
      relations: ['indent', 'vendors', 'vendors.supplier'],
      order: { createdDate: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: rfqs.map((rfq) => ({
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        indentId: rfq.indentId,
        indentNumber: rfq.indent?.indentNumber,
        status: rfq.status,
        notes: rfq.notes,
        sentDate: rfq.sentDate,
        createdDate: rfq.createdDate,
        vendorCount: rfq.vendors?.length || 0,
        respondedCount: rfq.vendors?.filter((v) => v.status === 'responded').length || 0,
        vendors: rfq.vendors?.map((v) => ({
          id: v.id,
          supplierName: v.supplier?.supplierName,
          status: v.status,
          deliveryDays: (v as any).deliveryDays ?? null,
        })) || [],
      })),
      total,
      page,
      pageSize,
    };
  }

  async findByIndent(indentId: number, enterpriseId: number) {
    const rfq = await this.rfqRepo.findOne({
      where: { indentId, enterpriseId },
    });
    if (!rfq) return null;

    const vendors = await this.vendorRepo.find({
      where: { rfqId: rfq.id },
      relations: ['supplier', 'items', 'items.indentItem'],
      order: { id: 'ASC' },
    });

    return { ...rfq, vendors };
  }

  async updateVendorQuote(
    rfqId: number,
    vendorId: number,
    enterpriseId: number,
    items: { indentItemId: number; unitPrice: number; taxPercent?: number; notes?: string }[],
    deliveryDays?: number,
  ) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId, enterpriseId } });
    if (!rfq) throw new NotFoundException('RFQ not found');

    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, rfqId } });
    if (!vendor) throw new NotFoundException('Vendor not found in this RFQ');

    for (const input of items) {
      const existing = await this.itemRepo.findOne({
        where: { rfqVendorId: vendorId, indentItemId: input.indentItemId },
      });
      if (existing) {
        await this.itemRepo.update(existing.id, {
          unitPrice: input.unitPrice,
          ...(input.taxPercent !== undefined && { taxPercent: input.taxPercent }),
          ...(input.notes !== undefined && { notes: input.notes }),
        });
      }
    }

    await this.vendorRepo.update(vendorId, {
      status: 'responded',
      ...(deliveryDays !== undefined && { deliveryDays }),
    });
    await this.updateRfqStatus(rfqId);

    return this.findByIndent(rfq.indentId, enterpriseId);
  }

  async uploadVendorQuote(rfqId: number, vendorId: number, enterpriseId: number, filePath: string) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId, enterpriseId } });
    if (!rfq) throw new NotFoundException('RFQ not found');

    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, rfqId } });
    if (!vendor) throw new NotFoundException('Vendor not found in this RFQ');

    await this.vendorRepo.update(vendorId, { quotePdfPath: filePath, status: 'responded' });
    await this.updateRfqStatus(rfqId);

    return { message: 'Quote PDF uploaded successfully', filePath };
  }

  async getComparison(rfqId: number, enterpriseId: number) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId, enterpriseId } });
    if (!rfq) throw new NotFoundException('RFQ not found');

    const indent = await this.indentRepo.findOne({ where: { id: rfq.indentId } });
    const isUrgent = (indent as any)?.priority === 'urgent';
    const priceWeight = isUrgent ? 0.3 : 0.7;
    const deliveryWeight = isUrgent ? 0.7 : 0.3;

    const indentItems = await this.indentItemRepo.find({ where: { indentId: rfq.indentId } });
    const vendors = await this.vendorRepo.find({
      where: { rfqId, status: 'responded' },
      relations: ['supplier', 'items'],
    });

    // Build per-vendor assigned item ID sets
    const vendorAssignedItems = new Map<number, Set<number>>();
    for (const vendor of vendors) {
      vendorAssignedItems.set(vendor.id, new Set(vendor.items.map((i) => i.indentItemId)));
    }

    const rows = indentItems.map((item) => {
      const vendorPrices: Record<number, { unitPrice: number | null; taxPercent: number | null; lineTotal: number | null }> = {};
      const assignedVendorIds: number[] = [];
      for (const vendor of vendors) {
        const assigned = vendorAssignedItems.get(vendor.id);
        if (!assigned?.has(item.id)) continue; // vendor not assigned this item — skip entirely
        assignedVendorIds.push(vendor.id);
        const vi = vendor.items.find((i) => i.indentItemId === item.id);
        const up = vi?.unitPrice ? Number(vi.unitPrice) : null;
        const tax = vi?.taxPercent ? Number(vi.taxPercent) : null;
        const lineTotal = up !== null ? up * Number(item.shortageQuantity) * (1 + (tax || 0) / 100) : null;
        vendorPrices[vendor.id] = { unitPrice: up, taxPercent: tax, lineTotal };
      }
      return {
        indentItemId: item.id,
        itemName: item.itemName,
        quantity: Number(item.shortageQuantity),
        unit: item.unitOfMeasure,
        vendorPrices,
        assignedVendorIds,
      };
    });

    const vendorTotals: Record<number, number> = {};
    for (const vendor of vendors) {
      vendorTotals[vendor.id] = rows.reduce((sum, row) => sum + (row.vendorPrices[vendor.id]?.lineTotal || 0), 0);
    }

    // ── Scope-group-based scoring ─────────────────────────────────────────────
    // Group vendors by their exact item scope. Only vendors in the same scope
    // group (≥2) are compared against each other. This prevents badges being
    // awarded based on a single shared item when vendors cover different scopes.
    const scopeKey = (vendorId: number) =>
      Array.from(vendorAssignedItems.get(vendorId) ?? []).sort((a, b) => a - b).join(',');

    const scopeGroups = new Map<string, typeof vendors>();
    for (const vendor of vendors) {
      const key = scopeKey(vendor.id);
      if (!scopeGroups.has(key)) scopeGroups.set(key, []);
      scopeGroups.get(key)!.push(vendor);
    }

    type VendorScore = { score: number | null; badge: string | null; badgeColor: string | null; hint: string | null };
    const vendorScores: Record<number, VendorScore> = {};

    // Default: no score for everyone; overwrite below for groups with ≥2 vendors
    for (const vendor of vendors) {
      vendorScores[vendor.id] = { score: null, badge: null, badgeColor: null, hint: null };
    }

    for (const [, group] of scopeGroups) {
      if (group.length < 2) continue; // no competition in this scope group

      // Scope items = the items this group covers (they all cover the same set)
      const scopeItemIds = vendorAssignedItems.get(group[0].id) ?? new Set<number>();

      // Comparable totals: sum only items in this scope
      const groupTotals: Record<number, number> = {};
      for (const vendor of group) {
        groupTotals[vendor.id] = rows
          .filter((row) => scopeItemIds.has(row.indentItemId))
          .reduce((sum, row) => sum + (row.vendorPrices[vendor.id]?.lineTotal || 0), 0);
      }

      // Only score vendors who have actually submitted prices (total > 0)
      const quotedVendors = group.filter((v) => groupTotals[v.id] > 0);
      if (quotedVendors.length < 2) continue; // need at least 2 with real quotes to compare

      const compTotals = quotedVendors.map((v) => groupTotals[v.id]);
      const minTotal = Math.min(...compTotals);
      const maxTotal = Math.max(...compTotals);

      const dayValues = quotedVendors.map((v) => (v as any).deliveryDays).filter((d) => d != null) as number[];
      const minDays = dayValues.length ? Math.min(...dayValues) : null;
      const maxDays = dayValues.length ? Math.max(...dayValues) : null;

      const priceDiff = maxTotal - minTotal;
      const dayDiff = maxDays != null && minDays != null ? maxDays - minDays : 0;

      // Step 1: Compute raw scores for all quoted vendors
      const rawScores: Record<number, number> = {};
      for (const vendor of quotedVendors) {
        const total = groupTotals[vendor.id];
        const priceScore = priceDiff > 0 ? ((maxTotal - total) / priceDiff) * 100 : 100;
        const dayVal = (vendor as any).deliveryDays as number | null;
        const deliveryScore = dayDiff > 0 && dayVal != null
          ? ((maxDays! - dayVal) / dayDiff) * 100
          : 50;
        rawScores[vendor.id] = Math.round(priceWeight * priceScore + deliveryWeight * deliveryScore);
      }

      // Step 2: Top scorer (highest score) always gets "Recommended"
      const sortedByScore = [...quotedVendors].sort((a, b) => rawScores[b.id] - rawScores[a.id]);
      const topVendor = sortedByScore[0];

      // Step 3: Assign badges — top vendor gets Recommended; others get role-based badges
      for (const vendor of quotedVendors) {
        const total = groupTotals[vendor.id];
        const dayVal = (vendor as any).deliveryDays as number | null;
        const isCheapest = priceDiff > 0 && total === minTotal;
        const isFastest  = dayDiff > 0 && dayVal != null && dayVal === minDays;
        const isExpensive = priceDiff > 0 && total > minTotal * 1.15;
        const isSlow      = dayDiff > 0 && dayVal != null && (dayVal - minDays!) > Math.max(2, dayDiff * 0.6);

        if (vendor.id === topVendor.id) {
          vendorScores[vendor.id] = {
            score: rawScores[vendor.id],
            badge: 'Recommended',
            badgeColor: '#722ed1',
            hint: isUrgent
              ? 'Best overall score for an urgent order (delivery weighted 70%)'
              : 'Best overall value — balanced price and delivery',
          };
        } else if (isCheapest && isSlow) {
          vendorScores[vendor.id] = { score: rawScores[vendor.id], badge: 'Caution', badgeColor: '#fa8c16', hint: 'Cheapest price but slowest delivery' };
        } else if (isCheapest) {
          vendorScores[vendor.id] = { score: rawScores[vendor.id], badge: 'Best Price', badgeColor: '#52c41a', hint: 'Lowest total cost' };
        } else if (isFastest && isExpensive) {
          vendorScores[vendor.id] = { score: rawScores[vendor.id], badge: 'Caution', badgeColor: '#fa8c16', hint: 'Fastest delivery but significantly more expensive' };
        } else if (isFastest) {
          vendorScores[vendor.id] = { score: rawScores[vendor.id], badge: 'Fastest', badgeColor: '#1677ff', hint: isUrgent ? 'Fastest delivery — prioritised for urgent order' : 'Fastest delivery' };
        } else {
          vendorScores[vendor.id] = { score: rawScores[vendor.id], badge: null, badgeColor: null, hint: null };
        }
      }
    }

    return {
      rfqId,
      rfqNumber: rfq.rfqNumber,
      isUrgent,
      vendors: vendors.map((v) => ({
        id: v.id,
        supplierId: v.supplierId,
        supplierName: v.supplier?.supplierName,
        grandTotal: vendorTotals[v.id] || 0,
        deliveryDays: (v as any).deliveryDays ?? null,
        assignedItemIds: Array.from(vendorAssignedItems.get(v.id) ?? []),
        score: vendorScores[v.id]?.score ?? null,
        badge: vendorScores[v.id]?.badge ?? null,
        badgeColor: vendorScores[v.id]?.badgeColor ?? null,
        hint: vendorScores[v.id]?.hint ?? null,
      })),
      rows,
    };
  }

  async getQuotePdf(rfqId: number, vendorId: number, enterpriseId: number) {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId, enterpriseId } });
    if (!rfq) throw new NotFoundException('RFQ not found');

    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, rfqId } });
    if (!vendor) throw new NotFoundException('Vendor not found in this RFQ');

    return { filePath: vendor.quotePdfPath };
  }

  private async updateRfqStatus(rfqId: number) {
    const vendors = await this.vendorRepo.find({ where: { rfqId } });
    const allResponded = vendors.length > 0 && vendors.every((v) => v.status === 'responded');
    if (allResponded) {
      await this.rfqRepo.update(rfqId, { status: 'completed' });
    }
  }
}

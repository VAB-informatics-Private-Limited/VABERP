import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import { PrintTemplateConfig } from './entities/print-template-config.entity';
import { PrintTemplateVersion } from './entities/print-template-version.entity';
import { UpsertPrintTemplateDto } from './dto/upsert-print-template.dto';

@Injectable()
export class PrintTemplatesService {
  constructor(
    @InjectRepository(PrintTemplateConfig)
    private configRepo: Repository<PrintTemplateConfig>,
    @InjectRepository(PrintTemplateVersion)
    private versionRepo: Repository<PrintTemplateVersion>,
  ) {}

  async getConfig(enterpriseId: number) {
    const config = await this.configRepo.findOne({ where: { enterpriseId } });
    if (!config) {
      return { data: this.buildDefault(enterpriseId), is_default: true };
    }
    return { data: this.map(config), is_default: false };
  }

  async upsert(enterpriseId: number, dto: UpsertPrintTemplateDto, userId?: number) {
    let config = await this.configRepo.findOne({ where: { enterpriseId } });
    const isNew = !config;

    if (!isNew) {
      // Snapshot current state before overwriting
      const { changeNotes, ...rest } = dto;
      await this.versionRepo.save(
        this.versionRepo.create({
          enterpriseId,
          versionNumber: config!.currentVersion,
          snapshot: this.map(config!),
          changeNotes: dto.changeNotes ?? null,
          changedBy: userId ?? null,
        }),
      );
    }

    if (isNew) {
      config = this.configRepo.create({ enterpriseId, currentVersion: 0 });
    }

    const { changeNotes, ...fields } = dto;
    if (fields.companyName !== undefined) config!.companyName = fields.companyName;
    if (fields.tagline !== undefined) config!.tagline = fields.tagline;
    if (fields.logoUrl !== undefined) config!.logoUrl = fields.logoUrl;
    if (fields.logoWidth !== undefined) config!.logoWidth = fields.logoWidth;
    if (fields.address !== undefined) config!.address = fields.address;
    if (fields.phone !== undefined) config!.phone = fields.phone;
    if (fields.email !== undefined) config!.email = fields.email;
    if (fields.gstNumber !== undefined) config!.gstNumber = fields.gstNumber;
    if (fields.cinNumber !== undefined) config!.cinNumber = fields.cinNumber;
    if (fields.headerAlignment !== undefined) config!.headerAlignment = fields.headerAlignment;
    if (fields.headerStyle !== undefined) config!.headerStyle = fields.headerStyle;
    if (fields.showGst !== undefined) config!.showGst = fields.showGst;
    if (fields.showEmail !== undefined) config!.showEmail = fields.showEmail;
    if (fields.showPhone !== undefined) config!.showPhone = fields.showPhone;
    if (fields.showTagline !== undefined) config!.showTagline = fields.showTagline;
    if (fields.showLogo !== undefined) config!.showLogo = fields.showLogo;
    if (fields.footerText !== undefined) config!.footerText = fields.footerText;
    if (fields.showFooter !== undefined) config!.showFooter = fields.showFooter;
    if (fields.watermarkText !== undefined) config!.watermarkText = fields.watermarkText;
    if (fields.showWatermark !== undefined)   config!.showWatermark   = fields.showWatermark;
    if (fields.primaryColor !== undefined)    config!.primaryColor    = fields.primaryColor;
    if (fields.secondaryColor !== undefined)  config!.secondaryColor  = fields.secondaryColor;
    if (fields.accentColor !== undefined)     config!.accentColor     = fields.accentColor;
    if (fields.fontFamily !== undefined)      config!.fontFamily      = fields.fontFamily;
    if (fields.signatureUrl !== undefined)    config!.signatureUrl    = fields.signatureUrl;
    if (fields.showSignature !== undefined)   config!.showSignature   = fields.showSignature;
    if (fields.showPageNumber !== undefined)  config!.showPageNumber  = fields.showPageNumber;
    config!.currentVersion = (config!.currentVersion ?? 0) + 1;
    config!.updatedBy = userId ?? null;

    const saved = await this.configRepo.save(config!);
    return { data: this.map(saved) };
  }

  async saveLogo(enterpriseId: number, logoUrl: string, userId?: number) {
    // Delete old logo file if exists
    const existing = await this.configRepo.findOne({ where: { enterpriseId } });
    if (existing?.logoUrl) {
      const oldPath = join(process.cwd(), existing.logoUrl.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    return this.upsert(enterpriseId, { logoUrl }, userId);
  }

  async getVersionHistory(enterpriseId: number, page?: any, limit?: any) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, parseInt(limit) || 15);
    const [versions, total] = await this.versionRepo.findAndCount({
      where: { enterpriseId },
      order: { versionNumber: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });
    return { data: versions, totalRecords: total };
  }

  async rollback(enterpriseId: number, versionNumber: number, userId?: number) {
    const version = await this.versionRepo.findOne({
      where: { enterpriseId, versionNumber },
    });
    if (!version) throw new NotFoundException('Version not found');

    const snap = version.snapshot as any;
    return this.upsert(
      enterpriseId,
      {
        companyName: snap.company_name,
        tagline: snap.tagline,
        logoUrl: snap.logo_url,
        logoWidth: snap.logo_width,
        address: snap.address,
        phone: snap.phone,
        email: snap.email,
        gstNumber: snap.gst_number,
        cinNumber: snap.cin_number,
        headerAlignment: snap.header_alignment,
        headerStyle: snap.header_style,
        showGst: snap.show_gst,
        showEmail: snap.show_email,
        showPhone: snap.show_phone,
        showTagline: snap.show_tagline,
        showLogo: snap.show_logo,
        footerText: snap.footer_text,
        showFooter: snap.show_footer,
        watermarkText: snap.watermark_text,
        showWatermark: snap.show_watermark,
        primaryColor: snap.primary_color,
        secondaryColor: snap.secondary_color,
        accentColor: snap.accent_color,
        fontFamily: snap.font_family,
        signatureUrl: snap.signature_url,
        showSignature: snap.show_signature,
        showPageNumber: snap.show_page_number,
        changeNotes: `Rolled back to version ${versionNumber}`,
      },
      userId,
    );
  }

  private buildDefault(enterpriseId: number) {
    return {
      enterprise_id: enterpriseId,
      company_name: null,
      tagline: null,
      logo_url: null,
      logo_width: 120,
      address: null,
      phone: null,
      email: null,
      gst_number: null,
      cin_number: null,
      header_alignment: 'left',
      header_style: 'detailed',
      show_gst: true,
      show_email: true,
      show_phone: true,
      show_tagline: false,
      show_logo: true,
      footer_text: null,
      show_footer: false,
      watermark_text: null,
      show_watermark: false,
      primary_color: '#f97316',
      secondary_color: '#111827',
      accent_color: null,
      font_family: 'Arial, Helvetica, sans-serif',
      signature_url: null,
      show_signature: true,
      show_page_number: false,
      current_version: 0,
    };
  }

  private map(c: PrintTemplateConfig) {
    return {
      id: c.id,
      enterprise_id: c.enterpriseId,
      company_name: c.companyName,
      tagline: c.tagline,
      logo_url: c.logoUrl,
      logo_width: c.logoWidth,
      address: c.address,
      phone: c.phone,
      email: c.email,
      gst_number: c.gstNumber,
      cin_number: c.cinNumber,
      header_alignment: c.headerAlignment,
      header_style: c.headerStyle,
      show_gst: c.showGst,
      show_email: c.showEmail,
      show_phone: c.showPhone,
      show_tagline: c.showTagline,
      show_logo: c.showLogo,
      footer_text: c.footerText,
      show_footer: c.showFooter,
      watermark_text: c.watermarkText,
      show_watermark: c.showWatermark,
      primary_color: c.primaryColor ?? '#f97316',
      secondary_color: c.secondaryColor ?? '#111827',
      accent_color: c.accentColor ?? null,
      font_family: c.fontFamily ?? 'Arial, Helvetica, sans-serif',
      signature_url: c.signatureUrl ?? null,
      show_signature: c.showSignature ?? true,
      show_page_number: c.showPageNumber ?? false,
      current_version: c.currentVersion,
      updated_at: c.updatedAt,
    };
  }
}

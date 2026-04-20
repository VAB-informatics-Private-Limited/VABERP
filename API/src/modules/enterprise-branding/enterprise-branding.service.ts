import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import { EnterpriseBranding } from './entities/enterprise-branding.entity';
import { BrandingVersion } from './entities/branding-version.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { UpsertBrandingDto } from './dto/upsert-branding.dto';

@Injectable()
export class EnterpriseBrandingService {
  constructor(
    @InjectRepository(EnterpriseBranding)
    private brandingRepo: Repository<EnterpriseBranding>,
    @InjectRepository(BrandingVersion)
    private versionRepo: Repository<BrandingVersion>,
    @InjectRepository(Enterprise)
    private enterpriseRepo: Repository<Enterprise>,
  ) {}

  async getByEnterpriseId(enterpriseId: number) {
    const branding = await this.brandingRepo.findOne({ where: { enterpriseId } });
    return { data: branding ? this.map(branding) : null };
  }

  async getBySlug(slug: string) {
    const enterprise = await this.enterpriseRepo.findOne({
      where: { slug },
      select: ['id', 'businessName', 'slug', 'status'],
    });
    if (!enterprise || enterprise.status === 'blocked') {
      return { data: null };
    }
    const branding = await this.brandingRepo.findOne({
      where: { enterpriseId: enterprise.id },
    });
    return {
      data: branding ? { ...this.map(branding), businessName: enterprise.businessName } : null,
    };
  }

  async upsert(enterpriseId: number, dto: UpsertBrandingDto, userId?: number) {
    let branding = await this.brandingRepo.findOne({ where: { enterpriseId } });
    const isNew = !branding;

    // Snapshot current state before overwriting
    if (!isNew) {
      await this.versionRepo.save(
        this.versionRepo.create({
          enterpriseId,
          versionNumber: branding!.currentVersion,
          snapshot: this.map(branding!),
          changeNotes: dto.changeNotes ?? null,
          changedBy: userId ?? null,
        }),
      );
    }

    if (isNew) {
      branding = this.brandingRepo.create({ enterpriseId, currentVersion: 0 });
    }

    if (dto.appName !== undefined) branding!.appName = dto.appName;
    if (dto.tagline !== undefined) branding!.tagline = dto.tagline;
    if (dto.logoUrl !== undefined) branding!.logoUrl = dto.logoUrl;
    if (dto.logoSmallUrl !== undefined) branding!.logoSmallUrl = dto.logoSmallUrl;
    if (dto.faviconUrl !== undefined) branding!.faviconUrl = dto.faviconUrl;
    if (dto.primaryColor !== undefined) branding!.primaryColor = dto.primaryColor;
    if (dto.secondaryColor !== undefined) branding!.secondaryColor = dto.secondaryColor;
    if (dto.accentColor !== undefined) branding!.accentColor = dto.accentColor;
    if (dto.colorBgLayout !== undefined) branding!.colorBgLayout = dto.colorBgLayout;
    if (dto.loginBgImageUrl !== undefined) branding!.loginBgImageUrl = dto.loginBgImageUrl;
    if (dto.fontFamily !== undefined) branding!.fontFamily = dto.fontFamily;
    if (dto.borderRadius !== undefined) branding!.borderRadius = dto.borderRadius;
    if (dto.sidebarBgColor !== undefined) branding!.sidebarBgColor = dto.sidebarBgColor;
    if (dto.sidebarTextColor !== undefined) branding!.sidebarTextColor = dto.sidebarTextColor;
    branding!.currentVersion = (branding!.currentVersion ?? 0) + 1;
    branding!.updatedBy = userId ?? null;

    const saved = await this.brandingRepo.save(branding!);
    return { message: 'Branding saved successfully', data: this.map(saved) };
  }

  async saveFile(
    enterpriseId: number,
    field: 'logoUrl' | 'logoSmallUrl' | 'faviconUrl' | 'loginBgImageUrl',
    fileUrl: string,
    userId?: number,
  ) {
    const existing = await this.brandingRepo.findOne({ where: { enterpriseId } });
    if (existing && existing[field]) {
      const oldPath = join(process.cwd(), existing[field]!.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    return this.upsert(enterpriseId, { [field]: fileUrl } as any, userId);
  }

  async getVersionHistory(enterpriseId: number, page?: any, limit?: any) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, parseInt(limit) || 20);
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
        appName: snap.app_name,
        tagline: snap.tagline,
        logoUrl: snap.logo_url,
        logoSmallUrl: snap.logo_small_url,
        faviconUrl: snap.favicon_url,
        primaryColor: snap.primary_color,
        secondaryColor: snap.secondary_color,
        accentColor: snap.accent_color,
        colorBgLayout: snap.color_bg_layout,
        loginBgImageUrl: snap.login_bg_image_url,
        fontFamily: snap.font_family,
        borderRadius: snap.border_radius,
        sidebarBgColor: snap.sidebar_bg_color,
        sidebarTextColor: snap.sidebar_text_color,
        changeNotes: `Rolled back to version ${versionNumber}`,
      },
      userId,
    );
  }

  private map(b: EnterpriseBranding) {
    return {
      id: b.id,
      enterprise_id: b.enterpriseId,
      app_name: b.appName,
      tagline: b.tagline,
      logo_url: b.logoUrl,
      logo_small_url: b.logoSmallUrl,
      favicon_url: b.faviconUrl,
      primary_color: b.primaryColor,
      secondary_color: b.secondaryColor,
      accent_color: b.accentColor,
      color_bg_layout: b.colorBgLayout,
      login_bg_image_url: b.loginBgImageUrl,
      font_family: b.fontFamily,
      border_radius: b.borderRadius,
      sidebar_bg_color: b.sidebarBgColor,
      sidebar_text_color: b.sidebarTextColor,
      current_version: b.currentVersion,
      updated_at: b.updatedAt,
    };
  }
}

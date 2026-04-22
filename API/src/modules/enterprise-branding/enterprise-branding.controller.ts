import {
  Controller, Get, Put, Post, Body, Param, Query,
  UploadedFile, UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { EnterpriseBrandingService } from './enterprise-branding.service';
import { UpsertBrandingDto } from './dto/upsert-branding.dto';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

const UPLOAD_DIR = 'branding';
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'];
const MAX_SIZE = 2 * 1024 * 1024;

function brandingStorage(prefix: string) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dest = join(process.cwd(), 'uploads', UPLOAD_DIR);
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const eid = (req as any).enterpriseId || 'unknown';
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${prefix}-${eid}-${Date.now()}${ext}`);
    },
  });
}

function fileFilter(_req: any, file: any, cb: any) {
  const ext = extname(file.originalname).toLowerCase();
  cb(null, ALLOWED_EXTS.includes(ext));
}

@ApiTags('Branding')
@Controller('branding')
export class EnterpriseBrandingController {
  constructor(private readonly svc: EnterpriseBrandingService) {}

  // ── Public endpoints (no auth) ──────────────────────────────────────────

  @Public()
  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.svc.getBySlug(slug);
  }

  // ── Authenticated endpoints ─────────────────────────────────────────────

  @ApiBearerAuth('JWT-auth')
  @Get()
  getOwn(@EnterpriseId() enterpriseId: number) {
    return this.svc.getByEnterpriseId(enterpriseId);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermission('employees', 'permissions', 'edit')
  @Put()
  upsert(
    @Body() dto: UpsertBrandingDto,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.svc.upsert(enterpriseId, dto, user?.id);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermission('employees', 'permissions', 'edit')
  @Post('logo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', {
    storage: brandingStorage('logo'),
    limits: { fileSize: MAX_SIZE },
    fileFilter,
  }))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    const url = `/uploads/${UPLOAD_DIR}/${file.filename}`;
    return this.svc.saveFile(enterpriseId, 'logoUrl', url, user?.id);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermission('employees', 'permissions', 'edit')
  @Post('logo-small')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', {
    storage: brandingStorage('logo-sm'),
    limits: { fileSize: MAX_SIZE },
    fileFilter,
  }))
  async uploadLogoSmall(
    @UploadedFile() file: Express.Multer.File,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    const url = `/uploads/${UPLOAD_DIR}/${file.filename}`;
    return this.svc.saveFile(enterpriseId, 'logoSmallUrl', url, user?.id);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermission('employees', 'permissions', 'edit')
  @Post('favicon')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('favicon', {
    storage: brandingStorage('favicon'),
    limits: { fileSize: MAX_SIZE },
    fileFilter,
  }))
  async uploadFavicon(
    @UploadedFile() file: Express.Multer.File,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    const url = `/uploads/${UPLOAD_DIR}/${file.filename}`;
    return this.svc.saveFile(enterpriseId, 'faviconUrl', url, user?.id);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermission('employees', 'permissions', 'edit')
  @Post('login-bg')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', {
    storage: brandingStorage('login-bg'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
  }))
  async uploadLoginBg(
    @UploadedFile() file: Express.Multer.File,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    const url = `/uploads/${UPLOAD_DIR}/${file.filename}`;
    return this.svc.saveFile(enterpriseId, 'loginBgImageUrl', url, user?.id);
  }

  // ── Version history ─────────────────────────────────────────────────────

  @ApiBearerAuth('JWT-auth')
  @Get('versions')
  getVersionHistory(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.getVersionHistory(enterpriseId, page, limit);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermission('employees', 'permissions', 'edit')
  @Post('rollback/:version')
  rollback(
    @Param('version', ParseIntPipe) version: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.svc.rollback(enterpriseId, version, user?.id);
  }
}

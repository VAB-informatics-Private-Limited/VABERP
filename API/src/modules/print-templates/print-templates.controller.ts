import {
  Controller, Get, Put, Post, Body, Param, Query,
  UploadedFile, UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PrintTemplatesService } from './print-templates.service';
import { UpsertPrintTemplateDto } from './dto/upsert-print-template.dto';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';

@ApiTags('Print Templates')
@Controller('print-templates')
@ApiBearerAuth('JWT-auth')
export class PrintTemplatesController {
  constructor(private readonly svc: PrintTemplatesService) {}

  @Get('config')
  getConfig(@EnterpriseId() enterpriseId: number) {
    return this.svc.getConfig(enterpriseId);
  }

  @Put('config')
  @RequirePermission('configurations', 'print_template', 'edit')
  upsert(
    @Body() dto: UpsertPrintTemplateDto,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.svc.upsert(enterpriseId, dto, user?.id);
  }

  @Post('config/logo')
  @RequirePermission('configurations', 'print_template', 'edit')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = join(process.cwd(), 'uploads', 'logos');
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const enterpriseId = (req as any).enterpriseId || 'unknown';
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `logo-${enterpriseId}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
        const ext = extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    const logoUrl = `/uploads/logos/${file.filename}`;
    return this.svc.saveLogo(enterpriseId, logoUrl, user?.id);
  }

  @Get('config/versions')
  @RequirePermission('configurations', 'print_template', 'edit')
  getVersionHistory(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.getVersionHistory(enterpriseId, page, limit);
  }

  @Post('config/rollback/:version')
  @RequirePermission('configurations', 'print_template', 'edit')
  rollback(
    @Param('version', ParseIntPipe) version: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.svc.rollback(enterpriseId, version, user?.id);
  }
}

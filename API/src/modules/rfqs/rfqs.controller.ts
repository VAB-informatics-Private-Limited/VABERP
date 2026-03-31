import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query,
  UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RfqsService } from './rfqs.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';

@ApiTags('RFQs')
@Controller('rfqs')
@ApiBearerAuth('JWT-auth')
export class RfqsController {
  constructor(private readonly service: RfqsService) {}

  @Get()
  @ApiOperation({ summary: 'List all RFQs for the enterprise' })
  @RequirePermission('procurement', 'rfqs', 'view')
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll(enterpriseId, status, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20);
  }

  @Post('from-indent/:indentId')
  @ApiOperation({ summary: 'Create RFQ from indent, select up to 3 vendors' })
  @RequirePermission('procurement', 'rfqs', 'create')
  async createFromIndent(
    @Param('indentId', ParseIntPipe) indentId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() body: {
      supplierIds?: number[];
      vendorItems?: { supplierId: number; indentItemIds: number[] }[];
      notes?: string;
    },
  ) {
    return this.service.createFromIndent(indentId, enterpriseId, body.supplierIds, body.notes, user?.id, body.vendorItems);
  }

  @Post(':id/add-vendors')
  @ApiOperation({ summary: 'Add vendors/items to an existing RFQ' })
  @RequirePermission('procurement', 'rfqs', 'edit')
  async addVendors(
    @Param('id', ParseIntPipe) rfqId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: { vendorItems: { supplierId: number; indentItemIds: number[] }[] },
  ) {
    return this.service.addVendors(rfqId, enterpriseId, body.vendorItems);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send RFQ emails to all vendors' })
  @RequirePermission('procurement', 'rfqs', 'send')
  async sendEmails(
    @Param('id', ParseIntPipe) rfqId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.sendEmails(rfqId, enterpriseId);
  }

  @Get('by-indent/:indentId')
  @ApiOperation({ summary: 'Get RFQ for an indent' })
  @RequirePermission('procurement', 'rfqs', 'view')
  async getByIndent(
    @Param('indentId', ParseIntPipe) indentId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.findByIndent(indentId, enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full RFQ details by ID' })
  @RequirePermission('procurement', 'rfqs', 'view')
  async findById(
    @Param('id', ParseIntPipe) rfqId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.findById(rfqId, enterpriseId);
  }

  @Get(':id/comparison')
  @ApiOperation({ summary: 'Price comparison across vendors' })
  @RequirePermission('procurement', 'rfqs', 'view')
  async getComparison(
    @Param('id', ParseIntPipe) rfqId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.service.getComparison(rfqId, enterpriseId);
  }

  @Patch(':id/vendors/:vendorId/quote')
  @ApiOperation({ summary: 'Enter vendor prices manually' })
  @RequirePermission('procurement', 'rfqs', 'edit')
  async updateQuote(
    @Param('id', ParseIntPipe) rfqId: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: { deliveryDays?: number; items: { indentItemId: number; unitPrice: number; taxPercent?: number; notes?: string }[] },
  ) {
    return this.service.updateVendorQuote(rfqId, vendorId, enterpriseId, body.items, body.deliveryDays);
  }

  @Post(':id/vendors/:vendorId/upload')
  @ApiOperation({ summary: 'Upload vendor quote PDF' })
  @RequirePermission('procurement', 'rfqs', 'edit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file: any, cb: any) => {
          const dir = 'uploads/rfq-quotes';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname);
          cb(null, `rfq-${req.params.id}-vendor-${req.params.vendorId}-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (req: any, file: any, cb: any) => {
        cb(null, file.mimetype === 'application/pdf');
      },
    }),
  )
  async uploadQuote(
    @Param('id', ParseIntPipe) rfqId: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @EnterpriseId() enterpriseId: number,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new Error('Only PDF files are allowed');
    return this.service.uploadVendorQuote(rfqId, vendorId, enterpriseId, file.path);
  }

  @Get(':id/vendors/:vendorId/pdf')
  @ApiOperation({ summary: 'Download vendor quote PDF' })
  @RequirePermission('procurement', 'rfqs', 'view')
  async downloadPdf(
    @Param('id', ParseIntPipe) rfqId: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @EnterpriseId() enterpriseId: number,
    @Res() res: Response,
  ) {
    const { filePath } = await this.service.getQuotePdf(rfqId, vendorId, enterpriseId);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    fs.createReadStream(filePath).pipe(res);
  }
}

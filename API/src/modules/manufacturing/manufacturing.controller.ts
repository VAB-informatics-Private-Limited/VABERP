import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { EnterpriseId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateJobCardDto, UpdateStageDto, CreateProcessTemplateDto, CreateBomDto, SendForApprovalDto, UpdateManufacturingDetailsDto } from './dto';

@ApiTags('Manufacturing')
@Controller('manufacturing')
@ApiBearerAuth('JWT-auth')
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  // ========== Purchase Orders for Manufacturing ==========

  @Get('purchase-orders')
  @ApiOperation({ summary: 'Get purchase orders sent to manufacturing' })
  @RequirePermission('orders', 'manufacturing', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getPurchaseOrders(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.manufacturingService.getPurchaseOrdersForManufacturing(
      enterpriseId, page, limit, search, status,
    );
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Get single manufacturing purchase order by ID' })
  @RequirePermission('orders', 'manufacturing', 'view')
  async getPurchaseOrderById(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getPurchaseOrderById(id, enterpriseId);
  }

  @Post('purchase-orders/:id/send-for-approval')
  @ApiOperation({ summary: 'Send PO for inventory approval (creates material request)' })
  @RequirePermission('orders', 'manufacturing', 'create')
  async sendForApproval(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: SendForApprovalDto,
  ) {
    return this.manufacturingService.sendForApproval(id, enterpriseId, dto);
  }

  @Put('purchase-orders/:id/details')
  @ApiOperation({ summary: 'Update manufacturing details (items, priority, notes, delivery date)' })
  @RequirePermission('orders', 'manufacturing', 'edit')
  async updateManufacturingDetails(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() dto: UpdateManufacturingDetailsDto,
  ) {
    return this.manufacturingService.updateManufacturingDetails(id, enterpriseId, dto);
  }

  @Post('purchase-orders/:id/start-production-item')
  @ApiOperation({ summary: 'Start production for a specific PO item (creates job card & starts immediately)' })
  @RequirePermission('orders', 'manufacturing', 'create')
  async startProductionForItem(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('itemId', ParseIntPipe) itemId: number,
    @Body('force') force?: boolean,
  ) {
    return this.manufacturingService.startProductionForItem(id, itemId, enterpriseId, user?.id, force);
  }

  @Post('purchase-orders/:id/request-inventory-item')
  @ApiOperation({ summary: 'Re-request inventory approval for a specific PO item' })
  @RequirePermission('orders', 'manufacturing', 'create')
  async requestInventoryForItem(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.manufacturingService.requestInventoryForItem(id, itemId, enterpriseId, user?.id);
  }

  // ========== Bill of Materials (BOM) ==========

  @Post('bom')
  @ApiOperation({ summary: 'Create BOM from a purchase order' })
  @RequirePermission('orders', 'bom', 'create')
  async createBom(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateBomDto,
  ) {
    return this.manufacturingService.createBom(enterpriseId, createDto);
  }

  @Get('bom/shortage-items')
  @ApiOperation({ summary: 'Get all BOM items with shortage status' })
  @RequirePermission('orders', 'bom', 'view')
  async getShortageItems(
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getShortageItems(enterpriseId);
  }

  @Get('bom/:id')
  @ApiOperation({ summary: 'Get BOM by ID with stock availability' })
  @RequirePermission('orders', 'bom', 'view')
  async getBom(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getBomById(id, enterpriseId);
  }

  @Get('purchase-orders/:poId/bom')
  @ApiOperation({ summary: 'Get first BOM for a purchase order (back-compat)' })
  @RequirePermission('orders', 'bom', 'view')
  async getBomByPo(
    @Param('poId', ParseIntPipe) poId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getBomByPurchaseOrder(poId, enterpriseId);
  }

  @Get('purchase-orders/:poId/boms')
  @ApiOperation({ summary: 'Get all BOMs for a purchase order (one per product)' })
  @RequirePermission('orders', 'bom', 'view')
  async getBomsByPo(
    @Param('poId', ParseIntPipe) poId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getBomsByPurchaseOrder(poId, enterpriseId);
  }

  @Post('bom/:id/check-stock')
  @ApiOperation({ summary: 'Re-check stock availability for BOM items' })
  @RequirePermission('orders', 'bom', 'view')
  async checkBomStock(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.checkBomStock(id, enterpriseId);
  }

  @Put('bom/:id/items')
  @ApiOperation({ summary: 'Replace materials on an existing BOM (blocked once job cards exist)' })
  @RequirePermission('orders', 'bom', 'edit')
  async updateBomItems(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: { items: Array<{ rawMaterialId?: number; itemName: string; requiredQuantity: number; unitOfMeasure?: string; notes?: string; sortOrder?: number }> },
  ) {
    return this.manufacturingService.updateBomItems(id, enterpriseId, body.items);
  }

  @Post('bom/:bomId/job-cards')
  @ApiOperation({ summary: 'Create job card from BOM with optional custom materials' })
  @RequirePermission('orders', 'bom', 'create')
  async createJobCardsFromBom(
    @Param('bomId', ParseIntPipe) bomId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() body: { jobCards: Array<{
      stageMasterId?: number;
      assignedTo?: number;
      quantity?: number;
      startDate?: string;
      expectedCompletion?: string;
      priority?: number;
      notes?: string;
    }>; customMaterials?: Array<{
      rawMaterialId?: number;
      itemName: string;
      requiredQuantity: number;
      unitOfMeasure?: string;
    }> },
  ) {
    return this.manufacturingService.createJobCardsFromBom(bomId, enterpriseId, body.jobCards, body.customMaterials);
  }

  @Get('bom/:bomId/job-cards')
  @ApiOperation({ summary: 'Get job cards linked to a BOM' })
  @RequirePermission('orders', 'bom', 'view')
  async getJobCardsForBom(
    @Param('bomId', ParseIntPipe) bomId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getBomById(bomId, enterpriseId);
  }

  @Delete('bom/:id')
  @ApiOperation({ summary: 'Delete a BOM (only if no linked job cards)' })
  @RequirePermission('orders', 'bom', 'delete')
  async deleteBom(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.deleteBom(id, enterpriseId);
  }

  // ========== Job Cards ==========

  @Get('jobs')
  @ApiOperation({ summary: 'Get all job cards' })
  @RequirePermission('orders', 'job_cards', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiQuery({ name: 'myTeam', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: number,
    @Query('purchaseOrderId') purchaseOrderId?: number,
    @Query('myTeam') myTeam?: string,
  ) {
    return this.manufacturingService.findAll(
      enterpriseId,
      page,
      limit,
      search,
      status,
      assignedTo,
      purchaseOrderId,
      user?.id,
      myTeam === 'true',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all job cards (alias)' })
  @RequirePermission('orders', 'job_cards', 'view')
  async findAllAlias(@EnterpriseId() enterpriseId: number) {
    return this.manufacturingService.findAll(enterpriseId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job card by ID' })
  @RequirePermission('orders', 'job_cards', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.findOne(id, enterpriseId);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new job card with materials (saves materials, does not auto-send for approval)' })
  @RequirePermission('orders', 'job_cards', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateJobCardDto,
  ) {
    return this.manufacturingService.create(enterpriseId, createDto, user?.id);
  }

  @Post('jobs/:id/send-for-approval')
  @ApiOperation({ summary: 'Send job card materials for inventory approval (creates material request)' })
  @RequirePermission('orders', 'job_cards', 'approve')
  async sendJobCardForApproval(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.manufacturingService.sendJobCardForApproval(id, enterpriseId, user?.id);
  }

  @Post('jobs/from-template/:templateId')
  @ApiOperation({ summary: 'Create job card from template' })
  @RequirePermission('orders', 'job_cards', 'create')
  async createFromTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateJobCardDto,
  ) {
    return this.manufacturingService.createJobFromTemplate(enterpriseId, templateId, createDto);
  }

  @Put('jobs/:id')
  @ApiOperation({ summary: 'Update a job card' })
  @RequirePermission('orders', 'job_cards', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateJobCardDto>,
  ) {
    return this.manufacturingService.update(id, enterpriseId, updateDto);
  }

  @Put('jobs/:id/status')
  @ApiOperation({ summary: 'Update job card status (with strict transition validation)' })
  @RequirePermission('orders', 'job_cards', 'edit')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('status') status: string,
    @Body('force') force?: boolean,
  ) {
    return this.manufacturingService.updateStatus(id, enterpriseId, status, user?.id, !!force);
  }

  @Put('jobs/:id/estimate')
  @ApiOperation({ summary: 'Set production estimate (days) during stock verification' })
  @RequirePermission('orders', 'job_cards', 'edit')
  async setEstimate(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('estimatedProductionDays') estimatedProductionDays: number,
  ) {
    return this.manufacturingService.setEstimate(id, estimatedProductionDays, enterpriseId, user?.id);
  }

  @Post('jobs/:id/recheck-materials')
  @ApiOperation({ summary: 'Recheck material status — auto-issues insufficient items if stock is now available' })
  @RequirePermission('orders', 'job_cards', 'create')
  async recheckMaterials(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.manufacturingService.recheckMaterialStatus(id, enterpriseId, user?.id);
  }

  @Post('jobs/:id/verify-stock')
  @ApiOperation({ summary: 'Verify stock availability — transitions to in_process or stock_not_available' })
  @RequirePermission('orders', 'job_cards', 'create')
  async verifyStock(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() body: { hasStock: boolean; shortageNotes?: string },
  ) {
    return this.manufacturingService.verifyStock(id, body, enterpriseId, user?.id);
  }

  @Post('jobs/:id/progress')
  @ApiOperation({ summary: 'Add a daily progress update to a job card' })
  @RequirePermission('orders', 'job_cards', 'create')
  async addProgress(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() body: { progressDate: string; quantityCompleted: number; remarks?: string },
  ) {
    return this.manufacturingService.addProgressUpdate(id, body, enterpriseId, user?.id);
  }

  @Get('jobs/:id/progress')
  @ApiOperation({ summary: 'Get progress history for a job card' })
  @RequirePermission('orders', 'job_cards', 'view')
  async getProgress(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getProgressHistory(id, enterpriseId);
  }

  @Post('jobs/:id/dispatch-action')
  @ApiOperation({ summary: 'Perform a dispatch action: approve | dispatch | hold | unhold | request_modification' })
  @RequirePermission('orders', 'job_cards', 'approve')
  async dispatchAction(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('action') action: 'approve' | 'dispatch' | 'hold' | 'unhold' | 'request_modification',
    @Body('remarks') remarks?: string,
    @Body('dispatchDate') dispatchDate?: string,
  ) {
    return this.manufacturingService.dispatchAction(id, action, enterpriseId, user?.id, remarks, dispatchDate);
  }

  @Post('jobs/:id/move-stage')
  @ApiOperation({ summary: 'Complete current stage and move to next (dynamic from stage masters)' })
  @RequirePermission('orders', 'job_cards', 'create')
  async moveToNextStage(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('notes') notes?: string,
    @Body('completedDate') completedDate?: string,
    @Body('description') description?: string,
  ) {
    return this.manufacturingService.completeCurrentStage(id, enterpriseId, user?.id, notes, completedDate, description);
  }

  @Post('jobs/:id/complete-stage')
  @ApiOperation({ summary: 'Complete current stage and activate next (alias)' })
  @RequirePermission('orders', 'job_cards', 'create')
  async completeStage(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body('notes') notes?: string,
    @Body('completedDate') completedDate?: string,
    @Body('description') description?: string,
  ) {
    return this.manufacturingService.completeCurrentStage(id, enterpriseId, user?.id, notes, completedDate, description);
  }

  @Get('jobs/:id/stage-history')
  @ApiOperation({ summary: 'Get production stage history for a job card' })
  @RequirePermission('orders', 'job_cards', 'view')
  async getStageHistory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getStageHistory(id, enterpriseId);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete a job card' })
  @RequirePermission('orders', 'job_cards', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.delete(id, enterpriseId);
  }

  @Get('bom-raw-materials')
  @ApiOperation({ summary: 'Get raw materials list for BOM creation' })
  @RequirePermission('orders', 'bom', 'view')
  async getBomRawMaterials(@EnterpriseId() enterpriseId: number) {
    return this.manufacturingService.getRawMaterialsForBom(enterpriseId);
  }

  // ========== Process Stages ==========

  @Get('jobs/:jobId/stages')
  @ApiOperation({ summary: 'Get all stages for a job card' })
  @RequirePermission('orders', 'job_cards', 'view')
  async getStages(
    @Param('jobId', ParseIntPipe) jobId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.getStages(jobId, enterpriseId);
  }

  @Post('jobs/:jobId/stages')
  @ApiOperation({ summary: 'Add a stage to a job card' })
  @RequirePermission('orders', 'job_cards', 'create')
  async addStage(
    @Param('jobId', ParseIntPipe) jobId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() stageData: any,
  ) {
    return this.manufacturingService.addStage(enterpriseId, jobId, stageData);
  }

  @Put('stages/:stageId')
  @ApiOperation({ summary: 'Update a process stage' })
  @RequirePermission('orders', 'job_cards', 'edit')
  async updateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: UpdateStageDto,
  ) {
    return this.manufacturingService.updateStage(stageId, enterpriseId, updateDto);
  }

  @Delete('stages/:stageId')
  @ApiOperation({ summary: 'Delete a process stage' })
  @RequirePermission('orders', 'job_cards', 'delete')
  async deleteStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.deleteStage(stageId, enterpriseId);
  }

  // ========== Process Templates ==========

  @Get('templates')
  @ApiOperation({ summary: 'Get all process templates' })
  @RequirePermission('orders', 'manufacturing', 'view')
  @ApiQuery({ name: 'productId', required: false })
  async findAllTemplates(
    @EnterpriseId() enterpriseId: number,
    @Query('productId') productId?: number,
  ) {
    return this.manufacturingService.findAllTemplates(enterpriseId, productId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a process template' })
  @RequirePermission('orders', 'manufacturing', 'create')
  async createTemplate(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateProcessTemplateDto,
  ) {
    return this.manufacturingService.createTemplate(enterpriseId, createDto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a process template' })
  @RequirePermission('orders', 'manufacturing', 'edit')
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateProcessTemplateDto>,
  ) {
    return this.manufacturingService.updateTemplate(id, enterpriseId, updateDto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete a process template' })
  @RequirePermission('orders', 'manufacturing', 'delete')
  async deleteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.manufacturingService.deleteTemplate(id, enterpriseId);
  }
}

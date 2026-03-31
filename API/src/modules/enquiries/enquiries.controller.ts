import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EnquiriesService } from './enquiries.service';
import { EnterpriseId, CurrentUser, RequirePermission, DataStartDate, OwnDataOnly, CurrentUserId } from '../../common/decorators';
import { CreateEnquiryDto, CreateFollowupDto, FollowupOutcomeDto } from './dto';

@ApiTags('Enquiries')
@Controller('enquiries')
@ApiBearerAuth('JWT-auth')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all enquiries' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'interestStatus', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @DataStartDate() dataStartDate: Date | null,
    @OwnDataOnly() ownDataOnly: boolean,
    @CurrentUserId() currentUserId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('interestStatus') interestStatus?: string,
    @Query('assignedTo') assignedTo?: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.enquiriesService.findAll(
      enterpriseId,
      page,
      limit,
      search,
      interestStatus,
      assignedTo,
      fromDate,
      toDate,
      dataStartDate,
      ownDataOnly,
      currentUserId,
    );
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's followups" })
  @ApiQuery({ name: 'assignedTo', required: false })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getTodayFollowups(
    @EnterpriseId() enterpriseId: number,
    @Query('assignedTo') assignedTo?: number,
  ) {
    return this.enquiriesService.getTodayFollowups(enterpriseId, assignedTo);
  }

  @Get('today-followups')
  @ApiOperation({ summary: 'Get all pending followups (overdue + today + upcoming)' })
  @ApiQuery({ name: 'assignedTo', required: false })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getAllPendingFollowups(
    @EnterpriseId() enterpriseId: number,
    @Query('assignedTo') assignedTo?: number,
  ) {
    return this.enquiriesService.getAllPendingFollowups(enterpriseId, assignedTo);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue followups' })
  @ApiQuery({ name: 'assignedTo', required: false })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getOverdueFollowups(
    @EnterpriseId() enterpriseId: number,
    @Query('assignedTo') assignedTo?: number,
  ) {
    return this.enquiriesService.getOverdueFollowups(enterpriseId, assignedTo);
  }

  @Get('prospects')
  @ApiOperation({ summary: 'Get all prospects' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getProspects(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.enquiriesService.getProspects(enterpriseId, page, limit);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getPipelineStats(@EnterpriseId() enterpriseId: number) {
    return this.enquiriesService.getPipelineStats(enterpriseId);
  }

  @Get(':id/quotations')
  @ApiOperation({ summary: 'Get all quotations linked to an enquiry' })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getQuotationsByEnquiry(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.enquiriesService.getQuotationsByEnquiry(id, enterpriseId);
  }

  @Get('check-mobile')
  @ApiOperation({ summary: 'Check if mobile number already exists in enquiries' })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async checkMobile(
    @Query('mobile') mobile: string,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.enquiriesService.checkMobile(mobile, enterpriseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enquiry by ID' })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.enquiriesService.findOne(id, enterpriseId);
  }

  @Get(':id/followups')
  @ApiOperation({ summary: 'Get all followups for an enquiry' })
  @RequirePermission('enquiry', 'enquiries', 'view')
  async getFollowups(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.enquiriesService.getFollowups(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new enquiry' })
  @RequirePermission('enquiry', 'enquiries', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateEnquiryDto,
  ) {
    return this.enquiriesService.create(enterpriseId, createDto, user);
  }

  @Post(':id/followups')
  @ApiOperation({ summary: 'Add a followup to an enquiry' })
  @RequirePermission('enquiry', 'enquiries', 'create')
  async addFollowup(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreateFollowupDto,
  ) {
    createDto.enquiryId = id;
    return this.enquiriesService.addFollowup(enterpriseId, createDto, user?.id);
  }

  @Post(':id/outcome')
  @ApiOperation({ summary: 'Submit follow-up outcome after calling a lead' })
  @RequirePermission('enquiry', 'enquiries', 'create')
  async submitFollowupOutcome(
    @Param('id', ParseIntPipe) enquiryId: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() dto: FollowupOutcomeDto,
  ) {
    return this.enquiriesService.updateFollowupOutcome(enquiryId, enterpriseId, dto, user?.id);
  }

  @Patch('followups/:followupId')
  @ApiOperation({ summary: 'Update a followup' })
  @RequirePermission('enquiry', 'enquiries', 'edit')
  async updateFollowup(
    @Param('followupId', ParseIntPipe) followupId: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateFollowupDto>,
  ) {
    return this.enquiriesService.updateFollowup(followupId, enterpriseId, updateDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an enquiry' })
  @RequirePermission('enquiry', 'enquiries', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
    @Body() updateDto: Partial<CreateEnquiryDto>,
  ) {
    return this.enquiriesService.update(id, enterpriseId, updateDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an enquiry' })
  @RequirePermission('enquiry', 'enquiries', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @CurrentUser() user: any,
  ) {
    return this.enquiriesService.delete(id, enterpriseId, user);
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Public()
  @Post('login')
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto);
  }

  @UseGuards(SuperAdminGuard)
  @Get('dashboard')
  getDashboard() {
    return this.superAdminService.getDashboard();
  }

  @UseGuards(SuperAdminGuard)
  @Get('enterprises')
  getAllEnterprises() {
    return this.superAdminService.getAllEnterprises();
  }

  @UseGuards(SuperAdminGuard)
  @Post('enterprises')
  createEnterprise(@Body() body: CreateEnterpriseDto) {
    return this.superAdminService.createEnterprise(body);
  }

  @UseGuards(SuperAdminGuard)
  @Get('enterprises/:id/financials')
  getEnterpriseFinancials(
    @Param('id', ParseIntPipe) id: number,
    @Query('period') period: string = '30d',
  ) {
    return this.superAdminService.getEnterpriseFinancials(id, period);
  }

  @UseGuards(SuperAdminGuard)
  @Get('enterprises/:id/payment')
  getEnterprisePayment(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.getEnterprisePayment(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('enterprises/:id/approve')
  approveEnterprise(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.approveEnterprise(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('enterprises/:id/reject')
  rejectEnterprise(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.rejectEnterprise(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('enterprises/:id')
  getEnterprise(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.getEnterprise(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('enterprises/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.superAdminService.updateStatus(id, status);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('enterprises/:id/expiry')
  updateExpiry(
    @Param('id', ParseIntPipe) id: number,
    @Body('expiryDate') expiryDate: string,
  ) {
    return this.superAdminService.updateExpiry(id, expiryDate);
  }

  // ─── Module 1: Employees ─────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('employees')
  getAllEmployees() {
    return this.superAdminService.getAllEmployees();
  }

  @UseGuards(SuperAdminGuard)
  @Get('employees/stats')
  getEmployeeStats() {
    return this.superAdminService.getEmployeeStats();
  }

  // ─── Module 2: Accounts ───────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('accounts')
  getPlatformAccounts(@Query('period') period: string = '30d') {
    return this.superAdminService.getPlatformAccounts(period);
  }

  // ─── Module 3: Support ────────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('support/stats')
  getTicketStats() {
    return this.superAdminService.getTicketStats();
  }

  @Public()
  @Post('support/submit')
  submitTicket(
    @Body()
    body: {
      enterpriseId: number;
      subject: string;
      message: string;
      category: string;
      priority: string;
    },
  ) {
    return this.superAdminService.submitTicket(body);
  }

  @UseGuards(SuperAdminGuard)
  @Get('support')
  getAllTickets(@Query('status') status?: string) {
    return this.superAdminService.getAllTickets(status);
  }

  @UseGuards(SuperAdminGuard)
  @Get('support/:id')
  getTicket(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.getTicket(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('support/:id/reply')
  replyToTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body('reply') reply: string,
    @Body('status') status: string,
  ) {
    return this.superAdminService.replyToTicket(id, reply, status);
  }

  // ─── Module 4: Subscriptions ──────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('subscriptions/plans')
  getSubscriptionPlans() {
    return this.superAdminService.getSubscriptionPlans();
  }

  @UseGuards(SuperAdminGuard)
  @Post('subscriptions/plans')
  createPlan(
    @Body()
    body: {
      name: string;
      description?: string;
      price: number;
      durationDays: number;
      maxEmployees: number;
      features?: string;
    },
  ) {
    return this.superAdminService.createPlan(body);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('subscriptions/plans/:id')
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: number;
      durationDays?: number;
      maxEmployees?: number;
      features?: string;
    },
  ) {
    return this.superAdminService.updatePlan(id, body);
  }

  @UseGuards(SuperAdminGuard)
  @Delete('subscriptions/plans/:id')
  deletePlan(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.deletePlan(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('subscriptions/enterprises')
  getEnterpriseSubscriptions() {
    return this.superAdminService.getEnterpriseSubscriptions();
  }

  @UseGuards(SuperAdminGuard)
  @Post('subscriptions/assign')
  assignPlan(
    @Body('enterpriseId') enterpriseId: number,
    @Body('planId') planId: number,
  ) {
    return this.superAdminService.assignPlan(enterpriseId, planId);
  }
}

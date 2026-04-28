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
import { ResellersService } from '../resellers/resellers.service';
import { CreateResellerDto } from '../resellers/dto/create-reseller.dto';
import { SetPlanPricingDto } from '../resellers/dto/set-plan-pricing.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly resellersService: ResellersService,
  ) {}

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
  @Get('analytics')
  getAnalytics() {
    return this.superAdminService.getAnalytics();
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
  @Patch('enterprises/:id/lock')
  lockEnterprise(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.lockProfile(id, 'enterprise');
  }

  @UseGuards(SuperAdminGuard)
  @Patch('enterprises/:id/unlock')
  unlockEnterprise(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.unlockProfile(id, 'enterprise');
  }

  @UseGuards(SuperAdminGuard)
  @Patch('enterprises/:id/task-visibility')
  updateTaskVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body('unrestricted') unrestricted: boolean,
  ) {
    return this.superAdminService.updateTaskVisibility(id, unrestricted);
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

  // Generic partial update for enterprise profile fields (business name,
  // contact, address, GST/CIN, website, etc.). Used by the Edit drawer on
  // the super-admin enterprises list.
  @UseGuards(SuperAdminGuard)
  @Patch('enterprises/:id')
  updateEnterprise(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.superAdminService.updateEnterpriseProfile(id, body);
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
      durationDays?: number;
      durationType?: string;
      durationValue?: number;
      maxEmployees: number;
      features?: string;
      numberOfServicesAllowed?: number;
      serviceIds?: number[];
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
      durationType?: string;
      durationValue?: number;
      maxEmployees?: number;
      features?: string;
      numberOfServicesAllowed?: number;
      serviceIds?: number[];
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
    @Body('couponCode') couponCode?: string,
  ) {
    return this.superAdminService.assignPlan(enterpriseId, planId, couponCode);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('enterprises/:id/reseller')
  reassignReseller(
    @Param('id', ParseIntPipe) id: number,
    @Body('resellerId') resellerId: number | null,
  ) {
    return this.superAdminService.reassignReseller(id, resellerId ?? null);
  }

  // ─── Resellers (super admin views/manages) ────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('resellers')
  listResellers() {
    return this.resellersService.findAll();
  }

  @UseGuards(SuperAdminGuard)
  @Post('resellers')
  createReseller(@Body() body: CreateResellerDto) {
    return this.resellersService.create(body);
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers/:id')
  getResellerDetail(@Param('id', ParseIntPipe) id: number) {
    return this.resellersService.findOne(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('resellers/:id/status')
  updateResellerStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.resellersService.updateStatus(id, status);
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers/:id/wallet')
  getResellerWallet(@Param('id', ParseIntPipe) id: number) {
    return this.resellersService.getWalletByResellerId(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('resellers/:id/wallet/credit')
  creditResellerWallet(
    @Param('id', ParseIntPipe) id: number,
    @Body('amount') amount: number,
    @Body('description') description?: string,
  ) {
    return this.resellersService.creditWallet(id, amount, description);
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers/:id/tenants')
  getResellerTenants(@Param('id', ParseIntPipe) id: number) {
    return this.resellersService.getMyTenants(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers/:id/earnings')
  getResellerEarnings(@Param('id', ParseIntPipe) id: number) {
    return this.resellersService.getMyCommissions(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers/:id/plan-pricing')
  getResellerPlanPricing(@Param('id', ParseIntPipe) id: number) {
    return this.resellersService.getPlanPricing(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('resellers/:id/plan-pricing')
  setResellerPlanPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetPlanPricingDto,
  ) {
    return this.resellersService.setPlanPricing(id, body);
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers/:id/report')
  getResellerReport(@Param('id', ParseIntPipe) id: number) {
    return this.resellersService.getReport(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('resellers/:id/assign-plan')
  assignPlanToReseller(
    @Param('id', ParseIntPipe) id: number,
    @Body('planId', ParseIntPipe) planId: number,
  ) {
    return this.resellersService.assignPlanToReseller(id, planId);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('resellers/:id/lock')
  lockReseller(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.lockProfile(id, 'reseller');
  }

  @UseGuards(SuperAdminGuard)
  @Patch('resellers/:id/unlock')
  unlockReseller(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.unlockProfile(id, 'reseller');
  }

  @UseGuards(SuperAdminGuard)
  @Get('resellers-list')
  getAllResellers() {
    return this.superAdminService.getAllResellers();
  }

  @UseGuards(SuperAdminGuard)
  @Get('reseller-subscriptions-overview')
  getResellersSubscriptionsOverview() {
    return this.superAdminService.getResellersSubscriptionsOverview();
  }

  @UseGuards(SuperAdminGuard)
  @Get('reseller-wallets-overview')
  getResellersWalletsOverview() {
    return this.superAdminService.getResellersWalletsOverview();
  }

  // ─── Reseller Plans CRUD ──────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('reseller-plans')
  getResellerPlans() {
    return this.superAdminService.getResellerPlans();
  }

  @UseGuards(SuperAdminGuard)
  @Post('reseller-plans')
  createResellerPlan(@Body() body: {
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    commissionPercentage: number;
    maxTenants?: number;
    features?: string;
  }) {
    return this.superAdminService.createResellerPlan(body);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('reseller-plans/:id')
  updateResellerPlan(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      price?: number;
      durationDays?: number;
      commissionPercentage?: number;
      maxTenants?: number;
      features?: string;
      isActive?: boolean;
    },
  ) {
    return this.superAdminService.updateResellerPlan(Number(id), body);
  }

  @UseGuards(SuperAdminGuard)
  @Delete('reseller-plans/:id')
  deleteResellerPlan(@Param('id') id: string) {
    return this.superAdminService.deleteResellerPlan(Number(id));
  }
}

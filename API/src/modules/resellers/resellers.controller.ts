import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResellersService } from './resellers.service';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { ResellerLoginDto } from './dto/reseller-login.dto';
import { SetPlanPricingDto } from './dto/set-plan-pricing.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ResellerGuard } from '../../common/guards/reseller.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Resellers')
@ApiBearerAuth('JWT-auth')
@Controller()
export class ResellersController {
  constructor(private readonly service: ResellersService) {}

  // ─── Public: Reseller Login ───────────────────────────────────────────────

  @Public()
  @Post('resellers/login')
  login(@Body() dto: ResellerLoginDto) {
    return this.service.login(dto);
  }

  // ─── Reseller Portal ──────────────────────────────────────────────────────

  @UseGuards(ResellerGuard)
  @Get('resellers/me/status')
  getMyStatus(@Request() req: { user: { id: number } }) {
    return this.service.getMyStatus(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/profile')
  getMyProfile(@Request() req: { user: { id: number } }) {
    return this.service.getMyProfile(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Patch('resellers/me/profile')
  updateProfile(
    @Request() req: { user: { id: number } },
    @Body() body: { name?: string; mobile?: string; companyName?: string },
  ) {
    return this.service.updateProfile(req.user.id, body);
  }

  @UseGuards(ResellerGuard)
  @Post('resellers/me/change-password')
  changePassword(
    @Request() req: { user: { id: number } },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.service.changePassword(req.user.id, body);
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────

  @UseGuards(ResellerGuard)
  @Get('resellers/me/wallet')
  getMyWallet(@Request() req: { user: { id: number } }) {
    return this.service.getMyWallet(req.user.id);
  }

  // ─── Own Subscription ─────────────────────────────────────────────────────

  @UseGuards(ResellerGuard)
  @Get('resellers/me/enterprise-plans')
  getEnterprisePlansForReseller(@Request() req: { user: { id: number } }) {
    return this.service.getEnterprisePlansForReseller(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/subscription-plans')
  getMySubscriptionPlans() {
    return this.service.getMySubscriptionPlans();
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/my-subscription')
  getMyCurrentSubscription(@Request() req: { user: { id: number } }) {
    return this.service.getMyCurrentSubscription(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Post('resellers/me/subscribe')
  subscribeToPlan(
    @Request() req: { user: { id: number } },
    @Body('planId', ParseIntPipe) planId: number,
  ) {
    return this.service.subscribeToPlan(req.user.id, planId);
  }

  // ─── Tenant Management ────────────────────────────────────────────────────

  @UseGuards(ResellerGuard)
  @Get('resellers/me/plans')
  getMyPlans(@Request() req: { user: { id: number } }) {
    return this.service.getPlanPricing(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/tenants')
  getMyTenants(@Request() req: { user: { id: number } }) {
    return this.service.getMyTenants(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Post('resellers/me/tenants')
  createTenant(
    @Request() req: { user: { id: number } },
    @Body() body: { businessName: string; email: string; mobile: string; planId: number },
  ) {
    return this.service.createTenant(req.user.id, body);
  }

  @UseGuards(ResellerGuard)
  @Post('resellers/me/tenants/:id/assign-plan')
  assignPlanToTenant(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) enterpriseId: number,
    @Body('planId', ParseIntPipe) planId: number,
  ) {
    return this.service.assignPlanToTenant(req.user.id, enterpriseId, planId);
  }

  @UseGuards(ResellerGuard)
  @Post('resellers/me/tenants/:id/renew')
  renewTenantPlan(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) enterpriseId: number,
    @Body('planId') planId?: number,
  ) {
    return this.service.renewTenantPlan(req.user.id, enterpriseId, planId ? Number(planId) : undefined);
  }

  // ─── Reports & Data ───────────────────────────────────────────────────────

  @UseGuards(ResellerGuard)
  @Get('resellers/me/report')
  getMyReport(@Request() req: { user: { id: number } }) {
    return this.service.getReport(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/subscriptions')
  getMySubscriptions(@Request() req: { user: { id: number } }) {
    return this.service.getMySubscriptions(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/usage')
  getMyUsage(@Request() req: { user: { id: number } }) {
    return this.service.getMyUsage(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/billing')
  getMyBilling(@Request() req: { user: { id: number } }) {
    return this.service.getMyBilling(req.user.id);
  }

  @UseGuards(ResellerGuard)
  @Get('resellers/me/commissions')
  getMyCommissions(@Request() req: { user: { id: number } }) {
    return this.service.getMyCommissions(req.user.id);
  }

  // ─── Super Admin: Reseller Management ────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers')
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(SuperAdminGuard)
  @Post('super-admin/resellers')
  create(@Body() dto: CreateResellerDto) {
    return this.service.create(dto);
  }

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('super-admin/resellers/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(id, status);
  }

  @UseGuards(SuperAdminGuard)
  @Post('super-admin/resellers/:id/plan-pricing')
  setPlanPricing(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPlanPricingDto,
  ) {
    return this.service.setPlanPricing(id, dto);
  }

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers/:id/plan-pricing')
  getPlanPricing(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPlanPricing(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers/:id/report')
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.service.getReport(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers/:id/wallet')
  getResellerWallet(@Param('id', ParseIntPipe) id: number) {
    return this.service.getWalletByResellerId(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('super-admin/resellers/:id/wallet/credit')
  creditResellerWallet(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.service.creditWallet(id, Number(body.amount), body.description);
  }

  @UseGuards(SuperAdminGuard)
  @Post('super-admin/resellers/:id/assign-plan')
  assignPlanToReseller(
    @Param('id', ParseIntPipe) id: number,
    @Body('planId', ParseIntPipe) planId: number,
  ) {
    return this.service.assignPlanToReseller(id, planId);
  }

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers/:id/tenants')
  getResellerTenants(@Param('id', ParseIntPipe) id: number) {
    return this.service.getMyTenants(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('super-admin/resellers/:id/earnings')
  getResellerEarnings(@Param('id', ParseIntPipe) id: number) {
    return this.service.getMyCommissions(id);
  }
}

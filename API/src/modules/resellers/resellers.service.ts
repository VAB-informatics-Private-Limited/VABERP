import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Reseller } from './entities/reseller.entity';
import { ResellerPlanPricing } from './entities/reseller-plan-pricing.entity';
import { SubscriptionPlan } from '../super-admin/entities/subscription-plan.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';
import { ResellerLoginDto } from './dto/reseller-login.dto';
import { SetPlanPricingDto } from './dto/set-plan-pricing.dto';

@Injectable()
export class ResellersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Reseller)
    private resellerRepository: Repository<Reseller>,
    @InjectRepository(ResellerPlanPricing)
    private pricingRepository: Repository<ResellerPlanPricing>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
    private jwtService: JwtService,
  ) {}

  async onApplicationBootstrap() {
    // 1. Create resellers table first
    await this.resellerRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS resellers (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR NOT NULL UNIQUE,
        password VARCHAR NOT NULL,
        mobile VARCHAR NOT NULL,
        company_name VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'active',
        created_date TIMESTAMP NOT NULL DEFAULT now(),
        updated_date TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // 2. Add subscription columns to resellers (idempotent)
    await this.resellerRepository.manager.query(`
      ALTER TABLE resellers ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES subscription_plans(id)
    `);
    await this.resellerRepository.manager.query(`
      ALTER TABLE resellers ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ
    `);
    await this.resellerRepository.manager.query(`
      ALTER TABLE resellers ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ
    `);

    // 3. Create reseller_plan_pricing table (references resellers)
    await this.resellerRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS reseller_plan_pricing (
        id SERIAL PRIMARY KEY,
        reseller_id INTEGER NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
        plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
        reseller_price DECIMAL(10,2) NOT NULL,
        created_date TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(reseller_id, plan_id)
      )
    `);

    // 4. Wallet tables
    await this.resellerRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS reseller_wallets (
        id SERIAL PRIMARY KEY,
        reseller_id INTEGER UNIQUE NOT NULL REFERENCES resellers(id),
        balance DECIMAL(10,2) NOT NULL DEFAULT 0,
        updated_date TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.resellerRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS reseller_wallet_transactions (
        id SERIAL PRIMARY KEY,
        reseller_id INTEGER NOT NULL REFERENCES resellers(id),
        type VARCHAR(10) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_type VARCHAR(30),
        reference_id INTEGER,
        created_date TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 5. Add reseller_id FK to enterprises (resellers table now exists)
    await this.resellerRepository.manager.query(`
      ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS reseller_id INTEGER REFERENCES resellers(id)
    `);

    // 6. Create dedicated reseller_plans table (separate from enterprise subscription_plans)
    await this.resellerRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS reseller_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 30,
        commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
        max_tenants INTEGER,
        features TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_date TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 7. Add reseller_plan_id column to resellers (references new reseller_plans table)
    await this.resellerRepository.manager.query(`
      ALTER TABLE resellers ADD COLUMN IF NOT EXISTS reseller_plan_id INTEGER REFERENCES reseller_plans(id)
    `);
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async login(dto: ResellerLoginDto) {
    const reseller = await this.resellerRepository
      .createQueryBuilder('reseller')
      .addSelect('reseller.password')
      .where('reseller.email = :email', { email: dto.email })
      .getOne();
    if (!reseller) throw new UnauthorizedException('Invalid email or password');
    if (reseller.status !== 'active') throw new UnauthorizedException('Account is inactive');

    const isValid = await bcrypt.compare(dto.password, reseller.password);
    if (!isValid) throw new UnauthorizedException('Invalid email or password');

    const token = this.jwtService.sign({
      sub: reseller.id,
      email: reseller.email,
      type: 'reseller',
    });

    return {
      message: 'Login successful',
      data: {
        reseller: {
          id: reseller.id,
          name: reseller.name,
          email: reseller.email,
          companyName: reseller.companyName,
          planId: reseller.resellerPlanId,
          expiryDate: reseller.expiryDate,
          subscriptionStatus: this.computeSubscriptionStatus(reseller.resellerPlanId, reseller.expiryDate),
          isLocked: reseller.isLocked ?? false,
        },
        token,
        type: 'reseller',
      },
    };
  }

  async getMyStatus(resellerId: number) {
    const reseller = await this.resellerRepository.findOne({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Reseller not found');
    return {
      message: 'Status fetched',
      data: {
        subscriptionStatus: this.computeSubscriptionStatus(reseller.resellerPlanId, reseller.expiryDate),
        expiryDate: reseller.expiryDate,
        planId: reseller.resellerPlanId,
      },
    };
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  async findAll() {
    const resellers = await this.resellerRepository.find({ order: { createdDate: 'DESC' } });
    return { message: 'Resellers fetched', data: resellers };
  }

  async findOne(id: number) {
    const reseller = await this.resellerRepository.findOne({ where: { id } });
    if (!reseller) throw new NotFoundException('Reseller not found');
    return { message: 'Reseller fetched', data: reseller };
  }

  async create(dto: CreateResellerDto) {
    const existing = await this.resellerRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const reseller = this.resellerRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      mobile: dto.mobile,
      companyName: dto.companyName ?? null,
      status: 'active',
    });
    await this.resellerRepository.save(reseller);

    const { password: _pw, ...safe } = reseller as Reseller & { password: string };
    return { message: 'Reseller created', data: safe };
  }

  async updateStatus(id: number, status: string) {
    const reseller = await this.resellerRepository.findOne({ where: { id } });
    if (!reseller) throw new NotFoundException('Reseller not found');
    await this.resellerRepository.update(id, { status });
    return { message: `Reseller ${status} successfully` };
  }

  async updateProfile(resellerId: number, dto: { name?: string; mobile?: string; companyName?: string }) {
    await this.resellerRepository.manager.query(
      `UPDATE resellers SET
         name = COALESCE($1, name),
         mobile = COALESCE($2, mobile),
         company_name = COALESCE($3, company_name),
         updated_date = NOW()
       WHERE id = $4`,
      [dto.name ?? null, dto.mobile ?? null, dto.companyName ?? null, resellerId],
    );
    return this.getMyProfile(resellerId);
  }

  async changePassword(resellerId: number, dto: { currentPassword: string; newPassword: string }) {
    const reseller = await this.resellerRepository
      .createQueryBuilder('reseller')
      .addSelect('reseller.password')
      .where('reseller.id = :id', { id: resellerId })
      .getOne();
    if (!reseller) throw new NotFoundException('Reseller not found');

    const isValid = await bcrypt.compare(dto.currentPassword, reseller.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.resellerRepository.update(resellerId, { password: hashed } as any);
    return { message: 'Password changed successfully' };
  }

  // ─── Plan Pricing ─────────────────────────────────────────────────────────

  async setPlanPricing(resellerId: number, dto: SetPlanPricingDto) {
    const reseller = await this.resellerRepository.findOne({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Reseller not found');

    const plan = await this.planRepository.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    if (Number(dto.resellerPrice) >= Number(plan.price)) {
      throw new BadRequestException('Reseller price must be less than the plan price');
    }

    await this.resellerRepository.manager.query(
      `INSERT INTO reseller_plan_pricing (reseller_id, plan_id, reseller_price)
       VALUES ($1, $2, $3)
       ON CONFLICT (reseller_id, plan_id) DO UPDATE SET reseller_price = EXCLUDED.reseller_price`,
      [resellerId, dto.planId, dto.resellerPrice],
    );

    return { message: 'Plan pricing set successfully' };
  }

  async getPlanPricing(resellerId: number) {
    const rows: Array<{
      id: number;
      plan_id: number;
      plan_name: string;
      business_price: string;
      reseller_price: string;
      created_date: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT rpp.id, rpp.plan_id, sp.name as plan_name,
              sp.price as business_price, rpp.reseller_price, rpp.created_date
       FROM reseller_plan_pricing rpp
       INNER JOIN subscription_plans sp ON sp.id = rpp.plan_id
       WHERE rpp.reseller_id = $1
       ORDER BY sp.price ASC`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      planId: r.plan_id,
      planName: r.plan_name,
      businessPrice: parseFloat(r.business_price) || 0,
      resellerPrice: parseFloat(r.reseller_price) || 0,
      createdDate: r.created_date,
    }));

    return { message: 'Plan pricing fetched', data };
  }

  // ─── Enterprise Plans for Reseller (for tenant assignment dropdown) ─────────

  async getEnterprisePlansForReseller(resellerId: number) {
    const rows: Array<{
      id: number;
      name: string;
      description: string | null;
      business_price: string;
      my_price: string;
      duration_days: number;
      max_employees: number | null;
      features: string | null;
    }> = await this.resellerRepository.manager.query(
      `SELECT sp.id, sp.name, sp.description, sp.price AS business_price,
              COALESCE(rpp.reseller_price, sp.price) AS my_price,
              sp.duration_days, sp.max_employees, sp.features
       FROM subscription_plans sp
       LEFT JOIN reseller_plan_pricing rpp ON rpp.plan_id = sp.id AND rpp.reseller_id = $1
       WHERE sp.is_active = true
       ORDER BY sp.price ASC`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      businessPrice: parseFloat(r.business_price) || 0,
      myPrice: parseFloat(r.my_price) || 0,
      durationDays: r.duration_days,
      maxEmployees: r.max_employees,
      features: r.features,
    }));

    return { message: 'Enterprise plans fetched', data };
  }

  // ─── Reseller Own Subscription ────────────────────────────────────────────

  async getMySubscriptionPlans() {
    const rows: Array<{
      id: number;
      name: string;
      description: string | null;
      price: string;
      duration_days: number;
      commission_percentage: string;
      max_tenants: number | null;
      features: string | null;
    }> = await this.resellerRepository.manager.query(
      `SELECT id, name, description, price, duration_days, commission_percentage, max_tenants, features
       FROM reseller_plans
       WHERE is_active = true
       ORDER BY price ASC`,
    );

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: parseFloat(r.price) || 0,
      durationDays: r.duration_days,
      commissionPercentage: parseFloat(r.commission_percentage) || 0,
      maxTenants: r.max_tenants,
      features: r.features,
    }));

    return { message: 'Reseller plans fetched', data };
  }

  async getMyCurrentSubscription(resellerId: number) {
    const rows: Array<{
      reseller_plan_id: number | null;
      subscription_start_date: string | null;
      expiry_date: string | null;
      plan_name: string | null;
      commission_percentage: string | null;
      duration_days: number | null;
    }> = await this.resellerRepository.manager.query(
      `SELECT r.reseller_plan_id, r.subscription_start_date, r.expiry_date,
              rp.name AS plan_name, rp.commission_percentage, rp.duration_days
       FROM resellers r
       LEFT JOIN reseller_plans rp ON rp.id = r.reseller_plan_id
       WHERE r.id = $1`,
      [resellerId],
    );
    if (!rows.length) throw new NotFoundException('Reseller not found');
    const row = rows[0];

    return {
      message: 'Subscription fetched',
      data: {
        planId: row.reseller_plan_id,
        planName: row.plan_name,
        commissionPercentage: parseFloat(row.commission_percentage ?? '0') || 0,
        durationDays: row.duration_days,
        subscriptionStartDate: row.subscription_start_date,
        expiryDate: row.expiry_date,
        subscriptionStatus: this.computeSubscriptionStatus(row.reseller_plan_id, row.expiry_date ? new Date(row.expiry_date) : null),
      },
    };
  }

  async subscribeToPlan(resellerId: number, planId: number) {
    const planRows: Array<{
      id: number; name: string; price: string; duration_days: number;
    }> = await this.resellerRepository.manager.query(
      `SELECT id, name, price, duration_days FROM reseller_plans WHERE id = $1 AND is_active = true`,
      [planId],
    );
    if (!planRows.length) throw new NotFoundException('Reseller plan not found or inactive');
    const plan = planRows[0];
    const planPrice = parseFloat(plan.price);

    // Check wallet balance
    const walletRows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT COALESCE(balance, 0) AS balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );
    const currentBalance = walletRows.length > 0 ? parseFloat(walletRows[0].balance) : 0;

    if (currentBalance < planPrice) {
      throw new BadRequestException(`Insufficient wallet balance. Required: ₹${planPrice}, Available: ₹${currentBalance}`);
    }

    const newBalance = currentBalance - planPrice;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

    // Deduct wallet
    await this.resellerRepository.manager.query(
      `UPDATE reseller_wallets SET balance = $1, updated_date = NOW() WHERE reseller_id = $2`,
      [newBalance, resellerId],
    );

    // Record transaction
    await this.resellerRepository.manager.query(
      `INSERT INTO reseller_wallet_transactions (reseller_id, type, amount, balance_after, description, reference_type)
       VALUES ($1, 'debit', $2, $3, $4, 'own_subscription')`,
      [resellerId, planPrice, newBalance, `Subscribed to reseller plan: ${plan.name}`],
    );

    // Update reseller subscription using new reseller_plan_id column
    await this.resellerRepository.manager.query(
      `UPDATE resellers SET reseller_plan_id = $1, subscription_start_date = NOW(), expiry_date = $2, status = 'active', updated_date = NOW() WHERE id = $3`,
      [planId, expiryDate, resellerId],
    );

    return {
      message: 'Subscribed successfully',
      data: { planName: plan.name, expiryDate, walletBalanceAfter: newBalance },
    };
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────

  async getMyWallet(resellerId: number) {
    const walletRows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT COALESCE(balance, 0) AS balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );
    const balance = walletRows.length > 0 ? parseFloat(walletRows[0].balance) : 0;

    const txRows: Array<{
      id: number;
      type: string;
      amount: string;
      balance_after: string;
      description: string | null;
      reference_type: string | null;
      created_date: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT id, type, amount, balance_after, description, reference_type, created_date
       FROM reseller_wallet_transactions
       WHERE reseller_id = $1
       ORDER BY created_date DESC
       LIMIT 50`,
      [resellerId],
    );

    const transactions = txRows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount) || 0,
      balanceAfter: parseFloat(t.balance_after) || 0,
      description: t.description,
      referenceType: t.reference_type,
      createdDate: t.created_date,
    }));

    return { message: 'Wallet fetched', data: { balance, transactions } };
  }

  async creditWallet(resellerId: number, amount: number, description?: string) {
    // UPSERT wallet
    await this.resellerRepository.manager.query(
      `INSERT INTO reseller_wallets (reseller_id, balance) VALUES ($1, $2)
       ON CONFLICT (reseller_id) DO UPDATE SET balance = reseller_wallets.balance + $2, updated_date = NOW()`,
      [resellerId, amount],
    );

    const rows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );
    const newBalance = parseFloat(rows[0].balance) || 0;

    await this.resellerRepository.manager.query(
      `INSERT INTO reseller_wallet_transactions (reseller_id, type, amount, balance_after, description, reference_type)
       VALUES ($1, 'credit', $2, $3, $4, 'top_up')`,
      [resellerId, amount, newBalance, description ?? 'Wallet top-up by admin'],
    );

    return { message: 'Wallet credited successfully', data: { balance: newBalance } };
  }

  async getWalletByResellerId(resellerId: number) {
    return this.getMyWallet(resellerId);
  }

  // ─── Reseller Direct Plan Assignment (by super admin) ─────────────────────

  async assignPlanToReseller(resellerId: number, planId: number) {
    const reseller = await this.resellerRepository.findOne({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Reseller not found');

    const planRows: Array<{ id: number; name: string; duration_days: number }> =
      await this.resellerRepository.manager.query(
        `SELECT id, name, duration_days FROM reseller_plans WHERE id = $1 AND is_active = true`,
        [planId],
      );
    if (!planRows.length) throw new NotFoundException('Reseller plan not found or inactive');
    const plan = planRows[0];

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

    await this.resellerRepository.manager.query(
      `UPDATE resellers SET reseller_plan_id = $1, subscription_start_date = NOW(), expiry_date = $2, status = 'active', updated_date = NOW() WHERE id = $3`,
      [planId, expiryDate, resellerId],
    );

    return {
      message: 'Plan assigned to reseller successfully',
      data: { planName: plan.name, expiryDate },
    };
  }

  // ─── Tenant Management ────────────────────────────────────────────────────

  async createTenant(resellerId: number, dto: { businessName: string; email: string; mobile: string; planId: number }) {
    // Check email not already taken
    const existing = await this.enterpriseRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const plan = await this.planRepository.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    // Get reseller price
    const pricingRows: Array<{ reseller_price: string }> = await this.resellerRepository.manager.query(
      `SELECT reseller_price FROM reseller_plan_pricing WHERE reseller_id = $1 AND plan_id = $2`,
      [resellerId, dto.planId],
    );
    const resellerPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].reseller_price) : Number(plan.price);

    // Check wallet
    await this.checkAndDeductWallet(resellerId, resellerPrice, 'tenant_plan', `Plan for tenant: ${dto.businessName}`);

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    // Create enterprise
    const result: Array<{ id: number }> = await this.resellerRepository.manager.query(
      `INSERT INTO enterprises (business_name, email, mobile, password, status, reseller_id, plan_id, subscription_start_date, expiry_date)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, NOW(), $7)
       RETURNING id`,
      [dto.businessName, dto.email, dto.mobile, hashedPassword, resellerId, dto.planId, expiryDate],
    );
    const enterpriseId = result[0].id;

    // Create platform payment
    await this.resellerRepository.manager.query(
      `INSERT INTO platform_payments (enterprise_id, plan_id, amount, payment_method, status)
       VALUES ($1, $2, $3, 'reseller_wallet', 'verified')`,
      [enterpriseId, dto.planId, plan.price],
    );

    const walletRows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT COALESCE(balance, 0) AS balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );
    const walletBalanceAfter = walletRows.length > 0 ? parseFloat(walletRows[0].balance) : 0;

    return {
      message: 'Tenant created successfully',
      data: {
        enterprise: { id: enterpriseId, businessName: dto.businessName, email: dto.email, tempPassword },
        walletBalanceAfter,
      },
    };
  }

  async assignPlanToTenant(resellerId: number, enterpriseId: number, planId: number) {
    // Verify ownership
    const tenant = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if ((tenant as any).resellerId !== resellerId) throw new BadRequestException('Tenant does not belong to this reseller');

    const plan = await this.planRepository.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    const pricingRows: Array<{ reseller_price: string }> = await this.resellerRepository.manager.query(
      `SELECT reseller_price FROM reseller_plan_pricing WHERE reseller_id = $1 AND plan_id = $2`,
      [resellerId, planId],
    );
    const resellerPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].reseller_price) : Number(plan.price);

    await this.checkAndDeductWallet(resellerId, resellerPrice, 'tenant_plan', `Assign plan to: ${(tenant as any).businessName}`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    await this.resellerRepository.manager.query(
      `UPDATE enterprises SET plan_id = $1, subscription_start_date = NOW(), expiry_date = $2, status = 'active' WHERE id = $3`,
      [planId, expiryDate, enterpriseId],
    );

    await this.resellerRepository.manager.query(
      `INSERT INTO platform_payments (enterprise_id, plan_id, amount, payment_method, status)
       VALUES ($1, $2, $3, 'reseller_wallet', 'verified')`,
      [enterpriseId, planId, plan.price],
    );

    const walletRows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT COALESCE(balance, 0) AS balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );

    return {
      message: 'Plan assigned successfully',
      data: { expiryDate, walletBalanceAfter: parseFloat(walletRows[0]?.balance ?? '0') },
    };
  }

  async renewTenantPlan(resellerId: number, enterpriseId: number, planId?: number) {
    const tenant = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if ((tenant as any).resellerId !== resellerId) throw new BadRequestException('Tenant does not belong to this reseller');

    const effectivePlanId = planId ?? (tenant as any).planId;
    if (!effectivePlanId) throw new BadRequestException('No plan specified and tenant has no current plan');

    const plan = await this.planRepository.findOne({ where: { id: effectivePlanId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    const pricingRows: Array<{ reseller_price: string }> = await this.resellerRepository.manager.query(
      `SELECT reseller_price FROM reseller_plan_pricing WHERE reseller_id = $1 AND plan_id = $2`,
      [resellerId, effectivePlanId],
    );
    const resellerPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].reseller_price) : Number(plan.price);

    await this.checkAndDeductWallet(resellerId, resellerPrice, 'tenant_plan', `Renew plan for: ${(tenant as any).businessName}`);

    // Stack expiry from current expiry (if still active) or from today
    const currentExpiry = (tenant as any).expiryDate ? new Date((tenant as any).expiryDate) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

    await this.resellerRepository.manager.query(
      `UPDATE enterprises SET plan_id = $1, expiry_date = $2, status = 'active' WHERE id = $3`,
      [effectivePlanId, newExpiry, enterpriseId],
    );

    await this.resellerRepository.manager.query(
      `INSERT INTO platform_payments (enterprise_id, plan_id, amount, payment_method, status)
       VALUES ($1, $2, $3, 'reseller_wallet', 'verified')`,
      [enterpriseId, effectivePlanId, plan.price],
    );

    const walletRows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT COALESCE(balance, 0) AS balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );

    return {
      message: 'Plan renewed successfully',
      data: { newExpiryDate: newExpiry, walletBalanceAfter: parseFloat(walletRows[0]?.balance ?? '0') },
    };
  }

  private async checkAndDeductWallet(resellerId: number, amount: number, referenceType: string, description: string) {
    const walletRows: Array<{ balance: string }> = await this.resellerRepository.manager.query(
      `SELECT COALESCE(balance, 0) AS balance FROM reseller_wallets WHERE reseller_id = $1`,
      [resellerId],
    );
    const currentBalance = walletRows.length > 0 ? parseFloat(walletRows[0].balance) : 0;

    if (currentBalance < amount) {
      throw new BadRequestException(`Insufficient wallet balance. Required: ₹${amount}, Available: ₹${currentBalance}`);
    }

    const newBalance = currentBalance - amount;

    await this.resellerRepository.manager.query(
      `UPDATE reseller_wallets SET balance = $1, updated_date = NOW() WHERE reseller_id = $2`,
      [newBalance, resellerId],
    );

    await this.resellerRepository.manager.query(
      `INSERT INTO reseller_wallet_transactions (reseller_id, type, amount, balance_after, description, reference_type)
       VALUES ($1, 'debit', $2, $3, $4, $5)`,
      [resellerId, amount, newBalance, description, referenceType],
    );
  }

  // ─── Existing report/data methods ────────────────────────────────────────

  async getMyProfile(resellerId: number) {
    return this.findOne(resellerId);
  }

  async getMyTenants(resellerId: number) {
    const rows: Array<{
      id: number;
      business_name: string;
      email: string;
      mobile: string;
      status: string;
      expiry_date: string | null;
      plan_id: number | null;
      plan_name: string | null;
      subscription_start_date: string | null;
      created_date: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT e.id, e.business_name, e.email, e.mobile, e.status,
              e.expiry_date, e.plan_id, sp.name AS plan_name, e.subscription_start_date, e.created_date
       FROM enterprises e
       LEFT JOIN subscription_plans sp ON sp.id = e.plan_id
       WHERE e.reseller_id = $1
       ORDER BY e.created_date DESC`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      businessName: r.business_name,
      email: r.email,
      mobile: r.mobile,
      status: r.status,
      expiryDate: r.expiry_date,
      planId: r.plan_id,
      planName: r.plan_name,
      subscriptionStartDate: r.subscription_start_date,
      createdDate: r.created_date,
    }));

    return { message: 'Tenants fetched', data };
  }

  async getReport(resellerId: number) {
    const reseller = await this.resellerRepository.findOne({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Reseller not found');

    const rows: Array<{
      total_tenants: string;
      active_subscriptions: string;
      expired_subscriptions: string;
      total_revenue: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT
         COUNT(DISTINCT e.id) as total_tenants,
         COUNT(DISTINCT e.id) FILTER (WHERE e.status='active' AND e.expiry_date > now()) as active_subscriptions,
         COUNT(DISTINCT e.id) FILTER (WHERE e.expiry_date < now()) as expired_subscriptions,
         COALESCE((
           SELECT SUM(pp.amount)
           FROM platform_payments pp
           INNER JOIN enterprises e2 ON e2.id = pp.enterprise_id
           WHERE e2.reseller_id = $1 AND pp.status = 'verified'
         ), 0) as total_revenue
       FROM enterprises e
       WHERE e.reseller_id = $1`,
      [resellerId],
    );

    const r = rows[0];
    return {
      message: 'Report fetched',
      data: {
        totalTenants: parseInt(r.total_tenants, 10) || 0,
        activeSubscriptions: parseInt(r.active_subscriptions, 10) || 0,
        expiredSubscriptions: parseInt(r.expired_subscriptions, 10) || 0,
        totalRevenue: parseFloat(r.total_revenue) || 0,
      },
    };
  }

  private computeSubscriptionStatus(
    planId: number | null,
    expiryDate: string | Date | null,
  ): 'active' | 'expired' | 'none' {
    if (!planId) return 'none';
    if (!expiryDate) return 'none';
    return new Date(expiryDate) >= new Date() ? 'active' : 'expired';
  }

  async getMySubscriptions(resellerId: number) {
    const rows: Array<{
      id: number;
      business_name: string;
      email: string;
      status: string;
      expiry_date: string | null;
      subscription_start_date: string | null;
      plan_id: number | null;
      plan_name: string | null;
      plan_price: string | null;
      duration_days: number | null;
    }> = await this.resellerRepository.manager.query(
      `SELECT e.id, e.business_name, e.email, e.status, e.expiry_date,
              e.subscription_start_date, e.plan_id,
              sp.name AS plan_name, sp.price AS plan_price, sp.duration_days
       FROM enterprises e
       LEFT JOIN subscription_plans sp ON sp.id = e.plan_id
       WHERE e.reseller_id = $1
       ORDER BY e.expiry_date ASC NULLS LAST`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      businessName: r.business_name,
      email: r.email,
      status: r.status,
      expiryDate: r.expiry_date,
      subscriptionStartDate: r.subscription_start_date,
      planId: r.plan_id,
      planName: r.plan_name,
      planPrice: r.plan_price ? parseFloat(r.plan_price) : null,
      durationDays: r.duration_days,
      subscriptionStatus: this.computeSubscriptionStatus(r.plan_id, r.expiry_date),
    }));

    const active = data.filter((d) => d.subscriptionStatus === 'active').length;
    const expired = data.filter((d) => d.subscriptionStatus === 'expired').length;
    const none = data.filter((d) => d.subscriptionStatus === 'none').length;

    return {
      message: 'Subscriptions fetched',
      data,
      summary: { total: data.length, active, expired, none },
    };
  }

  async getMyUsage(resellerId: number) {
    const rows: Array<{
      id: number;
      business_name: string;
      status: string;
      employee_count: string;
      active_employees: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT e.id, e.business_name, e.status,
              (SELECT COUNT(*) FROM employees emp WHERE emp.enterprise_id = e.id) AS employee_count,
              (SELECT COUNT(*) FROM employees emp WHERE emp.enterprise_id = e.id AND emp.status = 'active') AS active_employees
       FROM enterprises e
       WHERE e.reseller_id = $1
       ORDER BY e.business_name ASC`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      businessName: r.business_name,
      status: r.status,
      employeeCount: parseInt(r.employee_count, 10) || 0,
      activeEmployees: parseInt(r.active_employees, 10) || 0,
    }));

    const totalEmployees = data.reduce((sum, d) => sum + d.employeeCount, 0);
    const totalActiveEmployees = data.reduce((sum, d) => sum + d.activeEmployees, 0);

    return {
      message: 'Usage fetched',
      data,
      summary: {
        totalTenants: data.length,
        totalEmployees,
        totalActiveEmployees,
      },
    };
  }

  async getMyBilling(resellerId: number) {
    const rows: Array<{
      id: number;
      amount: string;
      payment_method: string;
      status: string;
      created_date: string;
      business_name: string;
      email: string;
      plan_name: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT pp.id, pp.amount, pp.payment_method, pp.status, pp.created_date,
              e.business_name, e.email,
              sp.name AS plan_name
       FROM platform_payments pp
       JOIN enterprises e ON e.id = pp.enterprise_id
       JOIN subscription_plans sp ON sp.id = pp.plan_id
       WHERE e.reseller_id = $1
       ORDER BY pp.created_date DESC`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      amount: parseFloat(r.amount) || 0,
      paymentMethod: r.payment_method,
      status: r.status,
      createdDate: r.created_date,
      businessName: r.business_name,
      email: r.email,
      planName: r.plan_name,
    }));

    const totalBilled = data.reduce((sum, d) => sum + d.amount, 0);
    const verifiedCount = data.filter((d) => d.status === 'verified').length;
    const pendingCount = data.filter((d) => d.status === 'pending').length;

    return {
      message: 'Billing fetched',
      data,
      summary: {
        totalBilled,
        verifiedPayments: verifiedCount,
        pendingPayments: pendingCount,
        totalTransactions: data.length,
      },
    };
  }

  async getMyCommissions(resellerId: number) {
    const rows: Array<{
      id: number;
      billed_amount: string;
      created_date: string;
      reseller_price: string;
      commission: string;
      business_name: string;
      plan_name: string;
    }> = await this.resellerRepository.manager.query(
      `SELECT pp.id, pp.amount AS billed_amount, pp.created_date,
              COALESCE(rpp.reseller_price, pp.amount) AS reseller_price,
              (pp.amount - COALESCE(rpp.reseller_price, pp.amount)) AS commission,
              e.business_name,
              sp.name AS plan_name
       FROM platform_payments pp
       JOIN enterprises e ON e.id = pp.enterprise_id
       JOIN subscription_plans sp ON sp.id = pp.plan_id
       LEFT JOIN reseller_plan_pricing rpp ON rpp.reseller_id = e.reseller_id AND rpp.plan_id = pp.plan_id
       WHERE e.reseller_id = $1 AND pp.status = 'verified'
       ORDER BY pp.created_date DESC`,
      [resellerId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      billedAmount: parseFloat(r.billed_amount) || 0,
      resellerPrice: parseFloat(r.reseller_price) || 0,
      commission: parseFloat(r.commission) || 0,
      createdDate: r.created_date,
      businessName: r.business_name,
      planName: r.plan_name,
    }));

    const totalCommission = data.reduce((sum, d) => sum + d.commission, 0);
    const totalBilled = data.reduce((sum, d) => sum + d.billedAmount, 0);

    return {
      message: 'Commissions fetched',
      data,
      summary: {
        totalCommission,
        totalBilled,
        transactionCount: data.length,
      },
    };
  }
}

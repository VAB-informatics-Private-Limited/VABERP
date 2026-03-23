import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SuperAdmin } from './entities/super-admin.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { Employee } from '../employees/entities/employee.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { PlatformPayment } from './entities/platform-payment.entity';

@Injectable()
export class SuperAdminService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(SalesOrder)
    private salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(SupportTicket)
    private supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(SubscriptionPlan)
    private subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(PlatformPayment)
    private platformPaymentRepository: Repository<PlatformPayment>,
    private jwtService: JwtService,
  ) {}

  async onApplicationBootstrap() {
    // Seed super admin
    const existing = await this.superAdminRepository.findOne({
      where: { email: 'admin@vabinformatics.com' },
    });
    if (!existing) {
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'VAB@admin123';
      const hashed = await bcrypt.hash(defaultPassword, 10);
      await this.superAdminRepository.save(
        this.superAdminRepository.create({
          name: 'Super Admin',
          email: 'admin@vabinformatics.com',
          password: hashed,
          status: 'active',
        }),
      );
    }

    // Create support_tickets table
    await this.supportTicketRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        enterprise_id INTEGER NOT NULL REFERENCES enterprises(id),
        subject VARCHAR NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR NOT NULL DEFAULT 'other',
        priority VARCHAR NOT NULL DEFAULT 'medium',
        status VARCHAR NOT NULL DEFAULT 'open',
        admin_reply TEXT,
        replied_at TIMESTAMP,
        created_date TIMESTAMP NOT NULL DEFAULT now(),
        updated_date TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create subscription_plans table and seed defaults
    await this.subscriptionPlanRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 30,
        max_employees INTEGER NOT NULL DEFAULT 0,
        features TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_date TIMESTAMP NOT NULL DEFAULT now(),
        updated_date TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await this.subscriptionPlanRepository.manager.query(`
      INSERT INTO subscription_plans (name, description, price, duration_days, max_employees, features, is_active)
      SELECT 'Basic', 'For small businesses', 999, 30, 5, '["Up to 5 employees","Invoicing","Inventory"]', true
      WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Basic')
    `);

    await this.subscriptionPlanRepository.manager.query(`
      INSERT INTO subscription_plans (name, description, price, duration_days, max_employees, features, is_active)
      SELECT 'Pro', 'For growing businesses', 2499, 30, 25, '["Up to 25 employees","All Basic features","Manufacturing","Reports"]', true
      WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Pro')
    `);

    await this.subscriptionPlanRepository.manager.query(`
      INSERT INTO subscription_plans (name, description, price, duration_days, max_employees, features, is_active)
      SELECT 'Enterprise', 'Unlimited scale', 4999, 30, 0, '["Unlimited employees","All features","Priority support","Custom integrations"]', true
      WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Enterprise')
    `);

    // Create platform_payments table
    await this.platformPaymentRepository.manager.query(`
      CREATE TABLE IF NOT EXISTS platform_payments (
        id SERIAL PRIMARY KEY,
        enterprise_id INTEGER NOT NULL REFERENCES enterprises(id),
        plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR NOT NULL,
        reference_number VARCHAR,
        notes TEXT,
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_date TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  async login(dto: SuperAdminLoginDto) {
    const admin = await this.superAdminRepository.findOne({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (admin.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const isValid = await bcrypt.compare(dto.password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      type: 'super_admin' as const,
    };

    return {
      message: 'Login successful',
      data: {
        user: { id: admin.id, name: admin.name, email: admin.email },
        token: this.jwtService.sign(payload),
        type: 'super_admin',
      },
    };
  }

  async getDashboard() {
    const total = await this.enterpriseRepository.count();
    const active = await this.enterpriseRepository.count({ where: { status: 'active' } });
    const blocked = await this.enterpriseRepository.count({ where: { status: 'blocked' } });

    const now = new Date();
    const allWithExpiry = await this.enterpriseRepository.find({
      where: { status: 'active' },
      select: ['id', 'expiryDate'],
    });
    const expired = allWithExpiry.filter(
      (e) => e.expiryDate && new Date(e.expiryDate) < now,
    ).length;

    const recentSignups = await this.enterpriseRepository.find({
      order: { createdDate: 'DESC' },
      take: 10,
      select: ['id', 'businessName', 'email', 'status', 'expiryDate', 'createdDate'],
    });

    return {
      message: 'Dashboard data fetched',
      data: { total, active, blocked, expired, recentSignups },
    };
  }

  async getAllEnterprises() {
    const enterprises = await this.enterpriseRepository.find({
      select: ['id', 'businessName', 'email', 'mobile', 'status', 'expiryDate', 'createdDate'],
      order: { createdDate: 'DESC' },
    });

    return { message: 'Enterprises fetched', data: enterprises };
  }

  async getEnterprise(id: number) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');
    return { message: 'Enterprise fetched', data: enterprise };
  }

  async updateStatus(id: number, status: string) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');

    await this.enterpriseRepository.update(id, { status });
    return { message: `Enterprise ${status} successfully` };
  }

  async updateExpiry(id: number, expiryDate: string) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');

    await this.enterpriseRepository.update(id, { expiryDate: new Date(expiryDate) });
    return { message: 'Expiry date updated successfully' };
  }

  async getEnterpriseFinancials(id: number, period: string) {
    const days = period === '1y' ? 365 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const revenueResult = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('SUM(inv.grandTotal)', 'total')
      .where('inv.enterpriseId = :id', { id })
      .andWhere('inv.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('inv.invoiceDate >= :startDate', { startDate: startDate })
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total ?? '0') || 0;

    const costsResult = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .select('SUM(po.grandTotal)', 'total')
      .where('po.enterpriseId = :id', { id })
      .andWhere('po.status NOT IN (:...statuses)', { statuses: ['cancelled', 'draft'] })
      .andWhere('po.orderDate >= :startDate', { startDate: startDate })
      .getRawOne();
    const totalCosts = parseFloat(costsResult?.total ?? '0') || 0;

    const collectedResult = await this.paymentRepository
      .createQueryBuilder('pay')
      .select('SUM(pay.amount)', 'total')
      .where('pay.enterpriseId = :id', { id })
      .andWhere('pay.status = :completed', { completed: 'completed' })
      .andWhere('pay.paymentDate >= :startDate', { startDate: startDate })
      .getRawOne();
    const totalCollected = parseFloat(collectedResult?.total ?? '0') || 0;

    const outstandingResult = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('SUM(inv.balanceDue)', 'total')
      .where('inv.enterpriseId = :id', { id })
      .andWhere('inv.status NOT IN (:...statuses)', { statuses: ['fully_paid', 'cancelled'] })
      .getRawOne();
    const outstandingBalance = parseFloat(outstandingResult?.total ?? '0') || 0;

    const totalInvoices = await this.invoiceRepository
      .createQueryBuilder('inv')
      .where('inv.enterpriseId = :id', { id })
      .andWhere('inv.invoiceDate >= :startDate', { startDate: startDate })
      .getCount();

    const totalPurchaseOrders = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .where('po.enterpriseId = :id', { id })
      .andWhere('po.orderDate >= :startDate', { startDate: startDate })
      .getCount();

    const totalSalesOrders = await this.salesOrderRepository
      .createQueryBuilder('so')
      .where('so.enterpriseId = :id', { id })
      .andWhere('so.orderDate >= :startDate', { startDate: startDate })
      .getCount();

    const dailyRevRows: Array<{ date: string; revenue: string }> = await this.invoiceRepository.manager.query(
      `SELECT TO_CHAR(invoice_date::date, 'YYYY-MM-DD') as date, SUM(grand_total) as revenue
       FROM invoices
       WHERE enterprise_id = $1 AND status != 'cancelled' AND invoice_date >= $2
       GROUP BY invoice_date::date ORDER BY date`,
      [id, startDateStr],
    );

    const dailyCostRows: Array<{ date: string; cost: string }> = await this.invoiceRepository.manager.query(
      `SELECT TO_CHAR(order_date::date, 'YYYY-MM-DD') as date, SUM(total_amount) as cost
       FROM purchase_orders
       WHERE enterprise_id = $1 AND status NOT IN ('cancelled','draft') AND order_date >= $2
       GROUP BY order_date::date ORDER BY date`,
      [id, startDateStr],
    );

    const dailyMap: Record<string, { date: string; revenue: number; cost: number }> = {};
    for (const row of dailyRevRows) {
      dailyMap[row.date] = { date: row.date, revenue: parseFloat(row.revenue) || 0, cost: 0 };
    }
    for (const row of dailyCostRows) {
      if (dailyMap[row.date]) {
        dailyMap[row.date].cost = parseFloat(row.cost) || 0;
      } else {
        dailyMap[row.date] = { date: row.date, revenue: 0, cost: parseFloat(row.cost) || 0 };
      }
    }
    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const monthlyRevRows: Array<{ month: string; month_date: string; revenue: string }> =
      await this.invoiceRepository.manager.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon YYYY') as month,
                DATE_TRUNC('month', invoice_date) as month_date,
                SUM(grand_total) as revenue
         FROM invoices
         WHERE enterprise_id = $1 AND status != 'cancelled'
           AND invoice_date >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', invoice_date) ORDER BY month_date`,
        [id],
      );

    const monthlyCostRows: Array<{ month: string; month_date: string; cost: string }> =
      await this.invoiceRepository.manager.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', order_date), 'Mon YYYY') as month,
                DATE_TRUNC('month', order_date) as month_date,
                SUM(total_amount) as cost
         FROM purchase_orders
         WHERE enterprise_id = $1 AND status NOT IN ('cancelled','draft')
           AND order_date >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', order_date) ORDER BY month_date`,
        [id],
      );

    const monthlyMap: Record<string, { month: string; month_date: string; revenue: number; cost: number }> = {};
    for (const row of monthlyRevRows) {
      monthlyMap[row.month] = { month: row.month, month_date: row.month_date, revenue: parseFloat(row.revenue) || 0, cost: 0 };
    }
    for (const row of monthlyCostRows) {
      if (monthlyMap[row.month]) {
        monthlyMap[row.month].cost = parseFloat(row.cost) || 0;
      } else {
        monthlyMap[row.month] = { month: row.month, month_date: row.month_date, revenue: 0, cost: parseFloat(row.cost) || 0 };
      }
    }
    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.month_date.localeCompare(b.month_date))
      .map(({ month, revenue, cost }) => ({ month, revenue, cost }));

    const statusRows: Array<{ status: string; count: string; amount: string }> =
      await this.invoiceRepository.manager.query(
        `SELECT status, COUNT(*) as count, SUM(grand_total) as amount
         FROM invoices
         WHERE enterprise_id = $1
         GROUP BY status`,
        [id],
      );
    const invoiceStatusBreakdown = statusRows.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
      amount: parseFloat(row.amount) || 0,
    }));

    const recentInvoices = await this.invoiceRepository.find({
      where: { enterpriseId: id },
      order: { invoiceDate: 'DESC' },
      take: 10,
      select: ['id', 'invoiceNumber', 'invoiceDate', 'customerName', 'grandTotal', 'status'],
    });

    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      message: 'Financials fetched',
      data: {
        summary: {
          totalRevenue,
          totalCosts,
          grossProfit,
          profitMargin,
          totalCollected,
          outstandingBalance,
          totalInvoices,
          totalPurchaseOrders,
          totalSalesOrders,
        },
        dailyData,
        monthlyData,
        invoiceStatusBreakdown,
        recentInvoices,
      },
    };
  }

  // ─── Module 1: Employees ───────────────────────────────────────────────────

  async getAllEmployees() {
    const rows: Array<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
      status: string;
      hire_date: string;
      created_date: string;
      enterprise_id: number;
      business_name: string;
    }> = await this.employeeRepository.manager.query(`
      SELECT e.id, e.first_name, e.last_name, e.email, e.phone_number,
             e.status, e.hire_date, e.created_date, e.enterprise_id,
             ent.business_name
      FROM employees e
      LEFT JOIN enterprises ent ON ent.id = e.enterprise_id
      ORDER BY e.created_date DESC
    `);

    const data = rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      fullName: `${r.first_name} ${r.last_name}`,
      email: r.email,
      phoneNumber: r.phone_number,
      status: r.status,
      hireDate: r.hire_date,
      createdDate: r.created_date,
      enterpriseId: r.enterprise_id,
      enterpriseName: r.business_name,
    }));

    return { message: 'Employees fetched', data };
  }

  async getEmployeeStats() {
    const total = await this.employeeRepository.count();
    const active = await this.employeeRepository.count({ where: { status: 'active' } });
    const inactive = total - active;

    const perEnterpriseRows: Array<{ enterprise_id: number; business_name: string; count: string }> =
      await this.employeeRepository.manager.query(`
        SELECT e.enterprise_id, ent.business_name, COUNT(*) as count
        FROM employees e
        LEFT JOIN enterprises ent ON ent.id = e.enterprise_id
        GROUP BY e.enterprise_id, ent.business_name
        ORDER BY count DESC
      `);

    const perEnterprise = perEnterpriseRows.map((r) => ({
      enterpriseId: r.enterprise_id,
      businessName: r.business_name,
      count: parseInt(r.count, 10),
    }));

    return { message: 'Employee stats fetched', data: { total, active, inactive, perEnterprise } };
  }

  // ─── Module 2: Platform Accounts ──────────────────────────────────────────

  async getPlatformAccounts(period: string) {
    const days = period === '1y' ? 365 : period === '90d' ? 90 : 30;

    const topEnterprises: Array<{
      id: number;
      business_name: string;
      total_revenue: string;
      total_costs: string;
    }> = await this.invoiceRepository.manager.query(`
      SELECT
        ent.id,
        ent.business_name,
        COALESCE(SUM(inv.grand_total) FILTER (WHERE inv.status != 'cancelled'), 0) as total_revenue,
        COALESCE((
          SELECT SUM(po.grand_total)
          FROM purchase_orders po
          WHERE po.enterprise_id = ent.id AND po.status NOT IN ('cancelled','draft')
            AND po.order_date >= NOW() - INTERVAL '${days} days'
        ), 0) as total_costs
      FROM enterprises ent
      LEFT JOIN invoices inv ON inv.enterprise_id = ent.id
        AND inv.invoice_date >= NOW() - INTERVAL '${days} days'
      GROUP BY ent.id, ent.business_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    const topEnterprisesByRevenue = topEnterprises.map((r) => {
      const totalRevenue = parseFloat(r.total_revenue) || 0;
      const totalCosts = parseFloat(r.total_costs) || 0;
      return {
        id: r.id,
        businessName: r.business_name,
        totalRevenue,
        totalCosts,
        profit: totalRevenue - totalCosts,
      };
    });

    const totalsRows: Array<{
      total_revenue: string;
      total_costs: string;
      total_collected: string;
      total_outstanding: string;
    }> = await this.invoiceRepository.manager.query(`
      SELECT
        COALESCE(SUM(inv.grand_total) FILTER (WHERE inv.status != 'cancelled'), 0) as total_revenue,
        COALESCE((SELECT SUM(po.grand_total) FROM purchase_orders po
                  WHERE po.status NOT IN ('cancelled','draft')
                    AND po.order_date >= NOW() - INTERVAL '${days} days'), 0) as total_costs,
        COALESCE((SELECT SUM(pay.amount) FROM payments pay
                  WHERE pay.status = 'completed'
                    AND pay.payment_date >= NOW() - INTERVAL '${days} days'), 0) as total_collected,
        COALESCE(SUM(inv.balance_due) FILTER (WHERE inv.status NOT IN ('fully_paid','cancelled')), 0) as total_outstanding
      FROM invoices inv
      WHERE inv.invoice_date >= NOW() - INTERVAL '${days} days'
    `);

    const t = totalsRows[0] ?? {};
    const totalRevenue = parseFloat(t.total_revenue as string) || 0;
    const totalCosts = parseFloat(t.total_costs as string) || 0;
    const platformTotals = {
      totalRevenue,
      totalCosts,
      totalProfit: totalRevenue - totalCosts,
      totalCollected: parseFloat(t.total_collected as string) || 0,
      totalOutstanding: parseFloat(t.total_outstanding as string) || 0,
    };

    const monthlyRows: Array<{ month: string; month_date: string; revenue: string; cost: string }> =
      await this.invoiceRepository.manager.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', m.month_date), 'Mon YYYY') as month,
          DATE_TRUNC('month', m.month_date) as month_date,
          COALESCE(SUM(inv.grand_total) FILTER (WHERE inv.status != 'cancelled'), 0) as revenue,
          COALESCE((
            SELECT SUM(po.grand_total) FROM purchase_orders po
            WHERE DATE_TRUNC('month', po.order_date) = DATE_TRUNC('month', m.month_date)
              AND po.status NOT IN ('cancelled','draft')
          ), 0) as cost
        FROM (
          SELECT generate_series(
            DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
            DATE_TRUNC('month', NOW()),
            INTERVAL '1 month'
          ) as month_date
        ) m
        LEFT JOIN invoices inv ON DATE_TRUNC('month', inv.invoice_date) = m.month_date
        GROUP BY m.month_date
        ORDER BY m.month_date
      `);

    const monthlyRevenue = monthlyRows.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.revenue) || 0,
      cost: parseFloat(r.cost) || 0,
    }));

    const recentPaymentsRows: Array<{
      id: number;
      amount: string;
      payment_date: string;
      payment_method: string;
      business_name: string;
      customer_name: string;
    }> = await this.invoiceRepository.manager.query(`
      SELECT
        pay.id, pay.amount, pay.payment_date, pay.payment_method,
        ent.business_name, inv.customer_name
      FROM payments pay
      LEFT JOIN enterprises ent ON ent.id = pay.enterprise_id
      LEFT JOIN invoices inv ON inv.id = pay.invoice_id
      ORDER BY pay.payment_date DESC
      LIMIT 15
    `);

    const recentPayments = recentPaymentsRows.map((r) => ({
      id: r.id,
      amount: parseFloat(r.amount) || 0,
      paymentDate: r.payment_date,
      paymentMethod: r.payment_method,
      enterpriseName: r.business_name,
      customerName: r.customer_name,
    }));

    return {
      message: 'Platform accounts fetched',
      data: { topEnterprisesByRevenue, platformTotals, monthlyRevenue, recentPayments },
    };
  }

  // ─── Module 3: Support Tickets ────────────────────────────────────────────

  async getAllTickets(status?: string) {
    const rows: Array<{
      id: number;
      enterprise_id: number;
      subject: string;
      message: string;
      category: string;
      priority: string;
      status: string;
      admin_reply: string | null;
      replied_at: string | null;
      created_date: string;
      updated_date: string;
      business_name: string;
    }> = await this.supportTicketRepository.manager.query(
      `SELECT st.*, ent.business_name
       FROM support_tickets st
       LEFT JOIN enterprises ent ON ent.id = st.enterprise_id
       ${status ? `WHERE st.status = $1` : ''}
       ORDER BY st.created_date DESC`,
      status ? [status] : [],
    );

    const data = rows.map((r) => ({
      id: r.id,
      enterpriseId: r.enterprise_id,
      enterpriseName: r.business_name,
      subject: r.subject,
      message: r.message,
      category: r.category,
      priority: r.priority,
      status: r.status,
      adminReply: r.admin_reply,
      repliedAt: r.replied_at,
      createdDate: r.created_date,
      updatedDate: r.updated_date,
    }));

    return { message: 'Tickets fetched', data };
  }

  async getTicket(id: number) {
    const rows: Array<{
      id: number;
      enterprise_id: number;
      subject: string;
      message: string;
      category: string;
      priority: string;
      status: string;
      admin_reply: string | null;
      replied_at: string | null;
      created_date: string;
      updated_date: string;
      business_name: string;
    }> = await this.supportTicketRepository.manager.query(
      `SELECT st.*, ent.business_name
       FROM support_tickets st
       LEFT JOIN enterprises ent ON ent.id = st.enterprise_id
       WHERE st.id = $1`,
      [id],
    );

    if (!rows.length) throw new NotFoundException('Ticket not found');
    const r = rows[0];
    return {
      message: 'Ticket fetched',
      data: {
        id: r.id,
        enterpriseId: r.enterprise_id,
        enterpriseName: r.business_name,
        subject: r.subject,
        message: r.message,
        category: r.category,
        priority: r.priority,
        status: r.status,
        adminReply: r.admin_reply,
        repliedAt: r.replied_at,
        createdDate: r.created_date,
        updatedDate: r.updated_date,
      },
    };
  }

  async replyToTicket(id: number, reply: string, status: string) {
    const ticket = await this.supportTicketRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.supportTicketRepository.update(id, {
      adminReply: reply,
      repliedAt: new Date(),
      status,
    });

    return { message: 'Reply submitted successfully' };
  }

  async getTicketStats() {
    const rows: Array<{ status: string; count: string }> =
      await this.supportTicketRepository.manager.query(`
        SELECT status, COUNT(*) as count FROM support_tickets GROUP BY status
      `);

    const map: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      map[r.status] = parseInt(r.count, 10);
      total += parseInt(r.count, 10);
    }

    return {
      message: 'Ticket stats fetched',
      data: {
        total,
        open: map['open'] ?? 0,
        inProgress: map['in_progress'] ?? 0,
        resolved: map['resolved'] ?? 0,
        closed: map['closed'] ?? 0,
      },
    };
  }

  async submitTicket(dto: {
    enterpriseId: number;
    subject: string;
    message: string;
    category: string;
    priority: string;
  }) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id: dto.enterpriseId } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');

    await this.supportTicketRepository.manager.query(
      `INSERT INTO support_tickets (enterprise_id, subject, message, category, priority)
       VALUES ($1, $2, $3, $4, $5)`,
      [dto.enterpriseId, dto.subject, dto.message, dto.category, dto.priority],
    );

    return { message: 'Support ticket submitted successfully' };
  }

  // ─── Module 4: Subscriptions ───────────────────────────────────────────────

  async getSubscriptionPlans() {
    const plans = await this.subscriptionPlanRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    return { message: 'Subscription plans fetched', data: plans };
  }

  async createPlan(dto: {
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    maxEmployees: number;
    features?: string;
  }) {
    const plan = this.subscriptionPlanRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      durationDays: dto.durationDays,
      maxEmployees: dto.maxEmployees,
      features: dto.features ?? null,
      isActive: true,
    });
    await this.subscriptionPlanRepository.save(plan);
    return { message: 'Plan created', data: plan };
  }

  async updatePlan(id: number, dto: {
    name?: string;
    description?: string;
    price?: number;
    durationDays?: number;
    maxEmployees?: number;
    features?: string;
  }) {
    const plan = await this.subscriptionPlanRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.subscriptionPlanRepository.update(id, dto);
    return { message: 'Plan updated' };
  }

  async deletePlan(id: number) {
    const plan = await this.subscriptionPlanRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.subscriptionPlanRepository.update(id, { isActive: false });
    return { message: 'Plan deactivated' };
  }

  async getEnterpriseSubscriptions() {
    const enterprises = await this.enterpriseRepository.find({
      select: ['id', 'businessName', 'email', 'expiryDate', 'status'],
      order: { businessName: 'ASC' },
    });

    const now = new Date();
    const data = enterprises.map((e) => {
      const expiry = e.expiryDate ? new Date(e.expiryDate) : null;
      const daysRemaining = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      let subscriptionStatus: string;
      if (!expiry) {
        subscriptionStatus = 'no_plan';
      } else if (daysRemaining !== null && daysRemaining < 0) {
        subscriptionStatus = 'expired';
      } else if (daysRemaining !== null && daysRemaining <= 7) {
        subscriptionStatus = 'expiring_soon';
      } else {
        subscriptionStatus = 'active';
      }

      return {
        id: e.id,
        businessName: e.businessName,
        email: e.email,
        expiryDate: e.expiryDate,
        daysRemaining,
        subscriptionStatus,
        accountStatus: e.status,
      };
    });

    return { message: 'Enterprise subscriptions fetched', data };
  }

  async assignPlan(enterpriseId: number, planId: number) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');

    const plan = await this.subscriptionPlanRepository.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    await this.enterpriseRepository.update(enterpriseId, { expiryDate });

    return { message: `Plan assigned. New expiry: ${expiryDate.toISOString().split('T')[0]}` };
  }

  // ─── Enterprise Onboarding ────────────────────────────────────────────────

  async createEnterprise(dto: {
    businessName: string;
    email: string;
    mobile: string;
    contactPerson?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
    cinNumber?: string;
    website?: string;
    planId: number;
    paymentAmount: number;
    paymentMethod: string;
    paymentReference?: string;
    paymentNotes?: string;
  }) {
    const existing = await this.enterpriseRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An enterprise with this email already exists');

    const plan = await this.subscriptionPlanRepository.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const temporaryPassword = Math.random().toString(36).slice(2, 8).toUpperCase() +
      Math.random().toString(36).slice(2, 8).toUpperCase();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const rows: Array<{ id: number }> = await this.enterpriseRepository.manager.query(
      `INSERT INTO enterprises
         (business_name, email, mobile, contact_person, address, city, state, pincode,
          gst_number, cin_number, website, password, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        dto.businessName,
        dto.email,
        dto.mobile,
        dto.contactPerson ?? null,
        dto.address ?? null,
        dto.city ?? null,
        dto.state ?? null,
        dto.pincode ?? null,
        dto.gstNumber ?? null,
        dto.cinNumber ?? null,
        dto.website ?? null,
        hashedPassword,
        'pending',
      ],
    );
    const enterpriseId = rows[0].id;

    await this.platformPaymentRepository.manager.query(
      `INSERT INTO platform_payments
         (enterprise_id, plan_id, amount, payment_method, reference_number, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        enterpriseId,
        dto.planId,
        dto.paymentAmount,
        dto.paymentMethod,
        dto.paymentReference ?? null,
        dto.paymentNotes ?? null,
        'pending',
      ],
    );

    const enterprise = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });

    return {
      message: 'Enterprise created successfully',
      data: { enterprise, temporaryPassword },
    };
  }

  async getEnterprisePayment(enterpriseId: number) {
    const payment = await this.platformPaymentRepository.findOne({ where: { enterpriseId } });
    if (!payment) throw new NotFoundException('No payment record found for this enterprise');

    const plan = await this.subscriptionPlanRepository.findOne({ where: { id: payment.planId } });

    return {
      message: 'Payment fetched',
      data: {
        ...payment,
        planName: plan?.name ?? null,
        planDurationDays: plan?.durationDays ?? null,
        planPrice: plan?.price ?? null,
      },
    };
  }

  async approveEnterprise(enterpriseId: number) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');
    if (enterprise.status !== 'pending') {
      throw new BadRequestException('Enterprise is not in pending state');
    }

    const payment = await this.platformPaymentRepository.findOne({ where: { enterpriseId } });
    if (!payment) throw new NotFoundException('No payment record found');

    const plan = await this.subscriptionPlanRepository.findOne({ where: { id: payment.planId } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    await this.enterpriseRepository.update(enterpriseId, { status: 'active', expiryDate });
    await this.platformPaymentRepository.update(payment.id, { status: 'verified' });

    return { message: 'Enterprise approved and activated successfully' };
  }

  async rejectEnterprise(enterpriseId: number) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');
    if (enterprise.status !== 'pending') {
      throw new BadRequestException('Enterprise is not in pending state');
    }

    const payment = await this.platformPaymentRepository.findOne({ where: { enterpriseId } });

    await this.enterpriseRepository.update(enterpriseId, { status: 'blocked' });
    if (payment) {
      await this.platformPaymentRepository.update(payment.id, { status: 'rejected' });
    }

    return { message: 'Enterprise rejected successfully' };
  }
}

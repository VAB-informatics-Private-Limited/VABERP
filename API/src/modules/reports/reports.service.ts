import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThanOrEqual } from 'typeorm';
import { Enquiry } from '../enquiries/entities/enquiry.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Enquiry)
    private enquiryRepository: Repository<Enquiry>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
    @InjectRepository(JobCard)
    private jobCardRepository: Repository<JobCard>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async getDashboard(enterpriseId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all queries in parallel for performance
    const [
      todayFollowups,
      overdueFollowups,
      totalEnquiries,
      totalProspects,
      totalCustomers,
      totalQuotations,
      pendingQuotations,
      acceptedQuotations,
      activeJobs,
      pendingJobs,
      completedJobs,
      lowStockAlerts,
      pipelineStats,
      quotationValues,
      recentEnquiries,
      recentCustomers,
      recentQuotations,
      monthlyTrend,
    ] = await Promise.all([
      // Today's followups
      this.enquiryRepository.count({
        where: { enterpriseId, nextFollowupDate: Between(today, tomorrow) },
      }),
      // Overdue followups
      this.enquiryRepository.count({
        where: { enterpriseId, nextFollowupDate: LessThan(today) },
      }),
      // Total enquiries
      this.enquiryRepository.count({ where: { enterpriseId } }),
      // Total prospects
      this.enquiryRepository.count({
        where: { enterpriseId, interestStatus: 'Prospect' },
      }),
      // Total customers
      this.customerRepository.count({ where: { enterpriseId } }),
      // Total quotations
      this.quotationRepository.count({ where: { enterpriseId } }),
      // Pending quotations
      this.quotationRepository.count({ where: { enterpriseId, status: 'sent' } }),
      // Accepted quotations
      this.quotationRepository.count({ where: { enterpriseId, status: 'accepted' } }),
      // Active jobs
      this.jobCardRepository.count({ where: { enterpriseId, status: 'in_progress' } }),
      // Pending jobs
      this.jobCardRepository.count({ where: { enterpriseId, status: 'pending' } }),
      // Completed jobs
      this.jobCardRepository.count({ where: { enterpriseId, status: 'completed' } }),
      // Low stock alerts
      this.inventoryRepository
        .createQueryBuilder('inventory')
        .where('inventory.enterpriseId = :enterpriseId', { enterpriseId })
        .andWhere('inventory.currentStock <= inventory.minStockLevel')
        .getCount(),
      // Pipeline stats
      this.enquiryRepository
        .createQueryBuilder('enquiry')
        .select('enquiry.interestStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
        .groupBy('enquiry.interestStatus')
        .getRawMany(),
      // Quotation value stats
      this.quotationRepository
        .createQueryBuilder('quotation')
        .select('quotation.status', 'status')
        .addSelect('SUM(quotation.grandTotal)', 'totalValue')
        .where('quotation.enterpriseId = :enterpriseId', { enterpriseId })
        .groupBy('quotation.status')
        .getRawMany(),
      // Recent enquiries (for activity feed)
      this.enquiryRepository.find({
        where: { enterpriseId },
        order: { createdDate: 'DESC' },
        take: 5,
        select: ['id', 'customerName', 'interestStatus', 'createdDate'],
      }),
      // Recent customers (for activity feed)
      this.customerRepository.find({
        where: { enterpriseId },
        order: { createdDate: 'DESC' },
        take: 5,
        select: ['id', 'customerName', 'businessName', 'createdDate'],
      }),
      // Recent quotations (for activity feed)
      this.quotationRepository.find({
        where: { enterpriseId },
        order: { createdDate: 'DESC' },
        take: 5,
        select: ['id', 'quotationNumber', 'customerName', 'grandTotal', 'status', 'createdDate'],
      }),
      // Monthly enquiry trend (last 6 months)
      this.enquiryRepository
        .createQueryBuilder('enquiry')
        .select("TO_CHAR(enquiry.createdDate, 'YYYY-MM')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
        .groupBy("TO_CHAR(enquiry.createdDate, 'YYYY-MM')")
        .orderBy("TO_CHAR(enquiry.createdDate, 'YYYY-MM')", 'DESC')
        .limit(6)
        .getRawMany(),
    ]);

    // Build recent activities feed
    const recentActivities = [
      ...recentEnquiries.map((e) => ({
        id: e.id,
        type: 'enquiry' as const,
        title: 'New Enquiry',
        description: `${e.customerName} - ${e.interestStatus || 'Enquiry'}`,
        time: e.createdDate,
      })),
      ...recentCustomers.map((c) => ({
        id: c.id,
        type: 'customer' as const,
        title: 'New Customer',
        description: c.businessName
          ? `${c.customerName} (${c.businessName})`
          : c.customerName,
        time: c.createdDate,
      })),
      ...recentQuotations.map((q) => ({
        id: q.id,
        type: q.status === 'accepted' ? ('sale' as const) : ('quotation' as const),
        title: q.status === 'accepted' ? 'Sale Closed' : 'Quotation Created',
        description: `${q.quotationNumber} - ${q.customerName}`,
        time: q.createdDate,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    return {
      message: 'Dashboard data fetched successfully',
      data: {
        todayFollowups,
        overdueFollowups,
        totalEnquiries,
        totalProspects,
        totalCustomers,
        totalQuotations,
        pendingQuotations,
        acceptedQuotations,
        activeJobs,
        pendingJobs,
        completedJobs,
        lowStockAlerts,
        pipelineStats,
        quotationValues,
        recentActivities,
        monthlyTrend,
      },
    };
  }

  async getEnquiryReport(
    enterpriseId: number,
    fromDate?: string,
    toDate?: string,
    interestStatus?: string,
    source?: string,
  ) {
    const query = this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'employee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId });

    if (fromDate) {
      query.andWhere('enquiry.createdDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('enquiry.createdDate <= :toDate', { toDate });
    }

    if (interestStatus) {
      query.andWhere('enquiry.interestStatus = :interestStatus', { interestStatus });
    }

    if (source) {
      query.andWhere('enquiry.source = :source', { source });
    }

    const enquiries = await query
      .orderBy('enquiry.createdDate', 'DESC')
      .getMany();

    // Group by status
    const byStatus = await this.enquiryRepository
      .createQueryBuilder('enquiry')
      .select('enquiry.interestStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(enquiry.expectedValue)', 'totalValue')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy('enquiry.interestStatus')
      .getRawMany();

    // Group by source (treat NULL/empty as 'Unknown')
    const bySource = await this.enquiryRepository
      .createQueryBuilder('enquiry')
      .select("COALESCE(NULLIF(enquiry.source, ''), 'Unknown')", 'source')
      .addSelect('COUNT(*)', 'count')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy("COALESCE(NULLIF(enquiry.source, ''), 'Unknown')")
      .getRawMany();

    // Monthly trend
    const monthlyTrend = await this.enquiryRepository
      .createQueryBuilder('enquiry')
      .select("TO_CHAR(enquiry.createdDate, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy("TO_CHAR(enquiry.createdDate, 'YYYY-MM')")
      .orderBy("TO_CHAR(enquiry.createdDate, 'YYYY-MM')", 'DESC')
      .limit(12)
      .getRawMany();

    return {
      message: 'Enquiry report fetched successfully',
      data: {
        enquiries,
        summary: {
          total: enquiries.length,
          byStatus,
          bySource,
          monthlyTrend,
        },
      },
    };
  }

  async getProspectReport(enterpriseId: number) {
    const prospects = await this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'employee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.interestStatus IN (:...statuses)', {
        statuses: ['Prospect', 'Quotation Sent'],
      })
      .orderBy('enquiry.expectedValue', 'DESC')
      .getMany();

    const totalValue = prospects.reduce(
      (sum, p) => sum + Number(p.expectedValue || 0),
      0,
    );

    return {
      message: 'Prospect report fetched successfully',
      data: {
        prospects,
        summary: {
          total: prospects.length,
          totalValue,
        },
      },
    };
  }

  async getFollowupReport(enterpriseId: number, assignedTo?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = this.enquiryRepository
      .createQueryBuilder('enquiry')
      .leftJoinAndSelect('enquiry.assignedEmployee', 'employee')
      .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('enquiry.nextFollowupDate IS NOT NULL');

    if (assignedTo) {
      query.andWhere('enquiry.assignedTo = :assignedTo', { assignedTo });
    }

    const allFollowups = await query
      .orderBy('enquiry.nextFollowupDate', 'ASC')
      .getMany();

    // Categorize
    const overdue = allFollowups.filter(
      (f) => f.nextFollowupDate && new Date(f.nextFollowupDate) < today,
    );
    const todayList = allFollowups.filter((f) => {
      if (!f.nextFollowupDate) return false;
      const date = new Date(f.nextFollowupDate);
      return date >= today && date < new Date(today.getTime() + 86400000);
    });
    const upcoming = allFollowups.filter(
      (f) => f.nextFollowupDate && new Date(f.nextFollowupDate) >= new Date(today.getTime() + 86400000),
    );

    return {
      message: 'Followup report fetched successfully',
      data: {
        overdue,
        today: todayList,
        upcoming,
        summary: {
          overdueCount: overdue.length,
          todayCount: todayList.length,
          upcomingCount: upcoming.length,
        },
      },
    };
  }

  async getCustomerReport(enterpriseId: number) {
    const customers = await this.customerRepository.find({
      where: { enterpriseId },
      order: { createdDate: 'DESC' },
    });

    // Group by city
    const byCity = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('customer.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('customer.city IS NOT NULL')
      .groupBy('customer.city')
      .getRawMany();

    // Group by state
    const byState = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('customer.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('customer.state IS NOT NULL')
      .groupBy('customer.state')
      .getRawMany();

    // Monthly acquisition
    const monthlyAcquisition = await this.customerRepository
      .createQueryBuilder('customer')
      .select("TO_CHAR(customer.createdDate, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('customer.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy("TO_CHAR(customer.createdDate, 'YYYY-MM')")
      .orderBy("TO_CHAR(customer.createdDate, 'YYYY-MM')", 'DESC')
      .limit(12)
      .getRawMany();

    return {
      message: 'Customer report fetched successfully',
      data: {
        customers,
        summary: {
          total: customers.length,
          byCity,
          byState,
          monthlyAcquisition,
        },
      },
    };
  }

  async getEmployeePerformance(enterpriseId: number, fromDate?: string, toDate?: string) {
    const employees = await this.employeeRepository.find({
      where: { enterpriseId, status: 'active' },
    });

    const performance = await Promise.all(
      employees.map(async (employee) => {
        const query = this.enquiryRepository
          .createQueryBuilder('enquiry')
          .where('enquiry.enterpriseId = :enterpriseId', { enterpriseId })
          .andWhere('enquiry.assignedTo = :employeeId', { employeeId: employee.id });

        if (fromDate) {
          query.andWhere('enquiry.createdDate >= :fromDate', { fromDate });
        }
        if (toDate) {
          query.andWhere('enquiry.createdDate <= :toDate', { toDate });
        }

        const totalEnquiries = await query.getCount();

        const closedSales = await query
          .clone()
          .andWhere('enquiry.interestStatus = :status', { status: 'Sale Closed' })
          .getCount();

        const prospects = await query
          .clone()
          .andWhere('enquiry.interestStatus IN (:...statuses)', {
            statuses: ['Prospect', 'Quotation Sent'],
          })
          .getCount();

        const expectedValue = await query
          .clone()
          .select('SUM(enquiry.expectedValue)', 'total')
          .getRawOne();

        return {
          employee: {
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
          },
          metrics: {
            totalEnquiries,
            closedSales,
            prospects,
            conversionRate: totalEnquiries > 0 ? (closedSales / totalEnquiries) * 100 : 0,
            expectedValue: expectedValue?.total || 0,
          },
        };
      }),
    );

    return {
      message: 'Employee performance report fetched successfully',
      data: performance.sort((a, b) => b.metrics.closedSales - a.metrics.closedSales),
    };
  }

  async getQuotationReport(enterpriseId: number, fromDate?: string, toDate?: string) {
    const query = this.quotationRepository
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.createdByEmployee', 'employee')
      .where('quotation.enterpriseId = :enterpriseId', { enterpriseId });

    if (fromDate) {
      query.andWhere('quotation.quotationDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('quotation.quotationDate <= :toDate', { toDate });
    }

    const quotations = await query
      .orderBy('quotation.quotationDate', 'DESC')
      .getMany();

    // Group by status
    const byStatus = await this.quotationRepository
      .createQueryBuilder('quotation')
      .select('quotation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(quotation.grandTotal)', 'totalValue')
      .where('quotation.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy('quotation.status')
      .getRawMany();

    // Monthly trend
    const monthlyTrend = await this.quotationRepository
      .createQueryBuilder('quotation')
      .select("TO_CHAR(quotation.quotationDate, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(quotation.grandTotal)', 'totalValue')
      .where('quotation.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy("TO_CHAR(quotation.quotationDate, 'YYYY-MM')")
      .orderBy("TO_CHAR(quotation.quotationDate, 'YYYY-MM')", 'DESC')
      .limit(12)
      .getRawMany();

    const totalValue = quotations.reduce(
      (sum, q) => sum + Number(q.grandTotal || 0),
      0,
    );

    return {
      message: 'Quotation report fetched successfully',
      data: {
        quotations,
        summary: {
          total: quotations.length,
          totalValue,
          byStatus,
          monthlyTrend,
        },
      },
    };
  }

  async getManufacturingReport(enterpriseId: number) {
    const jobs = await this.jobCardRepository.find({
      where: { enterpriseId },
      relations: ['product', 'assignedEmployee'],
      order: { createdDate: 'DESC' },
    });

    // Group by status
    const byStatus = await this.jobCardRepository
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('job.enterpriseId = :enterpriseId', { enterpriseId })
      .groupBy('job.status')
      .getRawMany();

    // Delayed jobs
    const today = new Date();
    const delayedJobs = jobs.filter(
      (j) =>
        j.expectedCompletion &&
        new Date(j.expectedCompletion) < today &&
        j.status !== 'completed',
    );

    return {
      message: 'Manufacturing report fetched successfully',
      data: {
        jobs,
        summary: {
          total: jobs.length,
          byStatus,
          delayedCount: delayedJobs.length,
          delayedJobs: delayedJobs.map((j) => ({
            id: j.id,
            jobNumber: j.jobNumber,
            jobName: j.jobName,
            expectedCompletion: j.expectedCompletion,
            status: j.status,
          })),
        },
      },
    };
  }
}

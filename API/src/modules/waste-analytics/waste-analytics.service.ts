import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WasteInventory } from '../waste-inventory/entities/waste-inventory.entity';
import { WasteDisposalTransaction } from '../waste-disposal/entities/waste-disposal-transaction.entity';

@Injectable()
export class WasteAnalyticsService {
  constructor(
    @InjectRepository(WasteInventory) private inventoryRepo: Repository<WasteInventory>,
    @InjectRepository(WasteDisposalTransaction) private txnRepo: Repository<WasteDisposalTransaction>,
    private dataSource: DataSource,
  ) {}

  async getSummary(enterpriseId: number, from?: string, to?: string) {
    const invQ = this.inventoryRepo.createQueryBuilder('wi')
      .select('SUM(wi.quantityGenerated)', 'totalGenerated')
      .addSelect('SUM(wi.quantityAvailable)', 'totalAvailable')
      .addSelect('SUM(wi.quantityReserved)', 'totalReserved')
      .addSelect('COUNT(DISTINCT wi.id)', 'totalBatches')
      .where('wi.enterpriseId = :enterpriseId', { enterpriseId });
    if (from) invQ.andWhere('wi.createdDate >= :from', { from });
    if (to) invQ.andWhere('wi.createdDate <= :to', { to });
    const invResult = await invQ.getRawOne();

    const finQ = this.txnRepo.createQueryBuilder('t')
      .select('SUM(t.totalRevenue)', 'totalRevenue')
      .addSelect('SUM(t.totalCost)', 'totalCost')
      .addSelect('SUM(t.totalQuantity)', 'totalDisposed')
      .addSelect('COUNT(DISTINCT t.id)', 'totalTransactions')
      .where('t.enterpriseId = :enterpriseId AND t.status = :s', { enterpriseId, s: 'completed' });
    if (from) finQ.andWhere('t.completedDate >= :from', { from });
    if (to) finQ.andWhere('t.completedDate <= :to', { to });
    const finResult = await finQ.getRawOne();

    const totalRevenue = Number(finResult?.totalRevenue) || 0;
    const totalCost = Number(finResult?.totalCost) || 0;

    return {
      message: 'Summary fetched',
      data: {
        totalGenerated: Number(invResult?.totalGenerated) || 0,
        totalAvailable: Number(invResult?.totalAvailable) || 0,
        totalReserved: Number(invResult?.totalReserved) || 0,
        totalBatches: Number(invResult?.totalBatches) || 0,
        totalDisposed: Number(finResult?.totalDisposed) || 0,
        totalTransactions: Number(finResult?.totalTransactions) || 0,
        totalRevenue,
        totalCost,
        netValue: totalRevenue - totalCost,
      },
    };
  }

  async getBySource(enterpriseId: number, from?: string, to?: string, groupBy = 'month') {
    const truncFn = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';
    const params: any[] = [enterpriseId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND wi.created_date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND wi.created_date <= $${params.length}`; }
    const q = this.dataSource.query(`
      SELECT
        DATE_TRUNC('${truncFn}', wi.created_date) AS period,
        COALESCE(ws.name, 'Unknown') AS source_name,
        ws.source_type,
        SUM(wi.quantity_generated) AS total_generated,
        SUM(wi.quantity_generated - wi.quantity_available - wi.quantity_reserved) AS total_disposed,
        SUM(wi.quantity_available) AS total_remaining,
        wi.unit
      FROM waste_inventory wi
      LEFT JOIN waste_sources ws ON ws.id = wi.source_id
      WHERE wi.enterprise_id = $1 ${dateFilter}
      GROUP BY 1, 2, 3, wi.unit
      ORDER BY 1 DESC, 2
    `, params);
    return { message: 'By source fetched', data: await q };
  }

  async getByCategory(enterpriseId: number, from?: string, to?: string) {
    const params: any[] = [enterpriseId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND wi.created_date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND wi.created_date <= $${params.length}`; }
    const q = this.dataSource.query(`
      SELECT
        wc.name AS category_name,
        wc.classification,
        wc.unit,
        SUM(wi.quantity_generated) AS total_generated,
        SUM(wi.quantity_available) AS total_available,
        SUM(wi.quantity_generated - wi.quantity_available - wi.quantity_reserved) AS total_disposed,
        COUNT(DISTINCT wi.id) AS batch_count
      FROM waste_inventory wi
      JOIN waste_categories wc ON wc.id = wi.category_id
      WHERE wi.enterprise_id = $1 ${dateFilter}
      GROUP BY wc.id, wc.name, wc.classification, wc.unit
      ORDER BY total_generated DESC
    `, params);
    return { message: 'By category fetched', data: await q };
  }

  async getDisposalMethods(enterpriseId: number, from?: string, to?: string) {
    const params: any[] = [enterpriseId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND t.completed_date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND t.completed_date <= $${params.length}`; }
    const q = this.dataSource.query(`
      SELECT
        COALESCE(t.disposal_method, 'unspecified') AS disposal_method,
        t.transaction_type,
        COUNT(*) AS transaction_count,
        SUM(t.total_quantity) AS total_quantity,
        SUM(t.total_revenue) AS total_revenue,
        SUM(t.total_cost) AS total_cost
      FROM waste_disposal_transactions t
      WHERE t.enterprise_id = $1 AND t.status = 'completed' ${dateFilter}
      GROUP BY 1, 2
      ORDER BY total_quantity DESC
    `, params);
    return { message: 'Disposal methods fetched', data: await q };
  }

  async getFinancials(enterpriseId: number, from?: string, to?: string) {
    const params: any[] = [enterpriseId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND t.completed_date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND t.completed_date <= $${params.length}`; }
    const q = this.dataSource.query(`
      SELECT
        DATE_TRUNC('month', t.completed_date) AS month,
        SUM(t.total_revenue) AS revenue,
        SUM(t.total_cost) AS cost,
        SUM(t.total_revenue - t.total_cost) AS net_value,
        COUNT(*) AS transactions,
        SUM(t.total_quantity) AS quantity
      FROM waste_disposal_transactions t
      WHERE t.enterprise_id = $1 AND t.status = 'completed' ${dateFilter}
      GROUP BY 1
      ORDER BY 1 DESC
    `, params);
    return { message: 'Financials fetched', data: await q };
  }

  async getTrends(enterpriseId: number, from?: string, to?: string) {
    const params: any[] = [enterpriseId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND wi.created_date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND wi.created_date <= $${params.length}`; }
    const q = this.dataSource.query(`
      SELECT
        DATE_TRUNC('week', wi.created_date) AS week,
        SUM(wi.quantity_generated) AS total_generated,
        COUNT(DISTINCT wi.id) AS batch_count,
        COUNT(DISTINCT wi.source_id) AS active_sources
      FROM waste_inventory wi
      WHERE wi.enterprise_id = $1 ${dateFilter}
      GROUP BY 1
      ORDER BY 1
    `, params);
    return { message: 'Trends fetched', data: await q };
  }

  async getAging(enterpriseId: number, minDays = 30) {
    const safeMinDays = Number.isFinite(Number(minDays)) ? Math.max(0, Math.floor(Number(minDays))) : 30;
    const q = this.dataSource.query(`
      SELECT
        wi.id,
        wi.batch_no,
        wc.name AS category_name,
        wc.classification,
        ws.name AS source_name,
        wi.quantity_available,
        wi.unit,
        wi.status,
        wi.storage_date,
        CURRENT_DATE - wi.storage_date::date AS days_in_stock,
        wi.expiry_alert_date
      FROM waste_inventory wi
      JOIN waste_categories wc ON wc.id = wi.category_id
      LEFT JOIN waste_sources ws ON ws.id = wi.source_id
      WHERE wi.enterprise_id = $1
        AND wi.status NOT IN ('fully_disposed','cancelled')
        AND (CURRENT_DATE - wi.storage_date::date) >= $2
      ORDER BY days_in_stock DESC
    `, [enterpriseId, safeMinDays]);
    return { message: 'Aging report fetched', data: await q };
  }

  async getPartyPerformance(enterpriseId: number, from?: string, to?: string) {
    const params: any[] = [enterpriseId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND t.completed_date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND t.completed_date <= $${params.length}`; }
    const q = this.dataSource.query(`
      SELECT
        wp.id,
        wp.company_name,
        wp.party_type,
        COUNT(DISTINCT t.id) AS transaction_count,
        SUM(t.total_quantity) AS total_quantity,
        SUM(t.total_revenue) AS total_revenue,
        SUM(t.total_cost) AS total_cost,
        SUM(t.total_revenue - t.total_cost) AS net_value,
        AVG(t.completed_date::date - t.scheduled_date::date) AS avg_completion_days
      FROM waste_parties wp
      LEFT JOIN waste_disposal_transactions t ON t.party_id = wp.id AND t.status = 'completed' ${dateFilter}
      WHERE wp.enterprise_id = $1
      GROUP BY wp.id, wp.company_name, wp.party_type
      ORDER BY total_quantity DESC NULLS LAST
    `, params);
    return { message: 'Party performance fetched', data: await q };
  }
}

import apiClient from './client';
import { ApiResponse } from '@/types/api';
import {
  EnquiryReport,
  ProspectReport,
  FollowupReport,
  CustomerReport,
  EmployeeReport,
  ReportFilters,
  StatusBreakdown,
  SourceBreakdown,
  DateBreakdown,
} from '@/types/reports';

// Status label/color mapping for enquiry interest statuses
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  'Enquiry': { label: 'Enquiry', color: '#1890ff' },
  'enquiry': { label: 'Enquiry', color: '#1890ff' },
  'Follow Up': { label: 'Follow Up', color: '#13c2c2' },
  'follow_up': { label: 'Follow Up', color: '#13c2c2' },
  'New Call': { label: 'New Call', color: '#722ed1' },
  'new_call': { label: 'New Call', color: '#722ed1' },
  'Not Interested': { label: 'Not Interested', color: '#f5222d' },
  'not_interested': { label: 'Not Interested', color: '#f5222d' },
  'Owner Not Available': { label: 'Owner Not Available', color: '#fa8c16' },
  'owner_not_available': { label: 'Owner Not Available', color: '#fa8c16' },
  'Prospect': { label: 'Prospect', color: '#faad14' },
  'prospect': { label: 'Prospect', color: '#faad14' },
  'Quotation Sent': { label: 'Quotation Sent', color: '#a0d911' },
  'quotation_sent': { label: 'Quotation Sent', color: '#a0d911' },
  'Sale Closed': { label: 'Sale Closed', color: '#52c41a' },
  'sale_closed': { label: 'Sale Closed', color: '#52c41a' },
};

function getStatusCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  byStatus: any[],
  ...statusNames: string[]
): number {
  return byStatus
    .filter((s) => statusNames.includes(s.status))
    .reduce((sum, s) => sum + Number(s.count || 0), 0);
}

export async function getSalesEnquiryReport(
  _enterpriseId: number,
  filters?: ReportFilters
): Promise<ApiResponse<EnquiryReport>> {
  const response = await apiClient.get('/reports/enquiries', {
    params: {
      fromDate: filters?.startDate,
      toDate: filters?.endDate,
      source: filters?.source,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  const summary = backendData.data?.summary || {};
  const byStatus = summary.byStatus || [];
  const bySource = summary.bySource || [];
  const monthlyTrend = summary.monthlyTrend || [];
  const total = summary.total || 0;

  // Build status breakdown with labels, colors, and percentages
  const enquiries_by_status: StatusBreakdown[] = byStatus.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => {
      const mapped = STATUS_MAP[s.status] || { label: s.status, color: '#8c8c8c' };
      const count = Number(s.count || 0);
      return {
        status: s.status,
        status_label: mapped.label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: mapped.color,
      };
    }
  );

  // Build source breakdown with percentages
  const enquiries_by_source: SourceBreakdown[] = bySource.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => {
      const count = Number(s.count || 0);
      return {
        source_name: s.source || 'Unknown',
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    }
  );

  // Build date breakdown from monthly trend
  const enquiries_by_date: DateBreakdown[] = monthlyTrend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((d: any) => ({
      date: d.month,
      count: Number(d.count || 0),
    }))
    .reverse();

  const closedCount = getStatusCount(byStatus, 'Sale Closed', 'sale_closed');
  const followUpCount = getStatusCount(byStatus, 'Follow Up', 'follow_up');
  const prospectCount = getStatusCount(byStatus, 'Prospect', 'prospect');
  const notInterestedCount = getStatusCount(byStatus, 'Not Interested', 'not_interested');
  const newEnquiryCount = getStatusCount(byStatus, 'Enquiry', 'enquiry', 'New Call', 'new_call');

  return {
    message: backendData.message,
    data: {
      total_enquiries: total,
      new_enquiries: newEnquiryCount,
      follow_up_count: followUpCount,
      prospects_count: prospectCount,
      closed_count: closedCount,
      not_interested_count: notInterestedCount,
      enquiries_by_source,
      enquiries_by_status,
      enquiries_by_date,
      conversion_rate: total > 0 ? (closedCount / total) * 100 : 0,
    },
  };
}

export async function getSalesProspectReport(
  _enterpriseId: number,
  filters?: ReportFilters
): Promise<ApiResponse<ProspectReport>> {
  const response = await apiClient.get('/reports/prospects');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  const prospects = backendData.data?.prospects || [];
  const summary = backendData.data?.summary || {};

  // Group prospects by assigned employee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeMap: Record<number, any> = {};
  for (const p of prospects) {
    const empId = p.assignedTo || 0;
    const empName = p.assignedEmployee
      ? `${p.assignedEmployee.firstName} ${p.assignedEmployee.lastName || ''}`.trim()
      : 'Unassigned';
    if (!employeeMap[empId]) {
      employeeMap[empId] = { employee_id: empId, employee_name: empName, total_prospects: 0, converted: 0, pending: 0 };
    }
    employeeMap[empId].total_prospects++;
    if (p.interestStatus === 'Sale Closed') {
      employeeMap[empId].converted++;
    } else {
      employeeMap[empId].pending++;
    }
  }
  const prospects_by_employee = Object.values(employeeMap).map((e) => ({
    ...e,
    conversion_rate: e.total_prospects > 0 ? (e.converted / e.total_prospects) * 100 : 0,
  }));

  return {
    message: backendData.message,
    data: {
      total_prospects: summary.total || 0,
      hot_prospects: 0,
      warm_prospects: summary.total || 0,
      cold_prospects: 0,
      converted_prospects: prospects.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.interestStatus === 'Sale Closed'
      ).length,
      prospects_by_employee,
      prospects_by_date: [],
      average_conversion_time: 0,
    },
  };
}

export async function getSalesFollowupReport(
  _enterpriseId: number,
  filters?: ReportFilters
): Promise<ApiResponse<FollowupReport>> {
  const response = await apiClient.get('/reports/followups', {
    params: {
      assignedTo: filters?.employeeId,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  const data = backendData.data || {};
  const summary = data.summary || {};

  const overdueList = data.overdue || [];
  const todayList = data.today || [];
  const upcomingList = data.upcoming || [];
  const totalFollowups = overdueList.length + todayList.length + upcomingList.length;

  // Group by employee
  const allFollowups = [...overdueList, ...todayList, ...upcomingList];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeMap: Record<number, any> = {};
  for (const f of allFollowups) {
    const empId = f.assignedTo || 0;
    const empName = f.assignedEmployee
      ? `${f.assignedEmployee.firstName} ${f.assignedEmployee.lastName || ''}`.trim()
      : 'Unassigned';
    if (!employeeMap[empId]) {
      employeeMap[empId] = { employee_id: empId, employee_name: empName, total_followups: 0, completed: 0, pending: 0 };
    }
    employeeMap[empId].total_followups++;
    if (f.interestStatus === 'Sale Closed') {
      employeeMap[empId].completed++;
    } else {
      employeeMap[empId].pending++;
    }
  }
  const followups_by_employee = Object.values(employeeMap).map((e) => ({
    ...e,
    completion_rate: e.total_followups > 0 ? (e.completed / e.total_followups) * 100 : 0,
  }));

  return {
    message: backendData.message,
    data: {
      total_followups: totalFollowups,
      completed_followups: 0,
      pending_followups: summary.todayCount + summary.upcomingCount || 0,
      overdue_followups: summary.overdueCount || 0,
      followups_by_employee,
      followups_by_date: [],
      average_response_time: 0,
    },
  };
}

export async function getCustomerReport(
  _enterpriseId: number,
  filters?: ReportFilters
): Promise<ApiResponse<CustomerReport>> {
  const response = await apiClient.get('/reports/customers');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  const data = backendData.data || {};
  const customers = data.customers || [];
  const summary = data.summary || {};

  // Count active/inactive
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCount = customers.filter((c: any) => c.status === 'active').length;
  const inactiveCount = customers.length - activeCount;

  // Count new this month
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newThisMonth = (summary.monthlyAcquisition || []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.month === thisMonthStr
  );

  // Map state breakdown
  const byState = summary.byState || [];
  const totalCustomers = summary.total || customers.length;
  const customers_by_state = byState.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => {
      const count = Number(s.count || 0);
      return {
        state: s.state,
        count,
        percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
      };
    }
  );

  // Map monthly acquisition to date breakdown
  const customers_by_date: DateBreakdown[] = (summary.monthlyAcquisition || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((d: any) => ({
      date: d.month,
      count: Number(d.count || 0),
    }))
    .reverse();

  return {
    message: backendData.message,
    data: {
      total_customers: totalCustomers,
      active_customers: activeCount,
      inactive_customers: inactiveCount,
      new_customers_this_month: Number(newThisMonth?.count || 0),
      customers_by_state,
      customers_by_date,
      top_customers: [],
    },
  };
}

export async function getEmployeePerformanceReport(
  _enterpriseId: number,
  filters?: ReportFilters
): Promise<ApiResponse<EmployeeReport[]>> {
  const response = await apiClient.get('/reports/employees', {
    params: {
      fromDate: filters?.startDate,
      toDate: filters?.endDate,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  const performance = backendData.data || [];

  const mapped: EmployeeReport[] = performance.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      employee_id: p.employee?.id || 0,
      employee_name: p.employee?.name || 'Unknown',
      department: '',
      designation: '',
      total_enquiries: p.metrics?.totalEnquiries || 0,
      total_prospects: p.metrics?.prospects || 0,
      total_conversions: p.metrics?.closedSales || 0,
      total_followups: 0,
      conversion_rate: p.metrics?.conversionRate || 0,
      average_response_time: 0,
    })
  );

  return {
    message: backendData.message,
    data: mapped,
  };
}

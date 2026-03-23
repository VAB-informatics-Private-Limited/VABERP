import apiClient from './client';
import { ApiResponse, FollowupItem } from '@/types';

interface ActivityItem {
  id: number;
  type: 'enquiry' | 'customer' | 'quotation' | 'sale';
  title: string;
  description: string;
  time: string;
}

interface MonthlyTrend {
  month: string;
  count: string;
}

export interface DashboardData {
  todayFollowups: number;
  overdueFollowups: number;
  totalEnquiries: number;
  totalProspects: number;
  totalCustomers: number;
  totalQuotations: number;
  pendingQuotations: number;
  acceptedQuotations: number;
  activeJobs: number;
  pendingJobs: number;
  completedJobs: number;
  lowStockAlerts: number;
  pipelineStats: { status: string; count: string }[];
  quotationValues: { status: string; totalValue: string }[];
  recentActivities: ActivityItem[];
  monthlyTrend: MonthlyTrend[];
}

interface DashboardParams {
  enterpriseId?: number;
  employee_id?: number;
}

// Get Dashboard Overview (unified endpoint)
export async function getDashboard(): Promise<ApiResponse<DashboardData>> {
  const response = await apiClient.get<ApiResponse<DashboardData>>('/reports/dashboard');
  return response.data;
}

// Get Today's Follow-ups
export async function getTodayFollowups(params?: DashboardParams): Promise<ApiResponse<FollowupItem[]>> {
  const response = await apiClient.get<ApiResponse<FollowupItem[]>>('/enquiries/today-followups', {
    params: { assignedTo: params?.employee_id },
  });
  return response.data;
}

// Get Sales Enquiry Reports (for total enquiries count)
export async function getSalesEnquiryReports(params?: {
  enterpriseId?: number;
  page?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse> {
  const response = await apiClient.get<ApiResponse>('/reports/enquiry', {
    params: {
      startDate: params?.startDate,
      endDate: params?.endDate,
    },
  });
  return response.data;
}

// Get Sales Prospects Report
export async function getSalesProspectsReport(params?: {
  enterpriseId?: number;
  page?: number;
}): Promise<ApiResponse> {
  const response = await apiClient.get<ApiResponse>('/reports/prospect', {
    params: { page: params?.page },
  });
  return response.data;
}

// Get Customer List Report (for total customers count)
export async function getCustomerListReport(params?: {
  enterpriseId?: number;
  page?: number;
}): Promise<ApiResponse> {
  const response = await apiClient.get<ApiResponse>('/reports/customer', {
    params: { page: params?.page },
  });
  return response.data;
}

// Get Sales Follow-up Report
export async function getSalesFollowupReport(params?: {
  enterpriseId?: number;
  page?: number;
}): Promise<ApiResponse> {
  const response = await apiClient.get<ApiResponse>('/reports/followup', {
    params: { page: params?.page },
  });
  return response.data;
}

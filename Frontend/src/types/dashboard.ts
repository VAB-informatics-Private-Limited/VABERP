export interface DashboardStats {
  totalEnquiries: number;
  activeProspects: number;
  totalCustomers: number;
  todayFollowups: number;
}

export interface FollowupItem {
  id: number;
  business_name: string;
  contact_person: string;
  mobile: string;
  interest_status: string;
  followup_date: string;
  remarks?: string;
  employee_name?: string;
}

export interface SalesPipelineData {
  stage: string;
  count: number;
  value: string;
}

export interface InterestStatus {
  id: number;
  status_name: string;
  status_value: string;
  active: 0 | 1;
}

export interface EnquiryReport {
  total_enquiries: number;
  new_enquiries: number;
  follow_up_count: number;
  prospects_count: number;
  closed_count: number;
  not_interested_count: number;
  enquiries_by_source: SourceBreakdown[];
  enquiries_by_status: StatusBreakdown[];
  enquiries_by_date: DateBreakdown[];
  conversion_rate: number;
}

export interface SourceBreakdown {
  source_name: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdown {
  status: string;
  status_label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DateBreakdown {
  date: string;
  count: number;
}

export interface ProspectReport {
  total_prospects: number;
  hot_prospects: number;
  warm_prospects: number;
  cold_prospects: number;
  converted_prospects: number;
  prospects_by_employee: EmployeeProspects[];
  prospects_by_date: DateBreakdown[];
  average_conversion_time: number;
}

export interface EmployeeProspects {
  employee_id: number;
  employee_name: string;
  total_prospects: number;
  converted: number;
  pending: number;
  conversion_rate: number;
}

export interface FollowupReport {
  total_followups: number;
  completed_followups: number;
  pending_followups: number;
  overdue_followups: number;
  followups_by_employee: EmployeeFollowups[];
  followups_by_date: DateBreakdown[];
  average_response_time: number;
}

export interface EmployeeFollowups {
  employee_id: number;
  employee_name: string;
  total_followups: number;
  completed: number;
  pending: number;
  completion_rate: number;
}

export interface CustomerReport {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
  new_customers_this_month: number;
  customers_by_state: StateBreakdown[];
  customers_by_date: DateBreakdown[];
  top_customers: TopCustomer[];
}

export interface StateBreakdown {
  state: string;
  count: number;
  percentage: number;
}

export interface TopCustomer {
  customer_id: number;
  customer_name: string;
  total_orders: number;
  total_value: number;
}

export interface EmployeeReport {
  employee_id: number;
  employee_name: string;
  department: string;
  designation: string;
  total_enquiries: number;
  total_prospects: number;
  total_conversions: number;
  total_followups: number;
  conversion_rate: number;
  average_response_time: number;
}

export interface SalesSummary {
  total_enquiries: number;
  total_prospects: number;
  total_customers: number;
  total_quotations: number;
  conversion_rate: number;
  pipeline_value: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  source?: string;
  status?: string;
}

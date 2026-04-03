export type CrmLeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'not_interested'
  | 'follow_up'
  | 'converted'
  | 'lost';

export interface CrmLead {
  id: number;
  enterprise_id: number;
  lead_number: string;
  customer_name: string;
  email?: string | null;
  mobile?: string | null;
  business_name?: string | null;
  gst_number?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  source?: string | null;
  status: CrmLeadStatus;
  expected_value?: number | null;
  requirements?: string | null;
  remarks?: string | null;
  next_followup_date?: string | null;
  created_by?: number | null;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  assigned_by?: number | null;
  manager_id?: number | null;
  manager_name?: string | null;
  converted_customer_id?: number | null;
  customer_id?: number | null;
  created_date: string;
  modified_date?: string;
}

export interface CrmFollowup {
  id: number;
  enterprise_id: number;
  crm_lead_id: number;
  created_by: number;
  created_by_name?: string;
  followup_type: string;
  followup_date: string;
  status?: string | null;
  notes?: string | null;
  next_followup_date?: string | null;
  next_followup_type?: string | null;
  created_date: string;
}

export interface CrmActivity {
  id: number;
  enterprise_id: number;
  crm_lead_id: number;
  performed_by: number;
  performed_by_name?: string;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  description?: string | null;
  created_date: string;
}

export interface ModuleTeamLeader {
  id: number;
  module_name: string;
  employee_id: number;
  employee_name: string;
  employee_email?: string;
}

export interface CrmTeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  reporting_to?: number | null;
}

export interface CrmPerformanceStat {
  employee_id: number;
  employee_name: string;
  total: number;
  converted: number;
  lost: number;
  active: number;
  conversion_rate: number;
}

export interface CrmSummary {
  total: number;
  by_status: Array<{ status: string; count: number }>;
}

export const CRM_STATUS_OPTIONS: { value: CrmLeadStatus; label: string; color: string }[] = [
  { value: 'new',           label: 'New',          color: 'blue'    },
  { value: 'contacted',     label: 'Contacted',    color: 'cyan'    },
  { value: 'interested',    label: 'Interested',   color: 'green'   },
  { value: 'not_interested',label: 'Not Interested',color: 'red'   },
  { value: 'follow_up',     label: 'Follow Up',    color: 'orange'  },
  { value: 'converted',     label: 'Converted',    color: 'success' },
  { value: 'lost',          label: 'Lost',         color: 'default' },
];

export const FOLLOWUP_TYPE_OPTIONS = [
  { value: 'Call',      label: 'Call'      },
  { value: 'Email',     label: 'Email'     },
  { value: 'Meeting',   label: 'Meeting'   },
  { value: 'Visit',     label: 'Visit'     },
  { value: 'WhatsApp',  label: 'WhatsApp'  },
];

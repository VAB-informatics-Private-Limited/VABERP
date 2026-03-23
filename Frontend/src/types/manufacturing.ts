export type JobCardStatus =
  | 'pending'
  | 'in_process'
  | 'partially_completed'
  | 'completed_production'
  | 'ready_for_approval'
  | 'approved_for_dispatch'
  | 'dispatched'
  // legacy statuses (backward compat)
  | 'ready_for_dispatch'
  | 'stock_verification'
  | 'stock_not_available'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export interface JobCard {
  id: number;
  enterprise_id: number;
  job_card_number: string;
  job_name?: string;
  parent_job_card_id?: number | null;
  stage_number?: number | null;
  child_job_cards?: JobCard[];
  selected_materials?: JobCardMaterialItem[];
  product_id: number;
  product_name?: string;
  product_code?: string;
  customer_id?: number;
  customer_name?: string;
  order_id?: number;
  order_number?: string;
  sales_order_id?: number;
  quantity: number;
  unit?: string;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: JobCardStatus;
  assigned_to?: number;
  assigned_to_name?: string;
  remarks?: string;
  // New production tracking fields
  estimated_production_days?: number;
  quantity_completed: number;
  shortage_notes?: string;
  dispatch_on_hold: boolean;
  // Stage-based production workflow
  production_stage: ProductionStage;
  material_status: MaterialStatus;
  stage_progress: StageProgress[];
  stage_history?: JobCardStageHistory[];
  material_request_id?: number;
  material_request_number?: string;
  material_request_status?: string;
  created_by: number;
  created_by_name?: string;
  created_date: string;
  modified_date?: string;
}

export interface JobCardProgress {
  id: number;
  job_card_id: number;
  progress_date: string;
  quantity_completed: number;
  remarks?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_date: string;
}

export type ProductionStage = string;

export type MaterialStatus =
  | 'PENDING_INVENTORY'
  | 'PARTIALLY_ISSUED'
  | 'FULLY_ISSUED'
  | 'REQUESTED_RECHECK';

export interface StageProgress {
  id: number;
  stage_master_id?: number;
  stage_name: string;
  description?: string;
  sort_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  start_time?: string;
  end_time?: string;
  actual_hours?: number;
  completed_by?: number;
  completed_by_name?: string;
  completed_date?: string;
  notes?: string;
}

export interface JobCardStageHistory {
  id: number;
  from_stage: string | null;
  to_stage: string;
  moved_by?: number;
  moved_by_name?: string;
  started_at: string;
  completed_at?: string;
  notes?: string;
  created_date: string;
}

export const MATERIAL_STATUS_OPTIONS: { value: MaterialStatus; label: string; color: string }[] = [
  { value: 'PENDING_INVENTORY', label: 'Pending Inventory', color: 'default' },
  { value: 'PARTIALLY_ISSUED', label: 'Partially Issued', color: 'orange' },
  { value: 'FULLY_ISSUED', label: 'Fully Issued', color: 'green' },
  { value: 'REQUESTED_RECHECK', label: 'Recheck Requested', color: 'red' },
];

export interface JobCardMaterialItem {
  rawMaterialId?: number;
  itemName: string;
  requiredQuantity: number;
  unitOfMeasure?: string;
  availableStock?: number;
}

export interface JobCardFormData {
  job_name: string;
  product_id?: number;
  customer_id?: number;
  order_id?: number;
  quantity: number;
  start_date?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status?: JobCardStatus;
  assigned_to?: number;
  remarks?: string;
  materials?: JobCardMaterialItem[];
}

export interface JobCardListParams {
  enterpriseId: number;
  page?: number;
  pageSize?: number;
  status?: JobCardStatus;
  priority?: string;
  productId?: number;
  customerId?: number;
  salesOrderId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ProcessTemplate {
  id: number;
  enterprise_id: number;
  process_name: string;
  description?: string;
  estimated_time?: number;
  time_unit?: 'minutes' | 'hours' | 'days';
  sequence_order: number;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface ProcessTemplateFormData {
  process_name: string;
  description?: string;
  estimated_time?: number;
  time_unit?: 'minutes' | 'hours' | 'days';
  sequence_order: number;
  status?: 'active' | 'inactive';
}

export interface JobCardProcess {
  id: number;
  job_card_id: number;
  process_id: number;
  process_name?: string;
  description?: string;
  sequence_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  completed_by?: number;
  completed_by_name?: string;
  remarks?: string;
  created_date: string;
}

export interface JobCardProcessFormData {
  job_card_id: number;
  process_id: number;
  sequence_order: number;
  process_name?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_to?: number;
  remarks?: string;
}

export const JOB_CARD_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'default' },
  { value: 'in_process', label: 'In Process', color: 'blue' },
  { value: 'partially_completed', label: 'Partially Completed', color: 'orange' },
  { value: 'completed_production', label: 'Production Complete', color: 'cyan' },
  { value: 'ready_for_approval', label: 'Ready for Approval', color: 'gold' },
  { value: 'approved_for_dispatch', label: 'Approved for Dispatch', color: 'purple' },
  { value: 'dispatched', label: 'Dispatched', color: 'success' },
  // legacy
  { value: 'ready_for_dispatch', label: 'Ready for Dispatch', color: 'purple' },
  { value: 'stock_verification', label: 'Stock Verification', color: 'processing' },
  { value: 'stock_not_available', label: 'Stock Not Available', color: 'error' },
  { value: 'in_progress', label: 'In Progress', color: 'processing' },
  { value: 'on_hold', label: 'On Hold', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' },
];

export const PROCESS_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'default' },
  { value: 'in_progress', label: 'In Progress', color: 'processing' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'skipped', label: 'Skipped', color: 'warning' },
];

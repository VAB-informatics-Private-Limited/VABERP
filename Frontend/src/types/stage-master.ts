export interface StageMaster {
  id: number;
  enterprise_id: number;
  stage_name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_date: string;
  modified_date?: string;
}

export interface StageMasterFormData {
  stage_name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UnitMaster {
  id: number;
  enterprise_id: number;
  unit_name: string;
  short_name?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_date: string;
  modified_date?: string;
}

export interface UnitMasterFormData {
  unit_name: string;
  short_name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

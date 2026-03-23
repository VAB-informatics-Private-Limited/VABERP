export interface Source {
  id: number;
  enterprise_id: number;
  source_name: string;
  source_code: string;
  is_active: boolean;
  sequence_order: number;
  created_date?: string;
  modified_date?: string;
}

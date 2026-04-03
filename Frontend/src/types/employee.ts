export interface Department {
  id: number;
  enterprise_id: number;
  department_name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface Designation {
  id: number;
  enterprise_id: number;
  department_id: number;
  department_name?: string;
  designation_name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface EmployeeDetails {
  id: number;
  enterprise_id: number;
  department_id: number;
  designation_id: number;
  department_name?: string;
  designation_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  hire_date: string;
  status: 'active' | 'inactive';
  created_date: string;
  reporting_to?: number | null;
  is_reporting_head?: boolean;
  reporting_manager_id?: number | null;
}

export interface DepartmentFormData {
  department_name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface DesignationFormData {
  department_id: number;
  designation_name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface ReportingManager {
  id: number;
  enterprise_id: number;
  name: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface EmployeeFormData {
  department_id: number;
  designation_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone_number: string;
  hire_date: string;
  status?: 'active' | 'inactive';
  reporting_to?: number | null;
  reporting_manager_id?: number | null;
}

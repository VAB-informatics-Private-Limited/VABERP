export interface Employee {
  id: number;
  enterprise_id: number;
  department_id: number;
  designation_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone_number: string;
  hire_date: string;
  created_date: string;
  status: 'active' | 'inactive';
  is_reporting_head?: boolean;
  reporting_to?: number | null;
}

export interface Enterprise {
  enterprise_id: number;
  business_name: string;
  email: string;
  mobile: string;
  address?: string;
  state: string;
  city: string;
  pincode?: string;
  gst_number?: string;
  cin_number?: string;
  licencekey?: string;
  expiry_date: string;
  email_status: 0 | 1;
  mobile_status: 0 | 1;
  status:
    | 'active'
    | 'inactive'
    | 'blocked'
    | 'pending'
    | 'pending_email_verification'
    | 'pending_review'
    | 'approved_pending_completion'
    | 'rejected';
  subscription_status?: 'active' | 'expired' | 'none';
  plan_id?: number | null;
  subscription_start_date?: string | null;
}

export type MenuPermissions = Record<string, Record<string, Record<string, 0 | 1>>>;

export type UserType = 'employee' | 'enterprise';

export interface AuthUser {
  user: Employee | Enterprise;
  userType: UserType;
  permissions: MenuPermissions | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface EnterpriseRegistration {
  businessName: string;
  businessEmail: string;
  businessMobile: string;
  businessAddress: string;
  businessState: string;
  businessCity: string;
  pincode: string;
  gstNumber?: string;
  cinNumber?: string;
}

export interface OtpVerification {
  email_id?: string;
  mobile_number?: string;
  otp: string;
}

export interface PasswordReset {
  email_id: string;
  oldpassword: string;
  confirmpassword: string;
}

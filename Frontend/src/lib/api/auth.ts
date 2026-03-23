import apiClient from './client';
import {
  ApiResponse,
  Employee,
  Enterprise,
  MenuPermissions,
  LoginCredentials,
  EnterpriseRegistration,
  OtpVerification,
  PasswordReset,
} from '@/types';

// Response type that includes JWT token
interface LoginResponse<T> {
  message: string;
  data: T;
  access_token?: string;
}

// Employee Login
export async function employeeLogin(credentials: LoginCredentials): Promise<LoginResponse<Employee>> {
  const response = await apiClient.post<LoginResponse<Employee>>('/auth/employee/login', credentials);
  return response.data;
}

// Enterprise Login - Step 1: Verify Email
export async function verifyEnterpriseEmail(email: string): Promise<ApiResponse<Enterprise>> {
  const response = await apiClient.post<ApiResponse<Enterprise>>('/auth/enterprise/verify-email', { email });
  return response.data;
}

// Enterprise Login - Step 2: Verify OTP
export async function verifyOtp(email: string, otp: string): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/auth/enterprise/verify-otp', { email, otp });
  return response.data;
}

// Enterprise Login - Step 3: Login with Password
export async function verifyEnterprisePassword(email: string, password: string): Promise<LoginResponse<Enterprise>> {
  const response = await apiClient.post<LoginResponse<Enterprise>>('/auth/enterprise/login', { email, password });
  return response.data;
}

// Alias for compatibility
export async function verifyPassword(email_id: string, password: string): Promise<LoginResponse<Enterprise>> {
  return verifyEnterprisePassword(email_id, password);
}

// Verify Email OTP (legacy compatibility)
export async function verifyEmailOtp(data: OtpVerification): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/auth/enterprise/verify-otp', {
    email: data.email_id,
    otp: data.otp,
  });
  return response.data;
}

// Verify Mobile OTP (legacy compatibility - may need backend implementation)
export async function verifyMobileOtp(data: OtpVerification): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/auth/enterprise/verify-otp', {
    email: data.email_id,
    otp: data.otp,
  });
  return response.data;
}

// Register Enterprise
export async function registerEnterprise(data: EnterpriseRegistration): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/auth/register', data);
  return response.data;
}

// Reset Password
export async function resetPassword(data: PasswordReset): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/auth/reset-password', data);
  return response.data;
}

// Get Employee Permissions (uses JWT - employee_id extracted from token)
export async function getPermissions(employee_id?: number): Promise<ApiResponse<MenuPermissions>> {
  const response = await apiClient.get<ApiResponse<MenuPermissions>>('/auth/permissions');
  return response.data;
}

// Get Current User Info
export async function getCurrentUser(): Promise<ApiResponse> {
  const response = await apiClient.get<ApiResponse>('/auth/me');
  return response.data;
}

// Update Menu Permissions
export async function updatePermissions(data: MenuPermissions & { enterprise_id?: number }): Promise<ApiResponse> {
  const response = await apiClient.put<ApiResponse>('/employees/permissions', data);
  return response.data;
}

import apiClient from './client';
import { ApiResponse } from '@/types/api';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export async function sendEmail(payload: SendEmailPayload): Promise<ApiResponse<{ sent: boolean }>> {
  const response = await apiClient.post<ApiResponse<{ sent: boolean }>>('/email/send', payload);
  return response.data;
}

export async function getEmailStatus(): Promise<ApiResponse<{ configured: boolean }>> {
  const response = await apiClient.get<ApiResponse<{ configured: boolean }>>('/email/status');
  return response.data;
}

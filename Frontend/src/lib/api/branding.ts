import apiClient from './client';
import { EnterpriseBranding } from '@/types/branding';

interface ApiResponse<T = any> {
  message: string;
  data: T;
}

export async function getBrandingBySlug(slug: string): Promise<ApiResponse<EnterpriseBranding | null>> {
  const response = await apiClient.get(`/branding/by-slug/${slug}`);
  return response.data;
}

export async function getMyBranding(): Promise<ApiResponse<EnterpriseBranding | null>> {
  const response = await apiClient.get('/branding');
  return response.data;
}

// Map frontend snake_case keys (the EnterpriseBranding shape) to the camelCase
// keys the NestJS DTO expects. Anything not listed here is dropped on save.
const SNAKE_TO_CAMEL: Record<string, string> = {
  app_name: 'appName',
  tagline: 'tagline',
  logo_url: 'logoUrl',
  logo_small_url: 'logoSmallUrl',
  favicon_url: 'faviconUrl',
  primary_color: 'primaryColor',
  secondary_color: 'secondaryColor',
  accent_color: 'accentColor',
  color_bg_layout: 'colorBgLayout',
  login_bg_image_url: 'loginBgImageUrl',
  font_family: 'fontFamily',
  border_radius: 'borderRadius',
  sidebar_bg_color: 'sidebarBgColor',
  sidebar_text_color: 'sidebarTextColor',
};

export async function saveBranding(data: Partial<EnterpriseBranding>): Promise<ApiResponse<EnterpriseBranding>> {
  const payload: Record<string, unknown> = {};
  for (const [snake, value] of Object.entries(data)) {
    const camel = SNAKE_TO_CAMEL[snake];
    if (!camel) continue;
    // Send empty strings as null so the backend can clear optional fields
    payload[camel] = value === '' ? null : value;
  }
  const response = await apiClient.put('/branding', payload);
  return response.data;
}

export async function uploadBrandingLogo(file: File): Promise<ApiResponse<EnterpriseBranding>> {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await apiClient.post('/branding/logo', formData);
  return response.data;
}

export async function uploadBrandingLogoSmall(file: File): Promise<ApiResponse<EnterpriseBranding>> {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await apiClient.post('/branding/logo-small', formData);
  return response.data;
}

export async function uploadBrandingFavicon(file: File): Promise<ApiResponse<EnterpriseBranding>> {
  const formData = new FormData();
  formData.append('favicon', file);
  const response = await apiClient.post('/branding/favicon', formData);
  return response.data;
}

export async function uploadBrandingLoginBg(file: File): Promise<ApiResponse<EnterpriseBranding>> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post('/branding/login-bg', formData);
  return response.data;
}

export async function getBrandingVersions(page = 1, limit = 20): Promise<ApiResponse<any[]> & { totalRecords?: number }> {
  const response = await apiClient.get('/branding/versions', { params: { page, limit } });
  return response.data;
}

export async function rollbackBranding(version: number): Promise<ApiResponse<EnterpriseBranding>> {
  const response = await apiClient.post(`/branding/rollback/${version}`);
  return response.data;
}

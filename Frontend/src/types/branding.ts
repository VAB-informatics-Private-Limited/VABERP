export interface EnterpriseBranding {
  id?: number;
  enterprise_id?: number;
  app_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  logo_small_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  color_bg_layout: string;
  login_bg_image_url: string | null;
  font_family: string;
  border_radius: number;
  sidebar_bg_color: string | null;
  sidebar_text_color: string | null;
  // Only returned from by-slug endpoint
  businessName?: string;
}

export const DEFAULT_BRANDING: EnterpriseBranding = {
  app_name: 'VAB Enterprise',
  tagline: 'Enterprise Resource Planning',
  logo_url: '/logo-icon.png',
  logo_small_url: '/logo-icon.png',
  favicon_url: '/favicon.png',
  primary_color: '#1677ff',
  secondary_color: '#111827',
  accent_color: null,
  color_bg_layout: '#f0f4f8',
  login_bg_image_url: null,
  font_family: 'Inter',
  border_radius: 8,
  sidebar_bg_color: null,
  sidebar_text_color: null,
};

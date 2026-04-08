export interface PrintTemplateConfig {
  id?: number;
  enterprise_id: number;
  company_name?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  logo_width: number;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gst_number?: string | null;
  cin_number?: string | null;
  header_alignment: 'left' | 'center' | 'right';
  header_style: 'compact' | 'detailed';
  show_gst: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_tagline: boolean;
  show_logo: boolean;
  footer_text?: string | null;
  show_footer: boolean;
  watermark_text?: string | null;
  show_watermark: boolean;
  current_version: number;
  updated_at?: string;
}

export interface PrintTemplateVersion {
  id: number;
  enterprise_id: number;
  version_number: number;
  snapshot: Partial<PrintTemplateConfig>;
  change_notes?: string | null;
  changed_by?: number | null;
  changed_at: string;
}

export const DEFAULT_PRINT_TEMPLATE: PrintTemplateConfig = {
  enterprise_id: 0,
  logo_width: 120,
  header_alignment: 'left',
  header_style: 'detailed',
  show_gst: true,
  show_email: true,
  show_phone: true,
  show_tagline: false,
  show_logo: true,
  show_footer: false,
  show_watermark: false,
  current_version: 0,
};

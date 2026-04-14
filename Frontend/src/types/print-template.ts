export interface PrintTemplateConfig {
  id?: number;
  enterprise_id: number;

  // ── Company info ──────────────────────────────────────────────────────────
  company_name?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  logo_width: number;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gst_number?: string | null;
  cin_number?: string | null;

  // ── Layout ────────────────────────────────────────────────────────────────
  header_alignment: 'left' | 'center' | 'right';
  header_style: 'compact' | 'detailed';

  // ── Visibility toggles ────────────────────────────────────────────────────
  show_gst: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_tagline: boolean;
  show_logo: boolean;
  show_footer: boolean;
  show_watermark: boolean;
  show_signature: boolean;
  show_page_number: boolean;

  // ── Footer & watermark ────────────────────────────────────────────────────
  footer_text?: string | null;
  watermark_text?: string | null;

  // ── Branding (CMS-driven, no hardcoding) ──────────────────────────────────
  primary_color: string;     // e.g. "#f97316"
  secondary_color: string;   // e.g. "#111827"
  accent_color?: string | null;
  font_family: string;       // e.g. "Arial, Helvetica, sans-serif"

  // ── Signature ─────────────────────────────────────────────────────────────
  signature_url?: string | null;

  // ── Meta ──────────────────────────────────────────────────────────────────
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
  show_signature: true,
  show_page_number: false,
  primary_color: '#f97316',
  secondary_color: '#111827',
  accent_color: null,
  font_family: 'Arial, Helvetica, sans-serif',
  signature_url: null,
  current_version: 0,
};

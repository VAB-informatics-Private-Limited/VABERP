import apiClient from './client';
import { PrintTemplateConfig, PrintTemplateVersion } from '@/types/print-template';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConfig(data: any): PrintTemplateConfig {
  return {
    id: data.id,
    enterprise_id: data.enterprise_id ?? data.enterpriseId,
    company_name: data.company_name ?? data.companyName ?? null,
    tagline: data.tagline ?? null,
    logo_url: data.logo_url ?? data.logoUrl ?? null,
    logo_width: data.logo_width ?? data.logoWidth ?? 120,
    address: data.address ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    gst_number: data.gst_number ?? data.gstNumber ?? null,
    cin_number: data.cin_number ?? data.cinNumber ?? null,
    header_alignment: data.header_alignment ?? data.headerAlignment ?? 'left',
    header_style: data.header_style ?? data.headerStyle ?? 'detailed',
    show_gst: data.show_gst ?? data.showGst ?? true,
    show_email: data.show_email ?? data.showEmail ?? true,
    show_phone: data.show_phone ?? data.showPhone ?? true,
    show_tagline: data.show_tagline ?? data.showTagline ?? false,
    show_logo: data.show_logo ?? data.showLogo ?? true,
    footer_text: data.footer_text ?? data.footerText ?? null,
    show_footer: data.show_footer ?? data.showFooter ?? false,
    watermark_text: data.watermark_text ?? data.watermarkText ?? null,
    show_watermark: data.show_watermark ?? data.showWatermark ?? false,
    current_version: data.current_version ?? data.currentVersion ?? 0,
    updated_at: data.updated_at ?? data.updatedAt,
  };
}

export async function getPrintTemplateConfig(): Promise<PrintTemplateConfig> {
  const res = await apiClient.get('/print-templates/config');
  const payload = res.data?.data ?? res.data;
  return mapConfig(payload);
}

export async function savePrintTemplateConfig(
  payload: Partial<PrintTemplateConfig> & { changeNotes?: string },
): Promise<PrintTemplateConfig> {
  const body = {
    companyName: payload.company_name,
    tagline: payload.tagline,
    logoWidth: payload.logo_width,
    address: payload.address,
    phone: payload.phone,
    email: payload.email,
    gstNumber: payload.gst_number,
    cinNumber: payload.cin_number,
    headerAlignment: payload.header_alignment,
    headerStyle: payload.header_style,
    showGst: payload.show_gst,
    showEmail: payload.show_email,
    showPhone: payload.show_phone,
    showTagline: payload.show_tagline,
    showLogo: payload.show_logo,
    footerText: payload.footer_text,
    showFooter: payload.show_footer,
    watermarkText: payload.watermark_text,
    showWatermark: payload.show_watermark,
    changeNotes: payload.changeNotes,
  };
  const res = await apiClient.put('/print-templates/config', body);
  return mapConfig(res.data?.data ?? res.data);
}

export async function uploadPrintTemplateLogo(file: File): Promise<{ logo_url: string }> {
  const form = new FormData();
  form.append('logo', file);
  // Do NOT set Content-Type manually — axios will set multipart/form-data with correct boundary
  const res = await apiClient.post('/print-templates/config/logo', form, {
    headers: { 'Content-Type': undefined },
    transformRequest: [(data) => data], // skip the default JSON transform for FormData
  });
  const data = res.data?.data ?? res.data;
  return { logo_url: data.logo_url ?? data.logoUrl };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVersion(v: any): PrintTemplateVersion {
  return {
    id: v.id,
    enterprise_id: v.enterprise_id ?? v.enterpriseId,
    version_number: v.version_number ?? v.versionNumber,
    snapshot: v.snapshot ?? {},
    change_notes: v.change_notes ?? v.changeNotes ?? null,
    changed_by: v.changed_by ?? v.changedBy ?? null,
    changed_at: v.changed_at ?? v.changedAt,
  };
}

export async function getPrintTemplateVersions(): Promise<PrintTemplateVersion[]> {
  const res = await apiClient.get('/print-templates/config/versions');
  const payload = res.data?.data ?? res.data;
  // service returns { data: [...], totalRecords: N }
  const arr = Array.isArray(payload) ? payload : (payload?.data ?? []);
  return arr.map(mapVersion);
}

export async function rollbackPrintTemplate(version: number): Promise<PrintTemplateConfig> {
  const res = await apiClient.post(`/print-templates/config/rollback/${version}`);
  return mapConfig(res.data?.data ?? res.data);
}

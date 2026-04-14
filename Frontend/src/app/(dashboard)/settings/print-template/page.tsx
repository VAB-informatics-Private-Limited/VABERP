'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Typography, Card, Form, Input, Button, Switch, Select, Row, Col,
  Upload, message, Tabs, Tag, Popconfirm, Spin, Alert, Badge, Divider,
} from 'antd';
import {
  SaveOutlined, UploadOutlined, ArrowLeftOutlined, RollbackOutlined,
  EyeOutlined, HistoryOutlined, SettingOutlined, CheckCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPrintTemplateConfig,
  savePrintTemplateConfig,
  uploadPrintTemplateLogo,
  getPrintTemplateVersions,
  rollbackPrintTemplate,
} from '@/lib/api/print-templates';
import { PrintMasterTemplate } from '@/components/print-engine/PrintMasterTemplate';
import { PrintTemplateConfig, DEFAULT_PRINT_TEMPLATE, PrintTemplateVersion } from '@/types/print-template';
import { fmt } from '@/lib/print/utils';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://64.235.43.187:2261';

// ─── Sample document data for preview ────────────────────────────────────────
const SAMPLE_ITEMS = [
  { id: 1, product_name: 'GI DB Box 4-Way', product_code: 'SKU-DB4W', hsn_code: '85371010', quantity: 2, unit: 'Nos', unit_price: 1100, discount_percent: 5, tax_percent: 18, total_amount: 2079.80 },
  { id: 2, product_name: 'Cable Tray 600mm', product_code: 'SKU-CT6', hsn_code: '73089090', quantity: 10, unit: 'Mtr', unit_price: 450, discount_percent: 0, tax_percent: 12, total_amount: 5040 },
];
const SAMPLE_SUBTOTAL   = 7119.80;
const SAMPLE_TAX        = 799.80;
const SAMPLE_TOTAL      = 7919.60;

const PREVIEW_COLUMNS = [
  { key: 'item',   label: 'Item / Description', align: 'left'   as const },
  { key: 'qty',    label: 'Qty',                align: 'center' as const, width: 52 },
  { key: 'unit',   label: 'Unit',               align: 'center' as const, width: 52 },
  { key: 'rate',   label: 'Rate',               align: 'right'  as const, width: 90 },
  { key: 'disc',   label: 'Disc%',              align: 'center' as const, width: 56 },
  { key: 'tax',    label: 'Tax%',               align: 'center' as const, width: 56 },
  { key: 'amount', label: 'Amount',             align: 'right'  as const, width: 96 },
];

// ─── Color picker sub-component ──────────────────────────────────────────────
function ColorField({
  label, fieldName, tooltip, form, onPreviewChange,
}: {
  label: string;
  fieldName: string;
  tooltip?: string;
  form: any;
  onPreviewChange: (field: string, value: string) => void;
}) {
  const [localVal, setLocalVal] = useState<string>(form.getFieldValue(fieldName) || '#f97316');

  // sync when form value changes externally (e.g. on load / rollback)
  useEffect(() => {
    const v = form.getFieldValue(fieldName);
    if (v) setLocalVal(v);
  }, [form.getFieldValue(fieldName)]);

  const handleChange = (v: string) => {
    setLocalVal(v);
    form.setFieldValue(fieldName, v);
    onPreviewChange(fieldName, v);
  };

  return (
    <Form.Item label={label} name={fieldName} tooltip={tooltip}>
      <Input
        value={localVal}
        prefix={
          <input
            type="color"
            value={localVal}
            onChange={(e) => handleChange(e.target.value)}
            style={{ width: 22, height: 22, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
          />
        }
        onChange={(e) => handleChange(e.target.value)}
        maxLength={7}
        style={{ fontFamily: 'monospace' }}
      />
    </Form.Item>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PrintTemplatePage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [form]       = Form.useForm();

  const [previewConfig, setPreviewConfig] = useState<PrintTemplateConfig | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [sigUploading,  setSigUploading]  = useState(false);
  const [hasUnsaved,    setHasUnsaved]    = useState(false);

  // ── Fetch saved config ────────────────────────────────────────────────────
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
  });

  useEffect(() => {
    if (!savedConfig) return;
    const d = savedConfig;
    form.setFieldsValue({
      company_name:    d.company_name,
      tagline:         d.tagline,
      address:         d.address,
      phone:           d.phone,
      email:           d.email,
      gst_number:      d.gst_number,
      cin_number:      d.cin_number,
      header_alignment: d.header_alignment,
      header_style:    d.header_style,
      show_gst:        d.show_gst,
      show_email:      d.show_email,
      show_phone:      d.show_phone,
      show_tagline:    d.show_tagline,
      show_logo:       d.show_logo,
      show_footer:     d.show_footer,
      footer_text:     d.footer_text,
      show_watermark:  d.show_watermark,
      watermark_text:  d.watermark_text,
      show_signature:  d.show_signature,
      logo_width:      d.logo_width,
      primary_color:   d.primary_color   ?? '#f97316',
      secondary_color: d.secondary_color ?? '#111827',
      accent_color:    d.accent_color,
      font_family:     d.font_family     ?? 'Arial, Helvetica, sans-serif',
      change_notes:    '',
    });
    setPreviewConfig(d);
    setHasUnsaved(false);
  }, [savedConfig]);

  // ── Fetch version history ─────────────────────────────────────────────────
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['print-template-versions'],
    queryFn: getPrintTemplateVersions,
  });

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: savePrintTemplateConfig,
    onSuccess: (data) => {
      message.success('Template saved successfully');
      setPreviewConfig(data);
      setHasUnsaved(false);
      queryClient.invalidateQueries({ queryKey: ['print-template-config'] });
      queryClient.invalidateQueries({ queryKey: ['print-template-versions'] });
      form.setFieldValue('change_notes', '');
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to save'),
  });

  // ── Rollback mutation ─────────────────────────────────────────────────────
  const rollbackMutation = useMutation({
    mutationFn: (version: number) => rollbackPrintTemplate(version),
    onSuccess: (data) => {
      message.success('Template restored successfully');
      setPreviewConfig(data);
      setHasUnsaved(false);
      form.setFieldsValue({
        company_name:    data.company_name,
        tagline:         data.tagline,
        address:         data.address,
        phone:           data.phone,
        email:           data.email,
        gst_number:      data.gst_number,
        cin_number:      data.cin_number,
        header_alignment: data.header_alignment,
        header_style:    data.header_style,
        show_gst:        data.show_gst,
        show_email:      data.show_email,
        show_phone:      data.show_phone,
        show_tagline:    data.show_tagline,
        show_logo:       data.show_logo,
        show_footer:     data.show_footer,
        footer_text:     data.footer_text,
        show_signature:  data.show_signature,
        primary_color:   data.primary_color   ?? '#f97316',
        secondary_color: data.secondary_color ?? '#111827',
        font_family:     data.font_family     ?? 'Arial, Helvetica, sans-serif',
        logo_width:      data.logo_width,
      });
      queryClient.invalidateQueries({ queryKey: ['print-template-config'] });
      queryClient.invalidateQueries({ queryKey: ['print-template-versions'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Rollback failed'),
  });

  // ── Live preview — updates as user changes any field ─────────────────────
  const handleValuesChange = useCallback((_: any, allValues: any) => {
    setHasUnsaved(true);
    setPreviewConfig((prev) => ({
      ...(prev ?? savedConfig ?? DEFAULT_PRINT_TEMPLATE),
      company_name:    allValues.company_name    ?? null,
      tagline:         allValues.tagline         ?? null,
      address:         allValues.address         ?? null,
      phone:           allValues.phone           ?? null,
      email:           allValues.email           ?? null,
      gst_number:      allValues.gst_number      ?? null,
      header_alignment: allValues.header_alignment ?? 'left',
      header_style:    allValues.header_style    ?? 'detailed',
      show_gst:        allValues.show_gst        ?? true,
      show_email:      allValues.show_email      ?? true,
      show_phone:      allValues.show_phone      ?? true,
      show_tagline:    allValues.show_tagline    ?? false,
      show_logo:       allValues.show_logo       ?? true,
      show_footer:     allValues.show_footer     ?? false,
      footer_text:     allValues.footer_text     ?? null,
      show_watermark:  allValues.show_watermark  ?? false,
      watermark_text:  allValues.watermark_text  ?? null,
      show_signature:  allValues.show_signature  ?? true,
      logo_width:      allValues.logo_width      ?? 120,
      primary_color:   allValues.primary_color   ?? '#f97316',
      secondary_color: allValues.secondary_color ?? '#111827',
      accent_color:    allValues.accent_color    ?? null,
      font_family:     allValues.font_family     ?? 'Arial, Helvetica, sans-serif',
    }));
  }, [savedConfig]);

  // For ColorField to trigger preview without going through Form.onValuesChange
  const handleColorPreviewChange = (field: string, value: string) => {
    setHasUnsaved(true);
    setPreviewConfig((prev) => ({
      ...(prev ?? savedConfig ?? DEFAULT_PRINT_TEMPLATE),
      [field]: value,
    }));
  };

  // ── Logo upload ───────────────────────────────────────────────────────────
  const handleLogoUpload: UploadProps['beforeUpload'] = async (file: RcFile) => {
    setLogoUploading(true);
    try {
      const result = await uploadPrintTemplateLogo(file as unknown as File);
      setPreviewConfig((prev) => prev ? { ...prev, logo_url: result.logo_url } : prev);
      queryClient.invalidateQueries({ queryKey: ['print-template-config'] });
      message.success('Logo uploaded successfully');
    } catch {
      message.error('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
    return false;
  };

  const handleSave = (values: any) => {
    saveMutation.mutate({
      company_name:    values.company_name,
      tagline:         values.tagline,
      address:         values.address,
      phone:           values.phone,
      email:           values.email,
      gst_number:      values.gst_number,
      cin_number:      values.cin_number,
      header_alignment: values.header_alignment,
      header_style:    values.header_style,
      show_gst:        values.show_gst,
      show_email:      values.show_email,
      show_phone:      values.show_phone,
      show_tagline:    values.show_tagline,
      show_logo:       values.show_logo,
      footer_text:     values.footer_text,
      show_footer:     values.show_footer,
      watermark_text:  values.watermark_text,
      show_watermark:  values.show_watermark,
      logo_width:      values.logo_width,
      primary_color:   values.primary_color,
      secondary_color: values.secondary_color,
      accent_color:    values.accent_color,
      font_family:     values.font_family,
      show_signature:  values.show_signature,
      changeNotes:     values.change_notes,
    });
  };

  const activeConfig   = previewConfig ?? savedConfig ?? DEFAULT_PRINT_TEMPLATE;
  const currentLogoUrl = activeConfig?.logo_url || null;

  // ── Build sample preview data from active config ──────────────────────────
  const previewFromParty = {
    sectionLabel: 'Quotation by',
    name:    activeConfig.company_name    || 'Your Company Name',
    address: activeConfig.address         || '42, MG Road, Koramangala, Bangalore - 560034',
    phone:   activeConfig.show_phone ? (activeConfig.phone    || '+91 98765 43210') : undefined,
    email:   activeConfig.show_email ? (activeConfig.email    || 'accounts@company.com') : undefined,
    gstin:   activeConfig.show_gst   ? (activeConfig.gst_number || '29AABCV1234D1Z5') : undefined,
    cin:     activeConfig.cin_number  || undefined,
  };

  const previewSummaryLeft = (
    <>
      <div className="pt-section-title">Terms &amp; Conditions</div>
      <div className="pt-section-body">{'1. Payment due within 30 days.\n2. Goods once sold will not be taken back.\n3. All disputes subject to local jurisdiction.'}</div>
      <div className="pt-section-title">Additional Notes</div>
      <div className="pt-section-body">Thank you for your business. This is a sample preview of your document template.</div>
    </>
  );

  const tabItems = [
    // ────────────────────────────────────────────────────────────────────────
    {
      key: 'config',
      label: <span><SettingOutlined /> Configuration</span>,
      children: isLoading ? (
        <div className="flex justify-center items-center h-64"><Spin size="large" /></div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          onValuesChange={handleValuesChange}
          initialValues={{
            header_alignment: 'left',
            header_style:     'detailed',
            show_gst:         true,
            show_email:       true,
            show_phone:       true,
            show_tagline:     false,
            show_logo:        true,
            show_footer:      false,
            show_watermark:   false,
            show_signature:   true,
            logo_width:       120,
            primary_color:    '#f97316',
            secondary_color:  '#111827',
            font_family:      'Arial, Helvetica, sans-serif',
          }}
        >
          {/* Logo */}
          <Card size="small" title="Logo" className="mb-4">
            <div className="flex items-center gap-6 flex-wrap">
              {currentLogoUrl ? (
                <img src={currentLogoUrl} alt="Logo" className="h-16 object-contain border rounded p-1" />
              ) : (
                <div className="h-16 w-32 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                  No logo
                </div>
              )}
              <div className="space-y-2">
                <Upload beforeUpload={handleLogoUpload} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />} loading={logoUploading}>
                    {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                </Upload>
                <p className="text-xs text-gray-400">JPG, PNG, WebP — max 2 MB</p>
              </div>
              <Form.Item label="Logo Width (px)" name="logo_width" className="!mb-0 ml-4">
                <Input type="number" style={{ width: 100 }} />
              </Form.Item>
            </div>
          </Card>

          {/* Company Info */}
          <Card size="small" title="Company Information" className="mb-4">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Company Name" name="company_name">
                  <Input placeholder="Your Company Pvt. Ltd." />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Tagline" name="tagline">
                  <Input placeholder="Powering Business with Smart ERP" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Address" name="address">
              <Input.TextArea rows={2} placeholder="42, MG Road, Koramangala, Bangalore - 560034" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Phone" name="phone">
                  <Input placeholder="+91 98765 43210" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Email" name="email">
                  <Input placeholder="accounts@company.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="GST Number" name="gst_number">
                  <Input placeholder="29ABCDE1234F1Z5" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="CIN Number" name="cin_number">
                  <Input placeholder="U72200KA2010PTC055678" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Brand Colors */}
          <Card size="small" title="Brand Colors" className="mb-4"
            extra={<Text type="secondary" className="text-xs">These control all colors in your PDF documents</Text>}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <ColorField
                  label="Primary Color"
                  fieldName="primary_color"
                  tooltip="Table headers, section labels, document title"
                  form={form}
                  onPreviewChange={handleColorPreviewChange}
                />
              </Col>
              <Col xs={24} md={8}>
                <ColorField
                  label="Secondary Color"
                  fieldName="secondary_color"
                  tooltip="Total row background, dark accents"
                  form={form}
                  onPreviewChange={handleColorPreviewChange}
                />
              </Col>
              <Col xs={24} md={8}>
                <ColorField
                  label="Accent Color (optional)"
                  fieldName="accent_color"
                  tooltip="Optional third highlight color"
                  form={form}
                  onPreviewChange={handleColorPreviewChange}
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Font Family" name="font_family" tooltip="Document font across all PDFs">
                  <Select options={[
                    { value: 'Arial, Helvetica, sans-serif',         label: 'Arial (default)' },
                    { value: "'Times New Roman', Times, serif",       label: 'Times New Roman' },
                    { value: 'Georgia, serif',                        label: 'Georgia' },
                    { value: "'Courier New', Courier, monospace",     label: 'Courier New' },
                    { value: 'Verdana, Geneva, sans-serif',           label: 'Verdana' },
                    { value: "'Trebuchet MS', Helvetica, sans-serif", label: 'Trebuchet MS' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Layout */}
          <Card size="small" title="Layout & Style" className="mb-4">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Header Alignment" name="header_alignment">
                  <Select options={[
                    { value: 'left',   label: 'Left — Logo left, Title center, Meta right' },
                    { value: 'center', label: 'Center — Everything centered' },
                    { value: 'right',  label: 'Right — Logo right' },
                  ]} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Header Style" name="header_style">
                  <Select options={[
                    { value: 'detailed', label: 'Detailed (full address + contacts)' },
                    { value: 'compact',  label: 'Compact (name + key info only)' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Visibility Toggles */}
          <Card size="small" title="Field Visibility" className="mb-4">
            <Row gutter={[24, 8]}>
              {[
                { name: 'show_logo',      label: 'Show Logo' },
                { name: 'show_gst',       label: 'Show GST Number' },
                { name: 'show_email',     label: 'Show Email' },
                { name: 'show_phone',     label: 'Show Phone' },
                { name: 'show_tagline',   label: 'Show Tagline' },
                { name: 'show_footer',    label: 'Show Footer' },
                { name: 'show_signature', label: 'Show Signature Line' },
                { name: 'show_watermark', label: 'Show Watermark' },
              ].map(({ name, label }) => (
                <Col xs={12} md={6} key={name}>
                  <div className="flex items-center gap-2 mb-2">
                    <Form.Item name={name} valuePropName="checked" className="!mb-0">
                      <Switch size="small" />
                    </Form.Item>
                    <Text className="text-sm">{label}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Footer */}
          <Form.Item noStyle shouldUpdate={(p, c) => p.show_footer !== c.show_footer}>
            {({ getFieldValue }) => getFieldValue('show_footer') && (
              <Card size="small" title="Footer Text" className="mb-4">
                <Form.Item name="footer_text">
                  <Input.TextArea rows={2} placeholder="Thank you for your business. All disputes subject to local jurisdiction." />
                </Form.Item>
              </Card>
            )}
          </Form.Item>

          {/* Signature */}
          <Form.Item noStyle shouldUpdate={(p, c) => p.show_signature !== c.show_signature}>
            {({ getFieldValue }) => getFieldValue('show_signature') !== false && (
              <Card size="small" title="Authorized Signature Image" className="mb-4">
                <div className="flex items-center gap-6">
                  {activeConfig?.signature_url ? (
                    <img src={activeConfig.signature_url} alt="Signature" className="h-16 object-contain border rounded p-1" />
                  ) : (
                    <div className="h-16 w-40 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs text-center px-2">
                      No signature uploaded
                    </div>
                  )}
                  <div className="space-y-2">
                    <Upload
                      beforeUpload={async (file) => {
                        setSigUploading(true);
                        try {
                          const result = await uploadPrintTemplateLogo(file as unknown as File);
                          saveMutation.mutate({ signature_url: result.logo_url } as any);
                          setPreviewConfig((prev) => prev ? { ...prev, signature_url: result.logo_url } : prev);
                          message.success('Signature uploaded');
                        } catch { message.error('Signature upload failed'); }
                        finally { setSigUploading(false); }
                        return false;
                      }}
                      showUploadList={false}
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />} loading={sigUploading}>Upload Signature</Button>
                    </Upload>
                    <p className="text-xs text-gray-400">PNG with transparent background recommended</p>
                  </div>
                </div>
              </Card>
            )}
          </Form.Item>

          {/* Watermark */}
          <Form.Item noStyle shouldUpdate={(p, c) => p.show_watermark !== c.show_watermark}>
            {({ getFieldValue }) => getFieldValue('show_watermark') && (
              <Card size="small" title="Watermark Text" className="mb-4">
                <Form.Item name="watermark_text">
                  <Input placeholder="e.g. DRAFT or CONFIDENTIAL" />
                </Form.Item>
              </Card>
            )}
          </Form.Item>

          {/* Save */}
          <Card size="small" className="mb-4">
            <Form.Item label="Change Notes (optional)" name="change_notes">
              <Input placeholder="e.g. Updated brand color and signature" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              size="large"
              block
            >
              Save Template
            </Button>
          </Card>
        </Form>
      ),
    },

    // ────────────────────────────────────────────────────────────────────────
    {
      key: 'preview',
      label: (
        <span>
          <EyeOutlined /> Live Preview{' '}
          {hasUnsaved
            ? <Badge dot color="orange" title="Unsaved changes" />
            : <Badge dot color="green"  title="Showing saved config" />}
        </span>
      ),
      children: (
        <div>
          {/* ── Status bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', marginBottom: 16,
            background: hasUnsaved ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${hasUnsaved ? '#fcd34d' : '#86efac'}`,
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasUnsaved ? (
                <>
                  <EditOutlined style={{ color: '#d97706' }} />
                  <Text style={{ color: '#92400e', fontWeight: 600, fontSize: 13 }}>
                    DRAFT — Unsaved changes (switch to Configuration tab to save)
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircleOutlined style={{ color: '#16a34a' }} />
                  <Text style={{ color: '#14532d', fontWeight: 600, fontSize: 13 }}>
                    ACTIVE — Showing saved configuration
                    {savedConfig?.current_version ? ` (v${savedConfig.current_version})` : ''}
                  </Text>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Color swatches */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Active colors:</span>
                <span title={`Primary: ${activeConfig.primary_color}`} style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 4, background: activeConfig.primary_color, border: '1px solid rgba(0,0,0,0.15)' }} />
                <span title={`Secondary: ${activeConfig.secondary_color}`} style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 4, background: activeConfig.secondary_color, border: '1px solid rgba(0,0,0,0.15)' }} />
                {activeConfig.accent_color && <span title={`Accent: ${activeConfig.accent_color}`} style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 4, background: activeConfig.accent_color, border: '1px solid rgba(0,0,0,0.15)' }} />}
                <Tag style={{ fontSize: 10, marginLeft: 4 }}>{activeConfig.font_family?.split(',')[0] || 'Arial'}</Tag>
              </div>
            </div>
          </div>

          {/* ── Full document preview ── */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <PrintMasterTemplate
              config={activeConfig}
              documentTitle="Quotation"
              metaLines={[
                { label: 'Quotation#', value: 'QTN-000001', bold: true },
                { label: 'Date',       value: dayjs().format('DD MMM YYYY').toUpperCase() },
                { label: 'Valid Until', value: dayjs().add(30, 'day').format('DD MMM YYYY').toUpperCase() },
              ]}
              fromParty={previewFromParty}
              toParty={{
                sectionLabel: 'Quotation to',
                name:    'Sample Customer',
                address: '305, 3rd Floor Orion Mall,\nBangalore, Karnataka - 560055',
                phone:   '+91 87654 32109',
                email:   'customer@example.com',
              }}
              tableColumns={PREVIEW_COLUMNS}
              tableRows={SAMPLE_ITEMS}
              renderCell={(row, key) => {
                if (key === 'item')   return <><div style={{ fontWeight: 600 }}>{row.product_name}</div><div style={{ fontSize: 10, color: '#888' }}>SKU: {row.product_code} &nbsp;|&nbsp; HSN: {row.hsn_code}</div></>;
                if (key === 'qty')    return row.quantity;
                if (key === 'unit')   return row.unit;
                if (key === 'rate')   return `₹${fmt(row.unit_price)}`;
                if (key === 'disc')   return `${Number(row.discount_percent).toFixed(2)}%`;
                if (key === 'tax')    return `${Number(row.tax_percent).toFixed(2)}%`;
                if (key === 'amount') return <strong>₹{fmt(row.total_amount)}</strong>;
                return null;
              }}
              summaryRows={[
                { label: 'Subtotal', value: `₹${fmt(SAMPLE_SUBTOTAL)}` },
                { label: 'Tax',      value: `₹${fmt(SAMPLE_TAX)}` },
                { label: 'Total',    value: `₹${fmt(SAMPLE_TOTAL)}`, highlight: true, large: true },
              ]}
              amountInWords="Seven Thousand Nine Hundred Nineteen Rupees Only"
              summaryLeft={previewSummaryLeft}
            />
          </div>
        </div>
      ),
    },

    // ────────────────────────────────────────────────────────────────────────
    {
      key: 'history',
      label: <span><HistoryOutlined /> Version History</span>,
      children: (
        <div>
          <Alert type="info" message="Each save creates a new version. You can restore any previous version." className="mb-4" showIcon />
          {versionsLoading ? (
            <div className="text-center py-8"><Spin /></div>
          ) : !versions?.length ? (
            <div className="text-center py-8 text-gray-400">No version history yet. Save the template to create the first version.</div>
          ) : (
            <div className="space-y-3">
              {(versions as PrintTemplateVersion[]).map((v, idx) => (
                <Card key={v.id} size="small"
                  style={{ border: idx === 0 ? '1px solid #86efac' : '1px solid #f0f0f0' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tag color={idx === 0 ? 'green' : 'blue'} className="font-semibold">
                        {idx === 0 ? '✓ Latest' : `v${v.version_number}`}
                      </Tag>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {v.change_notes || <span className="text-gray-400 italic">No notes</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {dayjs(v.changed_at).format('DD MMM YYYY [at] hh:mm A')}
                        </p>
                      </div>
                    </div>
                    {idx !== 0 && (
                      <Popconfirm
                        title="Restore this version?"
                        description="This will overwrite the current active config."
                        onConfirm={() => rollbackMutation.mutate(v.version_number)}
                        okText="Restore"
                        cancelText="Cancel"
                      >
                        <Button size="small" icon={<RollbackOutlined />} loading={rollbackMutation.isPending}>
                          Restore
                        </Button>
                      </Popconfirm>
                    )}
                    {idx === 0 && <Tag color="green">Current Active</Tag>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings')}>Back</Button>
        <div className="flex-1">
          <Title level={4} className="!mb-0">
            Print Template
            {savedConfig?.current_version != null && savedConfig.current_version > 0 && (
              <Tag className="ml-2" color="green">
                <CheckCircleOutlined /> Active v{savedConfig.current_version}
              </Tag>
            )}
            {hasUnsaved && <Tag className="ml-1" color="orange"><EditOutlined /> Unsaved changes</Tag>}
          </Title>
          <Text type="secondary" className="text-sm">
            Configure branding applied to all PDF documents — Quotations, Invoices, Receipts
          </Text>
        </div>
      </div>

      <Tabs items={tabItems} defaultActiveKey="config" />
    </div>
  );
}

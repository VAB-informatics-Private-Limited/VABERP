'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Typography, Card, Form, Input, Button, Switch, Select, Row, Col,
  Upload, message, Tabs, Tag, Divider, Space, Popconfirm, Spin, Alert,
} from 'antd';
import {
  SaveOutlined, UploadOutlined, ArrowLeftOutlined, RollbackOutlined,
  EyeOutlined, HistoryOutlined, SettingOutlined, DeleteOutlined,
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
import { PrintLayout } from '@/components/print-engine/PrintLayout';
import { PrintTemplateConfig, DEFAULT_PRINT_TEMPLATE, PrintTemplateVersion } from '@/types/print-template';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://64.235.43.187:2261';

export default function PrintTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [previewConfig, setPreviewConfig] = useState<PrintTemplateConfig | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // ── Fetch active config ────────────────────────────────────────────────────
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['print-template-config'],
    queryFn: getPrintTemplateConfig,
  });

  useEffect(() => {
    if (!savedConfig) return;
    const data = savedConfig;
    form.setFieldsValue({
      company_name: data.company_name,
      tagline: data.tagline,
      address: data.address,
      phone: data.phone,
      email: data.email,
      gst_number: data.gst_number,
      cin_number: data.cin_number,
      header_alignment: data.header_alignment,
      header_style: data.header_style,
      show_gst: data.show_gst,
      show_email: data.show_email,
      show_phone: data.show_phone,
      show_tagline: data.show_tagline,
      show_logo: data.show_logo,
      footer_text: data.footer_text,
      show_footer: data.show_footer,
      watermark_text: data.watermark_text,
      show_watermark: data.show_watermark,
      logo_width: data.logo_width,
      change_notes: '',
    });
    if (!previewConfig) setPreviewConfig(data);
  }, [savedConfig]);

  // ── Fetch version history ──────────────────────────────────────────────────
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['print-template-versions'],
    queryFn: getPrintTemplateVersions,
  });

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: savePrintTemplateConfig,
    onSuccess: (data) => {
      message.success('Print template saved successfully');
      setPreviewConfig(data);
      queryClient.invalidateQueries({ queryKey: ['print-template-config'] });
      queryClient.invalidateQueries({ queryKey: ['print-template-versions'] });
      form.setFieldValue('change_notes', '');
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to save'),
  });

  // ── Rollback mutation ──────────────────────────────────────────────────────
  const rollbackMutation = useMutation({
    mutationFn: (version: number) => rollbackPrintTemplate(version),
    onSuccess: (data) => {
      message.success('Template restored successfully');
      setPreviewConfig(data);
      form.setFieldsValue({
        company_name: data.company_name,
        tagline: data.tagline,
        address: data.address,
        phone: data.phone,
        email: data.email,
        gst_number: data.gst_number,
        cin_number: data.cin_number,
        header_alignment: data.header_alignment,
        header_style: data.header_style,
        show_gst: data.show_gst,
        show_email: data.show_email,
        show_phone: data.show_phone,
        show_tagline: data.show_tagline,
        show_logo: data.show_logo,
        footer_text: data.footer_text,
        show_footer: data.show_footer,
        logo_width: data.logo_width,
      });
      queryClient.invalidateQueries({ queryKey: ['print-template-config'] });
      queryClient.invalidateQueries({ queryKey: ['print-template-versions'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Rollback failed'),
  });

  // ── Live preview — updates instantly as user types ─────────────────────────
  const handleValuesChange = useCallback((_: any, allValues: any) => {
    setPreviewConfig((prev) => ({
      ...(prev ?? savedConfig ?? DEFAULT_PRINT_TEMPLATE),
      company_name: allValues.company_name ?? null,
      tagline: allValues.tagline ?? null,
      address: allValues.address ?? null,
      phone: allValues.phone ?? null,
      email: allValues.email ?? null,
      gst_number: allValues.gst_number ?? null,
      header_alignment: allValues.header_alignment ?? 'left',
      header_style: allValues.header_style ?? 'detailed',
      show_gst: allValues.show_gst ?? true,
      show_email: allValues.show_email ?? true,
      show_phone: allValues.show_phone ?? true,
      show_tagline: allValues.show_tagline ?? false,
      show_logo: allValues.show_logo ?? true,
      show_footer: allValues.show_footer ?? false,
      footer_text: allValues.footer_text ?? null,
      show_watermark: allValues.show_watermark ?? false,
      watermark_text: allValues.watermark_text ?? null,
      logo_width: allValues.logo_width ?? 120,
    }));
  }, [savedConfig]);

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload: UploadProps['beforeUpload'] = async (file: RcFile) => {
    setLogoUploading(true);
    try {
      const result = await uploadPrintTemplateLogo(file as unknown as File);
      const fullUrl = result.logo_url.startsWith('http')
        ? result.logo_url
        : `${API_URL}${result.logo_url}`;
      setPreviewConfig((prev) => prev ? { ...prev, logo_url: result.logo_url } : prev);
      queryClient.invalidateQueries({ queryKey: ['print-template-config'] });
      message.success('Logo uploaded successfully');
    } catch {
      message.error('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
    return false; // prevent antd auto-upload
  };

  const handleSave = (values: any) => {
    saveMutation.mutate({
      company_name: values.company_name,
      tagline: values.tagline,
      address: values.address,
      phone: values.phone,
      email: values.email,
      gst_number: values.gst_number,
      cin_number: values.cin_number,
      header_alignment: values.header_alignment,
      header_style: values.header_style,
      show_gst: values.show_gst,
      show_email: values.show_email,
      show_phone: values.show_phone,
      show_tagline: values.show_tagline,
      show_logo: values.show_logo,
      footer_text: values.footer_text,
      show_footer: values.show_footer,
      watermark_text: values.watermark_text,
      show_watermark: values.show_watermark,
      logo_width: values.logo_width,
      changeNotes: values.change_notes,
    });
  };

  const currentLogoUrl = previewConfig?.logo_url || savedConfig?.logo_url || null;

  const tabItems = [
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
            header_style: 'detailed',
            show_gst: true,
            show_email: true,
            show_phone: true,
            show_tagline: false,
            show_logo: true,
            show_footer: false,
            show_watermark: false,
            logo_width: 120,
          }}
        >
          {/* Logo */}
          <Card size="small" title="Logo" className="mb-4">
            <div className="flex items-center gap-6">
              {currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="Logo"
                  className="h-16 object-contain border rounded p-1"
                />
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
                <p className="text-xs text-gray-400">JPG, PNG, WebP or SVG — max 2 MB</p>
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
                  <Input placeholder="Quality You Can Trust" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Address" name="address">
              <Input.TextArea rows={2} placeholder="Full address" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Phone" name="phone">
                  <Input placeholder="+91 98765 43210" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Email" name="email">
                  <Input placeholder="info@company.com" />
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
                  <Input placeholder="L12345AB2000PLC123456" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Layout */}
          <Card size="small" title="Layout & Style" className="mb-4">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Header Alignment" name="header_alignment">
                  <Select
                    options={[
                      { value: 'left', label: 'Left' },
                      { value: 'center', label: 'Center' },
                      { value: 'right', label: 'Right' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Header Style" name="header_style">
                  <Select
                    options={[
                      { value: 'detailed', label: 'Detailed (full address + contacts)' },
                      { value: 'compact', label: 'Compact (name + key info only)' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Visibility Toggles */}
          <Card size="small" title="Field Visibility" className="mb-4">
            <Row gutter={[24, 8]}>
              {[
                { name: 'show_logo', label: 'Show Logo' },
                { name: 'show_gst', label: 'Show GST Number' },
                { name: 'show_email', label: 'Show Email' },
                { name: 'show_phone', label: 'Show Phone' },
                { name: 'show_tagline', label: 'Show Tagline' },
                { name: 'show_footer', label: 'Show Footer' },
              ].map(({ name, label }) => (
                <Col xs={12} md={8} key={name}>
                  <Form.Item name={name} valuePropName="checked" className="!mb-2">
                    <Switch size="small" />
                  </Form.Item>
                  <Text className="text-sm">{label}</Text>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Footer */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.show_footer !== cur.show_footer}>
            {({ getFieldValue }) =>
              getFieldValue('show_footer') && (
                <Card size="small" title="Footer Text" className="mb-4">
                  <Form.Item name="footer_text">
                    <Input.TextArea rows={2} placeholder="e.g. Thank you for your business. All disputes subject to local jurisdiction." />
                  </Form.Item>
                </Card>
              )
            }
          </Form.Item>

          {/* Change notes + Save */}
          <Card size="small" className="mb-4">
            <Form.Item label="Change Notes (optional)" name="change_notes">
              <Input placeholder="e.g. Updated phone number and logo" />
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
    {
      key: 'preview',

      label: <span><EyeOutlined /> Live Preview</span>,
      children: (
        <div>
          <Alert
            type="info"
            message="Changes in the Configuration tab reflect here instantly before you save."
            className="mb-4"
            showIcon
          />
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <PrintLayout configOverride={previewConfig ?? savedConfig ?? DEFAULT_PRINT_TEMPLATE}>
              {/* Sample document body for preview */}
              <div className="py-4">
                <div className="flex justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wide text-gray-700">Sample Invoice</h2>
                    <p className="text-sm text-gray-500">This is how your header will look on all documents</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p><span className="font-medium">Invoice #:</span> INV-000001</p>
                    <p><span className="font-medium">Date:</span> {dayjs().format('DD/MM/YYYY')}</p>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-100 rounded p-6 text-center text-gray-300 text-sm">
                  Document content appears here (items, totals, etc.)
                </div>
              </div>
            </PrintLayout>
          </div>
        </div>
      ),
    },
    {
      key: 'history',
      label: <span><HistoryOutlined /> Version History</span>,
      children: (
        <div>
          <Alert
            type="info"
            message="Each save creates a new version. You can restore any previous version."
            className="mb-4"
            showIcon
          />
          {versionsLoading ? (
            <div className="text-center py-8"><Spin /></div>
          ) : !versions?.length ? (
            <div className="text-center py-8 text-gray-400">No version history yet. Save the template to create the first version.</div>
          ) : (
            <div className="space-y-3">
              {(versions as PrintTemplateVersion[]).map((v) => (
                <Card key={v.id} size="small" className="border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tag color="blue" className="font-semibold">v{v.version_number}</Tag>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {v.change_notes || <span className="text-gray-400 italic">No notes</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {dayjs(v.changed_at).format('DD MMM YYYY [at] hh:mm A')}
                        </p>
                      </div>
                    </div>
                    <Popconfirm
                      title="Restore this version?"
                      description="Current config will be saved before restoring."
                      onConfirm={() => rollbackMutation.mutate(v.version_number)}
                      okText="Restore"
                      cancelText="Cancel"
                    >
                      <Button
                        size="small"
                        icon={<RollbackOutlined />}
                        loading={rollbackMutation.isPending}
                      >
                        Restore
                      </Button>
                    </Popconfirm>
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
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings')}>
          Back
        </Button>
        <div>
          <Title level={4} className="!mb-0">Print Template</Title>
          <Text type="secondary" className="text-sm">
            Configure your company header for all printable documents
            {savedConfig && savedConfig.current_version > 0 && (
              <Tag className="ml-2" color="default">v{savedConfig.current_version}</Tag>
            )}
          </Text>
        </div>
      </div>

      <Tabs items={tabItems} defaultActiveKey="config" />
    </div>
  );
}

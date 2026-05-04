'use client';

import { Typography, Card, Tabs, Form, Input, Button, Upload, message, ColorPicker, InputNumber, Row, Col, Space, Spin, Divider, Table, Tag, Popconfirm, Empty } from 'antd';
import { UploadOutlined, SaveOutlined, ArrowLeftOutlined, HistoryOutlined, RollbackOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMyBranding, saveBranding, uploadBrandingLogo, uploadBrandingLogoSmall, uploadBrandingFavicon, uploadBrandingLoginBg, getBrandingVersions, rollbackBranding } from '@/lib/api/branding';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { fadeInUp, smoothEasing } from '@/lib/animations';
import { useBrandingStore } from '@/stores/brandingStore';
import { DEFAULT_BRANDING, EnterpriseBranding } from '@/types/branding';
import type { Color } from 'antd/es/color-picker';

const { Title, Text } = Typography;

function colorToHex(color: Color | string): string {
  if (typeof color === 'string') return color;
  return color.toHexString();
}

export default function BrandingSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setBrandingStore = useBrandingStore((s) => s.setBranding);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['my-branding'],
    queryFn: getMyBranding,
  });

  const branding = data?.data;

  useEffect(() => {
    if (branding) {
      form.setFieldsValue({
        app_name: branding.app_name || '',
        tagline: branding.tagline || '',
        primary_color: branding.primary_color || DEFAULT_BRANDING.primary_color,
        secondary_color: branding.secondary_color || DEFAULT_BRANDING.secondary_color,
        font_family: branding.font_family || DEFAULT_BRANDING.font_family,
        border_radius: branding.border_radius ?? DEFAULT_BRANDING.border_radius,
      });
    }
  }, [branding, form]);

  const saveMutation = useMutation({
    mutationFn: (values: Partial<EnterpriseBranding>) => saveBranding(values),
    onSuccess: (res) => {
      message.success('Branding saved successfully');
      queryClient.invalidateQueries({ queryKey: ['my-branding'] });
      if (res.data) setBrandingStore(res.data);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Failed to save branding');
    },
  });

  const handleSave = (values: any) => {
    const payload: Partial<EnterpriseBranding> = {
      app_name: values.app_name || null,
      tagline: values.tagline || null,
      primary_color: typeof values.primary_color === 'string' ? values.primary_color : colorToHex(values.primary_color),
      secondary_color: typeof values.secondary_color === 'string' ? values.secondary_color : colorToHex(values.secondary_color),
      font_family: values.font_family || 'Inter',
      border_radius: values.border_radius ?? 8,
    };
    saveMutation.mutate(payload);
  };

  const handleFileUpload = async (
    uploadFn: (file: File) => Promise<any>,
    file: File,
    label: string,
  ) => {
    try {
      const res = await uploadFn(file);
      message.success(`${label} uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['my-branding'] });
      if (res.data) setBrandingStore(res.data);
    } catch {
      message.error(`Failed to upload ${label}`);
    }
    return false;
  };

  const uploadProps = (uploadFn: (file: File) => Promise<any>, label: string) => ({
    showUploadList: false,
    beforeUpload: (file: File) => {
      handleFileUpload(uploadFn, file, label);
      return false;
    },
    accept: '.jpg,.jpeg,.png,.webp,.svg,.ico',
  });

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['branding-versions'],
    queryFn: () => getBrandingVersions(1, 50),
  });

  const rollbackMutation = useMutation({
    mutationFn: (version: number) => rollbackBranding(version),
    onSuccess: (res) => {
      message.success('Rolled back successfully');
      queryClient.invalidateQueries({ queryKey: ['my-branding'] });
      queryClient.invalidateQueries({ queryKey: ['branding-versions'] });
      if (res.data) setBrandingStore(res.data);
    },
    onError: () => {
      message.error('Failed to rollback');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'identity',
      label: 'Identity',
      children: (
        <div>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="app_name" label="App Name">
                <Input placeholder="e.g., My Company ERP" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tagline" label="Tagline">
                <Input placeholder="e.g., Sign in to your account" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Uploads</Divider>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <div className="text-sm font-medium mb-2">Main Logo</div>
              <div className="flex items-center gap-3">
                {branding?.logo_url && (
                  <img src={branding.logo_url} alt="Logo" className="w-12 h-12 object-contain border rounded-lg p-1" />
                )}
                <Upload {...uploadProps(uploadBrandingLogo, 'Logo')}>
                  <Button icon={<UploadOutlined />} size="small">Upload</Button>
                </Upload>
              </div>
              <Text type="secondary" className="text-xs mt-1 block">Used in sidebar and login page</Text>
            </Col>
            <Col xs={24} sm={8}>
              <div className="text-sm font-medium mb-2">Small Logo</div>
              <div className="flex items-center gap-3">
                {branding?.logo_small_url && (
                  <img src={branding.logo_small_url} alt="Small Logo" className="w-10 h-10 object-contain border rounded-lg p-1" />
                )}
                <Upload {...uploadProps(uploadBrandingLogoSmall, 'Small Logo')}>
                  <Button icon={<UploadOutlined />} size="small">Upload</Button>
                </Upload>
              </div>
              <Text type="secondary" className="text-xs mt-1 block">Used when sidebar is collapsed</Text>
            </Col>
            <Col xs={24} sm={8}>
              <div className="text-sm font-medium mb-2">Favicon</div>
              <div className="flex items-center gap-3">
                {branding?.favicon_url && (
                  <img src={branding.favicon_url} alt="Favicon" className="w-8 h-8 object-contain border rounded-lg p-1" />
                )}
                <Upload {...uploadProps(uploadBrandingFavicon, 'Favicon')}>
                  <Button icon={<UploadOutlined />} size="small">Upload</Button>
                </Upload>
              </div>
              <Text type="secondary" className="text-xs mt-1 block">Browser tab icon</Text>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'colors',
      label: 'Colors',
      children: (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8}>
              <Form.Item
                name="primary_color"
                label="Primary Color"
                extra="Drives buttons, links, sidebar selection, table accents."
              >
                <ColorPicker format="hex" showText />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item
                name="secondary_color"
                label="Secondary Color"
                extra="Drives sidebar text, page titles, banner deep gradient."
              >
                <ColorPicker format="hex" showText />
              </Form.Item>
            </Col>
          </Row>
          {/* Accent / background layout / sidebar bg / sidebar text are
              derived from Primary + Secondary in BrandingProvider. */}

          <Divider orientation="left" plain>Typography</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="font_family" label="Font Family">
                <Input placeholder="Inter" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="border_radius" label="Border Radius (px)">
                <InputNumber min={0} max={24} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'login',
      label: 'Login Page',
      children: (
        <div>
          <div className="text-sm font-medium mb-2">Login Background Image</div>
          <div className="flex items-center gap-4 mb-4">
            {branding?.login_bg_image_url && (
              <img
                src={branding.login_bg_image_url}
                alt="Login BG"
                className="w-32 h-20 object-cover border rounded-lg"
              />
            )}
            <Upload {...uploadProps(uploadBrandingLoginBg, 'Login Background')}>
              <Button icon={<UploadOutlined />}>Upload Background Image</Button>
            </Upload>
          </div>
          <Text type="secondary" className="text-xs">
            Recommended: 1920x1080px or larger. If not set, a gradient background will be used.
          </Text>
        </div>
      ),
    },
    {
      key: 'preview',
      label: 'Preview',
      children: (
        <div>
          <div className="mb-4">
            <Text type="secondary">This is how your login page will look:</Text>
          </div>
          <div
            style={{
              background: branding?.login_bg_image_url
                ? `url(${branding.login_bg_image_url}) center/cover`
                : 'linear-gradient(135deg, #5b6ef5 0%, #764ba2 50%, #1677ff 100%)',
              borderRadius: 12,
              padding: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.98)',
              borderRadius: 16,
              padding: '32px 40px',
              maxWidth: 360,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 32px 64px -12px rgba(0,0,0,0.3)',
            }}>
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-3" />
              ) : (
                <img src="/logo-icon.png" alt="Logo" className="w-12 h-12 object-contain mx-auto mb-3" />
              )}
              <div className="font-bold text-lg text-gray-900 mb-1">
                {form.getFieldValue('app_name') || branding?.app_name || 'VAB Enterprise'}
              </div>
              <div className="text-gray-400 text-sm mb-6">
                {form.getFieldValue('tagline') || branding?.tagline || 'Sign in to your account'}
              </div>
              <div style={{ background: '#f5f5f5', borderRadius: 8, height: 36, marginBottom: 12 }} />
              <div style={{ background: '#f5f5f5', borderRadius: 8, height: 36, marginBottom: 16 }} />
              <div style={{
                background: typeof form.getFieldValue('primary_color') === 'string'
                  ? form.getFieldValue('primary_color')
                  : (branding?.primary_color || '#1677ff'),
                borderRadius: 8,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
              }}>
                Sign In
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Text type="secondary">Sidebar preview:</Text>
            <div className="mt-2 flex items-center gap-3 p-3 border rounded-lg" style={{ maxWidth: 240 }}>
              <img
                src={branding?.logo_url || '/logo-icon.png'}
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="font-bold text-sm text-gray-800">
                {form.getFieldValue('app_name') || branding?.app_name || 'VAB Informatics'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'versions',
      label: (
        <span>
          <HistoryOutlined className="mr-1" />
          Version History
        </span>
      ),
      children: (
        <div>
          {versionsLoading ? (
            <div className="flex justify-center py-8"><Spin /></div>
          ) : !versionsData?.data?.length ? (
            <Empty description="No version history yet. Save branding to create your first version." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              dataSource={versionsData.data}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Version',
                  dataIndex: 'versionNumber',
                  key: 'version',
                  width: 80,
                  render: (v: number) => <Tag color="blue">v{v}</Tag>,
                },
                {
                  title: 'App Name',
                  key: 'appName',
                  render: (_: any, record: any) => record.snapshot?.app_name || '-',
                },
                {
                  title: 'Primary Color',
                  key: 'color',
                  width: 130,
                  render: (_: any, record: any) => {
                    const color = record.snapshot?.primary_color;
                    return color ? (
                      <div className="flex items-center gap-2">
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: color, border: '1px solid #e5e7eb' }} />
                        <span className="text-xs text-gray-500">{color}</span>
                      </div>
                    ) : '-';
                  },
                },
                {
                  title: 'Notes',
                  dataIndex: 'changeNotes',
                  key: 'notes',
                  ellipsis: true,
                  render: (text: string) => text || '-',
                },
                {
                  title: 'Date',
                  dataIndex: 'changedAt',
                  key: 'date',
                  width: 140,
                  render: (date: string) => dayjs(date).format('DD MMM YYYY HH:mm'),
                },
                {
                  title: '',
                  key: 'action',
                  width: 100,
                  render: (_: any, record: any) => (
                    <Popconfirm
                      title="Restore this version?"
                      description="This will overwrite the current branding with this version's settings."
                      onConfirm={() => rollbackMutation.mutate(record.versionNumber)}
                      okText="Restore"
                      cancelText="Cancel"
                    >
                      <Button
                        size="small"
                        icon={<RollbackOutlined />}
                        loading={rollbackMutation.isPending}
                        style={{ borderRadius: 6 }}
                      >
                        Restore
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex items-center gap-3 mb-5">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings')} />
        <Title level={4} style={{ margin: 0 }}>Branding</Title>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: smoothEasing }}>
      <Card className="card-shadow" styles={{ body: { padding: '16px 20px' } }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs items={tabItems} />

          <div className="flex justify-end mt-4 pt-4 border-t">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              size="large"
            >
              Save Branding
            </Button>
          </div>
        </Form>
      </Card>
      </motion.div>
    </div>
  );
}
